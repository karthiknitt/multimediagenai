import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("video-generation")
volume = modal.Volume.from_name("wan22-models", create_if_missing=True)

# Wan2.2 (Apache-2.0) A14B MoE models in diffusers format
T2V_MODEL_ID = "Wan-AI/Wan2.2-T2V-A14B-Diffusers"
I2V_MODEL_ID = "Wan-AI/Wan2.2-I2V-A14B-Diffusers"

# Wan2.2 generates 16 fps video; frame counts must be 4k+1 (81 frames ~= 5 s)
FPS = 16
# Wan's recommended negative prompt (chinese, from the model card)
NEGATIVE_PROMPT = (
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，"
    "低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，"
    "毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
)

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")

video_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch==2.8.0",
    "torchvision==0.23.0",
    "diffusers==0.36.0",
    "transformers==4.57.3",
    "accelerate==1.12.0",
    "sentencepiece==0.2.0",
    "protobuf==5.29.2",
    "ftfy==6.3.1",
    "imageio[ffmpeg]==2.36.1",
    "boto3==1.35.80",
    "psycopg2-binary==2.9.10",
    "fastapi==0.115.6",
    "Pillow==12.0.0",
    "requests==2.32.3",
    "huggingface_hub>=0.34.0",
    "numpy",
)


