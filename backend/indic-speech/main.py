import io
import json
import logging
import os
import re
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional

import modal

logger = logging.getLogger(__name__)

app = modal.App("indic-speech")
models_volume = modal.Volume.from_name("indic-speech-models", create_if_missing=True)

# STT uses a gated Hugging Face repo and needs the `huggingface-credentials` secret
# (HF_TOKEN of an account that accepted the model terms). It is only registered when
# DEPLOY_INDIC_STT=1, so TTS can be deployed before that secret exists.
DEPLOY_STT = os.environ.get("DEPLOY_INDIC_STT") == "1"


def stt_only(register):
    """Apply an `app.function(...)` / `app.cls(...)` decorator only when STT is enabled."""
    return register if DEPLOY_STT else (lambda obj: obj)


# TTS: Maya 2 Native (Apache-2.0): 12 languages, 20 named voices, 24 kHz mono.
# Maya Research ships no STT model, so STT is AI4Bharat's IndicConformer
# (MIT, 22 Indian languages, hybrid CTC/RNNT; gated: accept the terms on the
# model page with the account whose token is in `huggingface-credentials`).
TTS_MODEL = "maya-research/maya2-native"
STT_MODEL = "ai4bharat/indic-conformer-600m-multilingual"

TTS_LANGUAGES = {
    "as": "Assamese",
    "bn": "Bengali",
    "en": "English",
    "gu": "Gujarati",
    "hi": "Hindi",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "or": "Odia",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
}
STT_LANGUAGES = {
    **{k: v for k, v in TTS_LANGUAGES.items() if k != "en"},
    "brx": "Bodo",
    "doi": "Dogri",
    "kok": "Konkani",
    "ks": "Kashmiri",
    "mai": "Maithili",
    "mni": "Manipuri",
    "ne": "Nepali",
    "sa": "Sanskrit",
    "sat": "Santali",
    "sd": "Sindhi",
    "ur": "Urdu",
}
# The model card names four of the 20 voices; any other name is passed through
# and rejected by the model if unknown.
KNOWN_VOICES = ("Ahana", "Vaidehi", "Ritvik", "Abhay")
DEFAULT_VOICE = "Ahana"
MAX_TTS_CHARS = 1000
MAX_AUDIO_BYTES = 25 * 1024 * 1024
MAX_AUDIO_SECONDS = 300
STT_SAMPLE_RATE = 16000

_COMMON_ENV = {
    "PYTHONIOENCODING": "utf-8",
    "LC_ALL": "C.UTF-8",
    "LANG": "C.UTF-8",
    "HF_HOME": "/models/hf",  # weights cached on the Modal volume
}
_COMMON_PIP = ["psycopg2-binary", "boto3", "requests", "numpy", "soundfile", "fastapi[standard]"]

# Separate images: Maya 2 needs the cu128 torch build, IndicConformer pins
# onnxruntime-gpu 1.20.1 (CUDA 12.x).
tts_image = (
    modal.Image.debian_slim(python_version="3.11")
    .env(_COMMON_ENV)
    .apt_install("git", "ffmpeg", "libsndfile1")
    .pip_install(
        "maya3[server] @ git+https://github.com/MayaResearch/maya2-native",
        *_COMMON_PIP,
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
)
stt_image = (
    modal.Image.debian_slim(python_version="3.11")
    .env(_COMMON_ENV)
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "torch==2.8.0",
        "torchaudio==2.8.0",
        "transformers",
        "onnx",
        "onnxruntime-gpu==1.20.2",  # the model card's 1.20.1 pin does not exist on PyPI
        "huggingface_hub>=0.34.0",
        *_COMMON_PIP,
    )
)


@dataclass
class IndicTTSRequest:
    job_id: str
    text: str
    language: str = "hi"
    voice: Optional[str] = None
    parameters: Optional[dict] = None


@dataclass
class IndicSTTRequest:
    job_id: str
    audio_url: str
    language: str = "hi"
    parameters: Optional[dict] = None


@dataclass
class IndicResponse:
    job_id: str
    status: str
    processing_time_ms: int
    output_url: Optional[str] = None
    text: Optional[str] = None
    error: Optional[str] = None


def _language(code: str, allowed: dict) -> str:
    code = (code or "").strip().lower()
    if code not in allowed:
        raise ValueError(f"Unsupported language: {code or '(none)'}")
    return code


