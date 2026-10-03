import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("image-generation")
volume = modal.Volume.from_name("zimage-models", create_if_missing=True)

MODEL_ID = "Tongyi-MAI/Z-Image-Turbo"

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch==2.8.0",
    "torchvision==0.23.0",
    "diffusers==0.36.0",
    "transformers==4.57.3",
    "accelerate==1.12.0",
    "sentencepiece==0.2.0",
    "protobuf==5.29.2",
    "boto3==1.35.80",
    "psycopg2-binary==2.9.10",
    "fastapi==0.115.6",
    "huggingface_hub>=0.34.0",
)


@app.function(
    image=image,
    volumes={"/models": volume},
    timeout=1800,
)
def download_models():
    """Download Z-Image-Turbo to the Modal volume (run once)"""
    from huggingface_hub import snapshot_download

    print(f"Downloading {MODEL_ID}...")
    snapshot_download(MODEL_ID, cache_dir="/models")
    volume.commit()
    print("Z-Image-Turbo downloaded")
    return True


@app.cls(
    gpu="L40S",  # Z-Image-Turbo is 6B: ~25GB with bf16 + text encoder, fits 48GB
    timeout=300,  # 5 min max for images
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],  # Z-Image-Turbo is public: no HF token needed
    image=image,
)
class ImageGenerator:
    @modal.enter()
    def load_model(self):
        """Load Z-Image-Turbo once on container start"""
        from diffusers import ZImagePipeline
        import torch

        print(f"Loading {MODEL_ID}...")
        self.pipe = ZImagePipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
            cache_dir="/models",
        )
        self.pipe.to("cuda")
        print("Z-Image-Turbo loaded successfully!")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: dict):
        """Generate image from text prompt"""
        import torch
        import os
        from datetime import datetime, timezone
        import boto3
        import psycopg2

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating image with Z-Image-Turbo...")

            # Generate image
            start_time = datetime.now(timezone.utc)

            # Z-Image-Turbo is a distilled 8-NFE model: 9 steps = 8 DiT forwards,
            # and guidance MUST be 0 (cfg_scale from the UI is intentionally ignored).
            seed = params.get("seed")
            if seed is None:
                seed = int.from_bytes(os.urandom(4), "little")
            steps = min(int(params.get("steps") or 9), 12)

            image = self.pipe(
                prompt=prompt,
                width=params.get("width", 1024),
                height=params.get("height", 1024),
                num_inference_steps=steps,
                guidance_scale=0.0,
                generator=torch.Generator("cuda").manual_seed(seed)
            ).images[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Uploading to R2...")

            # Save locally
            output_path = f"/tmp/{job_id}.png"
            image.save(output_path)

            # Upload to R2
            s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
            )

            # Organize by type and date: images/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"images/{date_folder}/{job_id}.png"
            s3_client.upload_file(
                output_path,
                os.environ["R2_BUCKET_NAME"],
                s3_key
            )

            output_url = f"{os.environ['R2_PUBLIC_URL']}/{s3_key}"

            # Update DB: completed
            self._update_db(
                job_id,
                "completed",
                100,
                "Image generated!",
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
    return {"status": "healthy", "service": "image-generation", "model": MODEL_ID}

@app.function(gpu="L40S")
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
