"""
Pydantic Schemas for Request/Response Validation
AI Video Generation Platform - Phase 1B
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from enum import Enum


class ModelType(str, Enum):
    """Supported AI models"""
    FLUX2_DEV = "flux2-dev"
    FLUX2_SCHNELL = "flux2-schnell"


class VideoModelType(str, Enum):
    """Supported video generation models"""
    MOCHI_1 = "mochi-1"
    COGVIDEOX_5B = "cogvideox-5b"


class ImageParameters(BaseModel):
    """Parameters for image generation"""
    steps: int = Field(default=28, ge=20, le=50, description="Number of denoising steps")
    cfg_scale: float = Field(default=3.5, ge=1.0, le=20.0, description="Classifier-free guidance scale")
    width: int = Field(default=1024, ge=512, le=2048, description="Image width")
    height: int = Field(default=1024, ge=512, le=2048, description="Image height")
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")

    @field_validator('width', 'height')
    @classmethod
    def validate_dimensions(cls, v):
        """Ensure dimensions are multiples of 64"""
        if v % 64 != 0:
            raise ValueError(f"Dimension must be multiple of 64, got {v}")
        return v


class ImageGenerationRequest(BaseModel):
    """Request schema for image generation"""
    job_id: str = Field(..., description="Unique job identifier")
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt")
    model: ModelType = Field(default=ModelType.FLUX2_DEV, description="Model to use")
    parameters: ImageParameters = Field(default_factory=ImageParameters)

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "prompt": "A serene mountain landscape at sunset, highly detailed, 4k",
                "model": "flux2-dev",
                "parameters": {
                    "steps": 28,
                    "cfg_scale": 3.5,
                    "width": 1024,
                    "height": 1024,
                    "seed": 42
                }
            }
        }
    }


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation"""
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    output_url: Optional[str] = None
    processing_time_ms: Optional[int] = None
    error: Optional[str] = None


class ProgressEvent(BaseModel):
    """Progress event schema"""
    job_id: str
    progress: int = Field(ge=0, le=100)
    message: str
    timestamp: float


class CompletionEvent(BaseModel):
    """Completion event schema"""
    job_id: str
    output_url: str
    processing_time_ms: int
    timestamp: float


class ErrorEvent(BaseModel):
    """Error event schema"""
    job_id: str
    error: str
    timestamp: float


class VideoParameters(BaseModel):
    """Parameters for video generation"""
    duration: float = Field(default=5.4, ge=1.0, le=10.0, description="Video duration in seconds")
    fps: int = Field(default=30, ge=24, le=60, description="Frames per second")
    motion_strength: float = Field(default=0.7, ge=0.0, le=1.0, description="Motion intensity")
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")


class Text2VideoRequest(BaseModel):
    """Request schema for text-to-video generation"""
    job_id: str = Field(..., description="Unique job identifier")
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt")
    model: VideoModelType = Field(default=VideoModelType.MOCHI_1, description="Video model to use")
    parameters: VideoParameters = Field(default_factory=VideoParameters)

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "prompt": "A cat walking through a futuristic city, cinematic lighting",
                "model": "mochi-1",
                "parameters": {
                    "duration": 5.4,
                    "fps": 30,
                    "motion_strength": 0.7,
                    "seed": 42
                }
            }
        }
    }


class Img2VideoParameters(BaseModel):
    """Parameters for image-to-video generation"""
    duration: float = Field(default=4.0, ge=1.0, le=8.0, description="Video duration in seconds")
    fps: int = Field(default=24, ge=24, le=60, description="Frames per second")
    motion_strength: float = Field(default=0.8, ge=0.0, le=1.0, description="Motion intensity")
    style: Optional[str] = Field(default=None, description="Animation style preset")
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")


class Img2VideoRequest(BaseModel):
    """Request schema for image-to-video generation"""
    job_id: str = Field(..., description="Unique job identifier")
    source_image_url: str = Field(..., description="URL to source image")
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt for animation")
    model: VideoModelType = Field(default=VideoModelType.COGVIDEOX_5B, description="Video model to use")
    parameters: Img2VideoParameters = Field(default_factory=Img2VideoParameters)

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "source_image_url": "https://example.com/image.jpg",
                "prompt": "The subject turns their head and smiles",
                "model": "cogvideox-5b",
                "parameters": {
                    "duration": 4.0,
                    "fps": 24,
                    "motion_strength": 0.8,
                    "style": "smooth",
                    "seed": 42
                }
            }
        }
    }


class VideoGenerationResponse(BaseModel):
    """Response schema for video generation"""
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    output_url: Optional[str] = None
    processing_time_ms: Optional[int] = None
    error: Optional[str] = None
