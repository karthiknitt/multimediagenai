"""
Modal App Entry Point - Direct Implementation (No ComfyUI)
AI Video Generation Platform - Backend

New Modal App: ai-video-gen-direct
GPU: A100-80GB (upgraded from A100-40GB)
Reuses: ai-models-volume (existing models from modal_app)

This is a side-by-side deployment with the existing ai-video-gen-v2 app.
Frontend remains unchanged initially.

Version: 2025-12-26-debug
"""

import modal
from pathlib import Path

# ============================================================================
# Modal App Configuration
# ============================================================================

app = modal.App("ai-video-gen-direct-v4")

# Reuse existing Modal Volume (models already downloaded)
model_volume = modal.Volume.from_name(
    "ai-models-volume",
    create_if_missing=True
)

# ============================================================================
# Container Image with Direct Implementation Dependencies
# ============================================================================

# Container image with direct implementation dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    # Install system dependencies
    .apt_install(
        "git",              # Required for git-based pip dependencies
        "pkg-config",       # Required for PyAV (audiocraft dependency)
        "ffmpeg",           # Required for video processing
        "libavcodec-dev",   # Required for PyAV
        "libavformat-dev",  # Required for PyAV
        "libavutil-dev",    # Required for PyAV
        "libswscale-dev",   # Required for PyAV
        "libavdevice-dev",  # Required for PyAV
    )
    # Install Python dependencies
    .pip_install_from_requirements("requirements.txt")
    # Mount the entire backend directory to make all Python modules available
    .add_local_dir(Path(__file__).parent, remote_path="/root")
)

# ============================================================================
# GPU Configuration for A100 80GB
# ============================================================================

GPU_CONFIG = "A100-80GB"  # Explicitly request 80GB variant (upgraded from A100)
SCALEDOWN_WINDOW = 300  # 5 minutes warm cache
TIMEOUT = 900  # 15 minutes max per generation
MEMORY_SIZE_MB = 32768  # 32GB RAM

# ============================================================================
# Modal Functions for Each Generation Type
# ============================================================================

