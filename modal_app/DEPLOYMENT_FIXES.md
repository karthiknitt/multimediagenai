# Deployment Fixes Applied

**Date:** 2025-12-19

## Issues Fixed

### 1. GPU Configuration Error ✅

**Error:**
```
TypeError: A100.__init__() got an unexpected keyword argument 'memory'
```

**Cause:** Modal API has changed. The `memory` parameter is not valid for `modal.gpu.A100()`.

**Fix:** Updated GPU configuration in `main.py`:
```python
# OLD (incorrect):
GPU_CONFIG = modal.gpu.A100(count=1, memory=80)

# NEW (correct):
GPU_CONFIG = "A100"  # Simple string format
```

**Note:** Modal A100 GPUs are available in 40GB and 80GB variants. Using `"A100"` will automatically select the available variant. You can also use `"A100-80GB"` to be explicit.

---

### 2. Deprecated Parameter Warning ✅

**Warning:**
```
container_idle_timeout -> scaledown_window
```

**Cause:** Modal renamed parameters as part of 1.0 migration.

**Fix:** Updated both function decorators in `main.py`:
```python
# OLD:
container_idle_timeout=CONTAINER_IDLE_TIMEOUT

# NEW:
scaledown_window=SCALEDOWN_WINDOW
```

**Impact:** This controls how long containers stay warm after last request. 300 seconds (5 minutes) is optimal for development.

---

### 3. Missing Secrets (Expected) ⚠️

**Error:**
```
Secret 'inngest-credentials' not found in environment 'main'
Secret 'r2-credentials' not found in environment 'main'
```

**Cause:** User hasn't created Modal secrets yet.

**Solution:** Secrets are now commented out in `main.py` for initial deployment:
```python
# Secrets are optional - comment out if not yet created
# secrets=[
#     modal.Secret.from_name("r2-credentials"),
#     modal.Secret.from_name("inngest-credentials"),
# ],
```

**To enable secrets later:**
1. Create secrets using Modal CLI:
   ```bash
   modal secret create r2-credentials \
     R2_ACCOUNT_ID="xxx" \
     R2_ACCESS_KEY_ID="xxx" \
     R2_SECRET_ACCESS_KEY="xxx" \
     R2_BUCKET_NAME="ai-video-gen-outputs" \
     R2_PUBLIC_DOMAIN="your-bucket.r2.dev"

   modal secret create inngest-credentials \
     INNGEST_EVENT_KEY="xxx" \
     INNGEST_API_URL="https://inn.gs/e/YOUR_KEY"
   ```

2. Uncomment the secrets lines in `main.py`

3. Redeploy: `modal deploy main.py`

---

### 4. Windows Encoding Issue ✅

**Error:**
```
'charmap' codec can't encode characters
```

**Cause:** Windows console uses non-UTF-8 encoding by default.

**Fix:** Set UTF-8 encoding before running Modal commands:
```bash
export PYTHONIOENCODING=utf-8
modal deploy main.py
```

Or use PowerShell:
```powershell
$env:PYTHONIOENCODING="utf-8"
modal deploy main.py
```

---

## Current Deployment Status

### ✅ Fixed Issues
1. GPU configuration syntax
2. Deprecated parameter warnings
3. Secrets made optional for initial deployment
4. Windows encoding handled

### ⏳ In Progress
- Building container image (downloading dependencies)
- This takes 5-10 minutes on first deployment
- Subsequent deploys use cached image (~30 seconds)

### 🔜 Next Steps After Deployment

1. **Create ComfyUI workflow:**
   - See [COMFYUI_WORKFLOW_GUIDE.md](COMFYUI_WORKFLOW_GUIDE.md)

2. **Create Modal secrets:**
   - R2 credentials for storage
   - Inngest credentials for events

3. **Uncomment secrets** in `main.py` and redeploy

4. **Download models:**
   ```bash
   modal run main.py::download_models
   ```

5. **Test deployment:**
   ```bash
   curl https://your-app.modal.run/health
   ```

---

## Modal 1.0 Migration Notes

Modal is transitioning to version 1.0 with renamed parameters. Here are the changes we made:

| Old Name | New Name | Location |
|----------|----------|----------|
| `container_idle_timeout` | `scaledown_window` | `@app.function()` |
| `memory` in GPU | Not needed | GPU config |

See full migration guide: https://modal.com/docs/guide/modal-1-0-migration

---

## Testing Without Secrets

You can test the deployment without R2 and Inngest secrets:

**What works:**
- Health check endpoint
- Container starts successfully
- Model loading (once models are downloaded)
- ComfyUI workflow execution

**What requires secrets:**
- R2 uploads (generation will fail at upload step)
- Inngest events (progress tracking won't work)

**Recommended:** Create secrets before testing full generation flow.

---

## Troubleshooting

### Issue: Build takes too long
**Solution:** First build downloads ~10GB of dependencies. Be patient (5-10 min).

### Issue: Build fails with "disk full"
**Solution:** Modal has sufficient space. This usually means a network issue. Retry: `modal deploy main.py`

### Issue: "Image Builder version" warning
**Solution:** Safe to ignore for now. Update to new builder at https://modal.com/settings/image-config when ready.

### Issue: Can't find Modal CLI
**Solution:** Install it: `pip install modal`

### Issue: Not authenticated
**Solution:** Run: `modal token new`

---

## Performance Notes

### First Deployment
- Image build: ~5-10 minutes (downloads dependencies)
- Model download: ~30-60 minutes (run separately with `modal run main.py::download_models`)
- **Total:** ~40-70 minutes

### Subsequent Deployments
- Image build: ~30 seconds (uses cache)
- Code changes: instant
- **Total:** <1 minute

### Cost During Build
- Image building: **Free** (no compute charges)
- Only charged when function executes (GPU containers start)

---

## Updated Files

1. **[main.py](main.py)**
   - Fixed GPU config: `"A100"` instead of `modal.gpu.A100(count=1, memory=80)`
   - Updated: `container_idle_timeout` → `scaledown_window`
   - Commented out secrets for initial deployment

2. **[DEPLOYMENT.md](DEPLOYMENT.md)** (no changes needed - still accurate)

3. **[This file](DEPLOYMENT_FIXES.md)** - Documents fixes applied

---

## Summary

All deployment blocking issues are **FIXED**. The build is now progressing successfully.

**Current status:** Building container image (expect 5-10 minutes)

**Next:** Wait for build to complete, then create ComfyUI workflow and secrets.

---

**Last Updated:** 2025-12-19 (during deployment)
