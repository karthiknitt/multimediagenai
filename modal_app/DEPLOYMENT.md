# Modal Deployment Guide - Step by Step

This guide walks you through deploying the Modal backend from scratch.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Modal account created (https://modal.com)
- [ ] Cloudflare account with R2 bucket created
- [ ] Inngest account with event key
- [ ] Python 3.11+ installed
- [ ] Git installed

## Step-by-Step Deployment

### Step 1: Create Modal Account (5 minutes)

1. Go to https://modal.com
2. Click "Sign Up" and create an account
3. Verify your email
4. Add payment method (required for GPU access)
   - Modal offers $30 free credits for new users
   - A100 80GB costs ~$2.50/hour when running

**Cost Estimate:**
- Development (2-3 hours/day): ~$50/month
- Production (10 images/day): ~$10/month
- Production (100 images/day): ~$100/month

### Step 2: Install Modal CLI (2 minutes)

```bash
# Install Modal
pip install modal

# Verify installation
modal --version
```

Expected output: `modal, version X.X.X`

### Step 3: Authenticate with Modal (2 minutes)

```bash
modal token new
```

This will:
1. Open a browser window
2. Ask you to log in to Modal
3. Generate an API token
4. Save it to `~/.modal.toml`

**Verify authentication:**
```bash
modal profile list
```

You should see your profile listed.

### Step 4: Create Modal Secrets (10 minutes)

**Step 4a: Get Hugging Face Access**

1. Go to https://huggingface.co/black-forest-labs/FLUX.2-dev
2. Click "Agree and access repository" to request access
3. Wait for approval (usually instant)

**Step 4b: Create Hugging Face Token**

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `modal-ai-video-gen`
4. Type: **Read** (sufficient for downloading models)
5. Click "Generate token"
6. Copy the token (starts with `hf_...`)

**Step 4c: Create Hugging Face secret in Modal:**

```bash
modal secret create huggingface-secret \
  HF_TOKEN="hf_your_token_here"
```

**Step 4d: Create R2 credentials secret:**

```bash
modal secret create r2-credentials \
  R2_ACCOUNT_ID="your-account-id" \
  R2_ACCESS_KEY_ID="your-access-key" \
  R2_SECRET_ACCESS_KEY="your-secret-key" \
  R2_BUCKET_NAME="ai-video-gen-outputs" \
  R2_PUBLIC_DOMAIN="your-bucket.r2.dev"
```

**Step 4e: Create Inngest credentials secret:**

```bash
modal secret create inngest-credentials \
  INNGEST_EVENT_KEY="your-inngest-event-key" \
  INNGEST_API_URL="https://inn.gs/e/YOUR_EVENT_KEY"
```

**Verify secrets:**
```bash
modal secret list
```

You should see:
- `huggingface-secret`
- `r2-credentials`
- `inngest-credentials`

### Step 5: Create Modal Volume (2 minutes)

```bash
# Create volume for model storage
modal volume create ai-models-volume
```

This creates a persistent volume for storing AI models (120GB).

**Cost:** ~$12/month ($0.10/GB/month)

**Verify volume:**
```bash
modal volume list
```

### Step 6: Download Models (30-60 minutes)

**⚠️ Warning:** This step will download ~120GB of models and incur storage costs.

```bash
cd modal_app

# Deploy the app first (required to run functions)
modal deploy main.py

# Run model download function
modal run main.py::download_models
```

This will:
1. Download FLUX.2 dev model (~32GB)
2. Apply FP8 quantization (37GB → 12GB VRAM)
3. Store in Modal Volume

**Expected output:**
```
Downloading black-forest-labs/FLUX.2-dev...
✓ Model downloaded successfully
Applying FP8 quantization to FLUX.2...
✓ FP8 quantization complete
All models downloaded successfully!
```

**Progress tracking:**
- You can monitor progress in the Modal dashboard
- Check logs: `modal app logs ai-video-gen`

### Step 7: Deploy Modal App (5 minutes)

```bash
cd modal_app

# Deploy the app
modal deploy main.py
```

Expected output:
```
✓ Created objects.
├── 🔨 Created mount /root/modal_app
├── 🔨 Created download_models.
├── 🔨 Created generate_image_task.
└── 🔨 Created web function fastapi_app.

✓ App deployed!

View Deployment: https://modal.com/apps/ap-xxxxx

API Endpoint: https://your-username--ai-video-gen-fastapi-app.modal.run
```

**Save the API endpoint URL!** You'll need it for the frontend.

### Step 8: Test the Deployment (10 minutes)

**Test health check:**
```bash
curl https://your-username--ai-video-gen-fastapi-app.modal.run/health
```

Expected response:
```json
{"status": "healthy", "service": "ai-video-gen-api"}
```

**Test image generation (with dummy job_id):**
```bash
curl -X POST https://your-username--ai-video-gen-fastapi-app.modal.run/generate/image \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-001",
    "prompt": "A serene mountain landscape at sunset",
    "model": "flux2-dev",
    "parameters": {
      "steps": 28,
      "cfg_scale": 3.5,
      "width": 1024,
      "height": 1024
    }
  }'
```

Expected response:
```json
{
  "job_id": "test-001",
  "status": "pending"
}
```

**Monitor the job execution:**
```bash
modal app logs ai-video-gen --follow
```

You should see:
- Container starting
- Model loading
- Image generation progress
- R2 upload
- Inngest events emitted

### Step 9: Verify Performance (15 minutes)

Test cold start and warm start performance:

**Cold start test:**
1. Wait 10 minutes for container to shut down
2. Send a generation request
3. Measure time from request to completion
4. Target: <45 seconds

**Warm start test:**
1. Send a request immediately after first one completes
2. Measure time
3. Target: <20 seconds

**Check VRAM usage:**
```bash
# In Modal logs, look for:
# "Model loaded. Current VRAM usage: 12GB / 75GB"
```

### Step 10: Configure Frontend (5 minutes)

Add the Modal API URL to your frontend `.env.local`:

```bash
# In frontend/.env.local
MODAL_API_URL=https://your-username--ai-video-gen-fastapi-app.modal.run
```

### Step 11: Monitor Costs (Ongoing)

**View costs in Modal dashboard:**
1. Go to https://modal.com/dashboard
2. Click "Usage & Billing"
3. Monitor:
   - GPU hours used
   - Volume storage costs
   - Network egress

**Cost tracking tips:**
- Set up budget alerts in Modal dashboard
- Monitor `container_idle_timeout` (5 min default)
- Check for stuck containers: `modal app list`

## Troubleshooting

### Issue: "No GPU available"
**Cause:** Modal account doesn't have GPU access
**Solution:**
1. Add payment method to Modal account
2. Request GPU access from Modal support (usually instant)

### Issue: "Secrets not found"
**Cause:** Secrets not created or wrong names
**Solution:**
1. Check secret names: `modal secret list`
2. Recreate secrets with exact names: `r2-credentials`, `inngest-credentials`

### Issue: "Volume not found"
**Cause:** Volume not created
**Solution:**
1. Create volume: `modal volume create ai-models-volume`
2. Check volumes: `modal volume list`

### Issue: "Model download timeout"
**Cause:** Download exceeds 15-minute timeout
**Solution:**
1. Increase timeout in `main.py`: `timeout=3600` (1 hour)
2. Redeploy: `modal deploy main.py`
3. Retry download: `modal run main.py::download_models`

### Issue: "R2 upload failed"
**Cause:** Invalid R2 credentials or bucket doesn't exist
**Solution:**
1. Verify R2 bucket exists in Cloudflare dashboard
2. Verify R2 credentials are correct
3. Update secret: `modal secret create r2-credentials ...`

### Issue: "CUDA out of memory"
**Cause:** FP8 quantization not working, or multiple models loaded
**Solution:**
1. Check logs for quantization errors
2. Verify VRAM usage: should be ~12GB for FLUX.2
3. Check `ModelManager` eviction logic

### Issue: "Container idle timeout too short"
**Cause:** Container shuts down between requests
**Solution:**
1. Increase `container_idle_timeout` in `main.py`
2. Trade-off: longer timeout = higher costs but better warm starts

## Maintenance Tasks

### Update Modal App
```bash
# Make changes to code
# Redeploy
modal deploy main.py
```

### View Logs
```bash
# Tail logs
modal app logs ai-video-gen --follow

# View specific time range
modal app logs ai-video-gen --since=1h
```

### List Running Containers
```bash
modal container list
```

### Stop All Containers (Cost Saving)
```bash
modal app stop ai-video-gen
```

### Delete Volume (Warning: Deletes all models)
```bash
modal volume delete ai-models-volume
```

## Production Checklist

Before going to production:

- [ ] Modal account has GPU access
- [ ] Payment method added
- [ ] Budget alerts configured
- [ ] Secrets created and verified
- [ ] Models downloaded and tested
- [ ] Cold start time <45s
- [ ] Warm start time <20s
- [ ] Cost per generation <$0.02
- [ ] R2 uploads working
- [ ] Inngest events emitting correctly
- [ ] Error handling tested
- [ ] Monitoring set up (Sentry)
- [ ] Frontend connected and tested

## Cost Optimization

### Development Tips
1. Use `modal app stop` when not actively developing
2. Keep `container_idle_timeout` low (60s) during development
3. Use `modal run` for one-off tests instead of keeping containers warm

### Production Tips
1. Increase `container_idle_timeout` to 300s (5 min) for warm starts
2. Pre-load FLUX.2 on container start (most common model)
3. Batch multiple requests in one GPU session if possible
4. Monitor and optimize VRAM usage
5. Use Modal's auto-scaling to handle burst traffic

## Next Steps

✅ Modal backend deployed and tested
🔜 Proceed to Phase 1C: Frontend Image Generation UI

---

**Deployment Status:** Ready for user credentials and deployment
**Estimated Setup Time:** 1-2 hours (excluding model download wait time)
**Monthly Cost (Development):** ~$50-75
