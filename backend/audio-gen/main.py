import logging
import re
import shutil
import tempfile

import modal
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Modal setup
app = modal.App("audio-generation")
volume = modal.Volume.from_name("acestep-models", create_if_missing=True)

# ACE-Step 1.5 (MIT) - open-source music generation model
MODEL_REPO = "ACE-Step/Ace-Step1.5"
ACESTEP_COMMIT = "ca1e85fe9430179831e6bc6be790c332190a3866"
DIT_CONFIG = "acestep-v15-turbo"  # 8-step turbo DiT
LM_MODEL = "acestep-5Hz-lm-1.7B"  # 5Hz language-model planner
PROJECT_ROOT = "/models/ace"  # checkpoints live in {PROJECT_ROOT}/checkpoints

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


def _clamp_num(params, key, default, lo, hi, cast=float):
    """Read a numeric param, falling back to `default` on junk and clamping to [lo, hi]."""
    value = params.get(key)
    if value is None or isinstance(value, bool):
        return default
    try:
        value = cast(value)
    except (TypeError, ValueError):
        return default
    if value != value:  # NaN
        return default
    return min(max(value, lo), hi)


def _flag(params, key, default):
    value = params.get(key)
    return value if isinstance(value, bool) else default


# acestep/constants.py:VALID_LANGUAGES (pinned commit)
VOCAL_LANGUAGES = frozenset(
    "ar az bg bn ca cs da de el en es fa fi fr he hi hr ht hu id is it ja ko la lt ms ne nl no "
    "pa pl pt ro ru sa sk sr sv sw ta te th tl tr uk ur vi yue zh unknown".split()
)
KEYSCALE_RE = re.compile(r"^[A-G][#b]? (major|minor)$")


def parse_music_params(params: dict) -> dict:
    """Validate/clamp user params for ACE-Step 1.5 turbo (user input is untrusted)."""
    duration = _clamp_num(params, "duration", 30.0, 10.0, 240.0)

    lyrics = params.get("lyrics")
    lyrics = lyrics.strip()[:4000] if isinstance(lyrics, str) else ""
    language = params.get("vocal_language")
    keyscale = params.get("keyscale")
    time_sig = str(params.get("time_signature", ""))
    infer_method = params.get("infer_method")

    fade_in = _clamp_num(params, "fade_in_duration", 0.0, 0.0, 10.0)
    fade_out = _clamp_num(params, "fade_out_duration", 0.0, 0.0, 10.0)
    if fade_in + fade_out > duration:  # fades must fit inside the clip
        scale = duration / (fade_in + fade_out)
        fade_in, fade_out = fade_in * scale, fade_out * scale

    seed = params.get("seed")
    return {
        "duration": duration,
        "lyrics": lyrics,
        "instrumental": _flag(params, "instrumental", False) or not lyrics,
        "vocal_language": language if language in VOCAL_LANGUAGES else "unknown",
        "bpm": _clamp_num(params, "bpm", None, 30, 300, int),
        "keyscale": keyscale if isinstance(keyscale, str) and KEYSCALE_RE.match(keyscale) else "",
        "timesignature": time_sig if time_sig in ("2", "3", "4", "6") else "",
        "seed": int(seed)
        if isinstance(seed, int) and not isinstance(seed, bool) and seed >= 0
        else None,
        "shift": _clamp_num(params, "shift", 1.0, 1.0, 5.0),
        "infer_method": infer_method if infer_method in ("ode", "sde") else "ode",
        "thinking": _flag(params, "thinking", True),
        "lm_temperature": _clamp_num(params, "lm_temperature", 0.85, 0.0, 2.0),
        "lm_top_k": _clamp_num(params, "lm_top_k", 0, 0, 200, int),
        "lm_top_p": _clamp_num(params, "lm_top_p", 0.9, 0.1, 1.0),
        "lm_cfg_scale": _clamp_num(params, "lm_cfg_scale", 2.0, 1.0, 5.0),
        "use_cot_metas": _flag(params, "use_cot_metas", True),
        "use_cot_caption": _flag(params, "use_cot_caption", True),
        "use_cot_language": _flag(params, "use_cot_language", True),
        "enable_normalization": _flag(params, "enable_normalization", True),
        "fade_in_duration": fade_in,
        "fade_out_duration": fade_out,
    }


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


# Modal list prices (USD/second, https://modal.com/pricing): GPU + the container's
# CPU (0.125 core minimum) and declared memory. Used to store a per-generation cost.
GPU_USD_PER_SEC = 0.000542
CPU_USD_PER_SEC = 0.125 * 0.0000131
MEMORY_GIB = 0.5
MEMORY_USD_PER_SEC = MEMORY_GIB * 0.00000222


