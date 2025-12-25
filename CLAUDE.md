# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is an **AI Video Generation Platform** that enables users to generate high-quality images, videos, and audio from text prompts, with plans to evolve into a professional-grade video editing platform.

The project is currently in **pre-development** phase with comprehensive PRD documentation. Implementation follows a phased approach tracked in `PHASE1_TASKS.md`.

---

## Technology Stack Architecture

### Frontend (Next.js 16 Monorepo)
- **Framework**: Next.js 16 (App Router) with TypeScript
- **UI**: shadcn/ui v2.x + Tailwind CSS v4
- **Auth**: Better Auth (self-hosted, type-safe)
- **State**: Zustand (client state) + React Query v5 (server state/caching)
- **Forms**: React Hook Form + Zod validation
- **Deployment**: Vercel

**Directory Structure (when created):**
```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/
│   │   ├── generate/             # Generation interfaces
│   │   │   ├── image/
│   │   │   ├── video/
│   │   │   └── audio/
│   │   ├── gallery/              # Media library
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── generate/
│   │   ├── inngest/              # Inngest webhook
│   │   └── generation/[jobId]/stream/  # SSE endpoint
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn components
│   ├── landing/                  # Landing page sections
│   ├── generation/               # Generation UI components
│   ├── gallery/                  # Gallery components
│   └── dashboard/
├── lib/
│   ├── db.ts                     # Neon connection
│   ├── auth.ts                   # Better Auth setup
│   ├── inngest.ts                # Inngest client
│   ├── r2.ts                     # Cloudflare R2 SDK
│   └── validation.ts             # Zod schemas
├── db/
│   ├── schema.ts                 # Drizzle schema
│   └── migrations/
├── inngest/
│   ├── client.ts
│   └── functions.ts              # Durable workflow handlers
└── store/                        # Zustand stores
```

### Backend (Modal + ComfyUI)
- **Compute**: Modal (serverless GPU - A100 80GB)
- **AI Engine**: ComfyUI (headless, workflow-based)
- **Runtime**: Python with FastAPI

**Directory Structure (when created):**
```
modal_app/
├── main.py                       # Modal app entry + GPU config
├── api.py                        # FastAPI endpoints
├── models.py                     # Model download/loading/FP8 quantization
├── comfy_runner.py               # ComfyUI executor
├── storage.py                    # R2 upload logic
├── events.py                     # Inngest event emission
├── schemas.py                    # Pydantic request/response models
├── workflows/                    # ComfyUI workflow JSONs
│   ├── flux2_text2img.json
│   ├── mochi_text2video.json
│   ├── cogvideox_img2video.json
│   └── musicgen_text2music.json
└── requirements.txt
```

### Infrastructure Services
- **Database**: Neon PostgreSQL (serverless) + Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible, zero egress costs)
- **Workflows**: Inngest (durable execution, event-driven orchestration)
- **Monitoring**: Sentry (error tracking)

---

## AI Models & VRAM Management

### Models Used (Total: ~120GB storage)
1. **FLUX.2 [dev]** - Image generation (32B params)
   - VRAM: 12GB (FP8 quantized from 37GB)
   - Resolution: Up to 4MP
   - Repository: `black-forest-labs/FLUX.2-dev`

2. **Mochi 1** - Text-to-video (10B params)
   - VRAM: 8-18GB optimized (60GB standard)
   - Output: 5.4s @ 30fps, 480p (162 frames)
   - Repository: `genmo/mochi-1-preview`

3. **CogVideoX-5B** - Image-to-video (5B params)
   - VRAM: 12GB optimized (68GB unoptimized)
   - Repository: `THUDM/CogVideoX-5b`

4. **MusicGen Large** - Audio generation (1.5B params)
   - VRAM: 16GB
   - Output: 32kHz audio
   - Repository: `facebook/musicgen-large`

### Model Loading Strategy
- **Lazy loading**: Load models on-demand to fit in A100 80GB
- **LRU eviction**: Unload least-recently-used models when VRAM full
- **FP8 quantization**: FLUX.2 uses FP8 to reduce from 37GB → 12GB
- **Storage**: Modal Volumes for zero-latency access ($0.10/GB/month)

