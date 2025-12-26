import modal
import os
import io
import time
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Modal app and volume setup
app = modal.App("tts-generation")
tts_volume = modal.Volume.from_name("tts-models", create_if_missing=True)

# Docker image with F5-TTS dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .env({"PYTHONIOENCODING": "utf-8", "LC_ALL": "C.UTF-8", "LANG": "C.UTF-8"})
    .apt_install("git", "ffmpeg")
    .pip_install(
        "torch>=2.0.0",
        "torchaudio",
        "transformers",
        "accelerate",
        "psycopg2-binary",
        "boto3",
        "python-dotenv",
        "numpy",
        "scipy",
        "soundfile",
        "cached-path",
        extra_options="--no-color --disable-pip-version-check",
    )
    .run_commands(
        "export PIP_NO_COLOR=1 && pip install --no-color --disable-pip-version-check git+https://github.com/SWivid/F5-TTS.git",
    )
)

# Pydantic models for request/response
class TTSRequest(BaseModel):
    job_id: str
    text: str  # max 500 chars for ~30s audio
    voice_reference_url: Optional[str] = None
    language: str = "en"
    speed: float = 1.0
    emotion: Optional[str] = None

class TTSResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None
    error: Optional[str] = None
    processing_time_ms: int


@app.function(
    image=image,
    volumes={"/models": tts_volume},
    timeout=300,
)
def download_models():
    """Download F5-TTS models to Modal Volume"""
    import torch
    from f5_tts.api import F5TTS

    print("Downloading F5-TTS models...")

    # Initialize F5-TTS (this will download models)
    model = F5TTS(
        model="F5TTS_v1_Base",
        ckpt_file="",
        vocab_file="",
        device="cpu",  # Download on CPU, we'll use GPU for inference
    )

    print("F5-TTS models downloaded successfully!")
    return True


@app.cls(
    image=image,
    gpu="A10G",
    timeout=300,
    scaledown_window=180,
    volumes={"/models": tts_volume},
    memory=16384,
    secrets=[
        modal.Secret.from_name("database-credentials"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
class TTSGenerator:
    def __init__(self):
        """Initialize TTS model on container startup"""
        import torch
        from f5_tts.api import F5TTS
        import boto3
        from botocore.client import Config

        print("Initializing F5-TTS model...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Initialize F5-TTS
        self.tts_model = F5TTS(
            model="F5TTS_v1_Base",
            ckpt_file="",
            vocab_file="",
            device=self.device,
        )

        # Database connection URL
        self.database_url = os.environ["DATABASE_URL"]

        # R2 credentials
        self.r2_client = boto3.client(
            's3',
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
            config=Config(signature_version='s3v4'),
            region_name='auto',
        )
        self.r2_bucket = os.environ['R2_BUCKET_NAME']

        print(f"F5-TTS initialized on {self.device}")

    def update_db_status(self, job_id: str, status: str, progress: int = 0, error: str = None, output_url: str = None, processing_time_ms: int = None):
        """Update generation status in database"""
        import psycopg2
        try:
            conn = psycopg2.connect(self.database_url)
            cur = conn.cursor()

            if status == "processing":
                # Update progress
                cur.execute(
                    "UPDATE generations SET status = %s, progress = %s WHERE id = %s",
                    (status, progress, job_id)
                )
            elif status == "completed":
                # Update completion with URL
                cur.execute(
                    """UPDATE generations
                       SET status = %s, output_url = %s, processing_time_ms = %s, completed_at = NOW()
                       WHERE id = %s""",
                    (status, output_url, processing_time_ms, job_id)
                )
            elif status == "failed":
                # Update failure with error
                cur.execute(
                    "UPDATE generations SET status = %s, error = %s WHERE id = %s",
                    (status, error, job_id)
                )

            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Database update error: {e}")

    def upload_to_r2(self, audio_data: bytes, job_id: str) -> str:
        """Upload audio to R2 and return public URL"""
        try:
            # Create date-based path (audio folder with speech prefix)
            from datetime import timezone
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            key = f"audio/{date_str}/speech-{job_id}.wav"

            # Upload to R2
            self.r2_client.put_object(
                Bucket=self.r2_bucket,
                Key=key,
                Body=audio_data,
                ContentType='audio/wav',
            )

            # Generate public URL
            public_url = f"https://pub-{os.environ.get('R2_PUBLIC_DOMAIN', 'example.com')}/{key}"

            return public_url
        except Exception as e:
            print(f"R2 upload error: {e}")
            raise

    def generate_speech(
        self,
        text: str,
        voice_reference_url: Optional[str] = None,
        language: str = "en",
        speed: float = 1.0,
    ) -> bytes:
        """Generate speech using F5-TTS"""
        import soundfile as sf
        import numpy as np

        # Preprocess text
        text = text.strip()
        if len(text) > 500:
            text = text[:500]

        # Generate speech
        # F5-TTS requires reference audio - use example audio from package
        # If voice_reference_url is provided, download and use it for cloning
        if voice_reference_url:
            # TODO: Download reference audio from URL
            # For now, use default voice
            ref_file = "/usr/local/lib/python3.11/site-packages/f5_tts/infer/examples/basic/basic_ref_en.wav"
            ref_text = ""  # Empty string means auto-transcribe
        else:
            # Use default reference audio from F5-TTS examples
            ref_file = "/usr/local/lib/python3.11/site-packages/f5_tts/infer/examples/basic/basic_ref_en.wav"
            ref_text = ""  # Empty string means auto-transcribe

        # Generate with F5-TTS
        audio_array, sample_rate, spectrogram = self.tts_model.infer(
            ref_file=ref_file,
            ref_text=ref_text,
            gen_text=text,
            speed=speed,
        )

        # Convert to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sample_rate, format='WAV')
        buffer.seek(0)

        return buffer.read()

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request: TTSRequest) -> TTSResponse:
        """Main TTS generation endpoint"""
        start_time = time.time()

        try:
            # Update status to processing (0%)
            self.update_db_status(request.job_id, "processing", progress=0)

            # Generate speech
            audio_data = self.generate_speech(
                text=request.text,
                voice_reference_url=request.voice_reference_url,
                language=request.language,
                speed=request.speed,
            )

            # Update progress (50%)
            self.update_db_status(request.job_id, "processing", progress=50)

            # Upload to R2
            output_url = self.upload_to_r2(audio_data, request.job_id)

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Update status to completed (100%)
            self.update_db_status(
                request.job_id,
                "completed",
                output_url=output_url,
                processing_time_ms=processing_time_ms
            )

            return TTSResponse(
                job_id=request.job_id,
                status="completed",
                output_url=output_url,
                processing_time_ms=processing_time_ms
            )

        except Exception as e:
            error_msg = str(e)
            print(f"TTS generation error: {error_msg}")

            # Update status to failed
            self.update_db_status(request.job_id, "failed", error=error_msg)

            return TTSResponse(
                job_id=request.job_id,
                status="failed",
                error=error_msg,
                processing_time_ms=int((time.time() - start_time) * 1000)
            )


@app.local_entrypoint()
def main():
    """Local test entrypoint"""
    # Download models
    download_models.remote()

    # Test generation
    generator = TTSGenerator()
    test_request = TTSRequest(
        job_id="test-001",
        text="Hello, this is a test of the F5-TTS text to speech system.",
        language="en",
        speed=1.0,
    )

    result = generator.generate.remote(test_request)
    print(f"Test result: {result}")
