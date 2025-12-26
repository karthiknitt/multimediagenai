# Quick Start - Modal Backend Deployment

**Phase 1B - AI Image Generation Backend**

---

## 🚀 Fast Track (30 minutes + model download)

### Prerequisites
- [ ] Modal account (https://modal.com)
- [ ] Cloudflare R2 bucket created
- [ ] Inngest event key
- [ ] Python 3.11+ installed

### Commands

```bash
# 1. Install Modal CLI (2 min)
pip install modal
modal token new

# 2. Create secrets (5 min)
modal secret create r2-credentials \
  R2_ACCOUNT_ID="xxx" \
  R2_ACCESS_KEY_ID="xxx" \
  R2_SECRET_ACCESS_KEY="xxx" \
  R2_BUCKET_NAME="ai-video-gen-outputs" \
  R2_PUBLIC_DOMAIN="your-bucket.r2.dev"

modal secret create inngest-credentials \
  INNGEST_EVENT_KEY="xxx" \
  INNGEST_API_URL="https://inn.gs/e/YOUR_KEY"

# 3. Deploy (5 min)
cd modal_app
modal deploy main.py

# 4. Download models (30-60 min - automated)
modal run main.py::download_models

# 5. Test (5 min)
curl https://your-app.modal.run/health
```

### What You Get

✅ **Deployed:** Modal backend with A100 GPU
✅ **Models:** FLUX.2 dev (FP8 quantized)
✅ **Storage:** Cloudflare R2 integration
✅ **Events:** Inngest progress tracking
✅ **API:** FastAPI endpoints at Modal URL

### Next Steps

1. Create ComfyUI workflow (see [COMFYUI_WORKFLOW_GUIDE.md](COMFYUI_WORKFLOW_GUIDE.md))
2. Test image generation
3. Proceed to Phase 1C (Frontend)

---

## 📚 Full Documentation

- **[README.md](README.md)** - Complete project overview
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[COMFYUI_WORKFLOW_GUIDE.md](COMFYUI_WORKFLOW_GUIDE.md)** - Workflow creation
- **[PHASE1B_SUMMARY.md](PHASE1B_SUMMARY.md)** - Implementation summary

---

## 💰 Cost Estimate

| Scenario | Cost/Month |
|----------|------------|
| Development | ~$50 |
| 10 images/day | ~$10 |
| 100 images/day | ~$100 |
| 1000 images/day | ~$1,000 |

**Includes:** Modal GPU + Volume + R2 storage

---

## ⚠️ Important Notes

1. **Model download takes 30-60 minutes** - runs once, then cached
2. **Cold start: <45s** - first request after idle
3. **Warm start: <20s** - subsequent requests (5 min cache)
4. **Cost per image: $0.01-0.02** - A100 GPU at $2.50/hour
5. **VRAM usage: ~12GB** - FLUX.2 with FP8 quantization

---

## 🆘 Need Help?

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) "Troubleshooting" section
2. Run: `modal app logs ai-video-gen --follow`
3. Check Modal dashboard: https://modal.com/dashboard
4. Verify secrets: `modal secret list`

---

## ✅ Phase 1B Checklist

**Before proceeding to Phase 1C:**

- [ ] Modal deployed and accessible
- [ ] Models downloaded (120GB)
- [ ] Health check returns 200 OK
- [ ] ComfyUI workflow created and tested
- [ ] Image generation working end-to-end
- [ ] Cold start <45 seconds
- [ ] Warm start <20 seconds
- [ ] VRAM usage ~12GB
- [ ] Cost per image <$0.02
- [ ] R2 uploads working
- [ ] Inngest events emitting
- [ ] API endpoint URL saved for frontend

---

**Ready to deploy?** Start with [DEPLOYMENT.md](DEPLOYMENT.md)

**Need workflow help?** See [COMFYUI_WORKFLOW_GUIDE.md](COMFYUI_WORKFLOW_GUIDE.md)

**Questions?** Read [README.md](README.md)
