import io
import logging
import os
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional

import modal

logger = logging.getLogger(__name__)

app = modal.App("image-to-3d")
models_volume = modal.Volume.from_name("image-to-3d-models", create_if_missing=True)

# Hi3D v1.0 (Hi3D Open License 1.0, built on Sparc3D) is a geometry *refiner*: it
# needs a reference image plus a coarse mesh. So this pipeline is two stages:
#   1. Hunyuan3D-2-mini makes the coarse mesh from the photo
#   2. Hi3D refines it at 512 or 1024 (1536 was only validated on a 96 GB card)
# Output is a geometry-only GLB (no texture / vertex colours).
# Commercial use must display "Powered by Hi3D 1.0" (see the license).
HI3D_MODEL = "hi3d-official/Hi3Dv1.0"
# Hi3D refuses symlinks, which HF cache snapshots are made of, so it lives in a plain dir.
HI3D_DIR = "/models/hi3d"
COARSE_MODEL = "tencent/Hunyuan3D-2mini"
COARSE_SUBFOLDER = "hunyuan3d-dit-v2-mini"

RESOLUTIONS = (512, 1024)
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 4096 * 4096

# Hi3D pins torch 2.5.0+cu124, flash-attn (compiled, needs nvcc) and spconv-cu120,
# so build on the CUDA devel image with Python 3.10.
image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    .env(
        {
            "PYTHONIOENCODING": "utf-8",
            "LC_ALL": "C.UTF-8",
            "LANG": "C.UTF-8",
            "HF_HOME": "/models/hf",
            "CUDA_HOME": "/usr/local/cuda",
        }
    )
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0", "build-essential", "ninja-build")
    .pip_install(
        "torch==2.5.0+cu124",
        "torchvision==0.20.0+cu124",
        extra_index_url="https://download.pytorch.org/whl/cu124",
    )
    .pip_install("packaging", "ninja", "psutil", "wheel", "setuptools")
    .run_commands("pip install --no-build-isolation flash-attn==2.7.4.post1")
    .run_commands(
        "git clone https://github.com/hi3d-official/Hi3Dv1.0.git /opt/hi3d",
        "cd /opt/hi3d && pip install -c docker/constraints.txt -e '.[inference]'",
    )
    .run_commands(
        "git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git /opt/hunyuan3d",
        "cd /opt/hunyuan3d && pip install -r requirements.txt && pip install -e .",
    )
    # Hunyuan3D's requirements bump numpy to 2.x and transformers/huggingface-hub to
    # major versions that break Hi3D's pinned kernel stack (sparc3d needs numpy<2,
    # huggingface-hub<1), so restore Hi3D's pins last.
    .run_commands(
        "cd /opt/hi3d && pip install -c docker/constraints.txt 'numpy<2' "
        "'huggingface-hub>=0.28,<1' 'transformers>=4.46,<5' 'diffusers>=0.30,<0.36'"
    )
    .pip_install(
        "psycopg2-binary",
        "boto3",
        "requests",
        "fastapi[standard]",
        "pillow",
        "trimesh",
        "huggingface_hub>=0.34.0",
    )
)


@dataclass
class ImageTo3DRequest:
    job_id: str
    image_url: str
    parameters: Optional[dict] = None


@dataclass
class ImageTo3DResponse:
    job_id: str
    status: str
    processing_time_ms: int
    output_url: Optional[str] = None
    error: Optional[str] = None


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