def parse_tts_params(language: str, voice: Optional[str], params: dict) -> dict:
    """Validate user input for TTS. Unknown languages raise ValueError; junk voices fall back."""
    voice = voice.strip() if isinstance(voice, str) else ""
    if not re.fullmatch(r"[A-Za-z]{2,24}", voice):
        voice = DEFAULT_VOICE
    normalize = params.get("normalize")
    return {
        "language": _language(language, TTS_LANGUAGES),
        "voice": voice,
        "normalize": normalize if isinstance(normalize, bool) else True,
    }


def parse_stt_params(language: str, params: dict) -> dict:
    decoding = params.get("decoding")
    return {
        "language": _language(language, STT_LANGUAGES),
        "decoding": decoding if decoding in ("ctc", "rnnt") else "ctc",
    }


def assert_r2_url(url: str) -> None:
    """Only fetch user-supplied URLs from our own R2 public origin (blocks SSRF)."""
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


def r2_key_from_url(url: str) -> str:
    """Object key of a user upload URL. Only `uploads/` keys on our R2 origin are accepted."""
    from urllib.parse import unquote, urlsplit

    assert_r2_url(url)
    path = unquote(urlsplit(url).path).lstrip("/")
    bucket = os.environ.get("R2_BUCKET_NAME", "")
    if bucket and path.startswith(bucket + "/"):
        path = path[len(bucket) + 1 :]
    if not path.startswith("uploads/") or ".." in path.split("/"):
        raise ValueError("URL must point to a file uploaded through this app")
    return path


def fetch_r2_bytes(client, bucket: str, url: str, max_bytes: int = MAX_AUDIO_BYTES) -> bytes:
    """Read an uploaded file with the authenticated R2 client (the bucket is not public)."""
    obj = client.get_object(Bucket=bucket, Key=r2_key_from_url(url))
    if obj["ContentLength"] > max_bytes:
        raise ValueError("Uploaded file exceeds size limit")
    return obj["Body"].read(max_bytes + 1)


# Modal list prices (USD/second, https://modal.com/pricing): GPU + the container's
# CPU (0.125 core minimum) and declared memory.
GPU_USD_PER_SEC = {"A10G": 0.000306, "T4": 0.000164}
CPU_USD_PER_SEC = 0.125 * 0.0000131
MEMORY_USD_PER_GIB_SEC = 0.00000222


def run_cost_usd(processing_time_ms: int, gpu: str, memory_gib: int) -> float:
    """Cost of the active function runtime (excludes cold start and idle scaledown)."""
    rate = GPU_USD_PER_SEC[gpu] + CPU_USD_PER_SEC + memory_gib * MEMORY_USD_PER_GIB_SEC
    return round(processing_time_ms / 1000 * rate, 6)


