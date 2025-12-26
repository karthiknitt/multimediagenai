# Product Requirements Document (PRD)
# AI Video Generation Platform

**Version:** 1.0
**Last Updated:** December 19, 2025
**Status:** Approved

---

## Executive Summary

### Vision
Build a comprehensive AI-powered video production platform that evolves from basic multi-modal generation (Phase 1) to professional-grade video editing and production (Phase 2).

### Product Goals
1. Enable users to generate high-quality images, videos, and audio from text prompts
2. Provide professional video editing capabilities with AI-powered effects
3. Deliver a cost-effective, scalable solution running on serverless infrastructure
4. Create an intuitive, production-ready web application

### Target Users
- Content creators and video producers
- Digital marketers and social media managers
- Creative professionals exploring AI tools
- Small businesses needing quick video content

---

## Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend** | Next.js | 16 (App Router) | Latest features, Turbopack stable, "use cache" directive |
| **Language** | TypeScript | Latest | Type safety, better DX |
| **UI Framework** | shadcn/ui | Latest v2.x | Modern, customizable, accessible components |
| **Styling** | Tailwind CSS | v4 | Utility-first, highly customizable |
| **Authentication** | Better Auth | Latest | Type-safe, self-hosted, free, Neon integration |
| **Workflows** | ~~Inngest~~ Direct API | ~~Latest~~ N/A | ~~Deprecated~~ Direct Modal → DB updates via SSE |
| **Database** | Neon PostgreSQL | Latest | Serverless, autoscaling, branching support |
| **ORM** | Drizzle | Latest | Type-safe, serverless-optimized |
| **Storage** | Cloudflare R2 | - | 10x cheaper egress than S3, CDN built-in |
| **Compute** | Modal (Microservices) | - | 5 separate apps, serverless GPU, pay-per-second |
| **GPU (Image)** | A100 80GB | - | FLUX.1/FLUX.2 generation ($2.50/hr) |
| **GPU (Video)** | A100 80GB | - | Mochi/CogVideoX generation ($2.50/hr) |
| **GPU (Audio)** | L40S | - | MusicGen generation ($1.20/hr, 48% savings) |
| **GPU (TTS)** | A10G | - | F5-TTS speech synthesis ($1.10/hr) |
| **AI Backend** | Diffusers/Transformers | Latest | Direct Python APIs (no ComfyUI) |
| **State** | Zustand | Latest | Lightweight state management |
| **Data Fetching** | React Query | v5 | Caching, SSE support |
| **Validation** | Zod | Latest | Schema validation |
| **Forms** | React Hook Form | Latest | Performance, validation integration |

---

## AI Models

### Image Generation
**Primary Model: FLUX.2 [dev]**
- **Parameters:** 32B (32 billion)
- **VRAM:** 12GB with FP8 quantization (37GB full precision)
- **Resolution:** Up to 4 megapixels
- **Text Encoder:** Mistral Small 3.1
- **Repository:** `black-forest-labs/FLUX.2-dev`
- **Why:** State-of-the-art quality, superior to FLUX.1, future-proof

**Secondary Model: FLUX.2 [schnell]**
- Faster variant for quick iterations
- Lower quality but 2-3x faster generation

### Video Generation

**Text-to-Video: Mochi 1**
- **Parameters:** 10B
- **VRAM:** 8-18GB optimized (60GB standard)
- **Output:** 5.4s videos at 30fps, 480p (162 frames at 640x480)
- **Architecture:** Asymmetric Diffusion Transformer (AsymmDiT)
- **Repository:** `genmo/mochi-1-preview`
- **License:** Apache 2.0
- **Why:** Best text-to-video prompt adherence, open-source

**Image-to-Video: CogVideoX-5B**
- **Parameters:** 5B
- **VRAM:** 12GB optimized (34GB transformer + 68GB VAE unoptimized)
- **Output:** High-quality video from single image
- **Architecture:** 3D VAE + expert Transformer
- **Repository:** `THUDM/CogVideoX-5b`
- **Features:** LoRA fine-tuning support
- **Why:** Best image-to-video quality in open-source

### Audio Generation

**Primary Model: MusicGen Large**
- **Parameters:** 1.5B
- **VRAM:** 16GB
- **Output:** 32kHz audio with EnCodec (4 codebooks at 50Hz)
- **Repository:** `facebook/musicgen-large`
- **Features:** Text-to-music with controllable conditioning
- **Why:** High-quality music generation, controllable output

### Text-to-Speech (TTS) Generation

**Primary Model: F5-TTS**
- **Parameters:** Diffusion-based TTS model
- **VRAM:** 6-8GB
- **Output:** Natural speech, 30s audio in ~4-6 seconds
- **Repository:** `SWivid/F5-TTS`
- **Features:** Zero-shot voice cloning (3-10s reference), multi-language support
- **Languages:** English (primary), Chinese, French, German, Japanese, Korean
- **License:** MIT (fully commercial-friendly)
- **GPU:** A10G ($1.10/hr)
- **Why:** State-of-the-art quality (Jan 2025), fastest inference, excellent voice cloning, low VRAM

### Phase 2: Video Editing Models

**Wan 2.1-VACE** (Alibaba, May 2025)
- Unified video editing model
- Video repainting, spatio-temporal extension
- Multi-modal input (text/image/video)
- VRAM: 8-17GB

**StepVideo-T2V** (Feb 2025)
- 30B parameters
- 8-second videos at 540p, 30fps
- Cinematic quality comparable to Sora

**SkyReels V1** (HunyuanVideo fine-tune)
- Trained on 10M+ film/TV clips
- Lifelike human characters

---

## Infrastructure Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────┐
│           Next.js 16 App (Vercel)                   │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Landing   │  │  Generation  │  │   Gallery   │ │
│  │    Page    │  │      UI      │  │   (TODO)    │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │      Better Auth (user management)             │ │
│  └────────────────────────────────────────────────┘ │
└───────────────────┬──────────────────────────────────┘
                    │ Direct HTTP API Calls (no Inngest)
                    ▼
        ┌────────────────────────┐
        │  5 Modal Microservices │
        │  (Separate Deployments)│
        └───┬────────────────┬───┘
            │                │
            ▼                ▼
