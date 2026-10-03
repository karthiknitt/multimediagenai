# Video Generation Backend - Deployment Status

## Deployment Information
- **Date**: December 25, 2025
- **Modal App Name**: ai-video-gen-v2
- **FastAPI Endpoint**: https://karthiknitt--ai-video-gen-v2-fastapi-app.modal.run
- **Modal Dashboard**: https://modal.com/apps/karthiknitt/main/deployed/ai-video-gen-v2

## Current Test Status

### Text-to-Video (Mochi 1)
- **Status**: Testing in progress
- **Test Job ID**: 550e8400-e29b-41d4-a716-446655440030
- **Call ID**: fc-01KDAQJBB68AZ1B416GSXNP87Y
- **Workflow**: mochi_text2video_api.json (API format)
- **Expected Duration**: 2-4 minutes

### Image-to-Video (CogVideoX-5B)
- **Status**: Pending
- **Workflow**: Needs API format conversion (currently in UI format)

## Technical Issues Resolved

### Issue 1: Method Name Error
- **Problem**: Code called `runner.run_workflow()` but method was `runner.execute_workflow_properly()`
- **Solution**: Updated all calls to use correct method name
- **Files Modified**: main.py lines 395, 524

### Issue 2: Workflow Format Mismatch
- **Problem**: Video workflows were in UI format (nodes array) instead of API format (dict with node IDs)
- **Solution**: Created new API-format workflow `mochi_text2video_api.json`
- **Root Cause**: UI exports from ComfyUI include metadata and node arrays, but the execution API requires dict format

### Issue 3: Modal Deployment Caching
- **Problem**: Modal cached old code despite file changes
- **Solution**: Changed app name from "ai-video-gen" to "ai-video-gen-v2" to force fresh deployment
- **Alternative**: Touching files with timestamps helps but app name change guarantees cache clear

## API Endpoints

### Health Check
```bash
curl https://karthiknitt--ai-video-gen-v2-fastapi-app.modal.run/health
```
Response: `{"status":"healthy","service":"ai-video-gen-api"}`

### Text-to-Video Generation
```bash
curl -X POST https://karthiknitt--ai-video-gen-v2-fastapi-app.modal.run/generate/video/text2video \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "unique-uuid-here",
    "prompt": "Your prompt here",
    "model": "mochi-1",
    "parameters": {
      "duration": 5.4,
      "fps": 30,
      "motion_strength": 0.7,
      "seed": 42
    }
  }'
```

### Image-to-Video Generation
```bash
curl -X POST https://karthiknitt--ai-video-gen-v2-fastapi-app.modal.run/generate/video/img2video \
  -H "Content-Type": application/json" \
  -d '{
    "job_id": "unique-uuid-here",
    "source_image_url": "https://example.com/image.png",
    "prompt": "Animation prompt",
    "model": "cogvideox-5b",
    "parameters": {
      "duration": 4.0,
      "fps": 24,
      "motion_strength": 0.8,
      "style": "smooth",
      "seed": 42
    }
  }'
```

## Models Downloaded
- ✅ **Mochi 1** (genmo/mochi-1-preview): ~18GB, already present
- ✅ **CogVideoX-5B** (THUDM/CogVideoX-5b): 20.05GB, downloaded successfully

## Next Steps
1. ⏳ Wait for Mochi test to complete (~2-3 min)
2. ⏳ Verify video upload to R2 bucket
3. 📝 Create CogVideoX API-format workflow
4. ✅ Test image-to-video endpoint
5. 📄 Update Phase 1D task status
