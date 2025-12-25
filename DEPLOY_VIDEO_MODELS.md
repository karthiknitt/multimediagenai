# Deploy and Test Video Models - Quick Start Guide

**Status:** Backend code complete, ready for deployment and testing

This guide walks through deploying the video generation backend and testing it end-to-end.

---

## Prerequisites

1. **Modal account set up** with authentication
2. **HuggingFace token** with access to model repositories
3. **Cloudflare R2** configured with credentials
4. **Database** (Neon PostgreSQL) set up

---

## Step 1: Verify Modal Secrets

Ensure all required secrets are configured:

```bash
# Check existing secrets
modal secret list

# Required secrets:
# - huggingface-secret (HF_TOKEN)
# - r2-credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)
# - database-credentials (DATABASE_URL)
```

If any are missing, create them:

```bash
modal secret create huggingface-secret HF_TOKEN=hf_xxxxxxxxxxxxx
modal secret create r2-credentials R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET_NAME=xxx
modal secret create database-credentials DATABASE_URL=postgresql://xxx
```

---

## Step 2: Download Video Models

Run the model download function to populate the Modal volume:

```bash
cd modal_app
modal run main.py::download_video_models
```

**Expected output:**

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

**Download time:** ~15-30 minutes (depends on network speed)

**Total storage:** ~30GB added to Modal volume

---

## Step 3: Deploy Modal API

Deploy the updated API with video endpoints:

```bash
modal deploy api.py
```

**Expected output:**

```
✓ Initialized. View app at https://modal.com/apps/xxx
✓ Created objects.
├── 🔨 Created mount /modal_app
├── 🔨 Created mount /comfyui
├── 🔨 Created generate_image_task
├── 🔨 Created generate_video_text2video_task
├── 🔨 Created generate_video_img2video_task
└── 🔨 Created web endpoints
    ├── POST /generate/image
    ├── POST /generate/video/text2video
    └── POST /generate/video/img2video

✓ App deployed! 🎉

View at: https://your-username--ai-video-gen-fastapi-app.modal.run
```

**Save this URL** - you'll need it for testing.

---

## Step 4: Test Text-to-Video Endpoint

Create a test request file `test_text2video.json`:

```json
{
  "job_id": "test-mochi-001",
  "prompt": "A majestic lion walking through a savanna at sunset, cinematic 4K quality",
  "model": "mochi-1",
  "parameters": {
    "duration": 5.4,
    "fps": 30,
    "motion_strength": 0.7,
    "seed": 42
  }
}
```

Send the request:

```bash
curl -X POST https://your-modal-url.modal.run/generate/video/text2video \
  -H "Content-Type: application/json" \
  -d @test_text2video.json
```

**Expected response:**

```json
{
  "job_id": "test-mochi-001",
  "status": "pending",
  "message": "Text-to-video generation task queued on GPU",
  "call_id": "fc-xxxxx"
}
```

---

## Step 5: Test Image-to-Video Endpoint

Create a test request file `test_img2video.json`:

```json
{
  "job_id": "test-cogvideox-001",
  "source_image_url": "https://example.com/test-image.jpg",
  "prompt": "The person turns their head and smiles warmly at the camera",
  "model": "cogvideox-5b",
  "parameters": {
    "duration": 4.0,
    "fps": 24,
    "motion_strength": 0.8,
    "style": "smooth",
    "seed": 42
  }
}
```

Send the request:

```bash
curl -X POST https://your-modal-url.modal.run/generate/video/img2video \
  -H "Content-Type: application/json" \
  -d @test_img2video.json
```

**Expected response:**

```json
{
  "job_id": "test-cogvideox-001",
  "status": "pending",
  "message": "Image-to-video generation task queued on GPU",
  "call_id": "fc-xxxxx"
}
```

---

## Step 6: Monitor Job Progress

### Via Modal Dashboard

1. Go to https://modal.com
2. Navigate to your app
3. Click "Functions" tab
4. Find your running function calls
5. View logs in real-time

### Via Database (if configured)

```sql
SELECT
  id,
  type,
  status,
  progress,
  progress_message,
  created_at
FROM generations
WHERE id IN ('test-mochi-001', 'test-cogvideox-001')
ORDER BY created_at DESC;
```

---

## Step 7: Verify Output

Once generation completes (check logs or database):

1. **Check R2 bucket** for uploaded videos:
   - Mochi: `videos/YYYYMMDD/test-mochi-001.mp4`
   - CogVideoX: `videos/YYYYMMDD/test-cogvideox-001.mp4`