┌────────────────────┐  ┌─────────────────────────────────┐
│  Neon PostgreSQL   │  │  Modal Apps (Direct psycopg2)   │
│  - User profiles   │  │                                 │
│  - Generations log │  │  1. image-gen (FLUX.1)          │
│  - Progress track  │  │     GPU: A100-80GB ($2.50/hr)   │
│  - Project data    │  │     Volume: 40GB models         │
└────────────────────┘  │                                 │
                        │  2. flux2-gen (FLUX.2)          │
                        │     GPU: A100-80GB ($2.50/hr)   │
                        │     Volume: 40GB models         │
                        │                                 │
                        │  3. video-gen (Mochi/CogVideoX) │
                        │     GPU: A100-80GB ($2.50/hr)   │
                        │     Volume: 80GB models         │
                        │                                 │
                        │  4. audio-gen (MusicGen)        │
                        │     GPU: L40S ($1.20/hr)        │
                        │     Volume: 16GB models         │
                        │                                 │
                        │  5. tts-gen (F5-TTS)            │
                        │     GPU: A10G ($1.10/hr)        │
                        │     Volume: 8GB models          │
                        └──────────┬──────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Cloudflare R2      │
                        │  - User outputs     │
                        │  - Voice samples    │
                        │  - R2 Public CDN    │
                        └─────────────────────┘
```

### Component Responsibilities

#### 1. Frontend (Next.js 16)
**Purpose:** User interface and client-side logic

**Key Features:**
- Responsive design (mobile + desktop)
- Server-Sent Events (SSE) for real-time progress
- Optimistic UI updates
- Image/video/audio preview and playback

**Pages:**
- `/` - Landing page (hero, features, pricing) ✅
- `/login`, `/signup` - Authentication ✅
- `/dashboard` - User dashboard with stats ✅
- `/generate/image` - Image generation interface ✅
- `/generate/video` - Video generation (text2video + img2video) ⏳
- `/generate/audio` - Audio/music generation ⏳
- `/generate/speech` - TTS generation (NEW) ⏳
- `/gallery` - Media library with search/filter ❌
- `/editor` - Video timeline editor (Phase 2) ❌
- `/projects` - Project management (Phase 2) ❌

#### 2. ~~Inngest Workflow Layer~~ Direct API Pattern (DEPRECATED)
**Previous Architecture:** Event-driven orchestration via Inngest
**New Architecture:** Direct Modal API calls with database polling

**Flow:**
```
Frontend → Next.js API Route → Modal FastAPI Endpoint
  → GPU Generation → Direct DB Update (psycopg2)
  → Frontend polls DB via SSE (/api/generation/[id]/stream)
```

**Why Changed:**
- Reduced complexity (fewer moving parts)
- Lower costs (no Inngest subscription)
- Simpler debugging (direct HTTP calls)
- Modal provides retry logic natively

**Note:** Inngest code still exists in codebase for backward compatibility but is being phased out.

#### 3. Modal Microservices Backend
**Purpose:** Serverless GPU compute for AI inference

**Architecture:** 5 separate Modal applications (not monolithic)

**App 1: image-gen (FLUX.1-dev)**
```python
@app.cls(gpu="A100-80GB", timeout=600, container_idle_timeout=180,
         volumes={"/models": flux1_volume}, memory=16384)
class ImageGenerator:
    @modal.fastapi_endpoint(method="POST")
    def generate(self, request): ...
```

**App 2: flux2-gen (FLUX.2-dev)**
```python
@app.cls(gpu="A100-80GB", timeout=600, container_idle_timeout=180,
         volumes={"/models": flux2_volume}, memory=16384)
class Flux2Generator:
    # Uses remote text encoder to save 10GB VRAM
    @modal.fastapi_endpoint(method="POST")
    def generate(self, request): ...
```

**App 3: video-gen (Mochi + CogVideoX)**
```python
@app.cls(gpu="A100-80GB", timeout=900, container_idle_timeout=300,
         volumes={"/models": video_volume}, memory=32768)
class VideoGenerator:
    # Lazy loads only Mochi OR CogVideoX per request
    @modal.fastapi_endpoint(method="POST")
    def generate_text2video(self, request): ...

    @modal.fastapi_endpoint(method="POST")
    def generate_img2video(self, request): ...
```

**App 4: audio-gen (MusicGen)**
```python
@app.cls(gpu="L40S", timeout=300, container_idle_timeout=180,
         volumes={"/models": audio_volume}, memory=16384)
class AudioGenerator:
    # 48% cheaper GPU (L40S vs A100)
    @modal.fastapi_endpoint(method="POST")
    def generate(self, request): ...
```

**App 5: tts-gen (F5-TTS)** (NEW)
```python
@app.cls(gpu="A10G", timeout=300, container_idle_timeout=180,
         volumes={"/models": tts_volume}, memory=16384)
class TTSGenerator:
    @modal.fastapi_endpoint(method="POST")
    def generate(self, request): ...
```

**Common Features:**
- Direct Diffusers/Transformers pipelines (no ComfyUI)
- FP8/BF16 quantization for VRAM optimization
- Lazy model loading on first request
- Progress tracking via direct DB updates (psycopg2)
- R2 upload for outputs (boto3)
- FastAPI endpoints for HTTP access

#### 4. Neon Database
**Purpose:** Serverless PostgreSQL for structured data

**Tables:**
- `users` - User accounts (Better Auth)
- `sessions` - Authentication sessions
- `generations` - Generation history with parameters
- `workflow_presets` - User-saved workflows
- `projects` - Video editing projects (Phase 2)

**Features:**
- Serverless autoscaling (0 → full in 500ms)
- Instant branching (dev/staging/prod)
- Free tier: 512MB storage, 0.5GB/month compute

#### 5. Cloudflare R2 Storage
**Purpose:** Cost-effective object storage with CDN

**Storage Strategy:**
- **Models:** Stored in Modal Volumes (per app, ~184GB total)
- **User Outputs:** Stored in R2 bucket `img-vid-aud`

**R2 Bucket Structure:**
```
img-vid-aud/
├── images/{yyyy-mm-dd}/{job_id}.png
├── videos/{yyyy-mm-dd}/{job_id}.mp4
├── audio/{yyyy-mm-dd}/{job_id}.wav
└── speech/{yyyy-mm-dd}/{job_id}.wav
    voices/{user_id}/{voice_id}.wav  (reference samples)
