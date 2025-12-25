"""
Modal App Entry Point
AI Video Generation Platform - Phase 1B

This module configures the Modal app with GPU settings and creates the container image.
"""

import modal
from pathlib import Path

# Create Modal app
app = modal.App("ai-video-gen-v2")

# Create Modal Volume for model storage (120GB for all models)
model_volume = modal.Volume.from_name(
    "ai-models-volume",
    create_if_missing=True
)

# Define the container image with all dependencies (v2 - with FP8 custom node)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .apt_install(
        "git",
        "wget",
        "libgl1-mesa-glx",  # OpenCV dependencies
        "libglib2.0-0",
    )
    # Install ComfyUI (will be cloned from GitHub)
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /comfyui",
        "pip install -r /comfyui/requirements.txt",
    )
    # Install required ComfyUI custom nodes for FLUX.2 FP8
    .run_commands(
        "cd /comfyui/custom_nodes && git clone https://github.com/silveroxides/ComfyUI_Hybrid-Scaled_fp8-Loader.git",
        # Install custom node dependencies if requirements.txt exists
        "cd /comfyui/custom_nodes/ComfyUI_Hybrid-Scaled_fp8-Loader && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",
    )
    # Install required ComfyUI custom nodes for video generation
    .run_commands(
        # Mochi 1 text-to-video support
        "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-MochiWrapper.git",
        "cd /comfyui/custom_nodes/ComfyUI-MochiWrapper && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

        # CogVideoX image-to-video support
        "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-CogVideoXWrapper.git",
        "cd /comfyui/custom_nodes/ComfyUI-CogVideoXWrapper && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

        # Video output and encoding support
        "cd /comfyui/custom_nodes && git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
        "cd /comfyui/custom_nodes/ComfyUI-VideoHelperSuite && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

        # Image utilities (resizing, etc.)
        "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-KJNodes.git",
        "cd /comfyui/custom_nodes/ComfyUI-KJNodes && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",
    )
    # Mount the entire modal_app directory to make all Python modules available
    .add_local_dir(Path(__file__).parent, remote_path="/root")
)

