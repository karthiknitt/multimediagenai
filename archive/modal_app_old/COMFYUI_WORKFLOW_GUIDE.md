# ComfyUI Workflow Creation Guide

This guide helps you create the FLUX.2 text-to-image workflow for the Modal backend.

---

## Why We Need This

The Modal backend executes **ComfyUI workflows** (JSON files) to generate images. ComfyUI is a node-based UI for AI generation, similar to Blender's node editor or Unreal Engine's Blueprint system.

**Current state:** We have a placeholder workflow JSON that must be replaced with a real one.

---

## Option 1: Quick Start (Use Pre-made Workflow)

If you want to skip creating the workflow yourself, you can use a pre-made FLUX.2 workflow from the ComfyUI community.

### Steps:

1. **Find a FLUX.2 workflow:**
   - Visit https://comfyworkflows.com
   - Search for "FLUX.2 dev text to image"
   - Download a simple workflow JSON

2. **Validate the workflow:**
   - Ensure it has these nodes:
     - CheckpointLoaderSimple (FLUX.2 model)
     - CLIPTextEncode (prompt input)
     - EmptyLatentImage (resolution)
     - KSampler (generation settings)
     - VAEDecode (decode latent)
     - SaveImage (output)

3. **Replace the placeholder:**
   ```bash
   # Copy downloaded workflow
   cp downloaded_workflow.json modal_app/workflows/flux2_text2img.json
   ```

4. **Test with Modal:**
   ```bash
   modal deploy main.py
   ```

---

## Option 2: Create Your Own Workflow (Recommended)

Creating your own workflow gives you full control and understanding.

### Prerequisites

- **Python 3.10+** installed
- **Git** installed
- **10GB free disk space**
- **Internet connection**

---

## Step-by-Step Workflow Creation

### Step 1: Install ComfyUI Locally (15 minutes)

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Install additional packages for FLUX.2
pip install diffusers transformers accelerate safetensors
```

**Verify installation:**
```bash
python main.py
```

You should see:
```
Starting server
To see the GUI go to: http://127.0.0.1:8188
```

Open http://127.0.0.1:8188 in your browser.

### Step 2: Download FLUX.2 Model (30-60 minutes)

**Option A: Via Hugging Face CLI (Recommended)**

```bash
# Install Hugging Face CLI
pip install huggingface-hub

# Login (requires HF account)
huggingface-cli login

# Download FLUX.2 dev
huggingface-cli download black-forest-labs/FLUX.2-dev \
  --local-dir ComfyUI/models/checkpoints/flux2-dev \
  --exclude "*.md" "*.txt"
