# Video Models Deployment Guide

This guide covers downloading and deploying the video generation models (Mochi 1 and CogVideoX-5B) for Phase 1D.

---

## Overview

**Video Models:**
1. **Mochi 1** - Text-to-video generation (10B params, ~18GB)
2. **CogVideoX-5B** - Image-to-video generation (5B params, ~12GB)

**Total Storage:** ~30GB additional (on top of ~37GB for FLUX.2)

**VRAM Usage:**
- Mochi 1: 8-18GB (optimized for A100)
- CogVideoX-5B: ~12GB (optimized)
- Can fit alongside FLUX.2 (12GB) in A100 80GB with model swapping

---

## Prerequisites

1. **Modal Account & Authentication**
   ```bash
   # Install Modal CLI
   pip install modal

   # Authenticate
   modal token new
   ```

2. **Hugging Face Token**
   - Create account at https://huggingface.co
   - Generate token at https://huggingface.co/settings/tokens
   - Accept model licenses:
     - https://huggingface.co/genmo/mochi-1-preview
     - https://huggingface.co/THUDM/CogVideoX-5b

3. **Modal Secrets**
   ```bash
   # Create HuggingFace secret if not already created
   modal secret create huggingface-secret HF_TOKEN=hf_xxxxxxxxxxxxx
   ```

---

## Step 1: Download Video Models

Run the dedicated video models download function:

```bash
modal run main.py::download_video_models
```

**What this does:**
1. Downloads Mochi 1 (~18GB) from `genmo/mochi-1-preview`
2. Downloads CogVideoX-5B (~12GB) from `THUDM/CogVideoX-5b`
3. Saves to Modal Volume at:
   - `/models/mochi/mochi-1-preview/`
   - `/models/cogvideox/CogVideoX-5b/`
4. Commits changes to Volume

**Expected Output:**
```
=== Downloading Video Generation Models ===

1/2: Downloading Mochi 1 text-to-video model...
Downloading Mochi 1 model from genmo/mochi-1-preview...
Mochi 1 downloaded to: /models/mochi/mochi-1-preview
Total model size: 18.42 GB
✓ Mochi 1: /models/mochi/mochi-1-preview

2/2: Downloading CogVideoX-5B image-to-video model...
Downloading CogVideoX-5B model from THUDM/CogVideoX-5b...
CogVideoX-5B downloaded to: /models/cogvideox/CogVideoX-5b
Total model size: 11.87 GB
✓ CogVideoX-5B: /models/cogvideox/CogVideoX-5b

=== All video models downloaded successfully! ===
```

**Download Time:** ~15-30 minutes (depends on network speed)

---

## Step 2: Verify Model Files

Check that models were downloaded correctly:

```bash
modal volume ls ai-models-volume /models/mochi
modal volume ls ai-models-volume /models/cogvideox
```

**Expected Structure:**
```
/models/
├── mochi/
│   └── mochi-1-preview/
│       ├── *.safetensors
│       ├── config.json
│       └── ... (model files)
└── cogvideox/
    └── CogVideoX-5b/
        ├── *.safetensors
        ├── config.json
        └── ... (model files)
```

---

## Step 3: ComfyUI Workflows (Production-Ready)

**Status:** ✅ Production-ready workflows are included in the repository.

The workflow JSON files are based on official tested workflows from Kijai's repositories:

- [modal_app/workflows/mochi_text2video.json](workflows/mochi_text2video.json) - Mochi 1 text-to-video
- [modal_app/workflows/cogvideox_img2video.json](workflows/cogvideox_img2video.json) - CogVideoX image-to-video

### Required ComfyUI Custom Nodes

These custom nodes must be installed in the Modal container image:

1. **ComfyUI-MochiWrapper** (by Kijai)
   - Repository: <https://github.com/kijai/ComfyUI-MochiWrapper>
   - Purpose: Mochi 1 text-to-video model support
   - Nodes used: `MochiTextEncode`, `DownloadAndLoadMochiModel`, `MochiSampler`, `MochiDecodeSpatialTiling`

