import io
import logging
import os
import tempfile
import time

import modal
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional

logger = logging.getLogger(__name__)

# Modal app and volume setup
app = modal.App("tts-generation")
tts_volume = modal.Volume.from_name("qwen3tts-models", create_if_missing=True)

# Qwen3-TTS (Apache-2.0): CustomVoice = 9 premium preset speakers,
# Base = 3-second voice cloning from a reference clip.
CUSTOM_VOICE_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
CLONE_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"

# Docker image with Qwen3-TTS dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .env(
        {
            "PYTHONIOENCODING": "utf-8",
            "LC_ALL": "C.UTF-8",
            "LANG": "C.UTF-8",
            "HF_HOME": "/models/hf",  # model weights cached on the Modal volume
        }
    )
    .apt_install("git", "ffmpeg", "sox", "libsox-fmt-all", "libsndfile1")
    .pip_install(
        "torch==2.8.0",
        "torchaudio==2.8.0",
        "qwen-tts==0.1.1",  # pins transformers==4.57.3 / accelerate==1.12.0
        "psycopg2-binary",
        "boto3",
        "requests",
        "numpy",
        "scipy",
        "soundfile",
        "librosa",
        "fastapi[standard]",
        "huggingface_hub>=0.34.0",
    )
)

# Voice preset definitions (Qwen3-TTS CustomVoice speakers)
VOICE_PRESETS = {
    "ryan": {
        "speaker": "Ryan",
        "language": "en",
        "description": "Dynamic male voice with strong rhythmic drive",
    },
    "aiden": {
        "speaker": "Aiden",
        "language": "en",
        "description": "Sunny American male voice with a clear midrange",
    },
    "vivian": {
        "speaker": "Vivian",
        "language": "zh",
        "description": "Bright, slightly edgy young female voice",
    },
    "serena": {
        "speaker": "Serena",
        "language": "zh",
        "description": "Warm, gentle young female voice",
    },
    "uncle_fu": {
        "speaker": "Uncle_Fu",
        "language": "zh",
        "description": "Seasoned male voice with a low, mellow timbre",
    },
    "dylan": {
        "speaker": "Dylan",
        "language": "zh",
        "description": "Youthful Beijing male voice (Beijing dialect)",
    },
    "eric": {
        "speaker": "Eric",
        "language": "zh",
        "description": "Lively Chengdu male voice (Sichuan dialect)",
    },
    "ono_anna": {
        "speaker": "Ono_Anna",
        "language": "ja",
        "description": "Playful Japanese female voice",
    },
    "sohee": {
        "speaker": "Sohee",
        "language": "ko",
        "description": "Warm Korean female voice with rich emotion",
    },
}
DEFAULT_PRESET = "ryan"

# ISO code -> Qwen3-TTS language name
LANGUAGES = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "de": "German",
    "fr": "French",
    "ru": "Russian",
    "pt": "Portuguese",
    "es": "Spanish",
    "it": "Italian",
}


# Pydantic models for request/response
@dataclass
class TTSRequest:
    job_id: str
    text: str  # max 500 chars for ~30s audio
    voice_reference_url: Optional[str] = None
    voice_preset: Optional[str] = None  # Key from VOICE_PRESETS
    language: str = "en"
    speed: float = 1.0
    emotion: Optional[str] = None  # free-text style instruction, e.g. "Very happy."


@dataclass
class TTSResponse:
    job_id: str
    status: str
    processing_time_ms: int
    output_url: Optional[str] = None
    error: Optional[str] = None


MAX_FETCH_BYTES = 10 * 1024 * 1024


def assert_r2_url(url: str) -> None:
    """Only fetch user-supplied URLs from our own R2 public origin (blocks SSRF)."""
    import os
    from urllib.parse import urlsplit

    base = os.environ.get("R2_PUBLIC_URL") or (
        f"https://pub-{os.environ.get('R2_ACCOUNT_ID', '')}.r2.dev"
    )

    def origin(u: str):
        p = urlsplit(u)
        return (p.scheme, p.hostname, p.port or 443), p

    try:
        got, parts = origin(url)
        want, _ = origin(base)
    except ValueError as e:
        raise ValueError(f"Invalid URL: {e}") from e
    if got != want or parts.scheme != "https" or parts.username or parts.password:
        raise ValueError("URL must point to this project's R2 storage")