---

## Data Flow Architecture

### Image Generation Flow
```
User → Next.js UI → API Route (/api/generate)
  → Inngest event (generation/requested)
  → Inngest function (generateImage)
  → Modal API (/generate/image)
  → ComfyUI workflow execution
  → Progress events → Inngest → SSE → Frontend
  → Output uploaded to R2
  → Metadata saved to Neon DB
  → Completion event → Frontend displays result
```

### Real-Time Progress Updates (SSE)
- Frontend connects to `/api/generation/[jobId]/stream`
- Inngest forwards progress events (0-100%)
- Updates stream to client every 5-10s
- Target latency: <500ms

### Durable Workflow Execution (Inngest)
- **Purpose**: Survives failures, automatic retries, step-based execution
- **Event Types**:
  - `generation/requested` - New job submitted
  - `generation/progress` - Progress update (0-100%)
  - `generation/completed` - Job finished
  - `generation/failed` - Job failed with error
- **Retry Policy**: 3 retries with exponential backoff

---

## Database Schema

### Core Tables (Drizzle ORM)
```typescript
users {
  id: uuid (PK)
  email: text (unique)
  name: text
  createdAt: timestamp
}

sessions {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  expiresAt: timestamp
}

generations {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  type: 'image' | 'video' | 'audio'
  model: text
  prompt: text
  parameters: jsonb
  outputUrl: text              // R2 public URL
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: text (nullable)
  processingTimeMs: integer
  createdAt: timestamp
  completedAt: timestamp (nullable)
}

workflow_presets {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  name: text
  description: text
  type: 'image' | 'video' | 'audio'
  workflowJson: jsonb          // ComfyUI workflow definition
  isPublic: boolean
  createdAt: timestamp
}
```

**Critical Indexes**:
- `generations.userId` - User gallery queries
- `generations.status` - Filtering
- `generations.createdAt` - Sorting

---

## Performance & Cost Targets

### Generation Performance (p95 latency)
- Image (cold start): <45s
- Image (warm start): <20s
- Video (Mochi text2vid): <3 min
- Video (CogVideoX img2vid): <2 min
- Audio (MusicGen 30s): <15s

### Cost Targets (A100 80GB @ $2.50/hr)
- Image: $0.01-0.02 per generation
- Video: $0.06-0.12 per generation
- Audio: <$0.01 per generation

### Modal Container Configuration
```python
@app.function(
    gpu="A100-80GB",
    timeout=900,              # 15 min max
    container_idle_timeout=300,  # 5 min warm cache
    volumes={"/models": volume},
    memory=32768,             # 32GB RAM
)
```

---

## Key Architectural Decisions

### Why Better Auth over Clerk/Auth.js?
- Self-hosted (no vendor lock-in, free)
- Type-safe, modern API
- Native Neon integration
- Avoid $25/month Clerk costs

### Why Inngest over Simple Queues?
- Durable workflows survive failures
- Built-in retry logic (critical for AI workloads)
- Visual debugging dashboard
- Event-driven architecture (loosely coupled)