2. **ComfyUI-CogVideoXWrapper** (by Kijai)
   - Repository: <https://github.com/kijai/ComfyUI-CogVideoXWrapper>
   - Purpose: CogVideoX image-to-video model support
   - Nodes used: `CogVideoTextEncode`, `DownloadAndLoadCogVideoModel`, `CogVideoImageEncode`, `CogVideoSampler`, `CogVideoDecode`

3. **ComfyUI-VideoHelperSuite**
   - Repository: <https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite>
   - Purpose: Video output and encoding
   - Nodes used: `VHS_VideoCombine`

4. **ComfyUI-KJNodes**
   - Repository: <https://github.com/kijai/ComfyUI-KJNodes>
   - Purpose: Image utilities
   - Nodes used: `ImageResizeKJ`

### Workflow Parameters

Both workflows are fully parameterized with placeholder variables:

**Mochi text2video parameters:**

- `{{PROMPT}}` - Text description of the video
- `{{NEGATIVE_PROMPT}}` - What to avoid in generation
- `{{WIDTH}}` - Video width (default: 848, must be multiple of 16)
- `{{HEIGHT}}` - Video height (default: 480, must be multiple of 16)
- `{{NUM_FRAMES}}` - Number of frames (default: 49, range: 25-163)
- `{{FPS}}` - Frames per second (default: 30, options: 24/30)
- `{{SEED}}` - Random seed (default: -1 for random)
- `{{CFG_SCALE}}` - Guidance scale (default: 4.5, range: 1.0-10.0)
- `{{OUTPUT_PREFIX}}` - Output filename prefix
- `{{JOB_ID}}` - Unique job identifier

**CogVideoX img2video parameters:**

- `{{SOURCE_IMAGE}}` - Path to source image file
- `{{PROMPT}}` - Motion/animation description
- `{{NEGATIVE_PROMPT}}` - What to avoid
- `{{WIDTH}}` - Video width (default: 1360, must be multiple of 16)
- `{{HEIGHT}}` - Video height (default: 768, must be multiple of 16)
- `{{NUM_FRAMES}}` - Number of frames (default: 49, range: 25-81)
- `{{FPS}}` - Frames per second (default: 16, options: 8/16/24)
- `{{STEPS}}` - Denoising steps (default: 25, range: 10-50)
- `{{CFG_SCALE}}` - Guidance scale (default: 6.0, range: 1.0-15.0)
- `{{SEED}}` - Random seed (default: 0)
- `{{OUTPUT_PREFIX}}` - Output filename prefix

### Installing Custom Nodes in Modal

The custom nodes will be installed in the Modal container image via `main.py`:

```python
.run_commands(
    # Mochi wrapper
    "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-MochiWrapper.git",
    "cd /comfyui/custom_nodes/ComfyUI-MochiWrapper && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

    # CogVideoX wrapper
    "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-CogVideoXWrapper.git",
    "cd /comfyui/custom_nodes/ComfyUI-CogVideoXWrapper && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

    # Video helper suite
    "cd /comfyui/custom_nodes && git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
    "cd /comfyui/custom_nodes/ComfyUI-VideoHelperSuite && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",

    # KJNodes
    "cd /comfyui/custom_nodes && git clone https://github.com/kijai/ComfyUI-KJNodes.git",
    "cd /comfyui/custom_nodes/ComfyUI-KJNodes && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi || true",
)
```

---

## Step 4: Deploy Video Generation Functions

After creating the workflows, you'll need to:

1. **Create video generation task functions** (similar to `generate_image_task`):
   - `generate_video_text2video_task()` in `main.py`
   - `generate_video_img2video_task()` in `main.py`

2. **Update API endpoints** in `api.py`:
   - Uncomment TODO lines in `/generate/video/text2video`
   - Uncomment TODO lines in `/generate/video/img2video`

3. **Deploy to Modal:**
   ```bash
   modal deploy api.py
   ```