# GPU Configuration for A100 80GB
# Modal A100 GPU (80GB variant is default when available)
GPU_CONFIG = "A100"  # Can also use: modal.gpu.A100() or "A100-80GB"
SCALEDOWN_WINDOW = 300  # 5 minutes warm cache (renamed from container_idle_timeout)
TIMEOUT = 900  # 15 minutes max per generation
MEMORY_SIZE_MB = 32768  # 32GB RAM


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,  # Updated from container_idle_timeout
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[
        modal.Secret.from_name("huggingface-secret"),
        modal.Secret.from_name("r2-credentials"),
        modal.Secret.from_name("database-credentials"),
        # modal.Secret.from_name("inngest-credentials"),  # Optional for now
    ],
)
def generate_image_task(job_data: dict) -> dict:
    """
    Main function to generate images using FLUX.2 + ComfyUI.
    This function will be called by the FastAPI endpoint.

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - prompt: Text prompt for image generation
            - model: Model to use (flux2-dev, flux2-schnell)
            - parameters: Dict of generation parameters (steps, cfg_scale, etc.)

    Returns:
        Dictionary with generation results and R2 URL
    """
    from comfy_runner_v2 import ComfyUIRunnerV2
    from storage import upload_to_r2
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    import time

    job_id = job_data["job_id"]

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Initializing ComfyUI...")

        # Initialize ComfyUI runner V2 (fixed version with proper workflow execution)
        runner = ComfyUIRunnerV2()

        # Emit progress: 10% - Loading model
        emit_progress(job_id, 10, "Loading FLUX.2 model...")

        # Load appropriate model
        runner.load_model(job_data["model"])

        # Emit progress: 20% - Model loaded
        emit_progress(job_id, 20, "Model loaded, starting generation...")

        # Execute workflow
        start_time = time.time()
        output_path = runner.generate_image(
            prompt=job_data["prompt"],
            parameters=job_data["parameters"],
            progress_callback=lambda p: emit_progress(job_id, 20 + int(p * 0.6), f"Generating: {int(p)}%")
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading to cloud storage...")

        # Upload to R2
        output_url = upload_to_r2(
            file_path=output_path,
            bucket_folder="images",
            job_id=job_id
        )

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
    scaledown_window=SCALEDOWN_WINDOW,  # Updated from container_idle_timeout
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def download_models():
    """
    Utility function to download and prepare all models.
    Run this once to populate the Modal Volume with models.
    """
    from models import ModelDownloader

    downloader = ModelDownloader()

    # Download FLUX.2 and apply FP8 quantization
    print("Downloading FLUX.2 dev model...")
    downloader.download_flux2_dev()

    print("All models downloaded successfully!")
    return {"status": "success"}


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def download_flux2_fp8():
    """
    Download pre-quantized FLUX.2 FP8 model.
    This is faster and more efficient than downloading and quantizing manually.
    """
    from models import ModelDownloader

    downloader = ModelDownloader()

    print("Downloading pre-quantized FLUX.2 FP8 model...")
    model_path = downloader.download_flux2_fp8_prequantized()

    print(f"FLUX.2 FP8 model downloaded successfully to: {model_path}")
    return {"status": "success", "model_path": model_path}


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def download_flux2_all_dependencies():
    """
    Download all FLUX.2 dependencies: FP8 model, VAE, and text encoder.
    Run this to get everything needed for FLUX.2 generation.
    """
    from models import ModelDownloader

    downloader = ModelDownloader()

    print("=== Downloading all FLUX.2 FP8 dependencies ===\n")

    # Download FP8 model (30GB)
    print("1/3: Downloading FLUX.2 FP8 model...")
    model_path = downloader.download_flux2_fp8_prequantized()
    print(f"✓ Model: {model_path}\n")

    # Download VAE
    print("2/3: Downloading FLUX.2 VAE...")
    vae_path = downloader.download_flux2_vae()
    print(f"✓ VAE: {vae_path}\n")

    # Download text encoder
    print("3/3: Downloading FLUX.2 text encoder...")
    text_encoder_path = downloader.download_flux2_text_encoder()
    print(f"✓ Text Encoder: {text_encoder_path}\n")

    print("=== All FLUX.2 dependencies downloaded successfully! ===")

    return {
        "status": "success",
        "model_path": model_path,
        "vae_path": vae_path,
        "text_encoder_path": text_encoder_path
    }


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    timeout=TIMEOUT,
    scaledown_window=SCALEDOWN_WINDOW,
    volumes={"/models": model_volume},
    memory=MEMORY_SIZE_MB,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def download_video_models():
    """
    Download Mochi 1 and CogVideoX-5B models for video generation.
    Run this to prepare video generation capabilities.
    """
    from models import ModelDownloader

    downloader = ModelDownloader()

    print("=== Downloading Video Generation Models ===\n")

    # Download Mochi 1 (~18GB)
    print("1/2: Downloading Mochi 1 text-to-video model...")
    mochi_path = downloader.download_mochi_1()
    print(f"✓ Mochi 1: {mochi_path}\n")

    # Download CogVideoX-5B (~12GB)
    print("2/2: Downloading CogVideoX-5B image-to-video model...")
    cogvideox_path = downloader.download_cogvideox_5b()
    print(f"✓ CogVideoX-5B: {cogvideox_path}\n")

    print("=== All video models downloaded successfully! ===")

    # Commit volume changes
    model_volume.commit()

    return {
        "status": "success",
        "mochi_path": mochi_path,
        "cogvideox_path": cogvideox_path
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
    Generate video from text using Mochi 1 model + ComfyUI.

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - prompt: Text prompt for video generation
            - model: Model to use (mochi-1)
            - parameters: Dict of generation parameters (duration, fps, motion_strength, etc.)

    Returns:
        Dictionary with generation results and R2 URL
    """
    from comfy_runner_v2 import ComfyUIRunnerV2
    from storage import upload_to_r2
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    import time

    job_id = job_data["job_id"]

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Initializing video generation...")

        # Initialize ComfyUI runner
        runner = ComfyUIRunnerV2()

        # Emit progress: 10% - Loading workflow
        emit_progress(job_id, 10, "Loading Mochi 1 workflow...")

        # Load Mochi workflow in API format (just the name without .json)
        workflow = runner.load_workflow("mochi_text2video_api")

        # Emit progress: 20% - Starting generation
        emit_progress(job_id, 20, "Starting video generation...")

        # Execute workflow
        start_time = time.time()

        # Prepare workflow parameters
        params = job_data.get("parameters", {})

        # Add filename_prefix to parameters for video combine node
        params["filename_prefix"] = f"mochi_{job_id}"
        params["negative_prompt"] = params.get("negative_prompt", "")
        
        # Use substitute_parameters method instead of manual dict manipulation
        workflow = runner.substitute_parameters(
            workflow,
            prompt=job_data["prompt"],
            parameters=params
        )

        # Execute the workflow with ComfyUI
        output_path = runner.execute_workflow_properly(
            workflow,
            progress_callback=lambda p: emit_progress(job_id, 20 + int(p * 0.6), f"Generating video: {int(p * 100)}%")
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading video to cloud storage...")

        # Upload to R2
        output_url = upload_to_r2(
            file_path=output_path,
            bucket_folder="videos",
            job_id=job_id
        )

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
        print(f"Error generating video: {error_msg}")

        # Update database: failed
        update_generation_failed(job_id, error_msg)

        # Emit error event
        emit_error(job_id, error_msg)

        raise


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
    Generate video from image using CogVideoX-5B model + ComfyUI.

    Args:
        job_data: Dictionary containing:
            - job_id: Unique job identifier
            - source_image_url: URL to source image
            - prompt: Text prompt for animation
            - model: Model to use (cogvideox-5b)
            - parameters: Dict of generation parameters (duration, fps, motion_strength, etc.)

    Returns:
        Dictionary with generation results and R2 URL
    """
    from comfy_runner_v2 import ComfyUIRunnerV2
    from storage import upload_to_r2, download_image
    from events import emit_progress, emit_completion, emit_error
    from database import update_generation_processing, update_generation_completed, update_generation_failed
    import time

    job_id = job_data["job_id"]

    try:
        # Update database: processing
        update_generation_processing(job_id)

        # Emit progress: 0% - Starting
        emit_progress(job_id, 0, "Downloading source image...")

        # Download source image
        source_image_path = download_image(job_data["source_image_url"], job_id)

        # Emit progress: 10% - Image downloaded
        emit_progress(job_id, 10, "Loading CogVideoX workflow...")

        # Initialize ComfyUI runner
        runner = ComfyUIRunnerV2()

        # Load CogVideoX workflow (just the name without .json)
        workflow = runner.load_workflow("cogvideox_img2video")

        # Emit progress: 20% - Starting generation
        emit_progress(job_id, 20, "Starting video generation...")

        # Execute workflow
        start_time = time.time()

        # Prepare workflow parameters
        params = job_data.get("parameters", {})

        # Substitute parameters directly in workflow JSON
        import json
        workflow_str = json.dumps(workflow)
        workflow_str = workflow_str.replace("{{SOURCE_IMAGE}}", source_image_path)
        workflow_str = workflow_str.replace("{{PROMPT}}", job_data["prompt"])
        workflow_str = workflow_str.replace("{{NEGATIVE_PROMPT}}", params.get("negative_prompt", ""))
        workflow_str = workflow_str.replace("{{WIDTH}}", str(params.get("width", 1360)))
        workflow_str = workflow_str.replace("{{HEIGHT}}", str(params.get("height", 768)))
        workflow_str = workflow_str.replace("{{NUM_FRAMES}}", str(params.get("num_frames", 49)))
        workflow_str = workflow_str.replace("{{FPS}}", str(params.get("fps", 24)))  # Fixed: must be >= 24
        workflow_str = workflow_str.replace("{{STEPS}}", str(params.get("steps", 25)))
        workflow_str = workflow_str.replace("{{CFG_SCALE}}", str(params.get("cfg_scale", 6.0)))
        workflow_str = workflow_str.replace("{{SEED}}", str(params.get("seed", 0)))
        workflow_str = workflow_str.replace("{{OUTPUT_PREFIX}}", f"cogvideox_{job_id}")
        workflow_substituted = json.loads(workflow_str)

        # Convert workflow to API format (dict with node IDs as keys)
        workflow_api_format = runner.convert_workflow_to_api_format(workflow_substituted)

        # Execute the workflow with ComfyUI
        output_path = runner.execute_workflow_properly(
            workflow_api_format,
            progress_callback=lambda p: emit_progress(job_id, 20 + int(p * 60), f"Generating video: {int(p * 100)}%")
        )

        # Emit progress: 80% - Upload to R2
        emit_progress(job_id, 80, "Uploading video to cloud storage...")

        # Upload to R2
        output_url = upload_to_r2(
            file_path=output_path,
            bucket_folder="videos",
            job_id=job_id
        )

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
        print(f"Error generating video from image: {error_msg}")

        # Update database: failed
        update_generation_failed(job_id, error_msg)

        # Emit error event
        emit_error(job_id, error_msg)

        raise


@app.function(
    image=image,
    volumes={"/models": model_volume},
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-secret")],
)
def cleanup_volume():
    """
    Clean up Modal volume to remove unnecessary duplicate files.
    Keeps only required files for FLUX.2 FP8 generation.
    """
    from pathlib import Path
    import shutil

    models_path = Path("/models")

    print("=" * 60)
    print("MODAL VOLUME CLEANUP")
    print("=" * 60)

    # Calculate initial size
    def get_dir_size(path):
        total = 0
        for item in path.rglob('*'):
            if item.is_file():
                try:
                    total += item.stat().st_size
                except:
                    pass
        return total

    initial_size = get_dir_size(models_path)
    print(f"\nInitial volume size: {initial_size / (1024**3):.2f} GB")

    removed_size = 0
    removed_dirs = []

    # Files we NEED to keep:
    print("\n" + "=" * 60)
    print("REQUIRED FILES (will keep):")
    print("=" * 60)

    keep_files = [
        "checkpoints/flux2-dev-fp8.safetensors",
        "vae/flux2-vae.safetensors",
        "text_encoders/mistral_3_small_flux2_fp8.safetensors"
    ]

    for file in keep_files:
        file_path = models_path / file
        if file_path.exists():
            size = file_path.stat().st_size / (1024**3)
            print(f"✓ {file} ({size:.2f} GB)")

    print("\n" + "=" * 60)
    print("REMOVING DUPLICATES:")
    print("=" * 60)

    # Remove flux directory (unused diffusers format)
    flux_dir = models_path / "flux"
    if flux_dir.exists():
        size = get_dir_size(flux_dir)
        print(f"\nRemoving flux/ ({size / (1024**3):.2f} GB)...")
        shutil.rmtree(flux_dir)
        removed_size += size
        removed_dirs.append("flux/")
        print("✓ Removed")

    # Remove HF cache (duplicates)
    hf_cache_dir = models_path / "hf_cache"
    if hf_cache_dir.exists():
        size = get_dir_size(hf_cache_dir)
        print(f"\nRemoving hf_cache/ ({size / (1024**3):.2f} GB)...")
        shutil.rmtree(hf_cache_dir)
        removed_size += size
        removed_dirs.append("hf_cache/")
        print("✓ Removed")

    final_size = get_dir_size(models_path)

    print("\n" + "=" * 60)
    print("CLEANUP SUMMARY")
    print("=" * 60)
    print(f"Initial:  {initial_size / (1024**3):.2f} GB")
    print(f"Final:    {final_size / (1024**3):.2f} GB")
    print(f"Freed:    {removed_size / (1024**3):.2f} GB")
    print(f"Savings:  ${(removed_size / (1024**3)) * 0.10:.2f}/month")

    return {
        "initial_gb": round(initial_size / (1024**3), 2),
        "final_gb": round(final_size / (1024**3), 2),
        "freed_gb": round(removed_size / (1024**3), 2),
        "monthly_savings": round((removed_size / (1024**3)) * 0.10, 2),
        "removed": removed_dirs
    }


# ============================================================================
# FastAPI Web Server
# ============================================================================

from fastapi import FastAPI, HTTPException

# Define image with all dependencies for the API
api_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi==0.115.0", "pydantic")
    .add_local_dir(Path(__file__).parent, remote_path="/root")
)

# Create FastAPI app
web_app = FastAPI(
    title="AI Video Generation API",
    version="1.0.0",
    description="Backend API for AI-powered image, video, and audio generation"
)


@web_app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-video-gen-api"}


@web_app.post("/generate/image")
async def generate_image_endpoint(request: dict):
    """Generate image using FLUX.2 model via ComfyUI"""
    try:
        from schemas import ImageGenerationRequest

        validated_request = ImageGenerationRequest(**request)

        job_data = {
            "job_id": validated_request.job_id,
            "prompt": validated_request.prompt,
            "model": validated_request.model.value,
            "parameters": {
                "steps": validated_request.parameters.steps,
                "cfg_scale": validated_request.parameters.cfg_scale,
                "width": validated_request.parameters.width,
                "height": validated_request.parameters.height,
                "seed": validated_request.parameters.seed,
            }
        }

        call = generate_image_task.spawn(job_data)

        return {
            "job_id": validated_request.job_id,
            "status": "pending",
            "message": "Generation task queued on GPU",
            "call_id": call.object_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start image generation: {str(e)}"
        )


@web_app.post("/generate/video/text2video")
async def generate_text2video_endpoint(request: dict):
    """Generate video from text using Mochi 1 model"""
    try:
        from schemas import Text2VideoRequest

        validated_request = Text2VideoRequest(**request)

        job_data = {
            "job_id": validated_request.job_id,
            "prompt": validated_request.prompt,
            "model": validated_request.model.value,
            "type": "text2video",
            "parameters": {
                "duration": validated_request.parameters.duration,
                "fps": validated_request.parameters.fps,
                "motion_strength": validated_request.parameters.motion_strength,
                "seed": validated_request.parameters.seed,
            }
        }

        call = generate_video_text2video_task.spawn(job_data)

        return {
            "job_id": validated_request.job_id,
            "status": "pending",
            "message": "Text-to-video generation task queued on GPU",
            "call_id": call.object_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start text-to-video generation: {str(e)}"
        )


@web_app.post("/generate/video/img2video")
async def generate_img2video_endpoint(request: dict):
    """Generate video from image using CogVideoX-5B model"""
    try:
        from schemas import Img2VideoRequest

        validated_request = Img2VideoRequest(**request)

        job_data = {
            "job_id": validated_request.job_id,
            "source_image_url": validated_request.source_image_url,
            "prompt": validated_request.prompt,
            "model": validated_request.model.value,
            "type": "img2video",
            "parameters": {
                "duration": validated_request.parameters.duration,
                "fps": validated_request.parameters.fps,
                "motion_strength": validated_request.parameters.motion_strength,
                "style": validated_request.parameters.style,
                "seed": validated_request.parameters.seed,
            }
        }

        call = generate_video_img2video_task.spawn(job_data)

        return {
            "job_id": validated_request.job_id,
            "status": "pending",
            "message": "Image-to-video generation task queued on GPU",
            "call_id": call.object_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start video generation: {str(e)}"
        )


@web_app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a generation job"""
    return {
        "job_id": job_id,
        "message": "Use Inngest events or SSE endpoint for real-time status"
    }


# Expose FastAPI app as Modal ASGI function
@app.function(
    image=api_image,
)
@modal.asgi_app()
def fastapi_app():
    """Expose FastAPI app via Modal"""
    return web_app


# For local testing
if __name__ == "__main__":
    print("Modal app configured. Deploy with: modal deploy main.py")
# Timestamp: 2025-12-25 17:40
