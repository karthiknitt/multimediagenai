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

---

## Lessons Learned from Video Generation Implementation

**CRITICAL: These lessons complement image generation learnings and apply to all future feature development**

### 1. CSS Pseudo-Element Pointer Events Blocking
**Mistake**: Using `::before` pseudo-elements with `position: absolute` and `inset: 0` without `pointer-events: none`

**Symptoms**:
- Interactive elements (buttons, tabs) inside cards are not clickable
- Playwright reports: `<div class="card-premium p-6">...</div> intercepts pointer events`
- Elements are visible and enabled but clicks don't register
- Browser DevTools shows element under cursor is the parent div, not the button

**Fix**: Always add `pointer-events: none` to decorative pseudo-elements
```css
/* ❌ WRONG - Blocks all clicks to children */
.card-premium::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(...);
}

/* ✅ CORRECT - Allows clicks to pass through */
.card-premium::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(...);
  pointer-events: none; /* Critical for interactive children */
}
```

**Applied in**: `frontend/app/globals.css:454`

**Prevention**: When creating decorative overlays, always test interactivity of child elements

---

### 2. Z-Index Stacking Context for Clickable Elements
**Mistake**: Not establishing proper z-index stacking context for interactive elements inside positioned containers

**Symptoms**:
- Adding `pointer-events: none` to `::before` isn't enough
- Parent container still intercepts clicks
- Force clicks work but normal clicks fail

**Fix**: Set explicit z-index on both parent and interactive children
```tsx
/* ❌ WRONG - No z-index hierarchy */
<div className="card-premium p-6">
  <Tabs>
    <TabsList>...</TabsList>
  </Tabs>
</div>

/* ✅ CORRECT - Explicit stacking context */
<div className="card-premium p-6" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
  <Tabs>
    <TabsList style={{ position: 'relative', zIndex: 10 }}>...</TabsList>
  </Tabs>
</div>
```

**Applied in**: `frontend/app/(dashboard)/generate/video/page.tsx:194-197`

**Prevention**: When nesting interactive elements in styled containers, always set explicit z-index hierarchy

---

### 3. Button Type Attribute in Forms
**Mistake**: Missing `type="button"` on buttons inside `<form>` tags

**Symptoms**:
- Clicking buttons triggers form submission instead of intended action
- Page refreshes unexpectedly
- State resets when clicking UI controls

**Fix**: Always specify `type="button"` for non-submit buttons in forms
```tsx
/* ❌ WRONG - Defaults to type="submit" */
<form onSubmit={handleSubmit}>
  <button onClick={handleTabClick}>Switch Tab</button>
</form>

/* ✅ CORRECT - Explicit type="button" */
<form onSubmit={handleSubmit}>
  <button type="button" onClick={handleTabClick}>Switch Tab</button>
</form>
```

**Applied in**: `frontend/app/(dashboard)/generate/video/page.tsx:198-202`

**Prevention**: Default all buttons to `type="button"`, only use `type="submit"` when needed

---

### 4. Zod Schema Validation for Optional URL Fields
**Mistake**: Using `z.string().url().optional()` for fields that can be undefined

**Symptoms**:
- Validation fails with "Invalid URL" for undefined or empty values
- Frontend validation passes but backend rejects
- TypeScript shows no errors but runtime validation fails

**Fix**: Use `z.union([z.string().url(), z.undefined()]).optional()` for truly optional URLs
```typescript
/* ❌ WRONG - Empty string fails URL validation */
sourceImageUrl: z.string().url().optional()

/* ✅ CORRECT - Handles undefined properly */
sourceImageUrl: z.union([z.string().url(), z.undefined()]).optional()
```

**Applied in**: `frontend/lib/validation.ts:53`

**Prevention**: For optional fields with format validation, use union with `z.undefined()`

---

### 5. Environment Variable Naming and Usage
**Mistake**: Creating generic environment variable names that don't match actual endpoint structure