```

**Features:**
- Zero egress costs ($0/GB vs S3's $0.09/GB)
- S3-compatible API (boto3)
- Public CDN URLs (1-hour pre-signed for security)
- $0.015/GB/month storage (10x cheaper than S3)
- Date-based organization for easy cleanup

**Cost:**
- Modal Volumes: ~$18.40/month (184GB × $0.10/GB)
- R2 Storage: ~$0.75/month (50GB × $0.015/GB)
- **Total Storage: ~$19/month**

---

## GPU & VRAM Requirements

### GPU Strategy: Dedicated GPUs per Model (Microservices)

**Architecture Change:** Instead of shared A100 with model swapping, each model type has a dedicated GPU instance.

**Rationale:**
1. **Simpler:** No complex LRU eviction logic needed
2. **Reliable:** Model loading failures don't affect other services
3. **Optimized:** Can choose cost-optimal GPU per workload
4. **Scalable:** Independent scaling per generation type

### VRAM Breakdown by Service

| Service | Model | GPU | VRAM Used | Cost/hr | Optimization |
|---------|-------|-----|-----------|---------|--------------|
| image-gen | FLUX.1-dev | A100-80GB | ~12GB | $2.50 | BF16 precision |
| flux2-gen | FLUX.2-dev | A100-80GB | ~18GB | $2.50 | Remote text encoder |
| video-gen (Mochi) | Mochi 1 | A100-80GB | 18GB | $2.50 | GGUF Q8 quantization |
| video-gen (CogVideoX) | CogVideoX-5B | A100-80GB | 12GB | $2.50 | BF16 precision |
| audio-gen | MusicGen Large | L40S | 16GB | $1.20 | **48% savings!** |
| tts-gen | F5-TTS | A10G | 6-8GB | $1.10 | Diffusion TTS |

**Note:** Video-gen lazy loads either Mochi OR CogVideoX per request (not both simultaneously).

### Model Loading Strategy (Per App)
- **Container startup:** <1s (no model loading)
- **First request:** Lazy load model on-demand (+10-50s)
- **Subsequent requests:** Use cached model (<1s overhead)
- **No LRU eviction:** Each app has dedicated VRAM

### Total VRAM Across All Services
- Peak concurrent VRAM: 18GB + 18GB + 16GB + 8GB = **60GB** (split across 5 GPUs)
- Previous architecture: 48-58GB (shared A100)
- **Trade-off:** Higher GPU costs but simpler and more reliable

---

## Storage Strategy (Updated)

### Current Implementation: Modal Volumes (per app) + R2

**Models (184GB total):** Stored in **Modal Volumes** (separate per app)
- image-gen: 40GB
- flux2-gen: 40GB
- video-gen: 80GB
- audio-gen: 16GB
- tts-gen: 8GB
- **Cost:** $18.40/month (184GB × $0.10/GB)

**User Outputs:** Stored in **Cloudflare R2** (`img-vid-aud` bucket)
- **Cost:** ~$0.75/month (50GB × $0.015/GB)

**Total Storage Cost:** ~$19/month

### Why This Approach
- ✅ Zero latency (instant model loading from volumes)
- ✅ Simple architecture (no download orchestration)
- ✅ Persistent across container restarts
- ✅ Each service has independent model storage
- ✅ R2 provides zero egress costs for user downloads

### Future Optimization Option
If storage costs exceed $50/month, consider migrating models to R2:
- **Savings:** 83% reduction ($18.40 → $2.76/month for models)
- **Trade-off:** +10-30s cold start latency per service
- **Effort:** 2-4 hours implementation

---

## Data Flow & User Journeys

### Image Generation Flow

```
1. User enters prompt + parameters in UI
2. Next.js validates input (Zod schema)
3. Next.js API route calls Modal API directly (/generate)
4. Modal spins up A100 GPU container (10-30s cold, instant warm)
5. Diffusers pipeline loads FLUX.2 model from Modal Volume
6. Generation starts, updates DB directly every 5s (psycopg2)
7. Frontend polls DB via SSE (/api/generation/[id]/stream)
8. Frontend updates progress bar in real-time
9. Output saved to R2, public URL returned
10. Backend updates DB with completion status
11. Frontend displays result with download link
```

**Performance Targets:**
- Cold start: <45s
- Warm start: <20s
- Cost per image: $0.01-0.02
- GPU: A100-80GB @ $2.50/hr

### Video Generation Flow (Text-to-Video)

```
1. User enters prompt + parameters (duration, FPS, motion strength)
2. UI validates and submits to Next.js API
3. API calls Modal video-gen endpoint (/generate_text2video)
4. Modal loads Mochi 1 model (18GB VRAM, GGUF Q8)
5. Generation runs for 2-3 minutes
6. Progress updates every 10s via direct DB updates (0%, 25%, 50%, 75%, 100%)
7. Frontend polls progress via SSE
8. Output video (5.4s @ 30fps, 480p) uploaded to R2
9. Backend saves metadata to DB (prompt, parameters, timestamp)
10. Frontend displays video player with controls
```

**Performance Targets:**
- Generation time: <3 min for 5s video
- Cost per video: $0.08-0.12
- GPU: A100-80GB @ $2.50/hr

### Video Generation Flow (Image-to-Video)

```
1. User selects image from gallery OR uploads new image
2. User adjusts parameters (motion strength, FPS, style)
3. Next.js API calls Modal video-gen endpoint (/generate_img2video)
4. Modal loads CogVideoX-5B model (12GB VRAM)
5. CogVideoX processes image → video (1.5-2.5 min)
6. Progress updates every 10s via direct DB updates
7. Frontend polls progress via SSE
8. Output saved to R2, thumbnail generated
9. Frontend shows before/after comparison
```

**Performance Targets:**
- Generation time: <2 min for 5s video
- Cost per video: $0.06-0.10
- GPU: A100-80GB @ $2.50/hr

### Audio Generation Flow

```
1. User enters prompt describing desired music/sound (genre, mood, instruments)
2. User adjusts parameters (duration, temperature, top_k, top_p)
3. Next.js API calls Modal audio-gen endpoint (/generate)
4. Modal loads MusicGen Large model (16GB VRAM)
5. Generation runs for 10-15 seconds (30s audio output)
6. Progress updates every 5s via direct DB updates
7. Frontend polls progress via SSE
8. Output audio (32kHz WAV) uploaded to R2
9. Backend saves metadata to DB (prompt, parameters, timestamp)
10. Frontend displays audio player with waveform
```

**Performance Targets:**
- Generation time: <15s for 30s audio
- Cost per audio: <$0.01
- GPU: L40S @ $1.20/hr (48% savings vs A100)

### TTS Generation Flow

```
1. User enters text + optional voice reference audio
2. User selects language, speed, emotion/style settings
3. Next.js API calls Modal tts-gen endpoint (/generate)
4. Modal loads F5-TTS model (6-8GB VRAM)
5. Generation runs for 4-6 seconds (30s speech output)
6. Progress updates every 2s via direct DB updates (0%, 50%, 100%)
7. Frontend polls progress via SSE
8. Output speech audio uploaded to R2
9. Backend saves metadata to DB (text, voice settings, timestamp)
10. Frontend displays audio player with waveform
```

**Performance Targets:**
- Generation time: <6s for 30s speech
- Cost per speech: <$0.002
- GPU: A10G @ $1.10/hr
- Voice cloning: 3-10s reference audio required

### Phase 2: Video Editing Flow

```
1. User creates new project in Projects page
2. Imports generated videos + uploads custom videos
3. Drags clips to multi-track timeline
4. Applies AI effects:
   - Style transfer (Wan 2.1-VACE)
   - Upscaling (540p → 1080p via StepVideo-T2V)
   - Background replacement
