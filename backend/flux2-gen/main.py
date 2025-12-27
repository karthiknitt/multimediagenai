import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("flux2-generation")
volume = modal.Volume.from_name("flux2-models", create_if_missing=True)

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")
hf_secret = modal.Secret.from_name("hf-token")

@app.cls(
    gpu="H100",  # H100 80GB, may upgrade to H200 141GB automatically
    timeout=300,  # 5 min max
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret, hf_secret],
    image=modal.Image.debian_slim(python_version="3.11").apt_install("git").pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "git+https://github.com/huggingface/transformers.git",  # Latest with Mistral3
        "accelerate==1.2.1",
        "sentencepiece==0.2.0",
        "protobuf==5.29.2",
        "boto3==1.35.80",
        "psycopg2-binary==2.9.10",
        "fastapi==0.115.6",
        "Pillow==12.0.0",
        "bitsandbytes>=0.46.1",
        "huggingface_hub>=0.21.0",
        "requests==2.32.3",
        "git+https://github.com/huggingface/diffusers.git"  # Latest with Flux2Pipeline
    )
)
class Flux2Generator:
    @modal.enter()
    def setup(self):
        """Initialize model placeholder - lazy load on first use"""
        self.pipe = None

    def _load_flux2(self):
        """Lazy load FLUX.2 [dev] on H100 GPU with optimized memory"""
        if self.pipe is None:
            from diffusers import Flux2Pipeline
            import torch
            import os

            print("Loading FLUX.2 [dev] on H100 with memory optimization...")

            # Load with memory optimizations
            repo_id = "black-forest-labs/FLUX.2-dev"
            torch_dtype = torch.bfloat16

            print("Building pipeline with CPU offloading...")
            self.pipe = Flux2Pipeline.from_pretrained(
                repo_id,
                torch_dtype=torch_dtype,
                cache_dir="/models",
                token=os.environ.get("HF_TOKEN")
            )

            # Use model CPU offloading to save VRAM
            # This moves model components to CPU when not in use
            self.pipe.enable_model_cpu_offload()

            # Enable memory efficient attention
            self.pipe.enable_attention_slicing(1)

            print("FLUX.2 loaded successfully with memory optimizations!")
        return self.pipe

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: dict):
        """Generate image from text prompt using FLUX.2 [dev] with 4-bit quantization"""
        import torch
        import os
        from datetime import datetime, timezone
        import boto3
        import psycopg2
        from PIL import Image

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            # Load FLUX.2 model
            self._update_db(job_id, "processing", 10, "Loading FLUX.2 model...")
            pipe = self._load_flux2()

            # Update DB: generating
            self._update_db(job_id, "processing", 30, "Generating image...")

            # Generate image
            start_time = datetime.now(timezone.utc)

            image = pipe(
                prompt=prompt,
                height=params.get("height", 1024),
                width=params.get("width", 1024),
                num_inference_steps=params.get("steps", 28),  # 28 is recommended trade-off
                guidance_scale=params.get("cfg_scale", 4.0),  # 4 is recommended
                generator=torch.manual_seed(params.get("seed", 42))
            ).images[0]

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Uploading image...")

            # Save image locally
            output_path = f"/tmp/{job_id}.png"
            image.save(output_path, format="PNG")

            # Upload to R2
            s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
            )

            bucket_name = os.environ["R2_BUCKET_NAME"]
            # Organize by type and date: images/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"images/{date_folder}/{job_id}.png"
            s3_client.upload_file(
                output_path,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'image/png'}
            )

            # Generate public URL
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
    return {
        "status": "healthy",
        "service": "flux2-generation",
        "model": "FLUX.2-dev (H100)",
        "gpu": "H100 80GB (may auto-upgrade to H200 141GB)"
    }

@app.function(gpu="H100")
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