**Symptoms**:
- API route tries to append paths to complete URLs
- Environment variable not found errors
- Hardcoded URL concatenation breaks

**Fix**: Use specific environment variables for each endpoint variant
```typescript
/* ❌ WRONG - Single variable with path concatenation */
const endpoint = `${process.env.VIDEO_API_URL}/generate_${variant}`;

/* ✅ CORRECT - Separate variables for each variant */
const text2videoUrl = process.env.VIDEO_GEN_TEXT2VIDEO_API_URL;
const img2videoUrl = process.env.VIDEO_GEN_IMG2VIDEO_API_URL;
const endpoint = variant === "text2video" ? text2videoUrl : img2videoUrl;
```

**Applied in**: `frontend/app/api/generate-video/route.ts:75-80`

**Prevention**: Map environment variables 1:1 to backend endpoints, avoid string concatenation

---

### 6. API Route Endpoint Consistency
**Mistake**: Mismatching frontend API call endpoint with actual API route location

**Symptoms**:
- 404 Not Found errors
- "Invalid request parameters" errors
- API route exists but frontend can't reach it

**Fix**: Ensure frontend hook calls match API route file structure
```typescript
/* ❌ WRONG - Calling wrong endpoint */
async function generateVideo(input: VideoGenerationInput) {
  const response = await fetch("/api/generate", {
    body: JSON.stringify({ type: "video", ...input }),
  });
}

/* ✅ CORRECT - Matches route.ts location */
async function generateVideo(input: VideoGenerationInput) {
  const response = await fetch("/api/generate-video", {
    body: JSON.stringify(input), // No wrapper needed
  });
}
```

**Applied in**: `frontend/hooks/useGeneration.ts:70-73`

**Prevention**: Keep API route paths and frontend fetch URLs in sync, avoid payload wrappers

---

### 7. Playwright Testing for UI Debugging
**Lesson**: Playwright is invaluable for diagnosing pointer-events and z-index issues

**How to use**:
1. Create test script with `headless: False` to watch browser
2. Check element properties: `is_visible()`, `is_enabled()`
3. Get computed styles: `element.evaluate('el => window.getComputedStyle(el).pointerEvents')`
4. Playwright error messages reveal blocking elements: `<div>...</div> intercepts pointer events`
5. Try `force=True` clicks to bypass actionability checks and confirm element detection

**Applied in**: Custom test script `test_video_tabs.py`

**Best practice**: When interactive elements don't work, write a quick Playwright test before debugging CSS

---

### 8. Modal Backend Video Generation Learnings

**Text2Video (Mochi) Performance**:
- Cold start: Model loading takes ~60 seconds
- Generation time: ~4-5 minutes for 16-64 frames
- VRAM: 8-18GB optimized (from 60GB unoptimized)
- Progress tracking: Works via database updates every 25% progress

**Img2Video (CogVideoX) Performance**:
- Similar cold start time
- Generation time: ~2-3 minutes for 13-49 frames
- VRAM: 12GB optimized (from 68GB unoptimized)

**Database Updates**:
- Update `progress_message` for user feedback
- Update `error` column when `status = "failed"`
- Use snake_case column names in SQL queries (not camelCase)

**Verified working end-to-end**:
- Frontend → API route → Modal backend → R2 upload → Database update → SSE stream → Frontend display
- Both text2video and img2video variants confirmed working
- Video generation logs show successful completions in 4-5 minutes

---

## Lessons Learned from Image Generation Implementation

**CRITICAL: Apply these fixes when implementing audio generation to avoid repeating mistakes**

### 1. Database Column Naming Convention
**Mistake**: Using camelCase in Python SQL queries when database schema uses snake_case

**Symptoms**:
- `column "progressMessage" of relation "generations" does not exist`
- Database updates fail silently

**Fix**: Always use snake_case in SQL queries to match Drizzle schema
```python
# ❌ WRONG
query = """UPDATE generations SET progressMessage = %s, outputUrl = %s"""

# ✅ CORRECT
query = """UPDATE generations SET progress_message = %s, output_url = %s"""
```