def run_cost_usd(processing_time_ms: int) -> float:
    """Cost of the active function runtime (excludes cold start and idle scaledown)."""
    rate = GPU_USD_PER_SEC + CPU_USD_PER_SEC + MEMORY_USD_PER_SEC
    return round(processing_time_ms / 1000 * rate, 6)


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
        import boto3
        from acestep.inference import GenerationParams, GenerationConfig, generate_music

        # Parse request
        job_id = request["job_id"]
        out_dir = None
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

            opts = parse_music_params(params)
            seed = opts["seed"]

            gen_params = GenerationParams(
                caption=prompt,
                lyrics="[Instrumental]" if opts["instrumental"] else opts["lyrics"],
                instrumental=opts["instrumental"],
                duration=opts["duration"],
                vocal_language=opts["vocal_language"],
                bpm=opts["bpm"],
                keyscale=opts["keyscale"],
                timesignature=opts["timesignature"],
                inference_steps=8,  # turbo model: 8 steps, CFG not used
                seed=seed if seed is not None else -1,
                shift=opts["shift"],
                infer_method=opts["infer_method"],
                # 5Hz LM planner: only when it loaded and the user left it on
                thinking=self.llm_ready and opts["thinking"],
                lm_temperature=opts["lm_temperature"],
                lm_top_k=opts["lm_top_k"],
                lm_top_p=opts["lm_top_p"],
                lm_cfg_scale=opts["lm_cfg_scale"],
                use_cot_metas=opts["use_cot_metas"],
                use_cot_caption=opts["use_cot_caption"],
                use_cot_language=opts["use_cot_language"],
                enable_normalization=opts["enable_normalization"],
                fade_in_duration=opts["fade_in_duration"],
                fade_out_duration=opts["fade_out_duration"],
            )
            gen_config = GenerationConfig(
                batch_size=1,
                use_random_seed=seed is None,
                audio_format="wav",
            )

            out_dir = os.path.join(tempfile.gettempdir(), str(job_id))
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
                "s3",
                endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            )

            bucket_name = os.environ["R2_BUCKET_NAME"]
            # Organize by type and date: audio/{yyyy-mm-dd}
            date_folder = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            s3_key = f"audio/{date_folder}/{job_id}.wav"
            s3_client.upload_file(
                output_path, bucket_name, s3_key, ExtraArgs={"ContentType": "audio/wav"}
            )

            # Generate public URL
            public_base = (
                os.environ.get("R2_PUBLIC_URL")
                or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
            )
            output_url = f"{public_base}/{s3_key}"

            # Update DB: completed
            self._update_db(
                job_id,
                "completed",
                100,
                "Audio generated!",
                output_url=output_url,
                processing_time_ms=int(generation_time * 1000),
            )

            return {
                "status": "success",
                "job_id": job_id,
                "output_url": output_url,
                "generation_time_seconds": generation_time,
            }

        except Exception as e:
            # Update DB: failed
            logger.exception("Generation failed for job %s", job_id)
            user_msg = (
                str(e) if isinstance(e, ValueError) else "Generation failed. Please try again."
            )
            self._update_db(job_id, "failed", 0, user_msg)
            return {"status": "error", "message": user_msg}
        finally:
            if out_dir:
                shutil.rmtree(out_dir, ignore_errors=True)

    def _update_db(
        self, job_id, status, progress, message, output_url=None, processing_time_ms=None
    ):
        """Best-effort status update: retry once, then log (a status write must not fail the job)"""
        for attempt in (1, 2):
            try:
                self._update_db_once(
                    job_id, status, progress, message, output_url, processing_time_ms
                )
                return
            except Exception:
                logger.warning(
                    "DB update failed for job %s (attempt %d)", job_id, attempt, exc_info=True
                )

    def _update_db_once(
        self, job_id, status, progress, message, output_url=None, processing_time_ms=None
    ):
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
                query += ", output_url = %s"
                params.append(output_url)

            if processing_time_ms:
                query += ", processing_time_ms = %s, cost_usd = %s, completed_at = NOW()"
                params.extend([processing_time_ms, run_cost_usd(processing_time_ms)])

            query += " WHERE id = %s"
            params.append(job_id)

            cur.execute(query, params)
            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            raise


@app.function()
def health():
    return {"status": "healthy", "service": "audio-generation", "model": MODEL_REPO}


@app.function(gpu="L40S", image=audio_image)
def gpu_info():
    import torch

    return {
        "gpu": torch.cuda.get_device_name(0),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda,
    }
