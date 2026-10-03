# AI Video Generation Platform

Enterprise-grade AI-powered image, video, and audio generation platform with professional editing capabilities.

**Status:** Image, video, music and speech generation working end to end; security hardening and reliability fixes in progress (see docs/plans).

---

## 🚀 Quick Links

- **[CLAUDE.md](CLAUDE.md)** - Current architecture, conventions and commands
- **[docs/plans/](docs/plans/)** - Active plans (latest: error-scan fix plan)
- **[PHASE1_TASKS.md](PHASE1_TASKS.md)** - Implementation roadmap
- **[PRD.md](PRD.md)** - Product requirements
- **[docs/archive/](docs/archive/)** - Historical status reports (describe the pre-2026-10 model stack)

---

## 📊 Project Status

### ✅ Phase 1A: Infrastructure (Complete)
- [x] Next.js 16 + TypeScript setup
- [x] Tailwind CSS v4 + shadcn/ui v2
- [x] Neon PostgreSQL + Drizzle ORM
- [x] Better Auth configuration
- [x] Inngest event system
- [x] Cloudflare R2 storage

### ✅ Phase 1B: Modal Backend (Complete - Ready to Deploy)
- [x] Modal app with A100 80GB GPU
- [x] ComfyUI integration (headless)
- [x] Z-Image-Turbo image generation
- [x] FastAPI endpoints
- [x] R2 storage integration
- [x] Inngest event emission
- [x] Comprehensive documentation

**📍 YOU ARE HERE → Deploy Modal backend ([guide](modal_app/DEPLOYMENT.md))**

### 🔜 Phase 1C: Frontend UI (Week 2)
- [ ] Landing page components
- [ ] Authentication pages
- [ ] Dashboard layout
- [ ] Image generation interface
- [ ] SSE progress streaming
- [ ] Gallery functionality

### 🔜 Phase 1D: Video Generation (Week 3)
- [x] Wan2.2 text-to-video
- [x] Wan2.2 image-to-video
- [ ] Video player components

### 🔜 Phase 1E: Audio + Gallery (Week 3-4)
- [x] ACE-Step music generation
- [ ] Complete gallery with filters

### 🔜 Phase 1F: Polish + Deploy (Week 4)
- [ ] Error handling
- [ ] Rate limiting
- [ ] Monitoring (Sentry)
- [ ] Production deployment

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Landing  │  │   Auth   │  │Dashboard │  │ Generate │  │
│  │   Page   │  │  Pages   │  │          │  │    UI    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  Better Auth + Zustand + React Query + shadcn/ui          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │        Inngest (Orchestration)      │
         │  • Event-driven workflows           │
         │  • Automatic retries                │
         │  • Progress tracking                │
         └─────────────────────────────────────┘
                │                    │
                ▼                    ▼
    ┌───────────────────┐   ┌───────────────────┐
    │   Neon Database   │   │  Modal GPUs          │
    │   (PostgreSQL)    │   │                    │
    │  • Users          │   │  • Diffusers       │
    │  • Sessions       │   │  • Z-Image-Turbo   │
    │  • Generations    │   │  • Wan2.2 T2V      │
    │  • Presets        │   │  • Wan2.2 I2V      │
    └───────────────────┘   │  • ACE-Step/Qwen3  │
                            └───────────────────┘
                                      │
                                      ▼
                            ┌───────────────────┐
                            │  Cloudflare R2    │
                            │  (Media Storage)  │
                            │  • Zero egress    │
                            │  • S3-compatible  │
                            └───────────────────┘
