# Modal Backend - AI Video Generation Platform

This directory contains the Modal backend for GPU-accelerated AI image, video, and audio generation.

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Next.js    │─────▶│   Inngest    │─────▶│   Modal     │
│  Frontend   │      │  (Workflow)  │      │  (A100 GPU) │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      ▼
                            │              ┌──────────────┐
                            │              │  ComfyUI +   │
                            │              │  FLUX.2      │
                            │              └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │    Neon DB   │      │ Cloudflare  │
                     │  (Metadata)  │      │  R2 (Media) │
                     └──────────────┘      └─────────────┘
```

## Phase 1B Status

### ✅ Completed
- [x] Directory structure created
- [x] Requirements.txt with all dependencies
- [x] Main.py with Modal app configuration (A100 80GB GPU)
- [x] API endpoints (FastAPI)
- [x] Pydantic schemas for request/response validation
- [x] Model downloader and manager (with LRU eviction)
- [x] ComfyUI runner (headless execution)
- [x] R2 storage integration
- [x] Inngest event emission
- [x] Placeholder FLUX.2 workflow JSON

### ⏳ To Complete (Requires User Action)
- [ ] Create Modal account at https://modal.com
- [ ] Install Modal CLI: `pip install modal`
- [ ] Authenticate: `modal token new`
- [ ] Create Modal secrets for R2 and Inngest credentials
- [ ] Create actual ComfyUI workflow and export JSON
- [ ] Download FLUX.2 model to Modal Volume
- [ ] Deploy and test on Modal infrastructure

## Quick Start

### 1. Install Modal CLI

```bash
# Install Modal
pip install modal

# Authenticate with Modal
modal token new
```

This will open a browser window to authenticate with your Modal account.

### 2. Set Up Modal Secrets

Modal uses secrets to manage environment variables securely. Create two secrets:

**R2 Credentials:**
```bash
modal secret create r2-credentials \
  R2_ACCOUNT_ID=your-account-id \
  R2_ACCESS_KEY_ID=your-access-key \
  R2_SECRET_ACCESS_KEY=your-secret-key \
  R2_BUCKET_NAME=ai-video-gen-outputs \
  R2_PUBLIC_DOMAIN=your-bucket.r2.dev
```

**Inngest Credentials:**
```bash
modal secret create inngest-credentials \
  INNGEST_EVENT_KEY=your-inngest-event-key \
  INNGEST_API_URL=https://inn.gs/e/YOUR_EVENT_KEY
```

### 3. Create Modal Volume for Models

```bash
# Create volume (will be created automatically on first deploy)
modal volume create ai-models-volume
```

### 4. Download Models to Modal Volume

```bash
# Run the model download function
modal run main.py::download_models
```

This will download FLUX.2 dev model and apply FP8 quantization (~12GB VRAM).
**Warning:** This will take 30-60 minutes and incur Modal storage costs (~$12/month for 120GB).

### 5. Deploy to Modal

```bash
# Deploy the app
modal deploy main.py
```

This will deploy your FastAPI endpoints and GPU functions to Modal.

### 6. Get API Endpoint

After deployment, Modal will provide a URL like:
```
https://your-username--ai-video-gen-fastapi-app.modal.run
```

Save this URL - you'll need it for the frontend `MODAL_API_URL` environment variable.

## Project Structure

```
modal_app/
├── main.py                      # Modal app entry + GPU config
├── api.py                       # FastAPI endpoints
├── models.py                    # Model download/loading/FP8 quantization
├── comfy_runner.py              # ComfyUI executor
├── storage.py                   # R2 upload logic
├── events.py                    # Inngest event emission
├── schemas.py                   # Pydantic request/response models
├── requirements.txt             # Python dependencies
├── workflows/                   # ComfyUI workflow JSONs
│   └── flux2_text2img.json     # FLUX.2 text-to-image workflow
└── README.md                    # This file
```

## Key Features

### GPU Configuration
- **GPU:** A100 80GB (single GPU)
- **Idle Timeout:** 5 minutes (keeps container warm)
- **Max Timeout:** 15 minutes per generation
- **RAM:** 32GB
- **Cost:** ~$2.50/hour when running

### Model Management
- **FLUX.2 dev:** 12GB VRAM (FP8 quantized from 37GB)
- **LRU Eviction:** Automatically unloads models when VRAM full
- **Modal Volume:** Zero-latency model access (~$12/month for 120GB)

### Performance Targets (Phase 1B)
- Cold start: <45 seconds
- Warm start: <20 seconds
- Cost per image: <$0.02

## API Endpoints

### Health Check
```bash
GET /health
```

Returns service status.

### Generate Image
```bash
POST /generate/image
Content-Type: application/json