**Applied in**: `backend/image-gen/main.py`, `backend/flux2-gen/main.py`

---

### 2. Error Logging in Database Updates
**Mistake**: Only updating `progress_message` column, not the `error` column when status is "failed"

**Symptoms**:
- Status shows "failed" in database but `error` column is NULL
- No visibility into what went wrong
- Debugging requires checking Modal logs instead of database

**Fix**: Always update the `error` column when status is "failed"
```python
# ❌ WRONG
def _update_db(self, job_id, status, progress, message):
    query = """UPDATE generations SET status = %s, progress = %s, progress_message = %s"""
    params = [status, progress, message]

# ✅ CORRECT
def _update_db(self, job_id, status, progress, message):
    query = """UPDATE generations SET status = %s, progress = %s, progress_message = %s"""
    params = [status, progress, message]

    # If status is failed, also update the error column
    if status == "failed":
        query += ', error = %s'
        params.append(message)
```

**Applied in**: `backend/image-gen/main.py:147-175`, `backend/flux2-gen/main.py:163-201`

---

### 3. SSE Stream Reconnection Handling
**Mistake**: Not checking job status immediately when SSE stream opens

**Symptoms**:
- Frontend stuck on "Generating..." with 0% progress
- Completed jobs don't show results
- User has to refresh page to see completed generation
- Occurs when job completes while client disconnected or during page navigation

**Fix**: Check job status BEFORE starting polling loop
```typescript
// ✅ CORRECT - Check status immediately on stream open
if (job.status === "completed") {
  sendEvent({
    type: "completed",
    jobId,
    progress: 100,
    outputUrl: job.outputUrl,
    timestamp: new Date().toISOString(),
  });
  closeStream();
  return;
}

if (job.status === "failed") {
  sendEvent({
    type: "failed",
    jobId,
    error: job.error || "Generation failed",
    timestamp: new Date().toISOString(),
  });
  closeStream();
  return;
}

// Send initial heartbeat
sendEvent({ type: "heartbeat", jobId, timestamp: new Date().toISOString() });

// THEN start polling loop
pollForUpdates();
```

**Applied in**: `frontend/app/api/generation/[jobId]/stream/route.ts:73-104`

---

### 4. SSE Controller Error Handling
**Mistake**: Not protecting against "Controller is already closed" errors

**Symptoms**:
- `TypeError: Invalid state: Controller is already closed`
- Multiple errors in Next.js server logs
- SSE reconnections causing duplicate close attempts

**Fix**: Add `isClosed` flag and `closeStream()` wrapper
```typescript
let isClosed = false;

const sendEvent = (data: Record<string, unknown>) => {
  if (isClosed) return;  // Guard clause
  try {
    const event = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(event));
  } catch (error) {
    console.error("Error sending SSE event:", error);
    isClosed = true;
  }
};

const closeStream = () => {
  if (isClosed) return;  // Guard clause
  isClosed = true;
  try {
    controller.close();
  } catch (error) {
    console.error("Error closing controller:", error);
  }
};
```

**Applied in**: `frontend/app/api/generation/[jobId]/stream/route.ts:52-71`

---

### 5. VRAM Optimization for Large Models
**Mistake**: Loading models without memory optimizations, causing CUDA OOM

**Symptoms**:
- `CUDA out of memory. Tried to allocate 288.00 MiB. GPU 0 has a total capacity of 79.25 GiB of which 86.75 MiB is free`
- Model consumes ~78-79GB on 80GB GPU
- No headroom for inference

**Fix**: Implement memory optimizations FROM THE START
```python
# ✅ CORRECT - Load with memory optimizations
self.pipe = Flux2Pipeline.from_pretrained(
    repo_id,
    torch_dtype=torch.bfloat16,
    cache_dir="/models",
    token=os.environ.get("HF_TOKEN")
)

# Use model CPU offloading to save VRAM
# This moves model components to CPU when not in use
self.pipe.enable_model_cpu_offload()

# Enable memory efficient attention
self.pipe.enable_attention_slicing(1)
```