5. Adds auto-generated music (MusicGen)
6. Syncs transitions to music beats
7. Adds animated text overlays
8. Previews in real-time
9. Exports final video (1080p, H.264, MP4)
10. Saves to R2, generates shareable link
```

**Performance Targets:**
- Timeline latency: <100ms
- Export time: <2x video duration
- AI effect processing: <1 min per effect

---

## Database Schema

### Users Table
```typescript
users {
  id: uuid (PK)
  email: text (unique)
  name: text
  createdAt: timestamp
}
```

### Sessions Table
```typescript
sessions {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  expiresAt: timestamp
}
```

### Generations Table
```typescript
generations {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  type: text ('image' | 'video' | 'audio' | 'speech')
  model: text ('flux1-dev' | 'flux2-dev' | 'mochi-1' | 'cogvideox' | 'musicgen' | 'f5-tts')
  prompt: text
  parameters: jsonb ({ steps, cfg, seed, resolution, voiceReferenceUrl, language, speed, ... })
  outputUrl: text (R2 public URL)
  status: text ('pending' | 'processing' | 'completed' | 'failed')
  error: text (nullable)
  processingTimeMs: integer
  createdAt: timestamp
  completedAt: timestamp (nullable)
}
```

**Indexes:**
- `userId` (for user gallery queries)
- `status` (for filtering)
- `createdAt` (for sorting)

### Workflow Presets Table
```typescript
workflowPresets {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  name: text
  description: text
  type: text ('image' | 'video' | 'audio')
  workflowJson: jsonb (ComfyUI workflow definition)
  isPublic: boolean (default: false)
  createdAt: timestamp
}
```

### Voice Library Table
```typescript
voiceLibrary {
  id: uuid (PK)
  userId: uuid (FK → users.id, nullable for system voices)
  name: text
  description: text
  referenceAudioUrl: text (R2 URL to voice sample)
  language: text ('en' | 'zh' | 'fr' | 'de' | 'ja' | 'ko' | ...)
  isPublic: boolean (default: false)
  isSystem: boolean (default: false, true for pre-loaded voices)
  createdAt: timestamp
}
```

**Indexes:**
- `userId` (for user's voice library)
- `isSystem` (for filtering system voices)
- `isPublic` (for public voice discovery)

**Pre-loaded System Voices (5-10):**
- Professional Male (English)
- Professional Female (English)
- Casual Male (English)
- Casual Female (English)
- Narrator (English)

### Projects Table (Phase 2)
```typescript
projects {
  id: uuid (PK)
  userId: uuid (FK → users.id)
  name: text
  description: text
  timeline: jsonb (video editing timeline data)
  assets: jsonb (array of generation IDs)
  outputUrl: text (final video R2 URL)
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## User Interface & Experience

### Design System
**Framework:** shadcn/ui v2.x + Tailwind CSS v4

**Color Palette:**
- Primary: Modern gradient (purple/blue)
- Secondary: Neutral grays
- Accent: Vibrant highlights for CTAs
- Success: Green
- Error: Red
- Warning: Orange

**Typography:**
- Headings: Inter (sans-serif)
- Body: Inter (sans-serif)
- Code: JetBrains Mono (monospace)

### Key UI Components

#### Landing Page
**Sections:**
1. Hero
   - Bold headline: "Create Professional Videos with AI"
   - Subheading: "Generate images, videos, and music in seconds"
   - Primary CTA: "Start Creating Free"
   - Demo video/animation showcasing capabilities

2. Features
   - 4-column grid
   - Icons + titles + descriptions
   - "Image Generation", "Video Creation", "Audio Production", "Speech Synthesis"

3. Pricing
   - Free tier: 10 generations/month
   - Pro tier: $29/month (unlimited generations)
   - Enterprise: Custom pricing

4. Footer
   - Links, social media, newsletter signup

#### Generation Interface (Image)
**Layout:**
- Left sidebar: Model selector, parameter controls
- Center: Large preview area
- Right sidebar: Generation history, workflow presets

**Parameters:**
- Prompt (textarea with templates)
- Model (FLUX.2 dev vs schnell)
- Steps (20-50, slider)
- CFG Scale (1-20, slider)
- Resolution (dropdown: 512x512, 1024x1024, 1536x1536)
- Seed (random or manual input)
- LoRA weights (advanced, collapsible)

**Actions:**
- "Generate" button (primary CTA)
- "Save Preset" button
- "Download" button (after generation)
- "Edit in Video" button (img2vid workflow)

#### Generation Interface (TTS/Speech)
**Layout:**
- Left sidebar: Voice settings, language selector
- Center: Text input area, waveform preview
- Right sidebar: Voice library, recent generations

**Parameters:**
- Text (textarea, max 500 chars for 30s speech)
- Voice (select from library or upload reference sample)
- Language (dropdown: English, Chinese, French, German, etc.)
- Speed (0.8x - 1.5x, slider)
- Emotion/Style (optional text description)

**Voice Library:**
- Pre-loaded system voices (5-10 professional voices)
- User-uploaded voice samples (for cloning)
- Voice preview button (play 5s sample)
- Upload voice sample button (3-10s audio file)

**Actions:**
- "Generate Speech" button (primary CTA)
- "Upload Voice Sample" button (for cloning)
- "Download" button (after generation)
- "Add to Video" button (integration with video gen)

#### Progress Indicator
**Design:**
- Linear progress bar (0-100%)
- Real-time updates via SSE (<500ms latency)
- Estimated time remaining
- "Cancel" button (aborts job)
- Status messages: "Loading model...", "Generating...", "Uploading..."

#### Gallery
**Layout:**
- Masonry grid (responsive columns)
- Filters: Type (image/video/audio), Date range, Model
- Search: Full-text search on prompts
- Sort: Newest, Oldest, Most liked

**Card Design:**
- Thumbnail preview
- Metadata overlay: Model, timestamp, parameters
- Actions: Download, Delete, Re-generate, Share

#### Video Editor (Phase 2)
**Layout:**
- Top: Toolbar (import, effects, export)
- Left: Asset library (drag-drop)
- Center: Video preview
- Bottom: Multi-track timeline
- Right: Effects panel, parameter controls

**Timeline Features:**
- Multi-track (video + audio layers)
- Trim, cut, split, arrange clips
- Keyframe animations
- Transitions (drag between clips)
- Waveform visualization

---

## User Customization & Workflows

### Pre-Built Workflow Presets

#### Image Generation Presets
1. **Photorealistic Portrait**
   - Model: FLUX.2 dev
   - Steps: 40
   - CFG: 7.5
   - Resolution: 1024x1024
   - Prompt template: "professional portrait of {subject}, studio lighting, bokeh background"

2. **Product Photography**
   - Model: FLUX.2 dev + ControlNet
   - Steps: 45
   - CFG: 8
   - Resolution: 1536x1536
   - Prompt template: "{product} on white background, commercial photography, high detail"

3. **Anime Style**
   - Model: FLUX.2 dev
   - Steps: 35
   - CFG: 9
   - LoRA: Anime style LoRA
   - Prompt template: "anime style {description}, vibrant colors, detailed"

#### Video Generation Presets
1. **Cinematic Short**
   - Model: Mochi 1
   - Duration: 5s
   - FPS: 30
   - Motion: High
   - Prompt template: "cinematic shot of {scene}, slow motion, dramatic lighting"

2. **Anime Character → Video**
   - Pipeline: FLUX.2 (image) → CogVideoX (img2vid)
   - Style: Consistent with input image
   - Motion: Moderate
   - Duration: 3s

3. **Music Video**
   - Pipeline: FLUX.2 → CogVideoX + MusicGen
   - Auto-syncs video to generated music
   - Beat-matched transitions
   - Duration: 5s video + 30s music

### Custom Workflow Upload
**Feature:** Allow users to export ComfyUI workflows and upload to the platform

**Flow:**
1. User creates workflow in ComfyUI desktop
2. Exports as JSON
3. Uploads via UI
4. System validates workflow for safety
5. Stores in `workflow_presets` table
6. Available in user's preset library

**Safety Checks:**
- No arbitrary code execution
- Whitelist of allowed nodes
- Parameter bounds checking
- VRAM estimation

---

## Cost Analysis & Projections

### Per-Generation Costs

| Generation Type | GPU | Time | Cost |
|----------------|-----|------|------|
| Image (FLUX.1/FLUX.2) | A100-80GB @ $2.50/hr | 15-30s | $0.01-0.02 |
| Video (Mochi text2vid) | A100-80GB @ $2.50/hr | 2-3 min | $0.08-0.12 |
| Video (CogVideoX img2vid) | A100-80GB @ $2.50/hr | 1.5-2.5 min | $0.06-0.10 |
| Audio (MusicGen 30s) | L40S @ $1.20/hr | 10-15s | $0.003-0.005 |
| Speech (F5-TTS 30s) | A10G @ $1.10/hr | 4-6s | $0.0012-0.0018 |

### Monthly Cost Projections

#### Development Phase (Low Usage)
- GPU: ~$50 (testing, debugging)
- Modal Volumes: ~$18 (184GB models, 5 apps)
- R2 Storage: ~$1 (test outputs)
- Neon DB: Free tier
- Vercel: Free tier
- **Total: ~$69/month**

#### Production Phase (100 images + 50 videos + 50 speech/day)
- GPU: ~$208
  - Images: 100 × 30 × $0.015 = $45
  - Videos: 50 × 30 × $0.10 = $150
  - Audio: 20 × 30 × $0.004 = $2.40
  - Speech: 50 × 30 × $0.0015 = $2.25
  - Burst overhead: ~$8
- Modal Volumes: ~$18 (184GB models)
- R2 Storage: ~$3
  - Outputs (100GB): $1.50
  - Voice samples (10GB): $0.15
- Neon DB: $19 (Pro tier)
- Inngest: $50 (Scale tier, 50k events)
- Vercel: $20 (Pro tier)
- **Total: ~$290/month**

#### Scaling Phase (1000 images + 500 videos + 500 speech/day)
- GPU: ~$2,030
  - Images: 1000 × 30 × $0.015 = $450
  - Videos: 500 × 30 × $0.10 = $1,500
  - Audio: 200 × 30 × $0.004 = $24
  - Speech: 500 × 30 × $0.0015 = $22.50
  - Burst overhead: ~$33.50
- Modal Volumes: ~$18 (184GB models)
- R2 Storage: ~$25
  - Outputs (500GB): $7.50
  - Voice samples (50GB): $0.75
- Neon DB: $69 (Scale tier)
- Vercel: $20 (Pro tier)
- **Total: ~$2,162/month**

### Revenue Model (Future)

#### Free Tier
- 10 generations/month
- Standard models only
- Public gallery (watermarked)
- Community support

#### Pro Tier - $29/month
- Unlimited generations
- All models (FLUX.1, FLUX.2, Mochi, CogVideoX, MusicGen, F5-TTS)
- Voice cloning (upload custom voice samples)
- Private gallery
- Custom workflow upload
- Priority queue
- Email support

#### Enterprise Tier - Custom
- API access (REST + webhooks)
- Custom model fine-tuning
- Dedicated GPU instances
- SLA guarantees
- White-label options
- Phone + Slack support

---

## Implementation Phases

### Phase 1A: Infrastructure Setup (Week 1)

**Goals:** Set up foundational services

**Tasks:**
1. Initialize Next.js 16 project with TypeScript
2. Set up Neon database + Drizzle ORM
3. Configure Better Auth (email/password + OAuth)
4. Initialize Inngest client + webhook endpoint
5. Create Cloudflare R2 bucket + access keys
6. Set up environment variables (`.env.local`)
7. Deploy to Vercel (staging environment)

**Files to Create:**
- `/frontend/package.json` - Dependencies
- `/frontend/next.config.ts` - Next.js config
- `/frontend/tailwind.config.ts` - Tailwind config
- `/frontend/drizzle.config.ts` - Drizzle config
- `/frontend/lib/db.ts` - Neon connection
- `/frontend/lib/auth.ts` - Better Auth setup
- `/frontend/lib/inngest.ts` - Inngest client
- `/frontend/lib/r2.ts` - R2 SDK setup
- `/frontend/.env.local` - Environment variables

**Deliverables:**
- ✅ Neon database with schema migrated
- ✅ Better Auth working (signup/login/logout)
- ✅ Inngest connected (dev server running)
- ✅ R2 bucket created with test upload
- ✅ Vercel deployment (staging URL)

**Success Criteria:**
- User can sign up, log in, log out
- Database tables visible in Neon dashboard
- Inngest dev server shows events
- Test file uploaded to R2 successfully

---

### Phase 1B: Modal Backend + FLUX.2 (Week 1-2)

**Goals:** Get image generation working end-to-end

**Tasks:**
1. Set up Modal account + install CLI
2. Create Modal app with A100 80GB config
3. Build Docker image with ComfyUI + dependencies
4. Implement FP8 model downloader (FLUX.2)
5. Create FLUX.2 text2img workflow JSON
6. Implement API endpoint for Inngest
7. Test local + deploy to Modal
8. Upload test models to Modal Volume

**Files to Create:**
- `/modal_app/main.py` - Modal app entry point
- `/modal_app/models.py` - Model download/FP8 quantization
- `/modal_app/comfy_runner.py` - ComfyUI executor
- `/modal_app/api.py` - REST API endpoints
- `/modal_app/workflows/flux2_text2img.json` - Workflow
- `/modal_app/requirements.txt` - Python deps
- `/modal_app/.env` - Modal secrets

**Deliverables:**
- ✅ FLUX.2 FP8 model loaded (12GB VRAM)
- ✅ ComfyUI running headless on Modal
- ✅ API endpoint responding to requests
- ✅ Test image generated successfully
- ✅ Inngest integration working

**Success Criteria:**
- API call returns job ID immediately
- Progress events emitted every 5s
- Image generated in <45s (cold), <20s (warm)
- Output uploaded to R2 with public URL

---

### Phase 1C: Frontend Landing + Generation UI (Week 2)

**Goals:** Build beautiful UI with frontend-design skill

**Tasks:**
1. Use frontend-design skill for landing page
2. Implement auth pages (login/signup)
3. Build dashboard with stats
4. Create image generation interface
5. Implement real-time progress (SSE)
6. Add parameter controls (steps, CFG, etc.)
7. Integrate with Inngest API
8. Test end-to-end flow

**Files to Create:**
- `/frontend/app/page.tsx` - Landing page
- `/frontend/app/(auth)/login/page.tsx` - Login
- `/frontend/app/(auth)/signup/page.tsx` - Signup
- `/frontend/app/(dashboard)/dashboard/page.tsx` - Dashboard
- `/frontend/app/(dashboard)/generate/image/page.tsx` - Image gen UI
- `/frontend/components/landing/Hero.tsx` - Hero section
- `/frontend/components/landing/Features.tsx` - Features
- `/frontend/components/landing/Pricing.tsx` - Pricing
- `/frontend/components/generation/PromptInput.tsx` - Prompt editor
- `/frontend/components/generation/ModelSelector.tsx` - Model picker
- `/frontend/components/generation/ParameterPanel.tsx` - Params
- `/frontend/components/generation/GenerationProgress.tsx` - Progress
- `/frontend/app/api/generate/route.ts` - API route
- `/frontend/app/api/generation/[jobId]/stream/route.ts` - SSE endpoint

**Deliverables:**
- ✅ Professional landing page (hero + features + pricing)
- ✅ User authentication UI
- ✅ Image generation interface
- ✅ Real-time progress updates
- ✅ Parameter customization

**Success Criteria:**
- User can sign up → generate image → see result
- Progress bar updates in real-time (<500ms latency)
- Mobile responsive design
- Accessible (WCAG AA compliance)

---

### Phase 1D: Video Generation (Week 3)

**Goals:** Add Mochi 1 + CogVideoX workflows

**Tasks:**
1. Download Mochi 1 model to Modal Volume
2. Create Mochi text2video workflow JSON
3. Download CogVideoX model
4. Create CogVideoX img2video workflow JSON
5. Extend API to handle video requests
6. Build video generation UI
7. Add video player component
8. Test both workflows

**Files to Create:**
- `/modal_app/workflows/mochi_text2video.json` - Mochi workflow
- `/modal_app/workflows/cogvideox_img2video.json` - CogVideoX workflow
- `/frontend/app/(dashboard)/generate/video/page.tsx` - Video UI
- `/frontend/components/generation/VideoPlayer.tsx` - Player
- Update `/modal_app/models.py` - Add Mochi + CogVideoX downloaders
- Update `/frontend/lib/inngest.ts` - Add generateVideo function

**Deliverables:**
- ✅ Text-to-video working (Mochi 1)
- ✅ Image-to-video working (CogVideoX)
- ✅ Video player with controls
- ✅ Both workflows accessible from UI

**Success Criteria:**
- Text2vid: 5s video in <3 min
- Img2vid: 5s video in <2 min
- Video plays in browser (MP4, H.264)
- Cost per video: <$0.12

---

### Phase 1E: Audio + Gallery (Week 3-4)

**Goals:** Complete Phase 1 feature set

**Tasks:**
1. Download MusicGen Large to Modal
2. Create MusicGen workflow JSON
3. Build audio generation UI
4. Implement audio player
5. Build gallery page (masonry grid)
6. Add filters (type, date, model)
7. Add search (full-text on prompts)
8. Implement download/delete/share actions

**Files to Create:**
- `/modal_app/workflows/musicgen_text2music.json` - MusicGen workflow
- `/frontend/app/(dashboard)/generate/audio/page.tsx` - Audio UI
- `/frontend/app/(dashboard)/gallery/page.tsx` - Gallery
- `/frontend/components/gallery/MediaGrid.tsx` - Grid layout
- `/frontend/components/gallery/MediaCard.tsx` - Card component
- `/frontend/components/generation/AudioPlayer.tsx` - Player
- Update `/modal_app/models.py` - Add MusicGen downloader

**Deliverables:**
- ✅ Text-to-music generation working
- ✅ Gallery with all user generations
- ✅ Search + filters functional
- ✅ Download/delete/share actions

**Success Criteria:**
- Audio generation: 30s track in <15s
- Gallery loads <100 items in <1s
- Search returns results in <500ms
- Cost per track: <$0.01

---

### Phase 1F: Polish & Optimization (Week 4)

**Goals:** Production readiness

**Tasks:**
1. Implement workflow presets (save/load)
2. Add error handling + retry logic
3. Implement rate limiting (per user)
4. Build usage analytics dashboard
5. Set up monitoring (Sentry for errors)
6. Configure Inngest dashboard
7. Optimize container warm-up
8. Pre-load frequently used models
9. Add loading skeletons
10. Implement toast notifications
11. Write documentation
12. Deploy to production

**Files to Create:**
- `/frontend/components/ui/Toast.tsx` - Notifications
- `/frontend/components/ui/Skeleton.tsx` - Loading states
- `/frontend/app/(dashboard)/settings/page.tsx` - User settings
- `/frontend/app/(dashboard)/analytics/page.tsx` - Analytics
- `/frontend/lib/monitoring.ts` - Sentry setup
- `/frontend/lib/rate-limit.ts` - Rate limiting
- `/docs/README.md` - User documentation

**Deliverables:**
- ✅ Workflow presets working
- ✅ Error handling comprehensive
- ✅ Rate limiting active (10 gen/day free tier)
- ✅ Analytics dashboard functional
- ✅ Monitoring alerts configured
- ✅ Production deployment stable

**Success Criteria:**
- Error rate <1%
- API uptime >99.5%
- Cold start <45s, warm <20s
- User can save/load custom presets
- Monitoring catches all failures

---

### Phase 2: Professional Video Editing (Weeks 5-8+)

**Note:** Phase 2 is out of scope for initial MVP but documented for future reference.

**Major Features:**
- Multi-track timeline editor
- AI effects (style transfer, upscaling, enhancement)
- Audio sync (beat-matched music, auto-generation)
- Transitions & text overlays
- Project management
- Export pipeline (1080p, H.264, MP4)

**Models to Integrate:**
- Wan 2.1-VACE (video editing)
- StepVideo-T2V (upscaling)
- SkyReels V1 (character enhancement)

---

## Key Architectural Decisions

### Why FLUX.2 (FP8) over FLUX.1?
- Latest model (32B params vs 12B)
- Superior quality + 4MP resolution support
- FP8 quantization: 37GB → 12GB VRAM (fits budget)
- Future-proof for Phase 2 high-res video frames

### Why Both Mochi + CogVideoX?
- **Mochi 1:** Best text-to-video quality, longer videos (5.4s)
- **CogVideoX:** Best image-to-video (FLUX.2 → video pipeline)
- Complementary workflows (text2vid + img2vid)
- Both optimized for <20GB VRAM

### ~~Why Inngest over Simple Queues?~~ (DEPRECATED)
**Previous Rationale:**
- Durable workflows (survives failures)
- Built-in retry logic with exponential backoff
- Event-driven architecture (loosely coupled)
- Visual workflow debugging

**Why Deprecated:**
- Added complexity without sufficient benefit for this use case
- Modal provides native retry logic
- Direct API calls simpler to debug and maintain
- Cost savings (no Inngest subscription needed)
- **Replaced with:** Direct Modal API calls + database polling via SSE

### Why Microservices Pattern over Monolithic ComfyUI App?
**Actual Implementation:** 5 separate Modal apps (image-gen, flux2-gen, video-gen, audio-gen, tts-gen)

**Why This Approach:**
- **Simpler deployment:** Independent releases per model/service
- **Easier debugging:** Isolated failures, clear error boundaries
- **Flexible GPU allocation:** Each model gets optimal GPU (A100 for video, L40S for audio, A10G for TTS)
- **No complex orchestration:** No LRU model swapping logic needed
- **Direct API control:** Diffusers/Transformers APIs instead of ComfyUI JSON workflows
- **Inspired by production patterns:** Real-world microservices architecture (hey-gen-clone repo)
- **Trade-off accepted:** Higher total GPU cost vs. shared GPU, but worth it for operational simplicity

**What Changed from PRD:**
- PRD planned: Single `modal_app/` with centralized ComfyUI workflows + LRU model swapping
- Actually built: 4 separate Modal apps with direct Diffusers/Transformers pipelines
- Added 5th app for TTS (F5-TTS on A10G)

### Why F5-TTS over Coqui XTTS/Bark/Tortoise?
**Comparison:**

| Model | Quality | Speed (30s) | VRAM | License | Voice Cloning |
|-------|---------|-------------|------|---------|---------------|
| F5-TTS | State-of-art | 4-6s | 6-8GB | MIT | 3-10s reference |
| Coqui XTTS v2 | Good | 10-15s | 10-16GB | CPML (restrictive) | 6s reference |
| Bark | Good | 15-20s | 10-16GB | MIT | No (voice presets) |
| Tortoise TTS | Excellent | 60-120s | 8-12GB | Apache 2.0 | Yes (slow) |

**Why F5-TTS:**
- **State-of-the-art quality** (Jan 2025, latest diffusion-based TTS)
- **Fastest inference:** 30s audio in 4-6 seconds (3x faster than XTTS)
- **Best voice cloning:** Minimal reference audio (3-10s) with excellent results
- **MIT License:** Fully commercial-friendly (vs CPML restrictions in XTTS)
- **Low VRAM:** 6-8GB fits comfortably on A10G ($1.10/hr vs $2.50/hr for A100)
- **Active development:** Latest release Dec 2024, strong community
- **Multi-language:** English, Chinese, French, German, Japanese, Korean support

**Cost Comparison:**
- F5-TTS on A10G: $0.0012-0.0018 per 30s
- XTTS on A100: $0.003-0.005 per 30s (2.5x more expensive)

### Why Better Auth over Clerk/Auth.js?
- Modern, type-safe
- Self-hosted (no vendor lock-in)
- Free (vs Clerk's $25/month)
- Integrates natively with Neon DB
- Active development

### Why Cloudflare R2 over S3?
- 10x cheaper egress: $0/GB vs $0.09/GB
- Storage: $0.015/GB vs $0.023/GB
- S3-compatible API (easy migration)
- Public URL support (CDN built-in)
- Perfect for video/image hosting

### Why Neon over Traditional PostgreSQL?
- Serverless (pay-per-use, autoscaling)
- Instant database branching (dev/staging/prod)
- Free tier generous (512MB storage)
- Drizzle ORM integration
- Zero maintenance

### Why Next.js 16 over 15?
- Turbopack stable (5-10x faster dev)
- "use cache" directive (explicit caching)
- Better dev tooling (MCP integration)
- Future-proof

### Why Modal over RunPod/Vast.ai?
- Serverless billing (pay only during generation)
- Zero infrastructure management
- Python-native (integrates with ComfyUI easily)
- Built-in volume storage for models
- Auto-scaling

---

## Risk Assessment & Mitigation

### Risk 1: Cold Start Latency
**Issue:** First request takes 10-30s to spin up GPU
**Impact:** Poor UX for first-time users
**Probability:** High
**Mitigation:**
- Container idle timeout: 5 min (keeps warm for burst traffic)
- Pre-warm container on user login
- Show expected wait time to users
- Implement priority queue for paid users

### Risk 2: Model Download Time
**Issue:** 120GB models take 5-10 min on first run
**Impact:** Delayed deployments, cold starts
**Probability:** Medium
**Mitigation:**
- Modal Volumes with pre-downloaded models
- Automated model update pipeline
- Versioned model snapshots

### Risk 3: GPU Out of Memory
**Issue:** Loading FLUX.2 + Mochi exceeds 80GB
**Probability:** Low (with FP8 quantization)
**Mitigation:**
- FP8 quantization reduces FLUX.2 to 12GB
- Model swapping (load on-demand)
- Monitor VRAM usage, add LRU eviction
- Graceful degradation (queue vs reject)

### Risk 4: Concurrent User Limits
**Issue:** Multiple users trigger multiple GPU instances → high costs
**Impact:** Cost overruns
**Probability:** High (as we scale)
**Mitigation:**
- Queue system (max 5 concurrent jobs)
- Rate limiting (10 gen/day free, unlimited pro)
- Cost alerts (email when >$500/day)
- Auto-scaling limits (max 10 GPUs)

### Risk 5: Generated Content Storage Costs
**Issue:** 1000 videos = 50GB+ storage → growing costs
**Impact:** Storage costs scale with users
**Probability:** High (long-term)
**Mitigation:**
- R2 cheap storage ($0.015/GB)
- Auto-delete after 30 days (free tier)
- Compression (H.264 high efficiency)
- User-managed storage (download + delete)
- Paid tiers get longer retention

### Risk 6: Phase 2 Complexity
**Issue:** Timeline editing is complex (state management, ffmpeg orchestration)
**Impact:** Delayed Phase 2 launch
**Probability:** Medium
**Mitigation:**
- Use proven libraries (ffmpeg-python, moviepy)
- Start simple (trim/cut only)
- Iterate based on user feedback
- Consider existing solutions (Frame AI, Wan 2.1-VACE)

---

## Success Metrics & KPIs

### Phase 1 KPIs (Launch → 3 Months)

#### Technical Performance
| Metric | Target | Measurement |
|--------|--------|-------------|
| Image generation (cold) | <45s | p95 latency |
| Image generation (warm) | <20s | p95 latency |
| Video (Mochi text2vid) | <3 min | p95 latency |
| Video (CogVideoX img2vid) | <2 min | p95 latency |
| Audio generation | <15s | p95 latency |
| API uptime | >99.5% | Monthly uptime |
| Error rate | <1% | Failed jobs / total jobs |

#### User Experience
| Metric | Target | Measurement |
|--------|--------|-------------|
| Signup → first generation | <2 min | Time to first value |
| Mobile responsive | 100% | Works on phones/tablets |
| Real-time progress latency | <500ms | SSE update delay |
| Cost per image | <$0.02 | GPU cost / generation |
| Cost per video | <$0.12 | GPU cost / generation |

#### Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| User signups | 1000/month | Month 3 target |
| DAU/MAU ratio | >20% | Engagement |
| Free → Pro conversion | >5% | Conversion rate |
| Churn rate | <10%/month | Monthly churn |
| NPS score | >50 | User satisfaction |

### Phase 2 KPIs (3-6 Months Post-Launch)

#### Technical Performance
| Metric | Target | Measurement |
|--------|--------|-------------|
| Timeline editing latency | <100ms | Drag/drop responsiveness |
| Final video export | <2x duration | Export time / video length |
| AI effect processing | <1 min | Per effect |

#### User Experience
| Metric | Target | Measurement |
|--------|--------|-------------|
| Generate → edit → export | <15 min | Full project time |
| Video quality (1080p) | >90% satisfaction | User survey |
| Gallery organization | Search <500ms | Performance |

#### Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Pro tier adoption | >15% | Of active users |
| MRR | $10k | Monthly recurring revenue |
| Enterprise leads | 5/month | Sales pipeline |

---

## Security & Compliance

### Data Privacy
- **User Data:** Encrypted at rest (Neon), in transit (TLS)
- **Generated Content:** Private by default, public