```

---

## 💻 Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui v2
- **State:** Zustand (client) + React Query v5 (server)
- **Auth:** Better Auth (self-hosted)
- **Forms:** React Hook Form + Zod
- **Deployment:** Vercel

### Backend
- **Compute:** Modal (A100 80GB GPU)
- **AI Engine:** ComfyUI (headless)
- **API:** FastAPI + Pydantic
- **Language:** Python 3.11+

### Infrastructure
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Storage:** Cloudflare R2 (S3-compatible)
- **Orchestration:** Inngest (durable workflows)
- **Monitoring:** Sentry

---

## 🤖 AI Models

| Model | Type | License | Output | Repository |
|-------|------|---------|--------|------------|
| **Z-Image-Turbo** | Image | Apache-2.0 | 1-2MP images, 8-step | `Tongyi-MAI/Z-Image-Turbo` |
| **Wan2.2 T2V-A14B** | Text→Video | Apache-2.0 | 480p, 5s @ 16fps | `Wan-AI/Wan2.2-T2V-A14B-Diffusers` |
| **Wan2.2 I2V-A14B** | Image→Video | Apache-2.0 | 480p, 5s @ 16fps | `Wan-AI/Wan2.2-I2V-A14B-Diffusers` |
| **ACE-Step 1.5** | Music | MIT | 48kHz stereo songs | `ACE-Step/Ace-Step1.5` |
| **Qwen3-TTS 1.7B** | Speech | Apache-2.0 | 9 preset voices + voice cloning | `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`, `...-Base` |

**Modal services** (one app each, weights cached on a per-service Modal Volume):

| Service dir | Modal app | Volume | GPU | Frontend env var |
|-------------|-----------|--------|-----|------------------|
| `backend/image-gen` | `image-generation` | `zimage-models` | L40S | `IMAGE_GEN_API_URL` |
| `backend/video-gen` | `video-generation` | `wan22-models` | H100 | `VIDEO_GEN_TEXT2VIDEO_API_URL`, `VIDEO_GEN_IMG2VIDEO_API_URL` |
| `backend/audio-gen` | `audio-generation` | `acestep-models` | L40S | `AUDIO_GEN_API_URL` |
| `backend/tts-gen` | `tts-generation` | `qwen3tts-models` | A10G | `TTS_GEN_API_URL` |

```bash
cd backend/<service> && modal run main.py::download_models   # once: cache weights on the volume
modal deploy main.py                                         # prints the endpoint URL(s) for the env vars above
```

All five models are public (no Hugging Face token needed).

-------|------|------|--------|------------|
| **FLUX.2 dev** | Image | 12GB (FP8) | 4MP images | `black-forest-labs/FLUX.2-dev` |
| **Mochi 1** | Video | 8-18GB | 5.4s @ 30fps | `genmo/mochi-1-preview` |
| **CogVideoX-5B** | Video | 12GB | Image→Video | `THUDM/CogVideoX-5b` |
| **MusicGen Large** | Audio | 16GB | 32kHz audio | `facebook/musicgen-large` |

**Total Storage:** ~120GB (Modal Volume)

---

## 📁 Project Structure

```
ImageAndVideoGenerator/
├── frontend/                    # Next.js app (Phase 1A ✅)
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities & integrations
│   ├── db/                     # Drizzle schema & migrations
│   └── inngest/                # Inngest functions
│
├── modal_app/                  # Modal backend (Phase 1B ✅)
│   ├── main.py                # Modal app + GPU config
│   ├── api.py                 # FastAPI endpoints
│   ├── models.py              # Model management
│   ├── comfy_runner.py        # ComfyUI executor
│   ├── storage.py             # R2 integration
│   ├── events.py              # Inngest events
│   ├── workflows/             # ComfyUI workflow JSONs
│   └── [documentation]/       # Comprehensive guides
│
├── PRD.md                      # Product requirements
├── PHASE1_TASKS.md            # Task breakdown
├── PHASE1B_COMPLETE.md        # Latest completion summary
└── CLAUDE.md                  # Developer guidance
```

---

## 🎯 Performance Targets

### Latency (Phase 1)
- Cold start: <45s (first request)
- Warm start: <20s (cached)
- SSE latency: <500ms
- Database queries: <500ms

### Cost (Phase 1)
- Image: $0.01-0.02 per generation
- Video: $0.06-0.12 per generation
- Audio: <$0.01 per generation
- Development: ~$50/month
- Production (100 images/day): ~$100/month

---

## 🚀 Getting Started

### Phase 1B Deployment (Current)

**Prerequisites:**
- Modal account (https://modal.com)
- Cloudflare R2 bucket
- Inngest event key
- Python 3.11+

**Quick Start:**
```bash
# 1. Install Modal CLI
pip install modal
modal token new

