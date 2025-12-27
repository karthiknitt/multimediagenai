import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("video-generation")
volume = modal.Volume.from_name("video-models", create_if_missing=True)

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")

@app.cls(
    gpu="A100-80GB",
    timeout=3600,  # 60 min max for videos (Mochi needs ~50-60 min for 162 frames)
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],
    image=modal.Image.debian_slim(python_version="3.11").pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "diffusers==0.32.1",
        "transformers==4.46.3",
        "accelerate==1.2.1",
        "sentencepiece==0.2.0",
        "protobuf==5.29.2",
        "imageio[ffmpeg]==2.36.1",
        "boto3==1.35.80",
        "psycopg2-binary==2.9.10",
        "fastapi==0.115.6",
        "Pillow==12.0.0"
    )
)
class VideoGenerator:
    @modal.enter()
    def setup(self):
        """Initialize model placeholders - lazy load on first use"""
        self.mochi = None
        self.cogvideox = None

    def _load_mochi(self):
        """Lazy load Mochi model for text-to-video"""
        if self.mochi is None:
            from diffusers import MochiPipeline
            import torch

            print("Loading Mochi for text-to-video...")
            self.mochi = MochiPipeline.from_pretrained(
                "genmo/mochi-1-preview",
                torch_dtype=torch.bfloat16,
                cache_dir="/models"
            )
            self.mochi.to("cuda")
            print("Mochi loaded successfully!")
        return self.mochi

    def _load_cogvideox(self):
        """Lazy load CogVideoX model for image-to-video"""
        if self.cogvideox is None:
            from diffusers import CogVideoXImageToVideoPipeline
            import torch

            print("Loading CogVideoX for image-to-video...")
            self.cogvideox = CogVideoXImageToVideoPipeline.from_pretrained(
                "THUDM/CogVideoX-5b-I2V",
                torch_dtype=torch.bfloat16,
                cache_dir="/models"
            )
            self.cogvideox.to("cuda")
            print("CogVideoX loaded successfully!")
        return self.cogvideox

    @modal.fastapi_endpoint(method="POST")
    def generate_text2video(self, request: dict):
        """Generate video from text prompt using Mochi"""
        import torch
        import os
        from datetime import datetime, timezone
        import boto3
        import psycopg2
        import imageio

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            # Load Mochi model
            self._update_db(job_id, "processing", 10, "Loading Mochi model...")
            mochi = self._load_mochi()

            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating video frames...")

            # Generate video
            start_time = datetime.now(timezone.utc)

            video_frames = mochi(
                prompt=prompt,
                num_frames=params.get("num_frames", 64),  # 64 frames = ~2 sec @ 30fps, ~20 min generation
                guidance_scale=params.get("cfg_scale", 7.5),
                generator=torch.manual_seed(params.get("seed", 42))
            ).frames[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Encoding and uploading video...")

            # Save video locally
            output_path = f"/tmp/{job_id}.mp4"
            imageio.mimsave(output_path, video_frames, fps=30)

            # Upload to R2
            s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
            )

            bucket_name = os.environ["R2_BUCKET_NAME"]
            # Organize by type and date: videos/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"videos/{date_folder}/{job_id}.mp4"
            s3_client.upload_file(
                output_path,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )

            # Generate public URL
            output_url = f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev/{s3_key}"

            # Update DB: completed
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
            # Update DB: failed
            self._update_db(job_id, "failed", 0, f"Error: {str(e)}")
            return {"status": "error", "message": str(e)}

    @modal.fastapi_endpoint(method="POST")
    def generate_img2video(self, request: dict):
        """Generate video from image using CogVideoX"""
        import torch
        import os
        from datetime import datetime, timezone
        import boto3
        import psycopg2
        import imageio
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
            response = requests.get(image_url)
            response.raise_for_status()
            source_image = Image.open(BytesIO(response.content)).convert("RGB")

            # Load CogVideoX model
            self._update_db(job_id, "processing", 15, "Loading CogVideoX model...")
            cogvideox = self._load_cogvideox()

            # Update DB: processing
            self._update_db(job_id, "processing", 30, "Generating video from image...")

            # Generate video
            start_time = datetime.now(timezone.utc)

            video_frames = cogvideox(
                prompt=prompt,
                image=source_image,
                num_frames=params.get("num_frames", 49),
                guidance_scale=params.get("cfg_scale", 6.0),
                generator=torch.manual_seed(params.get("seed", 42))
            ).frames[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Encoding and uploading video...")

            # Save video locally
            output_path = f"/tmp/{job_id}.mp4"
            imageio.mimsave(output_path, video_frames, fps=8)

            # Upload to R2
            s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
            )

            bucket_name = os.environ["R2_BUCKET_NAME"]
            # Organize by type and date: videos/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"videos/{date_folder}/{job_id}.mp4"
            s3_client.upload_file(
                output_path,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )

            # Generate public URL
            output_url = f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev/{s3_key}"

            # Update DB: completed
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
            # Update DB: failed
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
    return {"status": "healthy", "service": "video-generation"}

@app.function(gpu="A100-80GB")
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