{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "A serene mountain landscape at sunset",
  "model": "flux2-dev",
  "parameters": {
    "steps": 28,
    "cfg_scale": 3.5,
    "width": 1024,
    "height": 1024,
    "seed": 42
  }
}
```

Returns immediately with job status. Progress is tracked via Inngest events.

### Get Job Status
```bash
GET /job/{job_id}
```

Returns job status (note: real-time tracking via Inngest events recommended).

## Testing Locally (Without GPU)

You can test the FastAPI endpoints locally without GPU:

```bash
cd modal_app
pip install -r requirements.txt
python api.py
```

This will start a local FastAPI server at http://localhost:8000.

**Note:** Actual image generation requires Modal GPU infrastructure.

## Creating ComfyUI Workflows

The placeholder workflow (`workflows/flux2_text2img.json`) must be replaced with a real ComfyUI workflow:

1. **Install ComfyUI locally:**
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI
   cd ComfyUI
   pip install -r requirements.txt
   ```

2. **Download FLUX.2 model:**
   - Get FLUX.2 dev from Hugging Face: `black-forest-labs/FLUX.2-dev`
   - Place in `ComfyUI/models/checkpoints/`

3. **Create workflow in ComfyUI GUI:**
   ```bash
   python main.py
   # Open http://localhost:8188
   ```

4. **Build the workflow:**
   - Load Checkpoint (FLUX.2 dev)
   - CLIP Text Encode (positive prompt)
   - Empty Latent Image (resolution)
   - KSampler (steps, CFG, seed)
   - VAE Decode
   - Save Image

5. **Export workflow:**
   - Click "Save (API Format)"
   - Copy JSON to `modal_app/workflows/flux2_text2img.json`

## Monitoring and Debugging

### View Modal Logs
```bash
modal app logs ai-video-gen
```

### Monitor VRAM Usage
```bash
# In your Modal function
import torch
print(f"VRAM allocated: {torch.cuda.memory_allocated() / 1e9:.2f}GB")
print(f"VRAM reserved: {torch.cuda.memory_reserved() / 1e9:.2f}GB")
```

### Test Event Emission
Set `INNGEST_EVENT_KEY` locally and run:
```bash
python events.py
```

## Cost Optimization Tips

1. **Container Warm-up:** Set `container_idle_timeout=300` (5 min) for burst traffic
2. **Model Pre-loading:** Load frequently-used models on container start
3. **Batch Requests:** Process multiple images in one GPU session if possible
4. **Monitor Costs:** Check Modal dashboard regularly

## Common Issues

### Issue: "Modal command not found"
**Solution:** Install Modal CLI: `pip install modal`

### Issue: "Secrets not found"
**Solution:** Create Modal secrets (see Step 2 above)

### Issue: "Workflow file not found"
**Solution:** Create ComfyUI workflow and export JSON (see Creating ComfyUI Workflows section)

### Issue: "CUDA out of memory"
**Solution:** Check VRAM usage, ensure FP8 quantization is working

### Issue: "R2 upload failed"
**Solution:** Verify R2 credentials and bucket exists

## Next Steps (Phase 1C)

Once Phase 1B is complete and deployed:

1. ✅ Modal backend deployed and tested
2. 🔜 Frontend image generation UI
3. 🔜 SSE progress streaming
4. 🔜 End-to-end image generation flow

## Support

- **Modal Docs:** https://modal.com/docs
- **ComfyUI Docs:** https://github.com/comfyanonymous/ComfyUI
- **FLUX.2 Docs:** https://huggingface.co/black-forest-labs/FLUX.2-dev

---

**Phase 1B Implementation:** Complete (code-ready, deployment pending user credentials)