# 2. Create secrets
modal secret create r2-credentials ...
modal secret create inngest-credentials ...

# 3. Deploy
cd modal_app
modal deploy main.py

# 4. Download models (30-60 min)
modal run main.py::download_models

# 5. Create ComfyUI workflow
# See: modal_app/COMFYUI_WORKFLOW_GUIDE.md

# 6. Test
curl https://your-app.modal.run/health
```

**Full Guide:** [modal_app/DEPLOYMENT.md](modal_app/DEPLOYMENT.md)

### Frontend Development (Phase 1C - Next)

**Prerequisites:**
- Node.js 18+
- pnpm package manager
- Neon database credentials

```bash
# Install dependencies
cd frontend
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

---

## 📚 Documentation

### Getting Started
- **[modal_app/QUICK_START.md](modal_app/QUICK_START.md)** - 30-minute fast-track
- **[modal_app/DEPLOYMENT.md](modal_app/DEPLOYMENT.md)** - Complete deployment guide
- **[modal_app/COMFYUI_WORKFLOW_GUIDE.md](modal_app/COMFYUI_WORKFLOW_GUIDE.md)** - Workflow creation

### Architecture & Planning
- **[PRD.md](PRD.md)** - Product requirements document
- **[PHASE1_TASKS.md](PHASE1_TASKS.md)** - Implementation roadmap
- **[CLAUDE.md](CLAUDE.md)** - Developer guidance

### Implementation Details
- **[PHASE1B_COMPLETE.md](PHASE1B_COMPLETE.md)** - Phase 1B summary
- **[modal_app/README.md](modal_app/README.md)** - Backend documentation
- **[frontend/README.md](frontend/README.md)** - Frontend documentation (TBD)

---

## 💰 Cost Breakdown

### Development Phase
| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Modal GPU | ~$30 | A100 80GB (after $30 free credits) |
| Modal Volume | $12 | 120GB model storage |
| Neon DB | Free | Serverless PostgreSQL |
| R2 Storage | ~$1 | Development usage |
| Vercel | Free | Frontend hosting |
| Inngest | Free | Development tier |
| **Total** | **~$43** | |

### Production (100 images/day)
| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Modal GPU | ~$80 | ~100 generations |
| Modal Volume | $12 | 120GB storage |
| Neon DB | $19 | Paid tier |
| R2 Storage | ~$2 | ~1GB outputs |
| Vercel | Free | Hobby tier sufficient |
| Inngest | Free | <1M events |
| **Total** | **~$113** | |

### Scaling (1000 images/day)
| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Modal GPU | ~$800 | ~1000 generations |
| Modal Volume | $12 | 120GB storage |
| Neon DB | $69 | Scale tier |
| R2 Storage | ~$10 | ~5GB outputs |
| Vercel | $20 | Pro tier |
| Inngest | Free | <10M events |
| **Total** | **~$911** | |

---

## 🎨 Features

### Phase 1 (MVP - Current)
- [x] **Infrastructure** - Next.js + Modal + Neon + R2 + Inngest
- [x] **Backend** - GPU-accelerated AI generation
- [ ] **Image Generation** - FLUX.2 text-to-image (ready to deploy)
- [ ] **Landing Page** - Hero, features, pricing
- [ ] **Authentication** - Email/password login
- [ ] **Dashboard** - User stats & recent generations
- [ ] **Gallery** - Browse, search, filter generations
- [ ] **Video Generation** - Mochi + CogVideoX
- [ ] **Audio Generation** - MusicGen

### Phase 2 (Professional Editing)
- [ ] Multi-track timeline editor
- [ ] AI effects (style transfer, upscaling)
- [ ] Beat-matched music sync
- [ ] Transitions & overlays
- [ ] 1080p H.264 export

---

## 🔒 Security

