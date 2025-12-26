import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("audio-generation")
volume = modal.Volume.from_name("audio-models", create_if_missing=True)

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")

@app.cls(
    gpu="L40S",  # CHEAPER GPU! ($1.20/hr vs $2.50/hr)
    timeout=300,  # 5 min max
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],
    image=modal.Image.debian_slim(python_version="3.11").pip_install(
        "torch==2.5.1",
        "transformers==4.46.3",
        "scipy==1.14.1",
        "boto3==1.35.80",
        "psycopg2-binary==2.9.10",
        "fastapi==0.115.6"
    )
)
class AudioGenerator:
    @modal.enter()
    def setup(self):
        """Initialize model placeholders - lazy load on first use"""
        self.model = None
        self.processor = None

    def _load_musicgen(self):
        """Lazy load MusicGen model"""
        if self.model is None:
            from transformers import MusicgenForConditionalGeneration, AutoProcessor
            import torch

            print("Loading MusicGen...")
            self.model = MusicgenForConditionalGeneration.from_pretrained(
                "facebook/musicgen-large",
                torch_dtype=torch.float16,
                cache_dir="/models"
            )
            self.model.to("cuda")

            self.processor = AutoProcessor.from_pretrained(
                "facebook/musicgen-large",
                cache_dir="/models"
            )
            print("MusicGen loaded successfully!")
        return self.model, self.processor

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: dict):
        """Generate audio from text prompt"""
        import torch
        import os
        from datetime import datetime, timezone
        import boto3
        import psycopg2
        from scipy.io.wavfile import write as write_wav
        import numpy as np

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            # Load MusicGen model
            self._update_db(job_id, "processing", 10, "Loading MusicGen model...")
            model, processor = self._load_musicgen()

            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating audio...")

            # Generate audio
            start_time = datetime.now(timezone.utc)

            inputs = processor(
                text=[prompt],
                padding=True,
                return_tensors="pt",
            ).to("cuda")

            duration = params.get("duration", 30)  # seconds
            audio_values = model.generate(
                **inputs,
                max_new_tokens=int(duration * 50),  # 50 tokens per second
                do_sample=True,
                guidance_scale=params.get("guidance_scale", 3.0),
            )

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Uploading audio...")

            # Save audio locally
            output_path = f"/tmp/{job_id}.wav"
            sampling_rate = model.config.audio_encoder.sampling_rate
            # Convert from float16/float32 to int16 for WAV format
            audio_np = audio_values[0, 0].cpu().float().numpy()  # Convert to float32 first
            audio_int16 = (audio_np * 32767).astype(np.int16)
            write_wav(output_path, sampling_rate, audio_int16)

            # Upload to R2
            s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{os.environ["R2_ACCOUNT_ID"]}.r2.cloudflarestorage.com',
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"]
            )

            bucket_name = os.environ["R2_BUCKET_NAME"]
            # Organize by type and date: audio/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"audio/{date_folder}/{job_id}.wav"
            s3_client.upload_file(
                output_path,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': 'audio/wav'}
            )

            # Generate public URL
            output_url = f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev/{s3_key}"

            # Update DB: completed
            self._update_db(
                job_id,
                "completed",
                100,
                "Audio generated!",
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
        except Exception as e:
            # Silently skip DB updates for test job IDs that don't exist
            print(f"DB update skipped for job {job_id}: {str(e)}")

@app.function()
def health():
    return {"status": "healthy", "service": "audio-generation"}

@app.function(gpu="L40S")
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