def fetch_r2_bytes(url: str, timeout: int = 30) -> bytes:
    """Download a file from R2 with origin check, no redirects and a size cap."""
    import requests

    assert_r2_url(url)
    with requests.get(url, timeout=timeout, stream=True, allow_redirects=False) as r:
        r.raise_for_status()
        data = bytearray()
        for chunk in r.iter_content(1 << 20):
            data.extend(chunk)
            if len(data) > MAX_FETCH_BYTES:
                raise ValueError("Downloaded file exceeds size limit")
        return bytes(data)


@app.function(
    image=image,
    volumes={"/models": tts_volume},
    timeout=1800,
)
def download_models():
    """Download Qwen3-TTS models to the Modal Volume (run once)"""
    from huggingface_hub import snapshot_download

    for model_id in (CUSTOM_VOICE_MODEL, CLONE_MODEL):
        print(f"Downloading {model_id}...")
        snapshot_download(model_id)

    tts_volume.commit()
    print("Qwen3-TTS models downloaded successfully!")
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
    @modal.enter()
    def setup(self):
        """Initialize clients on container startup; models load lazily on first use"""
        import torch
        import boto3
        from botocore.client import Config

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.custom_model = None
        self.clone_model = None

        # Database connection URL
        self.database_url = os.environ["DATABASE_URL"]

        # R2 credentials
        self.r2_client = boto3.client(
            "s3",
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        self.r2_bucket = os.environ["R2_BUCKET_NAME"]

        print(f"Qwen3-TTS service ready on {self.device}")

    def _load(self, model_id: str):
        import torch
        from qwen_tts import Qwen3TTSModel

        print(f"Loading {model_id}...")
        model = Qwen3TTSModel.from_pretrained(
            model_id,
            device_map="cuda:0" if self.device == "cuda" else "cpu",
            dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
            attn_implementation="sdpa",
        )
        print(f"{model_id} loaded")
        return model

    def _get_custom_model(self):
        if self.custom_model is None:
            self.custom_model = self._load(CUSTOM_VOICE_MODEL)
        return self.custom_model

    def _get_clone_model(self):
        if self.clone_model is None:
            self.clone_model = self._load(CLONE_MODEL)
        return self.clone_model

    def update_db_status(
        self,
        job_id: str,
        status: str,
        progress: int = 0,
        error: str = None,
        output_url: str = None,
        processing_time_ms: int = None,
    ):
        """Best-effort status update: retry once, then log (a status write must not fail the job)"""
        for attempt in (1, 2):
            try:
                self._update_db_status_once(
                    job_id, status, progress, error, output_url, processing_time_ms
                )
                return
            except Exception:
                logger.warning(
                    "DB update failed for job %s (attempt %d)", job_id, attempt, exc_info=True
                )

    def _update_db_status_once(
        self,
        job_id: str,
        status: str,
        progress: int = 0,
        error: str = None,
        output_url: str = None,
        processing_time_ms: int = None,
    ):
        """Update generation status in database (raises on failure)"""
        import psycopg2

        try:
            conn = psycopg2.connect(self.database_url)
            cur = conn.cursor()

            if status == "processing":
                # Update progress
                cur.execute(
                    "UPDATE generations SET status = %s, progress = %s WHERE id = %s",
                    (status, progress, job_id),
                )
            elif status == "completed":
                # Update completion with URL
                cur.execute(
                    """UPDATE generations
                       SET status = %s, output_url = %s, processing_time_ms = %s, completed_at = NOW()
                       WHERE id = %s""",
                    (status, output_url, processing_time_ms, job_id),
                )
            elif status == "failed":
                # Update failure with error
                cur.execute(
                    "UPDATE generations SET status = %s, error = %s WHERE id = %s",
                    (status, error, job_id),
                )

            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            raise

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
                ContentType="audio/wav",
            )

            # Generate public URL
            public_base = (
                os.environ.get("R2_PUBLIC_URL")
                or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
            )
            return f"{public_base}/{key}"
        except Exception as e:
            print(f"R2 upload error: {e}")
            raise

    def generate_speech(
        self,
        text: str,
        voice_reference_url: Optional[str] = None,
        voice_preset: Optional[str] = None,
        language: str = "en",
        speed: float = 1.0,
        emotion: Optional[str] = None,
    ) -> bytes:
        """Generate speech using Qwen3-TTS"""
        import soundfile as sf
        import numpy as np

        # Preprocess text
        text = text.strip()
        if len(text) > 500:
            text = text[:500]

        qwen_language = LANGUAGES.get(language, "Auto")

        # Priority: voice_preset > voice_reference_url (clone) > default preset
        if voice_preset and voice_preset in VOICE_PRESETS:
            preset = VOICE_PRESETS[voice_preset]
            print(f"Using voice preset: {voice_preset}")
            wavs, sample_rate = self._get_custom_model().generate_custom_voice(
                text=text,
                language=qwen_language,
                speaker=preset["speaker"],
                instruct=emotion or "",
            )
        elif voice_reference_url:
            # Download custom reference audio from URL and clone it
            print(f"Downloading custom voice reference from: {voice_reference_url}")
            ref_bytes = fetch_r2_bytes(voice_reference_url, timeout=15)
            with tempfile.NamedTemporaryFile(suffix=".wav") as ref:
                ref.write(ref_bytes)
                ref.flush()

                # No transcript is collected by the UI, so clone from the speaker
                # embedding only (x_vector_only_mode needs no reference text).
                clone = self._get_clone_model()
                prompt_items = clone.create_voice_clone_prompt(
                    ref_audio=ref.name,
                    ref_text=None,
                    x_vector_only_mode=True,
                )
            wavs, sample_rate = clone.generate_voice_clone(
                text=text,
                language=qwen_language,
                voice_clone_prompt=prompt_items,
            )
        else:
            preset = VOICE_PRESETS[DEFAULT_PRESET]
            wavs, sample_rate = self._get_custom_model().generate_custom_voice(
                text=text,
                language=qwen_language,
                speaker=preset["speaker"],
                instruct=emotion or "",
            )

        audio_array = np.asarray(wavs[0], dtype=np.float32)

        # Qwen3-TTS has no native speed control - time-stretch the result
        if abs(speed - 1.0) > 0.01:
            import librosa

            audio_array = librosa.effects.time_stretch(audio_array, rate=float(speed))

        # Convert to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sample_rate, format="WAV")
        buffer.seek(0)

        return buffer.read()

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate(self, payload: dict) -> dict:
        """Main TTS generation endpoint"""
        start_time = time.time()
        request = TTSRequest(
            **{
                k: v
                for k, v in payload.items()
                if k in TTSRequest.__dataclass_fields__ and v is not None
            }
        )

        try:
            # Update status to processing (0%)
            self.update_db_status(request.job_id, "processing", progress=0)

            # Generate speech
            audio_data = self.generate_speech(
                text=request.text,
                voice_reference_url=request.voice_reference_url,
                voice_preset=request.voice_preset,
                language=request.language,
                speed=request.speed,
                emotion=request.emotion,
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
                processing_time_ms=processing_time_ms,
            )

            return asdict(
                TTSResponse(
                    job_id=request.job_id,
                    status="completed",
                    output_url=output_url,
                    processing_time_ms=processing_time_ms,
                )
            )

        except Exception as e:
            logger.exception("TTS generation failed for job %s", request.job_id)
            error_msg = (
                str(e) if isinstance(e, ValueError) else "Generation failed. Please try again."
            )

            # Update status to failed
            self.update_db_status(request.job_id, "failed", error=error_msg)

            return asdict(
                TTSResponse(
                    job_id=request.job_id,
                    status="failed",
                    error=error_msg,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                )
            )


@app.function()
def list_voice_presets():
    """List available voice presets"""
    return {
        "presets": [
            {"id": key, "description": preset["description"], "language": preset["language"]}
            for key, preset in VOICE_PRESETS.items()
        ]
    }


@app.local_entrypoint()
def main():
    """Local test entrypoint"""
    # Download models
    download_models.remote()

    # Test generation
    generator = TTSGenerator()
    test_request = TTSRequest(
        job_id="test-001",
        text="Hello, this is a test of the Qwen3-TTS text to speech system.",
        language="en",
        speed=1.0,
    )

    result = generator.generate.remote(test_request)
    print(f"Test result: {result}")