- **Authentication:** Better Auth with session management
- **Secrets:** Modal secrets for credentials
- **Validation:** Pydantic for type-safe APIs
- **Rate Limiting:** Per-user limits (Phase 1F)
- **Input Validation:** File size/format checks
- **Monitoring:** Sentry error tracking (Phase 1F)

---

## 🧪 Testing

### Current (Phase 1B)
- Manual API testing
- Modal logs for debugging
- Local FastAPI testing

### Planned (Phase 1F)
- Unit tests (pytest)
- Integration tests
- E2E tests (Playwright)
- Performance testing
- Load testing

---

## 📈 Roadmap

### Phase 1: MVP (Weeks 1-4) - **In Progress**
- [x] Week 1: Infrastructure + Modal backend
- [ ] Week 2: Frontend UI + Image generation
- [ ] Week 3: Video generation
- [ ] Week 4: Audio + Gallery + Polish

### Phase 2: Professional Editing (Weeks 5-8)
- [ ] Multi-track timeline
- [ ] AI effects
- [ ] Advanced editing tools
- [ ] Export pipeline

### Phase 3: Collaboration (Weeks 9-12)
- [ ] Team workspaces
- [ ] Shared projects
- [ ] Comments & feedback
- [ ] Version history

---

## 🤝 Contributing

This is currently a solo development project. Contributions guidelines will be added in Phase 2.

---

## 📄 License

TBD - Will be added before public release.

---

## 🆘 Support

### Documentation
- Check relevant `.md` files in project root and `modal_app/`
- Review [PHASE1_TASKS.md](PHASE1_TASKS.md) for task status

### Troubleshooting
- **Modal:** Check [modal_app/DEPLOYMENT.md](modal_app/DEPLOYMENT.md) troubleshooting section
- **Frontend:** Check frontend documentation (TBD)
- **General:** Check [PHASE1B_COMPLETE.md](PHASE1B_COMPLETE.md) for latest status

### Tools
- Modal Dashboard: https://modal.com/dashboard
- Cloudflare R2: https://dash.cloudflare.com/r2
- Inngest: https://app.inngest.com
- Neon: https://console.neon.tech

---

## 📊 Project Stats

**Phase 1B (Current):**
- Lines of code: ~900
- Lines of documentation: ~1,700
- Files created: 14 (9 code + 5 docs)
- Development time: ~8-10 hours

**Total Project (Planned):**
- Estimated lines of code: ~15,000
- Estimated timeline: 4-6 weeks (Phase 1)
- Target deployment: Q1 2025

---

## 🎯 Next Steps

### For User (Right Now)

1. **Deploy Modal backend** (2-3 hours)
   - Follow [modal_app/QUICK_START.md](modal_app/QUICK_START.md)
   - Or [modal_app/DEPLOYMENT.md](modal_app/DEPLOYMENT.md) for details

2. **Create ComfyUI workflow** (1 hour)
   - Follow [modal_app/COMFYUI_WORKFLOW_GUIDE.md](modal_app/COMFYUI_WORKFLOW_GUIDE.md)

3. **Test backend** (15 minutes)
   - Verify health check
   - Test image generation
   - Monitor performance

### For Development (Phase 1C)

Once backend is deployed:

1. **Frontend image generation UI**
2. **SSE progress streaming**
3. **Database integration**
4. **End-to-end testing**

---

## ⚠️ Important Reminders

### Cost Management
- **Stop Modal containers when not in use:** `modal app stop ai-video-gen`
- **Monitor dashboard:** https://modal.com/dashboard
- **Set budget alerts** in Modal settings

### Model Download
- Takes 30-60 minutes
- Downloads ~120GB
- Costs ~$12/month for storage
- One-time operation

### Performance
- Cold start: <45s (first request after idle)
- Warm start: <20s (5-minute cache)
- Can adjust `container_idle_timeout` in `modal_app/main.py`

---

**Current Status:** ✅ Phase 1B Complete - Ready for User Deployment

**Next Milestone:** Deploy Modal backend and proceed to Phase 1C

**Last Updated:** 2025-12-19
