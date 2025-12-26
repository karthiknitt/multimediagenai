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
    timeout=900,  # 15 min max for videos
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],
    image=modal.Image.debian_slim(python_version="3.11").pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "diffusers==0.32.1",
        "transformers==4.46.3",
        "accelerate==1.2.1",
        "imageio[ffmpeg]==2.36.1",
        "boto3==1.35.80",
        "psycopg2-binary==2.9.10",
        "fastapi==0.115.6",
        "Pillow==12.0.0"
    )
)
class VideoGenerator:
    @modal.enter()
    def load_models(self):
        """Load Mochi and CogVideoX models on container start"""
        from diffusers import MochiPipeline, CogVideoXImageToVideoPipeline
        import torch

        print("Loading Mochi for text-to-video...")
        self.mochi = MochiPipeline.from_pretrained(
            "genmo/mochi-1-preview",
            torch_dtype=torch.bfloat16,
            cache_dir="/models"
        )
        self.mochi.to("cuda")
        print("Mochi loaded successfully!")

        print("Loading CogVideoX for image-to-video...")
        self.cogvideox = CogVideoXImageToVideoPipeline.from_pretrained(
            "THUDM/CogVideoX-5b-I2V",
            torch_dtype=torch.bfloat16,
            cache_dir="/models"
        )
        self.cogvideox.to("cuda")
        print("CogVideoX loaded successfully!")

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
            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating video frames...")

            # Generate video
            start_time = datetime.now(timezone.utc)

            video_frames = self.mochi(
                prompt=prompt,
                num_frames=params.get("num_frames", 162),
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

            s3_key = f"generations/{job_id}.mp4"
            s3_client.upload_file(
                output_path,
                os.environ["R2_BUCKET_NAME"],
                s3_key
            )

            output_url = f"https://{os.environ['R2_PUBLIC_URL']}/{s3_key}"

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
            self._update_db(job_id, "processing", 10, "Downloading source image...")
            response = requests.get(image_url)
            source_image = Image.open(BytesIO(response.content))

            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating video from image...")

            # Generate video
            start_time = datetime.now(timezone.utc)

            video_frames = self.cogvideox(
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

            s3_key = f"generations/{job_id}.mp4"
            s3_client.upload_file(
                output_path,
                os.environ["R2_BUCKET_NAME"],
                s3_key
            )

            output_url = f"https://{os.environ['R2_PUBLIC_URL']}/{s3_key}"

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
        """Update generation status in database"""
        import psycopg2
        import os

        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()

        query = """
            UPDATE generations
            SET status = %s, progress = %s, "progressMessage" = %s
        """
        params = [status, progress, message]

        if output_url:
            query += ', "outputUrl" = %s'
            params.append(output_url)

        if processing_time_ms:
            query += ', "processingTimeMs" = %s, "completedAt" = NOW()'
            params.append(processing_time_ms)

        query += " WHERE id = %s"
        params.append(job_id)

        cur.execute(query, params)
        conn.commit()
        cur.close()
        conn.close()

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
