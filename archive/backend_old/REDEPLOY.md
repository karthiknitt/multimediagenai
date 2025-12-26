# Redeployment Instructions - Backend Fixes

This document provides step-by-step instructions to redeploy the backend with the fixes applied in this session.

---

## Fixes Applied

1. **CogVideoX Dependency Fix**: Updated `transformers` and `diffusers` to stable versions (4.47.1 and 0.32.1) to fix `transformers.modeling_layers` import error
2. **Test Script UUID Fix**: Updated `test_endpoints.sh` to generate valid UUID v4 job IDs instead of string IDs
3. **Health Endpoint Fix**: Split `/health` into fast endpoint and separate `/gpu-info` for GPU probing to avoid timeouts
4. **PEFT Version Pin**: Pinned `peft==0.14.0` for compatibility with transformers 4.47.1

---

## Prerequisites

- Modal CLI installed and authenticated (`modal token set`)
- Access to existing Modal secrets:
  - `huggingface-secret` (HF_TOKEN)
  - `r2-credentials` (R2 access keys)
  - `database-credentials` (Neon PostgreSQL) - optional

---

## Step 1: Review Changes

Changed files:
- [requirements.txt](requirements.txt) - Updated dependency versions
- [main.py](main.py) - Split health endpoint
- [test_endpoints.sh](test_endpoints.sh) - UUID generation fix + new GPU endpoint test

View changes:
```bash
cd d:/ImageAndVideoGenerator/backend
git diff requirements.txt main.py test_endpoints.sh
```

---

## Step 2: Redeploy to Modal

### Option A: Deploy from WSL (Recommended for Windows)

```bash
# Navigate to backend directory in WSL
cd /mnt/d/ImageAndVideoGenerator/backend

# Verify Modal authentication
modal token show

# Deploy the updated app
modal deploy main.py

# Wait for deployment to complete (~2-3 minutes)
# Note the new app URL in output:
# https://karthiknitt--ai-video-gen-direct-fastapi-app.modal.run
```

### Option B: Deploy from Windows Command Prompt

```cmd
cd d:\ImageAndVideoGenerator\backend

REM Set encoding to UTF-8 to avoid Windows encoding issues
chcp 65001

REM Deploy
modal deploy main.py
```

**Important**: Deployment will rebuild the container image with new dependencies. This takes ~3-5 minutes.

---

## Step 3: Verify Deployment

```bash
# Check app status
modal app list

# Should show ai-video-gen-direct as "deployed"

# Get app URL
modal app show ai-video-gen-direct
```

Expected output:
```
App ID: ap-xxxxx
Name: ai-video-gen-direct
State: deployed
URL: https://karthiknitt--ai-video-gen-direct-fastapi-app.modal.run
```

---

## Step 4: Run Test Suite

```bash
cd d:/ImageAndVideoGenerator/backend

# Make script executable (if needed)
chmod +x test_endpoints.sh

# Run tests with your app URL
./test_endpoints.sh https://karthiknitt--ai-video-gen-direct-fastapi-app.modal.run
```

**Expected Results** (7/7 tests passing):
```
✅ Root Health Check
✅ Lightweight Health Check
✅ GPU Information
✅ Image Generation (FLUX.2)
✅ Text-to-Video Generation (Mochi)
✅ Image-to-Video Generation (CogVideoX)  ← Should now pass!
✅ Audio Generation (MusicGen)
```

---

## Step 5: Monitor Job Execution

The test suite creates 4 generation jobs. Monitor their progress:

### View Live Logs
```bash
# Watch all logs (live tail)
modal app logs ai-video-gen-direct
```

### Check for Errors
Look for:
- ✅ No CogVideoX import errors
- ✅ Valid UUID job IDs in database updates
- ✅ Models loading successfully
- ✅ Progress updates emitted (if Inngest configured)

### Expected Log Output
```
[FLUX.2] Initializing generator (models: /models)
INFO:database:Updated generation test-uuid-here to processing
INFO:progress:[Progress] Initialized for job test-uuid-here (50 steps)
...
INFO:storage:Uploaded to R2: https://...
INFO:database:Generation test-uuid-here completed
```

---

## Step 6: Verify R2 Uploads

Check if generated files are uploaded to Cloudflare R2:

```python
# Run this Python script to list R2 bucket contents
python -c "
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='https://27ff2bec75ad03d16fb004d0c44b8ce1.r2.cloudflarestorage.com',
    aws_access_key_id='b8e1415cc494945480926c31b11596f4',
    aws_secret_access_key='a6b837277577c97b888d0fe45f5b6cdd7fd2ef64dba6f5a10ac4755dd44237e8'
)

response = s3.list_objects_v2(Bucket='img-vid-aud')
print(f'Total files: {response.get(\"KeyCount\", 0)}')
for obj in response.get('Contents', [])[-10:]:  # Last 10 files
    print(f'  {obj[\"Key\"]} ({obj[\"Size\"]} bytes, {obj[\"LastModified\"]})')
"
```

Expected output:
```
Total files: 8
  images/test-uuid-1.png (2.4 MB, 2025-12-25 20:50:00)
  videos/test-uuid-2.mp4 (15.6 MB, 2025-12-25 20:52:00)
  ...
```