@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("database-credentials"),
    ],
)
def generate_image_task(job_data: dict) -> dict:
    """
    Generate image using FLUX.2 (direct diffusers implementation).

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - prompt: Text prompt for image generation
            - model: Model to use (flux2-dev)
            - parameters: Dict of generation parameters

    Returns:
        Dictionary with generation results and R2 URL
    """
    print("[TASK] generate_image_task started", flush=True)
    from models.flux2_runner import Flux2Generator
    print("[TASK] Flux2Generator imported", flush=True)
    from storage import upload_to_r2
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    from progress import create_diffusers_callback
    import time
    import tempfile
    print("[TASK] All imports complete", flush=True)

    job_id = job_data["job_id"]
    print(f"[TASK] Job ID: {job_id}", flush=True)

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Initializing FLUX.2...")

        # Initialize FLUX.2 generator
        print("[MAIN] Creating Flux2Generator instance...", flush=True)
        generator = Flux2Generator(models_path="/models")
        print("[MAIN] Flux2Generator created successfully", flush=True)

        # Create progress callback
        params = job_data["parameters"]
        print(f"[MAIN] Creating progress callback (steps={params.get('steps', 50)})...", flush=True)
        callback = create_diffusers_callback(
            job_id=job_id,
            total_steps=params.get("steps", 50),
            emit_func=emit_progress,
            update_interval=5
        )
        print("[MAIN] Progress callback created", flush=True)

        # Generate image
        start_time = time.time()
        print(f"[MAIN] About to call generator.generate() with prompt: {job_data['prompt'][:50]}", flush=True)
        image_bytes = generator.generate(
            prompt=job_data["prompt"],
            width=params.get("width", 1024),
            height=params.get("height", 1024),
            num_inference_steps=params.get("steps", 50),
            guidance_scale=params.get("cfg_scale", 3.5),
            seed=params.get("seed"),
            progress_callback=callback
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading to cloud storage...")

        # Save to temporary file for R2 upload
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        # Upload to R2
        output_url = upload_to_r2(
            file_path=tmp_path,
            bucket_folder="images",
            job_id=job_id
        )

        # Clean up temp file
        Path(tmp_path).unlink()

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Emit progress: 100% - Complete
        emit_progress(job_id, 100, "Generation complete!")

        # Update database: completed
        update_generation_completed(job_id, output_url, processing_time_ms)

        # Emit completion event
        result = {
            "job_id": job_id,
            "output_url": output_url,
            "processing_time_ms": processing_time_ms,
            "status": "completed"
        }
        emit_completion(job_id, result)

        return result

    except Exception as e:
        # Emit error event
        error_message = str(e)
        print(f"ERROR in generate_image_task: {error_message}")
        import traceback
        traceback.print_exc()

        # Update database: failed
        update_generation_failed(job_id, error_message)

        emit_error(job_id, error_message)

        return {
            "job_id": job_id,
            "status": "failed",
            "error": error_message
        }


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("database-credentials"),
    ],
)
def generate_video_text2video_task(job_data: dict) -> dict:
    """
    Generate video from text using Mochi 1 (direct diffusers implementation).

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - prompt: Text prompt for video generation
            - model: Model to use (mochi-1)
            - parameters: Dict of generation parameters

    Returns:
        Dictionary with generation results and R2 URL
    """
    from models.mochi_runner import MochiGenerator
    from storage import upload_to_r2
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    from progress import create_diffusers_callback
    import time
    import tempfile

    job_id = job_data["job_id"]

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Initializing Mochi 1...")

        # Initialize Mochi generator
        generator = MochiGenerator(models_path="/models")

        # Create progress callback
        params = job_data.get("parameters", {})
        callback = create_diffusers_callback(
            job_id=job_id,
            total_steps=params.get("steps", 200),
            emit_func=emit_progress,
            update_interval=10  # Update every 10 steps for Mochi
        )

        # Generate video
        start_time = time.time()
        video_bytes = generator.generate(
            prompt=job_data["prompt"],
            negative_prompt=params.get("negative_prompt", ""),
            num_frames=params.get("num_frames", 84),  # Default: 84 frames (quality optimized)
            num_inference_steps=params.get("steps", 200),
            guidance_scale=params.get("guidance_scale", 4.5),
            seed=params.get("seed"),
            progress_callback=callback
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading video to cloud storage...")

        # Save to temporary file for R2 upload
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        # Upload to R2
        output_url = upload_to_r2(
            file_path=tmp_path,
            bucket_folder="videos",
            job_id=job_id
        )

        # Clean up temp file
        Path(tmp_path).unlink()

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Emit progress: 100% - Complete
        emit_progress(job_id, 100, "Video generation complete!")

        # Update database: completed
        update_generation_completed(job_id, output_url, processing_time_ms)

        # Emit completion event
        result = {
            "job_id": job_id,
            "output_url": output_url,
            "processing_time_ms": processing_time_ms,
            "status": "completed"
        }
        emit_completion(job_id, result)

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"ERROR in generate_video_text2video_task: {error_msg}")
        import traceback
        traceback.print_exc()

        # Update database: failed
        update_generation_failed(job_id, error_msg)

        # Emit error event
        emit_error(job_id, error_msg)

        return {
            "job_id": job_id,
            "status": "failed",
            "error": error_msg
        }


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("database-credentials"),
    ],
)
def generate_video_img2video_task(job_data: dict) -> dict:
    """
    Generate video from source image using CogVideoX-5B (direct diffusers implementation).

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - image_url: URL or path to source image
            - prompt: Text description of desired animation
            - model: Model to use (cogvideox-5b)
            - parameters: Dict of generation parameters

    Returns:
        Dictionary with generation results and R2 URL
    """
    from models.cogvideox_runner import CogVideoXGenerator
    from storage import upload_to_r2
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    from progress import create_diffusers_callback
    import time
    import tempfile

    job_id = job_data["job_id"]

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Initializing CogVideoX-5B...")

        # Initialize CogVideoX generator (use FP16 for 2x speedup)
        generator = CogVideoXGenerator(models_path="/models", use_fp16=True)

        # Create progress callback
        params = job_data.get("parameters", {})
        callback = create_diffusers_callback(
            job_id=job_id,
            total_steps=params.get("steps", 50),
            emit_func=emit_progress,
            update_interval=5  # Update every 5 steps
        )

        # Generate video
        start_time = time.time()
        video_bytes = generator.generate(
            image=job_data["image_url"],
            prompt=job_data["prompt"],
            num_frames=params.get("num_frames", 49),  # Default: 49 frames (6s @ 8fps)
            num_inference_steps=params.get("steps", 50),
            guidance_scale=params.get("guidance_scale", 6.0),
            seed=params.get("seed"),
            progress_callback=callback
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading video to cloud storage...")

        # Save to temporary file for R2 upload
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        # Upload to R2
        output_url = upload_to_r2(
            file_path=tmp_path,
            bucket_folder="videos",
            job_id=job_id
        )

        # Clean up temp file
        Path(tmp_path).unlink()

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Emit progress: 100% - Complete
        emit_progress(job_id, 100, "Video generation complete!")

        # Update database: completed
        update_generation_completed(job_id, output_url, processing_time_ms)

        # Emit completion event
        result = {
            "job_id": job_id,
            "output_url": output_url,
            "processing_time_ms": processing_time_ms,
            "status": "completed"
        }
        emit_completion(job_id, result)

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"ERROR in generate_video_img2video_task: {error_msg}")
        import traceback
        traceback.print_exc()

        # Update database: failed
        update_generation_failed(job_id, error_msg)

        # Emit error event
        emit_error(job_id, error_msg)

        return {
            "job_id": job_id,
            "status": "failed",
            "error": error_msg
        }


