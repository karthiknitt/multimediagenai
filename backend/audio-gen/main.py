import modal
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Modal setup
app = modal.App("audio-generation")
volume = modal.Volume.from_name("acestep-models", create_if_missing=True)

# ACE-Step 1.5 (MIT) - open-source music generation model
MODEL_REPO = "ACE-Step/Ace-Step1.5"
ACESTEP_COMMIT = "ca1e85fe9430179831e6bc6be790c332190a3866"
DIT_CONFIG = "acestep-v15-turbo"      # 8-step turbo DiT
LM_MODEL = "acestep-5Hz-lm-1.7B"     # 5Hz language-model planner
PROJECT_ROOT = "/models/ace"          # checkpoints live in {PROJECT_ROOT}/checkpoints

# Secrets
r2_secret = modal.Secret.from_name("r2-credentials")
db_secret = modal.Secret.from_name("database-credentials")

audio_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libsndfile1", "build-essential")
    .pip_install("uv", "boto3==1.35.80", "psycopg2-binary==2.9.10", "huggingface_hub>=0.34.0")
    .run_commands(
        "git clone https://github.com/ace-step/ACE-Step-1.5.git /opt/ace-step",
        f"cd /opt/ace-step && git checkout {ACESTEP_COMMIT}",
        # Install the locked dependency set straight into the system python
        "cd /opt/ace-step && UV_PROJECT_ENVIRONMENT=/usr/local uv sync --frozen --inexact --no-dev",
    )
    .env({"PYTHONPATH": "/opt/ace-step"})
)


@app.function(
    image=audio_image,
    volumes={"/models": volume},
    timeout=1800,
)
def download_models():
    """Download ACE-Step 1.5 checkpoints to the Modal volume (run once)"""
    from huggingface_hub import snapshot_download

    print(f"Downloading {MODEL_REPO}...")
    snapshot_download(
        MODEL_REPO,
        local_dir=f"{PROJECT_ROOT}/checkpoints",
    )
    volume.commit()
    print("ACE-Step checkpoints downloaded")
    return True


@app.cls(
    gpu="L40S",  # ACE-Step 1.5 runs in <20GB VRAM
    timeout=600,
    scaledown_window=300,  # Keep warm 5 min
    volumes={"/models": volume},
    secrets=[r2_secret, db_secret],
    image=audio_image,
)
class AudioGenerator:
    @modal.enter()
    def setup(self):
        """Initialize model placeholders - lazy load on first use"""
        self.dit_handler = None
        self.llm_handler = None
        self.llm_ready = False

    def _load_acestep(self):
        """Lazy load the ACE-Step 1.5 DiT (+ optional 5Hz LM planner)"""
        if self.dit_handler is None:
            from acestep.handler import AceStepHandler
            from acestep.llm_inference import LLMHandler

            print("Loading ACE-Step 1.5...")
            dit_handler = AceStepHandler()
            status, ok = dit_handler.initialize_service(
                project_root=PROJECT_ROOT,
                config_path=DIT_CONFIG,
                device="cuda",
            )
            print(status)
            if not ok:
                raise RuntimeError(f"ACE-Step DiT failed to initialize: {status}")

            llm_handler = LLMHandler()
            try:
                status, ok = llm_handler.initialize(
                    checkpoint_dir=f"{PROJECT_ROOT}/checkpoints",
                    lm_model_path=LM_MODEL,
                    backend="pt",
                    device="cuda",
                )
                print(status)
                self.llm_ready = bool(ok)
            except Exception as e:
                # The LM only improves prompt planning - generation works without it
                print(f"LM planner unavailable, continuing without it: {e}")
                self.llm_ready = False

            self.dit_handler = dit_handler
            self.llm_handler = llm_handler
            print("ACE-Step 1.5 loaded successfully!")
        return self.dit_handler, self.llm_handler

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate(self, request: dict):
        """Generate audio from text prompt"""
        import os
        from datetime import datetime, timezone
        import boto3
        from acestep.inference import GenerationParams, GenerationConfig, generate_music

        # Parse request
        job_id = request["job_id"]
        prompt = request["prompt"]
        params = request.get("parameters", {})

        try:
            # Load ACE-Step
            self._update_db(job_id, "processing", 10, "Loading ACE-Step 1.5 model...")
            dit_handler, llm_handler = self._load_acestep()

            # Update DB: processing
            self._update_db(job_id, "processing", 25, "Generating music...")

            # Generate audio
            start_time = datetime.now(timezone.utc)

            duration = float(params.get("duration", 30))  # seconds
            seed = params.get("seed")
            lyrics = params.get("lyrics") or ""

            gen_params = GenerationParams(
                caption=prompt,
                lyrics=lyrics if lyrics else "[Instrumental]",
                instrumental=not lyrics,
                duration=duration,
                inference_steps=8,  # turbo model: 8 steps, CFG not used
                seed=int(seed) if seed is not None else -1,
                thinking=self.llm_ready,  # let the 5Hz LM plan the song when available
            )
            gen_config = GenerationConfig(
                batch_size=1,
                use_random_seed=seed is None,
                audio_format="wav",
            )

            out_dir = f"/tmp/{job_id}"
            os.makedirs(out_dir, exist_ok=True)
            result = generate_music(
                dit_handler, llm_handler, gen_params, gen_config, save_dir=out_dir
            )
            if not result.success or not result.audios:
                raise RuntimeError(result.error or "ACE-Step produced no audio")

            generation_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Update DB: uploading
            self._update_db(job_id, "processing", 75, "Uploading audio...")

            output_path = result.audios[0]["path"]

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
            public_base = os.environ.get("R2_PUBLIC_URL") or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
            output_url = f"{public_base}/{s3_key}"

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
                SET status = %s, progress = %s, progress_message = %s
            """
            params = [status, progress, message]

            # If status is failed, also update the error column
            if status == "failed":
                query = """
                    UPDATE generations
                    SET status = %s, progress = %s, progress_message = %s, error = %s
                """
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
    return {"status": "healthy", "service": "audio-generation", "model": MODEL_REPO}

@app.function(gpu="L40S", image=audio_image)
def gpu_info():
    import torch
    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda
    }
