# AI Video Generation API Documentation

**Version:** 2.0.0
**Implementation:** Direct (No ComfyUI)
**GPU:** A100-80GB
**Base URL:** `https://<your-username>--ai-video-gen-direct-fastapi-app.modal.run`

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Image Generation](#image-generation-flux2)
  - [Text-to-Video](#text-to-video-mochi)
  - [Image-to-Video](#image-to-video-cogvideox)
  - [Audio Generation](#audio-generation-musicgen)
- [Request/Response Models](#requestresponse-models)
- [Error Handling](#error-handling)
- [Performance & Cost](#performance--cost)
- [Examples](#examples)

---

## Overview

This API provides GPU-accelerated AI generation for:
- **Images** - FLUX.2 [dev] (32B params, FP8 quantized)
- **Videos** - Mochi 1 (text-to-video) and CogVideoX-5B (image-to-video)
- **Audio** - MusicGen Large (3.3B params)

All endpoints are **asynchronous** - they return immediately with a `job_id` and process in the background. Use the job tracking system (Inngest + SSE) to monitor progress.

---

## Authentication

Currently, the API does not require authentication. In production, configure authentication through Modal secrets and add middleware.

---

## Endpoints

### Health Check

#### `GET /`

Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "app": "ai-video-gen-direct",
  "gpu": "A100-80GB",
  "implementation": "Direct (no ComfyUI)"
}
```

---

#### `GET /health`

Detailed health check with GPU information.

**Response:**
```json
{
  "status": "healthy",
  "cuda_available": true,
  "cuda_device_count": 1,
  "cuda_device_name": "NVIDIA A100-SXM4-80GB",
  "models_path": "/models",
  "implementation": "Direct (Diffusers + AudioCraft)"
}
```

---

### Image Generation (FLUX.2)

#### `POST /generate/image`

Generate high-quality images using FLUX.2 [dev] with FP8 quantization.

**Request Body:**
```json
{
  "job_id": "unique-job-id",
  "prompt": "A serene mountain landscape at sunset, photorealistic, 8k",
  "model": "flux2-dev",
  "parameters": {
    "width": 1024,
    "height": 1024,
    "steps": 50,
    "cfg_scale": 3.5,
    "seed": null
  }
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `job_id` | `string` | *required* | Unique identifier for tracking |
| `prompt` | `string` | *required* | Text description of desired image |
| `model` | `string` | `"flux2-dev"` | Model identifier |
| `parameters.width` | `int` | `1024` | Image width (multiple of 16, max 2048) |
| `parameters.height` | `int` | `1024` | Image height (multiple of 16, max 2048) |
| `parameters.steps` | `int` | `50` | Inference steps (20-100) |
| `parameters.cfg_scale` | `float` | `3.5` | Classifier-free guidance (1.0-10.0) |
| `parameters.seed` | `int` | `null` | Random seed for reproducibility |

**Response:**
```json
{
  "job_id": "unique-job-id",
  "status": "queued",
  "message": "Image generation started"
}
```

**Performance:**
- Cold start: 45-60s
- Warm start: 15-25s
- VRAM: ~15GB
- Cost: $0.01-0.02 per image

**Output:**
- Format: PNG
- Storage: Cloudflare R2 (`images/` folder)
- URL: Available via job completion event

---

### Text-to-Video (Mochi)

#### `POST /generate/video/text2video`

Generate videos from text prompts using Mochi 1.

**Request Body:**
```json
{
  "job_id": "unique-job-id",
  "prompt": "A cat walking in a garden, cinematic lighting",
  "model": "mochi-1",
  "parameters": {
    "num_frames": 84,
    "steps": 200,
    "guidance_scale": 4.5,
    "negative_prompt": "blurry, low quality",
    "seed": null
  }
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `job_id` | `string` | *required* | Unique identifier for tracking |
| `prompt` | `string` | *required* | Text description of desired video |
| `model` | `string` | `"mochi-1"` | Model identifier |
| `parameters.num_frames` | `int` | `84` | Number of frames (49-163), 84 = ~2.8s @ 30fps |
| `parameters.steps` | `int` | `200` | Inference steps (100-300, quality optimized) |
| `parameters.guidance_scale` | `float` | `4.5` | CFG scale (3.0-6.0) |
| `parameters.negative_prompt` | `string` | `""` | Negative prompt for unwanted elements |
| `parameters.seed` | `int` | `null` | Random seed for reproducibility |

**Response:**
```json
{
  "job_id": "unique-job-id",
  "status": "queued",
  "message": "Text-to-video generation started"
}
```

**Performance:**
- Processing time: 4-6 minutes (84 frames)
- VRAM: ~22GB (with CPU offload + VAE tiling)
- Cost: ~$0.125 per video
- Resolution: 848×480

**Output:**
- Format: MP4
- FPS: 30
- Duration: ~2.8s (84 frames)
- Storage: Cloudflare R2 (`videos/` folder)

---

### Image-to-Video (CogVideoX)

#### `POST /generate/video/img2video`

Animate still images using CogVideoX-5B.

**Request Body:**
```json
{
  "job_id": "unique-job-id",
  "image_url": "https://example.com/image.jpg",
  "prompt": "The image comes to life with gentle movement",
  "model": "cogvideox-5b",
  "parameters": {
    "num_frames": 49,
    "steps": 50,
    "guidance_scale": 6.0,
    "seed": null
  }
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `job_id` | `string` | *required* | Unique identifier for tracking |
| `image_url` | `string` | *required* | URL or path to source image |
| `prompt` | `string` | *required* | Description of desired animation |
| `model` | `string` | `"cogvideox-5b"` | Model identifier |
| `parameters.num_frames` | `int` | `49` | Number of frames (49 = 6s @ 8fps) |
| `parameters.steps` | `int` | `50` | Inference steps (30-100) |
| `parameters.guidance_scale` | `float` | `6.0` | CFG scale (4.0-8.0) |
| `parameters.seed` | `int` | `null` | Random seed for reproducibility |

**Response:**
```json
{
  "job_id": "unique-job-id",
  "status": "queued",
  "message": "Image-to-video generation started"
}
```

**Performance:**
- Processing time: 90-180s (FP16 mode)
- VRAM: ~5GB (optimized from 26GB!)
- Cost: $0.08-0.12 per video
- Resolution: 720×480 (upscaled from 480×320)

**Output:**
- Format: MP4
- FPS: 8
- Duration: ~6s (49 frames)
- Storage: Cloudflare R2 (`videos/` folder)

---

### Audio Generation (MusicGen)

#### `POST /generate/audio`

Generate music/audio from text descriptions using MusicGen Large.

**Request Body:**
```json
{
  "job_id": "unique-job-id",
  "prompt": "upbeat electronic dance music with heavy bass",
  "model": "musicgen-large",
  "parameters": {
    "duration": 30.0,
    "temperature": 1.0,
    "cfg_coef": 3.0
  }
}
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `job_id` | `string` | *required* | Unique identifier for tracking |
| `prompt` | `string` | *required* | Text description of desired audio |
| `model` | `string` | `"musicgen-large"` | Model identifier |
| `parameters.duration` | `float` | `30.0` | Audio duration in seconds (max 30) |
| `parameters.temperature` | `float` | `1.0` | Sampling temperature (0.5-1.5) |
| `parameters.cfg_coef` | `float` | `3.0` | Classifier-free guidance (1.0-5.0) |

**Response:**
```json
{
  "job_id": "unique-job-id",
  "status": "queued",
  "message": "Audio generation started (first run may take longer due to model download)"
}
```

**Performance:**
- Processing time: 15-30s (30s audio, warm)
- First run: +60-90s (model download, ~16GB)
- VRAM: ~16GB
- Cost: <$0.01 per generation

**Output:**
- Format: WAV
- Sample rate: 32kHz
- Channels: Stereo
- Storage: Cloudflare R2 (`audio/` folder)

**Prompt Examples:**
- `"upbeat electronic dance music with heavy bass"`
- `"calm acoustic guitar melody"`
- `"epic orchestral soundtrack"`
- `"lo-fi hip hop beat"`
- `"80s pop track with bassy drums and synth"`

---

## Request/Response Models

### ImageGenerationRequest
```typescript
{
  job_id: string;
  prompt: string;
  model?: string = "flux2-dev";
  parameters?: {
    width?: number = 1024;
    height?: number = 1024;
    steps?: number = 50;
    cfg_scale?: number = 3.5;
    seed?: number | null = null;
  };
}
```

### VideoText2VideoRequest
```typescript
{
  job_id: string;
  prompt: string;
  model?: string = "mochi-1";
  parameters?: {
    num_frames?: number = 84;
    steps?: number = 200;
    guidance_scale?: number = 4.5;
    negative_prompt?: string = "";
    seed?: number | null = null;
  };
}
```

### VideoImg2VideoRequest
```typescript
{
  job_id: string;
  image_url: string;
  prompt: string;
  model?: string = "cogvideox-5b";
  parameters?: {
    num_frames?: number = 49;
    steps?: number = 50;
    guidance_scale?: number = 6.0;
    seed?: number | null = null;
  };
}
```

### AudioGenerationRequest
```typescript
{
  job_id: string;
  prompt: string;
  model?: string = "musicgen-large";
  parameters?: {
    duration?: number = 30.0;
    temperature?: number = 1.0;
    cfg_coef?: number = 3.0;
  };
}
```

### GenerationResponse
```typescript
{
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  message: string;
}
```

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| `200` | Success - job queued |
| `400` | Bad Request - invalid parameters |
| `500` | Internal Server Error - processing failed |

**Error Response:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Errors:**
- Invalid dimensions (not multiples of 16 for FLUX.2)
- Missing required fields (`job_id`, `prompt`)
- Invalid parameter ranges
- GPU out of memory (rare with LRU eviction)

---

## Performance & Cost

### Processing Times (p95, warm container)

| Model | Operation | Time | Notes |
|-------|-----------|------|-------|
| FLUX.2 | 1024×1024, 50 steps | 15-25s | Cold: +30-45s |
| Mochi | 84 frames, 200 steps | 4-6 min | Quality optimized |
| CogVideoX | 49 frames, 50 steps | 90-180s | FP16 mode |
| MusicGen | 30s audio | 15-30s | First run: +60-90s |

### Cost Estimates (A100-80GB @ $2.50/hr)

| Model | Cost per Generation | Notes |
|-------|---------------------|-------|
| FLUX.2 | $0.01-0.02 | Fast inference |
| Mochi | ~$0.125 | Slightly over target, optimizable |
| CogVideoX | $0.08-0.12 | Within target range |
| MusicGen | <$0.01 | Very efficient |

### VRAM Usage

| Model | VRAM | Optimization |
|-------|------|--------------|
| FLUX.2 | ~15GB | FP8 quantization |
| Mochi | ~22GB | CPU offload + VAE tiling |
| CogVideoX | ~5GB | Sequential offload + tiling |
| MusicGen | ~16GB | Standard |

**Total VRAM Budget:** 58GB / 80GB available
**Multi-Model Support:** LRU eviction manages up to 4 models simultaneously

---

## Examples

### cURL Examples

**1. Generate Image**
```bash
curl -X POST https://your-url/generate/image \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "img-001",
    "prompt": "A futuristic city at night, neon lights, cyberpunk style",
    "parameters": {
      "width": 1024,
      "height": 1024,
      "steps": 50,
      "cfg_scale": 3.5
    }
  }'
```

**2. Generate Text-to-Video**
```bash
curl -X POST https://your-url/generate/video/text2video \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "vid-001",
    "prompt": "A dolphin jumping out of the ocean at sunset",
    "parameters": {
      "num_frames": 84,
      "steps": 200,
      "guidance_scale": 4.5
    }
  }'
```

**3. Generate Image-to-Video**
```bash
curl -X POST https://your-url/generate/video/img2video \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "i2v-001",
    "image_url": "https://example.com/portrait.jpg",
    "prompt": "The person smiles and waves",
    "parameters": {
      "num_frames": 49,
      "steps": 50
    }
  }'
```

**4. Generate Audio**
```bash
curl -X POST https://your-url/generate/audio \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "audio-001",
    "prompt": "epic orchestral soundtrack with dramatic strings",
    "parameters": {
      "duration": 30.0,
      "cfg_coef": 3.0
    }
  }'
```

### Python Client Example

```python
import requests
import uuid

API_URL = "https://your-url"

def generate_image(prompt: str, **params):
    response = requests.post(
        f"{API_URL}/generate/image",
        json={
            "job_id": str(uuid.uuid4()),
            "prompt": prompt,
            "parameters": params
        }
    )
    return response.json()

# Example usage
result = generate_image(
    prompt="A beautiful sunset over the ocean",
    width=1024,
    height=1024,
    steps=50
)

print(f"Job queued: {result['job_id']}")
print(f"Status: {result['status']}")
```

### JavaScript/TypeScript Client Example

```typescript
const API_URL = "https://your-url";

async function generateImage(prompt: string, params = {}) {
  const response = await fetch(`${API_URL}/generate/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: crypto.randomUUID(),
      prompt,
      parameters: params
    })
  });

  return await response.json();
}

// Example usage
const result = await generateImage(
  "A serene mountain landscape at sunset",
  { width: 1024, height: 1024, steps: 50 }
);

console.log(`Job queued: ${result.job_id}`);
console.log(`Status: ${result.status}`);
```

---

## Job Tracking

Jobs are processed asynchronously. To track progress:

1. **Database Polling** - Query `generations` table by `job_id`
2. **Inngest Events** - Subscribe to progress events via SSE endpoint
3. **Modal Logs** - Check function logs in Modal dashboard

**SSE Endpoint (Frontend):**
```
GET /api/generation/{job_id}/stream
```

**Progress Events:**
- `generation/progress` - Progress updates (0-100%)
- `generation/completed` - Job finished successfully
- `generation/failed` - Job failed with error

**Database Schema:**
```sql
SELECT
  id,
  status,           -- 'pending' | 'processing' | 'completed' | 'failed'
  output_url,       -- R2 public URL (when completed)
  processing_time_ms,
  error             -- Error message (when failed)
FROM generations
WHERE id = 'job-id';
```

---

## Rate Limiting & Quotas

Currently no rate limiting is enforced. In production, implement:

- **Per-user limits** - 10 generations/day (free), unlimited (pro)
- **Concurrent jobs** - Max 3 simultaneous generations per user
- **Queue management** - FIFO queue with priority tiers

---

## Model Details

### FLUX.2 [dev]
- **Repository:** `black-forest-labs/FLUX.1-dev`
- **Parameters:** 32B
- **Precision:** FP8 (quantized from BF16)
- **Features:** High-quality image generation, fast inference

### Mochi 1
- **Repository:** `genmo/mochi-1-preview`
- **Parameters:** 10B
- **Optimizations:** CPU offload, VAE tiling
- **Features:** Text-to-video, quality-optimized (84 frames default)

### CogVideoX-5B
- **Repository:** `THUDM/CogVideoX-5b-I2V`
- **Parameters:** 5B
- **Optimizations:** Sequential offload, VAE tiling, FP16
- **Features:** Image-to-video with excellent VRAM efficiency

### MusicGen Large
- **Repository:** `facebook/musicgen-large`
- **Parameters:** 3.3B
- **Library:** Meta AudioCraft (official implementation)
- **Features:** High-quality music generation, loudness normalization

---

## Support & Monitoring

- **Modal Dashboard:** https://modal.com/apps
- **Logs:** `modal function logs ai-video-gen-direct.<function-name>`
- **Billing:** https://modal.com/billing
- **Documentation:** This file

---

## Changelog

### v2.0.0 (Current)
- ✨ Direct implementation without ComfyUI
- ✨ All 4 models implemented (FLUX.2, Mochi, CogVideoX, MusicGen)
- ✨ LRU model management for 80GB VRAM
- ✨ FastAPI integration with async job spawning
- ✨ Progress callbacks via Inngest
- ✨ A100-80GB GPU support
- ✨ uv package manager for faster builds

---

**Last Updated:** 2025-01-XX
**Maintainer:** AI Video Generation Team