**Impact**: Reduced peak VRAM from ~78GB to ~50-60GB

**Applied in**: `backend/flux2-gen/main.py:44-73`

---

### 6. R2 Public URL Configuration
**Mistake**: Missing `R2_PUBLIC_URL` in Modal secrets

**Symptoms**:
- Generation succeeds but `output_url` is NULL in database
- Files uploaded to R2 but no public URL generated
- Frontend can't display images

**Fix**: Ensure Modal secret includes ALL required R2 variables
```bash
# ✅ CORRECT - Include public URL in secret
modal secret create r2-credentials \
  R2_ACCOUNT_ID=xxx \
  R2_ACCESS_KEY_ID=xxx \
  R2_SECRET_ACCESS_KEY=xxx \
  R2_BUCKET_NAME=xxx \
  R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

**Applied in**: Modal secrets configuration for all backend apps

---

### 7. Modal Container Warm Start Persistence
**Mistake**: Not realizing warm containers persist after deployment

**Symptoms**:
- Deploy new GPU configuration (A100 → H100) but still get old GPU
- `modal deploy` doesn't force new container creation
- CUDA errors show old GPU capacity (79.18 GiB) despite H100 config

**Fix**: Stop warm containers after deployment changes
```bash
# After deploying GPU configuration change:
modal app stop <app-name>  # Force cold start with new config
```

**When to do this**:
- GPU type changes (A100 → H100)
- Major dependency updates
- Model loading logic changes
- Memory optimization changes

---

### 8. Model Text Encoder Dependencies
**Mistake**: Relying on remote HuggingFace services for text encoders

**Symptoms**:
- `Error: Remote text encoder failed: The space is paused, ask a maintainer to restart it`
- External dependency causes failures
- No control over service availability

**Fix**: Load text encoders locally
```python
# ❌ WRONG - Rely on remote service
# (FLUX.2 was trying to use remote text encoder)

# ✅ CORRECT - Load locally
self.pipe = Flux2Pipeline.from_pretrained(
    repo_id,
    torch_dtype=torch_dtype,
    cache_dir="/models",
    token=os.environ.get("HF_TOKEN")
    # Text encoder loads locally by default
)
```

---

### Checklist for Video/Audio Generation Implementation

**Before writing code**:
- [ ] Use snake_case for ALL database column names in SQL queries
- [ ] Plan memory optimizations (CPU offloading, attention slicing) from start
- [ ] Include ALL R2 variables in Modal secrets (including R2_PUBLIC_URL)
- [ ] Load all model components locally (no remote dependencies)

**During implementation**:
- [ ] Update BOTH `progress_message` AND `error` columns in database
- [ ] Implement `isClosed` flag for SSE stream controllers
- [ ] Add immediate job status check when SSE stream opens
- [ ] Test error logging by triggering failures

**After deployment**:
- [ ] Stop warm containers if GPU config changed: `modal app stop <app-name>`
- [ ] Verify error messages appear in database `error` column
- [ ] Test SSE reconnection scenarios (refresh page during generation)
- [ ] Monitor VRAM usage and adjust optimizations if needed

**Testing checklist**:
- [ ] Generate with valid prompt → verify completion
- [ ] Generate with invalid prompt → verify error in database
- [ ] Refresh page during generation → verify reconnection works
- [ ] Check database for proper error messages when failures occur
- [ ] Verify R2 public URLs are generated correctly

#Modal command usage

Always use wsl bash with modal commands with pythonioencoding set to utf-8. This prevents windows encoding issues. 

Example:

 wsl bash -c "export PYTHONIOENCODING=utf-8 && cd /mnt/d/ImageAndVideoGenerator/backend/tts-gen && timeout 180 /home/karthik/.local/bin/modal deploy main.py"