### Why Cloudflare R2 over S3?
- Zero egress costs ($0/GB vs S3's $0.09/GB)
- 10x cheaper storage ($0.015/GB vs $0.023/GB)
- S3-compatible API (easy migration path)
- Built-in CDN for public URLs

### Why Modal Volumes for Models (not R2)?
- Zero latency (models available instantly)
- Simple Modal-native architecture
- Trade-off: $12/month vs $1.80/month (worth it for cold start performance)
- Migration path to R2 documented if costs scale (adds 10-30s cold start latency)

### Why ComfyUI over Direct Model APIs?
- Workflow ecosystem (easy model swapping)
- Visual workflow editor (export to JSON)
- Extensive custom nodes library
- Supports complex multi-model pipelines (FLUX.2 → CogVideoX)

---

## Development Workflow

### Phase 1 Implementation Order
Refer to `PHASE1_TASKS.md` for the complete task breakdown. High-level phases:

1. **Phase 1A**: Infrastructure (Next.js, Neon, Better Auth, Inngest, R2, Vercel)
2. **Phase 1B**: Modal backend + FLUX.2 image generation
3. **Phase 1C**: Frontend UI (landing page, auth, image generation interface)
4. **Phase 1D**: Video generation (Mochi + CogVideoX)
5. **Phase 1E**: Audio generation (MusicGen) + Gallery
6. **Phase 1F**: Polish (presets, error handling, rate limiting, monitoring, deployment)

### Task Tracking
- Use `PHASE1_TASKS.md` to track progress
- Update task status: ⏳ Pending → 🔄 In Progress → ✅ Complete
- Check off subtasks as completed

---

## Critical Implementation Notes

### Security Considerations
- **Auth**: Better Auth handles session management, CSRF protection
- **Rate Limiting**: Per-user limits (10 gen/day free, unlimited pro)
- **File Uploads**: Validate size/format before R2 upload
- **API Protection**: Authenticate all `/api/generate/*` endpoints
- **Workflow Validation**: Whitelist ComfyUI nodes to prevent code injection

### Error Handling Strategy
- **Frontend**: Global error boundary + Sentry integration
- **API Routes**: Try/catch with user-friendly error messages
- **Inngest Functions**: 3 automatic retries with exponential backoff
- **Modal Functions**: Graceful degradation, emit error events
- **Database**: Transaction rollback on failures

### Model Swapping Logic
```python
# Load models on-demand based on request type
if request.type == "image":
    load_flux2()  # 12GB
elif request.type == "video" and request.variant == "text2video":
    load_flux2()  # 12GB
    load_mochi()  # 18GB (total: 30GB)
elif request.type == "video" and request.variant == "img2video":
    load_flux2()  # 12GB
    load_cogvideox()  # 12GB (total: 24GB)
elif request.type == "audio":
    load_musicgen()  # 16GB
```

### Environment Variables (Frontend)
```bash
# Database
DATABASE_URL=                    # Neon PostgreSQL connection string

# Auth
BETTER_AUTH_SECRET=             # Session encryption key
BETTER_AUTH_URL=                # Base URL for callbacks

# Inngest
INNGEST_EVENT_KEY=              # Inngest API key
INNGEST_SIGNING_KEY=            # Webhook signature verification

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Modal
MODAL_API_URL=                  # Modal function endpoint

# Monitoring
SENTRY_DSN=                     # Error tracking
```

### Environment Variables (Modal)
```bash
# Storage
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Events
INNGEST_EVENT_KEY=              # To emit progress events

# Monitoring
SENTRY_DSN=
```

---

## Phase 2 Preview (Future)

Phase 2 adds professional video editing capabilities:
- Multi-track timeline editor
- AI effects (Wan 2.1-VACE for style transfer, StepVideo-T2V for upscaling)
- Beat-matched music synchronization
- Transitions & text overlays
- Project management
- 1080p H.264 export pipeline

Documented in `PRD.md` but not included in initial MVP scope.

---

## Quick Reference

### Key Files to Read First
1. `PRD.md` - Complete product requirements and architecture
2. `PHASE1_TASKS.md` - Implementation task breakdown
3. This file (`CLAUDE.md`) - Development guidance

### Performance Budgets
- SSE latency: <500ms
- API response time: <1s
- Database queries: <500ms
- Gallery load (100 items): <1s
- Search results: <500ms

### Cost Budgets (Production Target)
- Development: ~$50/month
- Production (100 images + 50 videos/day): ~$290/month
- Scaling (1000 images + 500 videos/day): ~$2,300/month

---

## Common Pitfalls to Avoid

1. **VRAM Management**: Always check total VRAM before loading multiple models. Implement LRU eviction.
2. **Cold Starts**: Use container idle timeout (5 min) to keep warm for burst traffic.
3. **Inngest Retries**: Don't retry non-idempotent operations (uploads, DB writes) without deduplication.
4. **R2 URLs**: Use public URLs for user-facing content, pre-signed URLs for sensitive data.
5. **Model Loading**: Lazy load models, don't pre-load all 120GB on container start.
6. **SSE Connections**: Set timeout (15 min) to prevent hanging connections.
7. **Database Indexes**: Always index foreign keys and frequently queried fields.
8. **FP8 Quantization**: FLUX.2 requires specific FP8 quantization setup, don't use generic quantization.