---

## Step 7: Performance Verification

After jobs complete, verify processing times:

| Task | Target Time | Acceptable Range |
|------|-------------|------------------|
| Image (FLUX.2) | 15-25s | 10-35s (warm) |
| Text-to-Video (Mochi) | 4-6 min | 3-8 min |
| Img-to-Video (CogVideoX) | 90-180s | 60-240s |
| Audio (MusicGen) | 15-30s | 10-45s |

**Note**: First run includes model downloads:
- MusicGen: +60-90s download time
- Container cold start: +30-60s

---

## Troubleshooting

### Issue: CogVideoX still failing with import error

**Solution**:
```bash
# Force rebuild container image
modal deploy main.py --force-build

# This clears pip cache and reinstalls all dependencies
```

### Issue: Test script shows "command not found: python3"

**Solution**:
```bash
# Edit test_endpoints.sh line 91, use just 'python':
generate_job_id() {
    python -c "import uuid; print(str(uuid.uuid4()))"
}
```

### Issue: Database updates still failing with UUID error

**Check**:
```bash
# Verify test script generates valid UUIDs
bash -c 'source test_endpoints.sh && generate_job_id'

# Should output: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

### Issue: R2 uploads failing

**Verify secrets**:
```bash
modal secret list

# Should show:
# - r2-credentials
# - huggingface-secret
# - database-credentials
```

If missing:
```bash
modal secret create r2-credentials \
  R2_ACCESS_KEY_ID="b8e1415cc494945480926c31b11596f4" \
  R2_SECRET_ACCESS_KEY="a6b837277577c97b888d0fe45f5b6cdd7fd2ef64dba6f5a10ac4755dd44237e8" \
  R2_BUCKET_NAME="img-vid-aud" \
  R2_ACCOUNT_ID="27ff2bec75ad03d16fb004d0c44b8ce1"
```

---

## Rollback Instructions

If the new deployment has issues, rollback to previous version:

```bash
# List recent deployments
modal app list --all

# Stop current deployment
modal app stop ai-video-gen-direct

# Redeploy from git commit before changes
git checkout <previous-commit-hash>
modal deploy main.py
git checkout main  # Return to latest
```

---

## Cost Monitoring

**Deployment Costs** (one-time):
- Container rebuild: ~3-5 minutes
- Image layer caching: Reduces future rebuilds
- **Estimated**: $0.20-0.30 (A100-80GB @ $2.50/hr)

**Testing Costs** (per test suite run):
- 4 generation jobs (image + 2 videos + audio)
- Warm container time: ~5-8 minutes
- **Estimated**: $0.30-0.50 per full test

**Total session cost**: ~$0.50-0.80

---

## Next Steps After Successful Deployment

1. **Configure Inngest** (optional, for frontend integration):
   ```bash
   # Get Inngest key from https://app.inngest.com
   modal secret create inngest-credentials INNGEST_EVENT_KEY="evt_..."

   # Update main.py to include inngest-credentials secret
   # Redeploy
   ```

2. **Set up monitoring**:
   - Configure Sentry DSN in Modal secrets
   - Set up uptime monitoring for FastAPI endpoint

3. **Frontend integration**:
   - Update frontend `MODAL_API_URL` to new endpoint
   - Test end-to-end flow from UI
   - Verify SSE progress updates (if Inngest configured)

4. **Database integration**:
   - Verify Neon PostgreSQL connection
   - Run migrations if needed
   - Test job status queries

5. **Performance optimization**:
   - Benchmark cold vs warm start times
   - Tune scaledown_window (currently 5 min)
   - Consider adding model preloading

---

## Deployment Checklist

Use this checklist for future deployments:

- [ ] Review code changes (`git diff`)
- [ ] Update version number in `main.py` (line 555)
- [ ] Test locally if possible
- [ ] Deploy to Modal (`modal deploy main.py`)
- [ ] Wait for container build to complete
- [ ] Run test suite (`./test_endpoints.sh`)
- [ ] Verify all 7 endpoints passing
- [ ] Check logs for errors (`modal app logs`)
- [ ] Verify R2 uploads working
- [ ] Monitor first few generations
- [ ] Update frontend API URL if changed
- [ ] Document any new issues in TEST_RESULTS.md

---

## Success Criteria

Deployment is successful when:

1. ✅ All 7 API endpoints respond with 200 OK
2. ✅ Test jobs complete without errors
3. ✅ Files uploaded to R2 bucket
4. ✅ Database updates succeed (if configured)
5. ✅ Processing times within acceptable ranges
6. ✅ No CogVideoX import errors in logs
7. ✅ Container stays warm for 5 minutes after last request

---

## Support

If issues persist after following these steps:

1. Check [TEST_RESULTS.md](TEST_RESULTS.md) for known issues
2. Review Modal logs: `modal app logs ai-video-gen-direct`
3. Check Modal dashboard: https://modal.com/apps
4. Verify Model Volume has models: `modal volume list`
5. Contact Modal support if infrastructure issues

---

**Deployment prepared**: 2025-12-25
**Fixes applied**: CogVideoX dependencies, UUID generation, health endpoint split
**Expected outcome**: 100% test pass rate (7/7 endpoints)