def parse_3d_params(params: dict) -> dict:
    """Validate/clamp user params. Defaults follow the Hi3D and Hunyuan3D-2 READMEs."""
    seed = params.get("seed")
    resolution = params.get("resolution")
    refine = params.get("refine")
    remove_bg = params.get("remove_background")
    return {
        "resolution": resolution
        if isinstance(resolution, int)
        and not isinstance(resolution, bool)
        and resolution in RESOLUTIONS
        else 1024,
        "refine_steps": _clamp_num(params, "refine_steps", 25, 10, 50, int),
        "coarse_steps": _clamp_num(params, "coarse_steps", 30, 10, 50, int),
        "guidance_scale": _clamp_num(params, "guidance_scale", 5.0, 1.0, 10.0),
        "seed": int(seed)
        if isinstance(seed, int) and not isinstance(seed, bool) and seed >= 0
        else 0,
        "refine": refine if isinstance(refine, bool) else True,
        "remove_background": remove_bg if isinstance(remove_bg, bool) else True,
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


def fetch_r2_bytes(client, bucket: str, url: str, max_bytes: int = MAX_IMAGE_BYTES) -> bytes:
    """Read an uploaded file with the authenticated R2 client (the bucket is not public)."""
    obj = client.get_object(Bucket=bucket, Key=r2_key_from_url(url))
    if obj["ContentLength"] > max_bytes:
        raise ValueError("Uploaded file exceeds size limit")
    return obj["Body"].read(max_bytes + 1)


# Modal list prices (USD/second, https://modal.com/pricing).
GPU_USD_PER_SEC = 0.001097  # H100
CPU_USD_PER_SEC = 0.125 * 0.0000131
MEMORY_GIB = 32
MEMORY_USD_PER_SEC = MEMORY_GIB * 0.00000222


def run_cost_usd(processing_time_ms: int) -> float:
    """Cost of the active function runtime (excludes cold start and idle scaledown)."""
    rate = GPU_USD_PER_SEC + CPU_USD_PER_SEC + MEMORY_USD_PER_SEC
    return round(processing_time_ms / 1000 * rate, 6)


@app.function(image=image, volumes={"/models": models_volume}, timeout=3600, secrets=[])
def download_models():
    """Download Hi3D and Hunyuan3D-2-mini weights to the Modal Volume (run once)."""
    from huggingface_hub import snapshot_download

    snapshot_download(HI3D_MODEL, local_dir=HI3D_DIR)
    snapshot_download(COARSE_MODEL, allow_patterns=[f"{COARSE_SUBFOLDER}/*", "*.json"])
    models_volume.commit()
    return True


@app.cls(
    image=image,
    gpu="H100",
    timeout=900,
    scaledown_window=180,
    volumes={"/models": models_volume},
    memory=MEMORY_GIB * 1024,
    secrets=[
        modal.Secret.from_name("database-credentials"),
        modal.Secret.from_name("r2-credentials"),
    ],
)
class ImageTo3D:
    @modal.enter()
    def setup(self):
        import boto3
        from botocore.client import Config
        from hy3dgen.rembg import BackgroundRemover
        from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
        from sparc3d import Sparc3DPipeline

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

        self.rembg = BackgroundRemover()
        self.coarse = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            COARSE_MODEL, subfolder=COARSE_SUBFOLDER, variant="fp16"
        )
        self.refiner = Sparc3DPipeline.from_pretrained(HI3D_DIR).to("cuda")
        logger.info("Hunyuan3D-2-mini + Hi3D loaded")

    def update_db_status(
        self,
        job_id: str,
        status: str,
        progress: int = 0,
        error: Optional[str] = None,
        output_url: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
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

    def _update_db_status_once(self, job_id, status, progress, error, output_url, ms):
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
                    (status, output_url, ms, run_cost_usd(ms or 0), job_id),
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

    def upload_to_r2(self, glb: bytes, job_id: str) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"models3d/{date_str}/model-{job_id}.glb"
        self.r2_client.put_object(
            Bucket=self.r2_bucket, Key=key, Body=glb, ContentType="model/gltf-binary"
        )
        public_base = (
            os.environ.get("R2_PUBLIC_URL") or f"https://pub-{os.environ['R2_ACCOUNT_ID']}.r2.dev"
        )
        return f"{public_base}/{key}"

    def _load_image(self, raw: bytes):
        from PIL import Image

        Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except Exception as e:
            raise ValueError("Could not read the image file") from e
        return img.convert("RGBA")

    def _build(self, job_id: str, img, opts: dict) -> bytes:
        import torch
        import trimesh

        self.update_db_status(job_id, "processing", progress=5)
        if opts["remove_background"]:
            img = self.rembg(img.convert("RGB"))

        generator = torch.Generator("cpu").manual_seed(opts["seed"])
        coarse = self.coarse(
            image=img,
            num_inference_steps=opts["coarse_steps"],
            guidance_scale=opts["guidance_scale"],
            generator=generator,
        )[0]
        self.update_db_status(job_id, "processing", progress=45)

        if not opts["refine"]:
            return coarse.export(file_type="glb")

        # Hi3D takes a trimesh loaded without processing, so round-trip through GLB bytes.
        coarse_mesh = trimesh.load(
            io.BytesIO(coarse.export(file_type="glb")),
            file_type="glb",
            force="mesh",
            process=False,
        )
        result = self.refiner(
            img.convert("RGB"),
            coarse_mesh,
            resolution=opts["resolution"],
            num_inference_steps=opts["refine_steps"],
            seed=opts["seed"],
        )
        return result.mesh.export(file_type="glb")

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate(self, payload: dict) -> dict:
        start = time.time()
        request = ImageTo3DRequest(
            **{
                k: v
                for k, v in payload.items()
                if k in ImageTo3DRequest.__dataclass_fields__ and v is not None
            }
        )
        try:
            opts = parse_3d_params(request.parameters or {})
            self.update_db_status(request.job_id, "processing", progress=0)
            img = self._load_image(
                fetch_r2_bytes(self.r2_client, self.r2_bucket, request.image_url)
            )
            glb = self._build(request.job_id, img, opts)
            self.update_db_status(request.job_id, "processing", progress=90)
            output_url = self.upload_to_r2(glb, request.job_id)
            elapsed = int((time.time() - start) * 1000)
            self.update_db_status(
                request.job_id, "completed", output_url=output_url, processing_time_ms=elapsed
            )
            return asdict(
                ImageTo3DResponse(request.job_id, "completed", elapsed, output_url=output_url)
            )
        except Exception as e:
            logger.exception("Image-to-3D failed for job %s", request.job_id)
            message = (
                str(e) if isinstance(e, ValueError) else "Generation failed. Please try again."
            )
            self.update_db_status(request.job_id, "failed", error=message)
            return asdict(
                ImageTo3DResponse(
                    request.job_id, "failed", int((time.time() - start) * 1000), error=message
                )
            )
