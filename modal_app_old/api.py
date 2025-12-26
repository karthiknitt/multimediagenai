"""
FastAPI Endpoints for Modal Backend
AI Video Generation Platform - Phase 1B
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import modal
from pathlib import Path

# Import the app and GPU function from main.py
from main import app, generate_image_task

# Define image with all dependencies for the API
api_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi", "pydantic")
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
async def generate_image(request: dict):
    """
    Generate image using FLUX.2 model via ComfyUI.

    This endpoint accepts a generation request and returns immediately with job_id.
    The actual generation happens asynchronously in a Modal GPU container.

    Args:
        request: Image generation parameters

    Returns:
        Response with job_id and status
    """
    try:
        # Import schemas locally to avoid import errors
        from schemas import ImageGenerationRequest

        # Validate request
        validated_request = ImageGenerationRequest(**request)

        # Convert to dict for Modal function
        job_data = {
            "job_id": validated_request.job_id,
            "prompt": validated_request.prompt,
            "model": validated_request.model.value,  # Get enum value
            "parameters": {
                "steps": validated_request.parameters.steps,
                "cfg_scale": validated_request.parameters.cfg_scale,
                "width": validated_request.parameters.width,
                "height": validated_request.parameters.height,
                "seed": validated_request.parameters.seed,
            }
        }

        # Spawn async task on Modal GPU
        call = generate_image_task.spawn(job_data)

        # Return immediately with pending status
        return {
            "job_id": validated_request.job_id,
            "status": "pending",
            "message": "Generation task queued on GPU",
            "call_id": call.object_id  # Modal call ID for tracking
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start image generation: {str(e)}"
        )


@web_app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """
    Get status of a generation job.

    Note: In production, this should query a database or cache.
    For Phase 1B, status tracking is handled via Inngest events.
    """
    return {
        "job_id": job_id,
        "message": "Use Inngest events or SSE endpoint for real-time status"
    }


@web_app.post("/generate/video/text2video")
async def generate_text2video(request: dict):
    """
    Generate video from text using Mochi 1 model.

    This endpoint accepts a text-to-video request and returns immediately with job_id.
    The actual generation happens asynchronously in a Modal GPU container.

    Args:
        request: Video generation parameters

    Returns:
        Response with job_id and status
    """
    try:
        from schemas import Text2VideoRequest

        # Validate request
        validated_request = Text2VideoRequest(**request)

        # Convert to dict for Modal function
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

        # Spawn async task on Modal GPU
        from main import generate_video_text2video_task
        call = generate_video_text2video_task.spawn(job_data)

        # Return immediately with pending status
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
async def generate_img2video(request: dict):
    """
    Generate video from image using CogVideoX-5B model.

    This endpoint accepts an image-to-video request and returns immediately with job_id.
    The actual generation happens asynchronously in a Modal GPU container.

    Args:
        request: Video generation parameters including source image

    Returns:
        Response with job_id and status
    """
    try:
        from schemas import Img2VideoRequest

        # Validate request
        validated_request = Img2VideoRequest(**request)

        # Convert to dict for Modal function
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

        # Spawn async task on Modal GPU
        from main import generate_video_img2video_task
        call = generate_video_img2video_task.spawn(job_data)

        # Return immediately with pending status
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


# Expose FastAPI app as Modal ASGI function
@app.function(
    image=api_image,
)
@modal.asgi_app()
def fastapi_app():
    """Expose FastAPI app via Modal"""
    return web_app


if __name__ == "__main__":
    # For local testing
    import uvicorn
    uvicorn.run(web_app, host="0.0.0.0", port=8000)