class _JobMixin:
    """DB status updates and R2 uploads shared by the TTS and STT classes."""

    gpu_name: str
    memory_gib: int

    def _init_clients(self) -> None:
        import boto3
        from botocore.client import Config

        self.database_url = os.environ["DATABASE_URL"]
        self.r2_client = boto3.client(
            "s3",
            endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        self.r2_bucket = os.environ["R2_BUCKET_NAME"]

    def _update_db(
        self,
        job_id: str,
        status: str,
        progress: int = 0,
        error: Optional[str] = None,
        output_url: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
    ) -> None:
        """Best-effort status update: retry once, then log (a status write must not fail the job)."""
        for attempt in (1, 2):
            try:
                self._update_db_once(
                    job_id, status, progress, error, output_url, processing_time_ms
                )
                return
            except Exception:
                logger.warning(
                    "DB update failed for job %s (attempt %d)", job_id, attempt, exc_info=True
                )

    def _update_db_once(self, job_id, status, progress, error, output_url, processing_time_ms):
        import psycopg2

        conn = psycopg2.connect(self.database_url)
        try:
            cur = conn.cursor()
            if status == "processing":
                cur.execute(
                    "UPDATE generations SET status = %s, progress = %s WHERE id = %s",
                    (status, progress, job_id),
                )
            elif status == "completed":
                cur.execute(
                    """UPDATE generations
                       SET status = %s, output_url = %s, processing_time_ms = %s,
                           cost_usd = %s, completed_at = NOW()
                       WHERE id = %s""",
                    (
                        status,
                        output_url,
                        processing_time_ms,
                        run_cost_usd(processing_time_ms or 0, self.gpu_name, self.memory_gib),
                        job_id,
                    ),
                )
            elif status == "failed":
                cur.execute(
                    "UPDATE generations SET status = %s, error = %s WHERE id = %s",
                    (status, error, job_id),
                )
            conn.commit()
            cur.close()
        finally:
            conn.close()

    def _upload(self, body: bytes, key: str, content_type: str) -> str:
        self.r2_client.put_object(
            Bucket=self.r2_bucket, Key=key, Body=body, ContentType=content_type
        )
        public_base = (
            os.environ.get("R2_PUBLIC_URL") or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
        )
        return f"{public_base}/{key}"


def peak_normalize(audio, target: float = 0.9, max_gain: float = 8.0):
    """Scale speech to a consistent loudness. Maya 2's raw output peaks near -13 dBFS,
    which is hard to hear on laptop speakers. Silence is left alone and gain is capped
    so near-silent noise is not blown up."""
    import numpy as np

    audio = np.asarray(audio, dtype=np.float32)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak < 1e-4:
        return audio
    return np.clip(audio * min(target / peak, max_gain), -1.0, 1.0)


def _date_prefix() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _failure_message(e: Exception) -> str:
    return str(e) if isinstance(e, ValueError) else "Generation failed. Please try again."


@stt_only(
    app.function(
        image=stt_image,
        volumes={"/models": models_volume},
        secrets=[modal.Secret.from_name("huggingface-credentials")] if DEPLOY_STT else [],
        timeout=1800,
    )
)
def download_stt_models():
    """Download IndicConformer to the Modal Volume (run once; needs HF_TOKEN with access granted)."""
    from huggingface_hub import snapshot_download

    snapshot_download(STT_MODEL, token=os.environ["HF_TOKEN"])
    models_volume.commit()
    return True


@app.function(image=tts_image, volumes={"/models": models_volume}, timeout=1800)
def download_tts_models():
    """Download Maya 2 Native to the Modal Volume (run once)."""
    from huggingface_hub import snapshot_download

    snapshot_download(TTS_MODEL)
    models_volume.commit()
    return True


@app.cls(
    image=tts_image,
    gpu="A10G",
    timeout=300,
    scaledown_window=180,
    volumes={"/models": models_volume},
    memory=16384,
    secrets=[
        modal.Secret.from_name("database-credentials"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
class IndicTTS(_JobMixin):
    gpu_name = "A10G"
    memory_gib = 16

    @modal.enter()
    def setup(self):
        from maya3 import Maya3TTS

        self._init_clients()
        self.tts = Maya3TTS.from_pretrained(TTS_MODEL, max_seats=1)
        logger.info("Maya 2 Native loaded")

    @modal.exit()
    def teardown(self):
        self.tts.close()

    def _synthesize(self, text: str, opts: dict) -> bytes:
        import soundfile as sf

        audio = self.tts.generate(
            text,
            lang=opts["language"],
            voice=opts["voice"],
            normalize=opts["normalize"],
        )
        buffer = io.BytesIO()
        sf.write(buffer, peak_normalize(audio), 24000, format="WAV")
        return buffer.getvalue()

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate(self, payload: dict) -> dict:
        start = time.time()
        request = IndicTTSRequest(
            **{
                k: v
                for k, v in payload.items()
                if k in IndicTTSRequest.__dataclass_fields__ and v is not None
            }
        )
        try:
            text = request.text.strip()[:MAX_TTS_CHARS]
            if not text:
                raise ValueError("Text is required")
            opts = parse_tts_params(request.language, request.voice, request.parameters or {})
            self._update_db(request.job_id, "processing", progress=0)
            wav = self._synthesize(text, opts)
            self._update_db(request.job_id, "processing", progress=80)
            output_url = self._upload(
                wav, f"audio/{_date_prefix()}/indic-speech-{request.job_id}.wav", "audio/wav"
            )
            elapsed = int((time.time() - start) * 1000)
            self._update_db(
                request.job_id, "completed", output_url=output_url, processing_time_ms=elapsed
            )
            return asdict(
                IndicResponse(request.job_id, "completed", elapsed, output_url=output_url)
            )
        except Exception as e:
            logger.exception("Indic TTS failed for job %s", request.job_id)
            message = _failure_message(e)
            self._update_db(request.job_id, "failed", error=message)
            return asdict(
                IndicResponse(
                    request.job_id,
                    "failed",
                    int((time.time() - start) * 1000),
                    error=message,
                )
            )


def _to_mono_16k(raw: bytes, workdir: str) -> str:
    """Decode any uploaded audio with ffmpeg to a 16 kHz mono wav; enforce the duration cap."""
    src = os.path.join(workdir, "input")
    dst = os.path.join(workdir, "audio.wav")
    with open(src, "wb") as f:
        f.write(raw)
    proc = subprocess.run(  # noqa: S603
        [  # noqa: S607
            "ffmpeg",
            "-nostdin",
            "-y",
            "-i",
            src,
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(STT_SAMPLE_RATE),
            "-t",
            str(MAX_AUDIO_SECONDS + 1),
            dst,
        ],
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0 or not os.path.exists(dst):
        logger.error("ffmpeg failed: %s", proc.stderr[-500:])
        raise ValueError("Could not read the audio file")
    return dst


@stt_only(
    app.cls(
        image=stt_image,
        gpu="T4",
        timeout=600,
        scaledown_window=180,
        volumes={"/models": models_volume},
        memory=8192,
        secrets=[
            modal.Secret.from_name("database-credentials"),
            modal.Secret.from_name("r2-credentials"),
            modal.Secret.from_name("huggingface-credentials"),
        ]
        if DEPLOY_STT
        else [],
    )
)
class IndicSTT(_JobMixin):
    gpu_name = "T4"
    memory_gib = 8

    @modal.enter()
    def setup(self):
        from transformers import AutoModel

        self._init_clients()
        self.model = AutoModel.from_pretrained(
            STT_MODEL, trust_remote_code=True, token=os.environ.get("HF_TOKEN")
        )
        logger.info("IndicConformer loaded")

    def _transcribe(self, audio_path: str, opts: dict) -> tuple[str, float]:
        import torch
        import torchaudio

        wav, sr = torchaudio.load(audio_path)
        wav = torch.mean(wav, dim=0, keepdim=True)
        if sr != STT_SAMPLE_RATE:
            wav = torchaudio.transforms.Resample(sr, STT_SAMPLE_RATE)(wav)
        duration = wav.shape[1] / STT_SAMPLE_RATE
        if duration > MAX_AUDIO_SECONDS:
            raise ValueError(f"Audio must be {MAX_AUDIO_SECONDS // 60} minutes or shorter")
        if duration < 0.2:
            raise ValueError("Audio is too short")
        text = self.model(wav, opts["language"], opts["decoding"])
        return str(text).strip(), duration

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def transcribe(self, payload: dict) -> dict:
        start = time.time()
        request = IndicSTTRequest(
            **{
                k: v
                for k, v in payload.items()
                if k in IndicSTTRequest.__dataclass_fields__ and v is not None
            }
        )
        try:
            opts = parse_stt_params(request.language, request.parameters or {})
            self._update_db(request.job_id, "processing", progress=0)
            raw = fetch_r2_bytes(self.r2_client, self.r2_bucket, request.audio_url)
            with tempfile.TemporaryDirectory() as workdir:
                text, duration = self._transcribe(_to_mono_16k(raw, workdir), opts)
            self._update_db(request.job_id, "processing", progress=80)
            body = json.dumps(
                {
                    "text": text,
                    "language": opts["language"],
                    "decoding": opts["decoding"],
                    "duration_s": round(duration, 2),
                },
                ensure_ascii=False,
            ).encode()
            output_url = self._upload(
                body,
                f"transcripts/{_date_prefix()}/transcript-{request.job_id}.json",
                "application/json",
            )
            elapsed = int((time.time() - start) * 1000)
            self._update_db(
                request.job_id, "completed", output_url=output_url, processing_time_ms=elapsed
            )
            return asdict(
                IndicResponse(
                    request.job_id, "completed", elapsed, output_url=output_url, text=text
                )
            )
        except Exception as e:
            logger.exception("Indic STT failed for job %s", request.job_id)
            message = _failure_message(e)
            self._update_db(request.job_id, "failed", error=message)
            return asdict(
                IndicResponse(
                    request.job_id, "failed", int((time.time() - start) * 1000), error=message
                )
            )


@app.function()
def list_options():
    """Languages and known voices, for the UI."""
    return {
        "tts_languages": TTS_LANGUAGES,
        "stt_languages": STT_LANGUAGES,
        "voices": list(KNOWN_VOICES),
    }