# ============================================================================
# Audio Generation (TEMPORARILY DISABLED - torch version conflict)
# ============================================================================
# DISABLED: Audio generation requires audiocraft which depends on torch==2.1.0
# This conflicts with torch==2.5.1 required by FLUX.2, Mochi, and CogVideoX
# TODO: Deploy audio generation in a separate Modal app with torch 2.1.0


# ============================================================================
# FastAPI Web Application
# ============================================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal

web_app = FastAPI(
    title="AI Video Generation API - Direct Implementation",
    description="GPU-accelerated AI generation without ComfyUI",
    version="2.0.0"
)

# CORS configuration (allow frontend requests)
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class ImageGenerationRequest(BaseModel):
    job_id: str
    prompt: str
    model: str = "flux2-dev"
    parameters: Optional[dict] = {
        "width": 1024,
        "height": 1024,
        "steps": 50,
        "cfg_scale": 3.5,
        "seed": None
    }


class VideoText2VideoRequest(BaseModel):
    job_id: str
    prompt: str
    model: str = "mochi-1"
    parameters: Optional[dict] = {
        "num_frames": 84,  # Quality optimized
        "steps": 200,
        "guidance_scale": 4.5,
        "negative_prompt": "",
        "seed": None
    }


class VideoImg2VideoRequest(BaseModel):
    job_id: str
    image_url: str
    prompt: str
    model: str = "cogvideox-5b"
    parameters: Optional[dict] = {
        "num_frames": 49,
        "steps": 50,
        "guidance_scale": 6.0,
        "seed": None
    }


class GenerationResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    message: str


# ============================================================================
# API Endpoints
# ============================================================================

@web_app.get("/")
def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": "ai-video-gen-direct",
        "gpu": "A100-80GB",
        "implementation": "Direct (no ComfyUI)"
    }


@web_app.post("/generate/image", response_model=GenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """
    Generate image using FLUX.2 [dev].

    Spawns async Modal function and returns immediately.
    """
    try:
        # Spawn Modal function (async execution)
        generate_image_task.spawn(request.dict())

        return GenerationResponse(
            job_id=request.job_id,
            status="queued",
            message="Image generation started"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@web_app.post("/generate/video/text2video", response_model=GenerationResponse)
async def generate_video_text2video(request: VideoText2VideoRequest):
    """
    Generate video from text using Mochi 1.

    Spawns async Modal function and returns immediately.
    """
    try:
        # Spawn Modal function (async execution)
        generate_video_text2video_task.spawn(request.dict())

        return GenerationResponse(
            job_id=request.job_id,
            status="queued",
            message="Text-to-video generation started"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@web_app.post("/generate/video/img2video", response_model=GenerationResponse)
async def generate_video_img2video(request: VideoImg2VideoRequest):
    """
    Generate video from image using CogVideoX-5B.

    Spawns async Modal function and returns immediately.
    """
    try:
        # Spawn Modal function (async execution)
        generate_video_img2video_task.spawn(request.dict())

        return GenerationResponse(
            job_id=request.job_id,
            status="queued",
            message="Image-to-video generation started"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@web_app.get("/health")
async def health():
    """
    Lightweight health check (fast response).
    Use /gpu-info for detailed GPU information.
    """
    return {
        "status": "healthy",
        "models_path": "/models",
        "implementation": "Direct (Diffusers + AudioCraft)",
        "note": "Use /gpu-info for detailed GPU status"
    }


@web_app.get("/gpu-info")
async def gpu_info():
    """
    Detailed GPU information (slower - probes CUDA).
    """
    import torch

    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A",
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else "N/A",
        "pytorch_version": torch.__version__
    }


# ============================================================================
# Modal ASGI App
# ============================================================================

@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("database-credentials"),
    ],
)
@modal.asgi_app()
def fastapi_app():
    """
    Expose FastAPI app as Modal ASGI app.

    Access via: https://<modal-username>--ai-video-gen-direct-fastapi-app.modal.run
    """
    return web_app