---

## Step 5: Test Video Generation

**Test text2video:**
```bash
curl -X POST https://your-modal-url.modal.run/generate/video/text2video \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-video-001",
    "prompt": "A cat walking through a futuristic city, cinematic lighting",
    "model": "mochi-1",
    "parameters": {
      "duration": 5.4,
      "fps": 30,
      "motion_strength": 0.7,
      "seed": 42
    }
  }'
```

**Test img2video:**
```bash
curl -X POST https://your-modal-url.modal.run/generate/video/img2video \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-video-002",
    "source_image_url": "https://example.com/image.jpg",
    "prompt": "The subject turns their head and smiles",
    "model": "cogvideox-5b",
    "parameters": {
      "duration": 4.0,
      "fps": 24,
      "motion_strength": 0.8,
      "seed": 42
    }
  }'
```

---

## VRAM Management

**Model Loading Strategy:**

The `ModelManager` class in `models.py` uses LRU eviction to manage VRAM:

```python
# Example VRAM usage scenarios:

# Scenario 1: Image generation only
FLUX.2 FP8: 12GB
Total: 12GB / 75GB ✓

# Scenario 2: Text-to-video
FLUX.2 FP8: 12GB (for initial frame generation)
Mochi 1: 18GB
Total: 30GB / 75GB ✓

# Scenario 3: Image-to-video
FLUX.2 FP8: 12GB (kept loaded)
CogVideoX-5B: 12GB
Total: 24GB / 75GB ✓
```

**Model Swapping Logic:**
1. Load FLUX.2 on startup (12GB)
2. When video request comes in:
   - Text2video: Load Mochi 1 (18GB) → Total 30GB
   - Img2video: Load CogVideoX (12GB) → Total 24GB
3. If VRAM limit exceeded, evict least recently used model
4. All models fit comfortably in A100 80GB

---

## Performance Targets

**Generation Times (p95):**
- Mochi text2video (5.4s): <3 minutes
- CogVideoX img2video (4s): <2 minutes

**Cost Targets (A100 80GB @ $2.50/hr):**
- Text2video: $0.06-0.12 per video
- Img2video: $0.08-0.10 per video

**Quality Targets:**
- Mochi: 480p, 30fps, smooth motion
- CogVideoX: Source resolution, 24fps, natural animation

---

## Troubleshooting

### Issue: Model download fails
**Solution:** Check HuggingFace token permissions and model licenses

### Issue: VRAM out of memory
**Solution:** Verify LRU eviction is working, check `ModelManager.current_vram_gb`

### Issue: Workflow execution fails
**Solution:** Verify ComfyUI workflow JSON is valid and all nodes are installed

### Issue: Video quality is poor
**Solution:** Adjust parameters (motion_strength, fps, duration) in workflow

---

## Next Steps

1. ✅ Models downloaded (Step 1)
2. ✅ ComfyUI workflows created (Step 3)
3. ⏳ Install custom nodes in Modal container image
4. ⏳ Implement generation task functions (Step 4)
5. ⏳ Deploy and test (Steps 4-5)
6. ⏳ Frontend integration (Phase 1D.7-1D.9)

---

## Storage Costs

**Modal Volume Pricing:** $0.10/GB/month

**Current Storage:**
- FLUX.2 FP8 + VAE + Text Encoder: ~37GB = $3.70/month
- Mochi 1: ~18GB = $1.80/month
- CogVideoX-5B: ~12GB = $1.20/month
- **Total: ~67GB = $6.70/month**

**Note:** This is significantly cheaper than downloading models on every cold start, which would add 10-30 seconds latency and egress costs.

---

## References

- Mochi 1 Repository: https://huggingface.co/genmo/mochi-1-preview
- CogVideoX-5B Repository: https://huggingface.co/THUDM/CogVideoX-5b
- ComfyUI: https://github.com/comfyanonymous/ComfyUI
- Modal Docs: https://modal.com/docs