2. **Get video URL** from database `output_url` field

3. **Download and verify** video plays correctly

---

## Expected Performance

### Generation Times (A100 80GB)

- **Mochi text2video** (5.4s, 49 frames):
  - Cold start: <3 minutes
  - Warm start: <2 minutes

- **CogVideoX img2video** (4s, 49 frames):
  - Cold start: <2.5 minutes
  - Warm start: <1.5 minutes

### Cost Estimates (A100 @ $2.50/hour)

- Text2video: $0.06-0.12 per video
- Img2video: $0.08-0.10 per video

---

## Troubleshooting

### Issue: Model download fails

**Check:**

- HuggingFace token has correct permissions
- Accept model licenses at:
  - https://huggingface.co/genmo/mochi-1-preview
  - https://huggingface.co/THUDM/CogVideoX-5b

**Solution:**

```bash
# Verify token
modal secret list huggingface-secret

# Re-create if needed
modal secret create huggingface-secret HF_TOKEN=hf_xxxxxxxxxxxxx
```

### Issue: ComfyUI workflow fails

**Check:**

- Custom nodes are installed in container image
- Workflow JSON files exist in `/root/workflows/`

**View logs:**

```bash
modal logs --function generate_video_text2video_task
```

### Issue: VRAM out of memory

**Check:**

- Only one model loads at a time
- Model swapping is working correctly

**Solution:**

- Verify GGUF Q8 quantization for Mochi (reduces from 60GB to 16GB)
- Check Modal function logs for memory usage

### Issue: Video not uploaded to R2

**Check:**

- R2 credentials are correct
- Bucket exists and has write permissions

**Solution:**

```bash
# Test R2 connection
modal run api.py::test_r2_connection  # (if you create this test function)

# Verify credentials
modal secret list r2-credentials
```

### Issue: Database not updating

**Check:**

- Database credentials are correct
- Neon database is accessible

**Solution:**

```bash
# Verify database connection
modal secret list database-credentials

# Check database schema has progress fields
# See frontend/db/schema.ts
```

---

## Next Steps

### 1. Run Multiple Test Cases

Test various prompts and parameters:

- Different video lengths (25-163 frames)
- Different resolutions (848x480 to 1360x768)
- Different motion strengths (0.0-1.0)
- Different seeds for reproducibility

### 2. Performance Optimization

- Monitor VRAM usage
- Track cold start vs warm start times
- Optimize ComfyUI workflow parameters

### 3. Frontend Integration

Once backend testing is complete:

- Build video generation UI (Phase 1D.7)
- Add video player component (Phase 1D.8)
- Add image upload for img2video (Phase 1D.9)

---

## Production Readiness Checklist

- [ ] Video models downloaded and verified
- [ ] Both endpoints tested successfully
- [ ] Videos generated with good quality
- [ ] Performance meets targets (<3 min)
- [ ] Costs within budget ($0.06-0.12/video)
- [ ] R2 upload working correctly
- [ ] Database progress tracking working
- [ ] Error handling tested (bad prompts, invalid images, etc.)
- [ ] Modal container scaling verified
- [ ] Custom nodes all functioning

---

## Files Modified/Created Summary

### Backend (Modal)

- ✅ `modal_app/models.py` - Video model downloaders
- ✅ `modal_app/main.py` - Video generation task functions
- ✅ `modal_app/api.py` - Video endpoints with task spawning
- ✅ `modal_app/schemas.py` - Video request/response schemas
- ✅ `modal_app/storage.py` - Image download function
- ✅ `modal_app/workflows/mochi_text2video.json` - Production workflow
- ✅ `modal_app/workflows/cogvideox_img2video.json` - Production workflow

### Documentation

- ✅ `VIDEO_MODELS_GUIDE.md` - Comprehensive deployment guide
- ✅ `PHASE1D_PROGRESS.md` - Progress tracking
- ✅ `DEPLOY_VIDEO_MODELS.md` - This quick start guide
- ✅ `PHASE1_TASKS.md` - Updated task statuses

---

## Success Criteria

**Backend is ready for production when:**

1. ✅ All video models downloaded
2. ✅ API deployed and accessible
3. ⏳ Test videos generated successfully
4. ⏳ Quality meets standards (smooth motion, good resolution)
5. ⏳ Performance meets targets (<3 min)
6. ⏳ All error cases handled gracefully

**Current Status:** Ready for deployment and testing (steps 1-2)