```

**Option B: Manual Download**

1. Go to https://huggingface.co/black-forest-labs/FLUX.2-dev
2. Click "Files and versions"
3. Download these files:
   - `flux2-dev.safetensors` (main model file)
   - `model_index.json`
   - VAE files
4. Place in `ComfyUI/models/checkpoints/flux2-dev/`

**Verify model files:**
```bash
ls -lh ComfyUI/models/checkpoints/flux2-dev/
# Should see flux2-dev.safetensors (~32GB)
```

### Step 3: Create Workflow in ComfyUI GUI (30 minutes)

1. **Open ComfyUI:**
   ```bash
   cd ComfyUI
   python main.py
   # Open http://127.0.0.1:8188
   ```

2. **Clear the canvas:**
   - Right-click → "Clear Canvas"

3. **Add CheckpointLoaderSimple node:**
   - Right-click canvas → Add Node → loaders → CheckpointLoaderSimple
   - In the node, select `flux2-dev.safetensors` from dropdown

4. **Add CLIPTextEncode node (positive prompt):**
   - Right-click → Add Node → conditioning → CLIPTextEncode
   - Connect `CLIP` output from CheckpointLoader to `clip` input
   - In the text field, enter: `A serene mountain landscape at sunset`

5. **Add CLIPTextEncode node (negative prompt):**
   - Add another CLIPTextEncode node
   - Connect same `CLIP` output
   - Leave text field empty or enter: `blurry, low quality`

6. **Add EmptyLatentImage node:**
   - Right-click → Add Node → latent → EmptyLatentImage
   - Set width: 1024
   - Set height: 1024
   - Set batch_size: 1

7. **Add KSampler node:**
   - Right-click → Add Node → sampling → KSampler
   - Connect inputs:
     - `model` from CheckpointLoader
     - `positive` from first CLIPTextEncode
     - `negative` from second CLIPTextEncode
     - `latent_image` from EmptyLatentImage
   - Set parameters:
     - seed: 42 (or random)
     - steps: 28
     - cfg: 3.5
     - sampler_name: euler
     - scheduler: normal
     - denoise: 1.0

8. **Add VAEDecode node:**
   - Right-click → Add Node → latent → VAEDecode
   - Connect:
     - `samples` from KSampler output
     - `vae` from CheckpointLoader

9. **Add SaveImage node:**
   - Right-click → Add Node → image → SaveImage
   - Connect `images` from VAEDecode
   - Set filename_prefix: `flux2_output`

### Step 4: Test the Workflow (5 minutes)

1. **Queue the workflow:**
   - Click "Queue Prompt" button (top right)

2. **Monitor progress:**
   - Watch the progress bar
   - Should take 20-60 seconds

3. **View output:**
   - Click "View" button when complete
   - Image should appear in output panel

4. **Verify quality:**
   - Image should be 1024×1024
   - Should match the prompt
   - Should be high quality

### Step 5: Export Workflow as JSON (2 minutes)

1. **Save workflow:**
   - Click "Save" button (top right)
   - Name it: `flux2_text2img`

2. **Export as API format:**
   - Click "Settings" gear icon (top right)
   - Enable "Developer Mode"
   - Click "Save (API Format)" button
   - Save as `flux2_text2img_api.json`

3. **Copy to Modal app:**
   ```bash
   cp flux2_text2img_api.json /path/to/modal_app/workflows/flux2_text2img.json
   ```

### Step 6: Verify JSON Structure (3 minutes)

Open the exported JSON and verify it has this structure:

```json
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "flux2-dev.safetensors"
    }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "A serene mountain landscape...",
      "clip": ["1", 1]
    }
  },
  ...
}
```

**Key things to check:**
- ✅ Each node has a `class_type`
- ✅ Inputs reference other nodes by ID
- ✅ Text prompt is in a CLIPTextEncode node
- ✅ Resolution is in EmptyLatentImage node
- ✅ Steps, CFG, seed are in KSampler node

---

## Step 7: Test with Modal (10 minutes)

Now that you have the workflow, test it with Modal:

1. **Deploy Modal app:**
   ```bash
   cd modal_app
   modal deploy main.py
   ```

2. **Trigger a test generation:**
   ```bash
   curl -X POST https://your-app.modal.run/generate/image \
     -H "Content-Type: application/json" \
     -d '{
       "job_id": "test-workflow-001",
       "prompt": "A futuristic city at night",
       "model": "flux2-dev",
       "parameters": {
         "steps": 28,
         "cfg_scale": 3.5,
         "width": 1024,
         "height": 1024,
         "seed": 42
       }
     }'
   ```

3. **Monitor logs:**
   ```bash
   modal app logs ai-video-gen --follow
   ```

   You should see:
   - Container starting
   - Model loading
   - Workflow executing
   - Progress updates (0-100%)
   - R2 upload
   - Completion event

4. **Verify output:**
   - Check R2 bucket for generated image
   - Verify public URL is accessible

---

## Workflow Customization

### Adjusting Parameters

The workflow JSON has placeholder values that get replaced at runtime:

| Parameter | Location in JSON | Description |
|-----------|-----------------|-------------|
| `prompt` | CLIPTextEncode → text | Text description |
| `width` | EmptyLatentImage → width | Image width (512-2048) |
| `height` | EmptyLatentImage → height | Image height (512-2048) |
| `steps` | KSampler → steps | Denoising steps (20-50) |
| `cfg_scale` | KSampler → cfg | Guidance scale (1-20) |
| `seed` | KSampler → seed | Random seed |

These are substituted by `comfy_runner.py::substitute_parameters()`.

### Adding Advanced Features

**Example: Add LoRA support**

1. In ComfyUI GUI:
   - Add LoRALoader node
   - Connect between CheckpointLoader and KSampler
   - Set LoRA weight parameter

2. Export as JSON

3. Update `comfy_runner.py` to substitute LoRA parameters

**Example: Add upscaling**

1. Add these nodes:
   - UpscaleModelLoader
   - ImageUpscaleWithModel
   - Connect after VAEDecode

2. Export and test

---

## Troubleshooting

### Issue: "FLUX.2 model not found"

**Solution:**
- Verify model downloaded: `ls ComfyUI/models/checkpoints/flux2-dev/`
- Check model name in workflow matches filename
- Try redownloading model

### Issue: "CUDA out of memory"

**Solution:**
- FLUX.2 requires 12GB+ VRAM
- If testing locally, reduce resolution to 512×512
- Or use FLUX.2 schnell (faster, less VRAM)

### Issue: "Workflow generation failed"

**Solution:**
- Test workflow in ComfyUI GUI first
- Check all nodes are connected
- Verify model paths are correct
- Check ComfyUI logs: `ComfyUI/comfyui.log`

### Issue: "Modal can't find workflow"

**Solution:**
- Verify file is at `modal_app/workflows/flux2_text2img.json`
- Check file is valid JSON: `python -m json.tool workflow.json`
- Redeploy: `modal deploy main.py`

### Issue: "Parameters not substituting"

**Solution:**
- Check node IDs in JSON match `comfy_runner.py` expectations
- Update `substitute_parameters()` function to match your workflow structure
- Add logging to see what's being substituted

---

## Alternative: Use FLUX.2 Schnell (Faster)

FLUX.2 schnell is a faster variant (4 steps vs 28 steps):

**Pros:**
- 4-6x faster generation
- Lower VRAM usage
- Good for testing

**Cons:**
- Lower quality than dev
- Less flexibility

**To use:**
1. Download FLUX.2 schnell model
2. Create separate workflow: `flux2_schnell_text2img.json`
3. Set steps to 4 in workflow
4. Update API to support model selection

---

## Pre-made Workflow JSON (Emergency Fallback)

If you can't create a workflow, here's a basic template (may need adjustment):

```json
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {"ckpt_name": "flux2-dev.safetensors"}
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {"text": "PROMPT_PLACEHOLDER", "clip": ["1", 1]}
  },
  "3": {
    "class_type": "EmptyLatentImage",
    "inputs": {"width": 1024, "height": 1024, "batch_size": 1}
  },
  "4": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 42,
      "steps": 28,
      "cfg": 3.5,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["1", 0],
      "positive": ["2", 0],
      "negative": ["2", 0],
      "latent_image": ["3", 0]
    }
  },
  "5": {
    "class_type": "VAEDecode",
    "inputs": {"samples": ["4", 0], "vae": ["1", 2]}
  },
  "6": {
    "class_type": "SaveImage",
    "inputs": {"filename_prefix": "flux2", "images": ["5", 0]}
  }
}
```

**Warning:** This is untested and may not work without adjustment.

---

## Resources

- **ComfyUI Docs:** https://github.com/comfyanonymous/ComfyUI
- **ComfyUI Workflows:** https://comfyworkflows.com
- **FLUX.2 on HuggingFace:** https://huggingface.co/black-forest-labs/FLUX.2-dev
- **ComfyUI Discord:** https://discord.gg/comfyui (get help from community)

---

## Estimated Time

| Task | Time |
|------|------|
| Install ComfyUI | 15 min |
| Download FLUX.2 | 30-60 min |
| Create workflow | 30 min |
| Test workflow | 5 min |
| Export JSON | 2 min |
| Test with Modal | 10 min |
| **Total** | **1.5-2 hours** |

---

## Next Steps

Once you have the workflow JSON:

1. ✅ Replace placeholder workflow
2. ✅ Deploy to Modal
3. ✅ Test image generation
4. 🔜 Proceed to Phase 1C (Frontend)

---

**Good luck!** If you get stuck, check the ComfyUI Discord or GitHub issues.
