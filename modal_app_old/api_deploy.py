"""
FastAPI Endpoints for Modal Backend
AI Video Generation Platform - Phase 1B

This is a deployment wrapper that avoids local import errors.
"""

import modal
from pathlib import Path

# Import the app from main.py
from main import app, generate_image_task

# Define image with all dependencies for the API
api_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi", "pydantic")
    .add_local_dir(Path(__file__).parent, remote_path="/root")
)

# Expose FastAPI app as Modal ASGI function
@app.function(
    image=api_image,
)
@modal.asgi_app()
def fastapi_app():
    """Expose FastAPI app via Modal"""
    # Import FastAPI here (inside the function) to avoid local import errors
    from fastapi import FastAPI, HTTPException

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

    return web_app