def _frames_4k_plus_1(num_frames: int) -> int:
    """Wan requires num_frames = 4k + 1"""
    num_frames = max(5, int(num_frames))
    return ((num_frames - 1) // 4) * 4 + 1


@app.function(
    image=video_image,
    volumes={"/models": volume},
    timeout=3600,
)
def download_models():
    """Download both Wan2.2 A14B models to the Modal volume (run once)"""
    from huggingface_hub import snapshot_download

    for model_id in (T2V_MODEL_ID, I2V_MODEL_ID):
        print(f"Downloading {model_id}...")
        snapshot_download(model_id, cache_dir="/models")
    volume.commit()
    print("Wan2.2 models downloaded")
    return True


@app.cls(
    gpu="H100",
    timeout=3600,  # 60 min max for videos
    scaledown_window=300,  # Keep warm 5 min
    memory=98304,  # CPU RAM for model CPU-offload of the 2x14B MoE experts
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],
    image=video_image,
)
class VideoGenerator:
    @modal.enter()
    def setup(self):
        """Initialize model placeholders - lazy load on first use"""
        self.t2v = None
        self.i2v = None

    def _free(self, name):
        """Drop a cached pipeline so only one A14B model lives in RAM/VRAM at a time"""
        import gc
        import torch

        setattr(self, name, None)
        gc.collect()
        torch.cuda.empty_cache()

    def _load_t2v(self):
        """Lazy load Wan2.2 T2V-A14B for text-to-video"""
        if self.t2v is None:
            from diffusers import WanPipeline
            import torch

            self._free("i2v")
            print("Loading Wan2.2 T2V-A14B for text-to-video...")
            self.t2v = WanPipeline.from_pretrained(
                T2V_MODEL_ID,
                torch_dtype=torch.bfloat16,
                cache_dir="/models",
            )
            self.t2v.enable_model_cpu_offload()
            print("Wan2.2 T2V-A14B loaded successfully!")
        return self.t2v

    def _load_i2v(self):
        """Lazy load Wan2.2 I2V-A14B for image-to-video"""
        if self.i2v is None:
            from diffusers import WanImageToVideoPipeline
            import torch

            self._free("t2v")
            print("Loading Wan2.2 I2V-A14B for image-to-video...")
            self.i2v = WanImageToVideoPipeline.from_pretrained(
                I2V_MODEL_ID,
                torch_dtype=torch.bfloat16,
                cache_dir="/models",
            )
            self.i2v.enable_model_cpu_offload()
            print("Wan2.2 I2V-A14B loaded successfully!")
        return self.i2v

    def _encode_and_upload(self, job_id, frames):
        """Encode frames to mp4 and upload to R2. Returns the public URL."""
        import os
        import boto3
        from diffusers.utils import export_to_video

        output_path = f"/tmp/{job_id}.mp4"
        export_to_video(frames, output_path, fps=FPS)

        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
        )

        # Organize by type and date: videos/{yyyy-mm-dd}
        date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        s3_key = f"videos/{date_folder}/{job_id}.mp4"
        s3_client.upload_file(
            output_path,
            os.environ["R2_BUCKET_NAME"],
            s3_key,
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        public_base = os.environ.get("R2_PUBLIC_URL") or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
        return f"{public_base}/{s3_key}"

    @modal.fastapi_endpoint(method="POST")
    def generate_text2video(self, request: dict):
        """Generate video from text prompt using Wan2.2 T2V-A14B"""
        import torch
        import os

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            self._update_db(job_id, "processing", 10, "Loading Wan2.2 text-to-video model...")
            pipe = self._load_t2v()

            self._update_db(job_id, "processing", 25, "Generating video frames...")
            start_time = datetime.now(timezone.utc)

            seed = params.get("seed")
            if seed is None:
                seed = int.from_bytes(os.urandom(4), "little")

            frames = pipe(
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                height=480,
                width=832,
                num_frames=_frames_4k_plus_1(params.get("num_frames", 81)),
                guidance_scale=params.get("cfg_scale", 4.0),
                guidance_scale_2=3.0,
                num_inference_steps=params.get("steps", 40),
                generator=torch.Generator("cuda").manual_seed(seed),
            ).frames[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            self._update_db(job_id, "processing", 75, "Encoding and uploading video...")
            output_url = self._encode_and_upload(job_id, frames)

            self._update_db(
                job_id,
                "completed",
                100,
                "Video generated!",
                output_url=output_url,
                processing_time_ms=int(generation_time * 1000)
            )

            return {
                "status": "success",
                "job_id": job_id,
                "output_url": output_url,
                "generation_time_seconds": generation_time
            }

        except Exception as e:
            self._update_db(job_id, "failed", 0, f"Error: {str(e)}")
            return {"status": "error", "message": str(e)}

    @modal.fastapi_endpoint(method="POST")
    def generate_img2video(self, request: dict):
        """Generate video from image using Wan2.2 I2V-A14B"""
        import torch
        import os
        import numpy as np
        from PIL import Image
        import requests
        from io import BytesIO

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        image_url = request["image_url"]
        params = request.get("parameters", {})

        try:
            # Download source image
            self._update_db(job_id, "processing", 5, "Downloading source image...")
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            source_image = Image.open(BytesIO(response.content)).convert("RGB")

            self._update_db(job_id, "processing", 15, "Loading Wan2.2 image-to-video model...")
            pipe = self._load_i2v()

            # Fit the source image into ~480p area, keeping aspect ratio
            max_area = 480 * 832
            aspect_ratio = source_image.height / source_image.width
            mod_value = pipe.vae_scale_factor_spatial * pipe.transformer.config.patch_size[1]
            height = round(np.sqrt(max_area * aspect_ratio)) // mod_value * mod_value
            width = round(np.sqrt(max_area / aspect_ratio)) // mod_value * mod_value
            source_image = source_image.resize((width, height))

            self._update_db(job_id, "processing", 30, "Generating video from image...")
            start_time = datetime.now(timezone.utc)

            seed = params.get("seed")
            if seed is None:
                seed = int.from_bytes(os.urandom(4), "little")

            frames = pipe(
                image=source_image,
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                height=height,
                width=width,
                num_frames=_frames_4k_plus_1(params.get("num_frames", 81)),
                guidance_scale=params.get("cfg_scale", 3.5),
                num_inference_steps=params.get("steps", 40),
                generator=torch.Generator("cuda").manual_seed(seed),
            ).frames[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            self._update_db(job_id, "processing", 75, "Encoding and uploading video...")
            output_url = self._encode_and_upload(job_id, frames)

            self._update_db(
                job_id,
                "completed",
                100,
                "Video generated!",
                output_url=output_url,
                processing_time_ms=int(generation_time * 1000)
            )

            return {
                "status": "success",
                "job_id": job_id,
                "output_url": output_url,
                "generation_time_seconds": generation_time
            }

        except Exception as e:
            self._update_db(job_id, "failed", 0, f"Error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def _update_db(self, job_id, status, progress, message, output_url=None, processing_time_ms=None):
        """Update generation status in database (or skip if record doesn't exist)"""
        import psycopg2
        import os

        try:
            conn = psycopg2.connect(os.environ["DATABASE_URL"])
            cur = conn.cursor()

            query = """
                UPDATE generations
                SET status = %s, progress = %s, progress_message = %s
            """
            params = [status, progress, message]

            # If status is failed, also update the error column
            if status == "failed":
                query += ', error = %s'
                params.append(message)

            if output_url:
                query += ', output_url = %s'
                params.append(output_url)

            if processing_time_ms:
                query += ', processing_time_ms = %s, completed_at = NOW()'
                params.append(processing_time_ms)

            query += " WHERE id = %s"
            params.append(job_id)

            cur.execute(query, params)
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            # Silently skip DB updates for test job IDs that don't exist
            print(f"DB update skipped for job {job_id}: {str(e)}")

@app.function()
def health():
    return {
        "status": "healthy",
        "service": "video-generation",
        "models": {"text2video": T2V_MODEL_ID, "img2video": I2V_MODEL_ID},
    }

@app.function(
    gpu="H100",
    image=modal.Image.debian_slim(python_version="3.11").pip_install("torch==2.8.0")
)
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
