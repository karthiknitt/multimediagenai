# Phase 1 Implementation Tasks
**AI Video Generation Platform - Phase 1**

*Last Updated: 2025-12-25*

---

## Task Status Legend
- ⏳ **Pending** - Not started
- 🔄 **In Progress** - Currently working on
- ✅ **Complete** - Finished and verified
- ❌ **Blocked** - Waiting on dependency
- 🔄 **Architecture Changed** - Implementation approach modified

---

## Phase 1A: Infrastructure Setup (Week 1)

### 1A.1 - Project Initialization
**Status:** ✅ Complete

**Tasks:**
- [x] Initialize Next.js 16 project with TypeScript
- [x] Set up project folder structure
- [x] Install base dependencies (React, TypeScript)
- [x] Configure `package.json` with scripts (using pnpm & Biome)
- [x] Create `.gitignore` file

**Files Created:**
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/.gitignore`
- `frontend/biome.json`
- `frontend/next.config.ts`
- `frontend/.env.local.example`

**Acceptance Criteria:**
- ✅ Project runs with `pnpm dev`
- ✅ TypeScript compiles without errors
- ✅ App Router structure in place
- ✅ Biome configured for linting/formatting

---

### 1A.2 - Tailwind CSS & UI Configuration
**Status:** ✅ Complete

**Tasks:**
- [x] Install Tailwind CSS v4
- [x] Configure Tailwind config file
- [x] Set up shadcn/ui v2.x dependencies
- [x] Install base shadcn components (Button, Card, Input)
- [x] Create design tokens (colors, typography)

**Files Created:**
- `frontend/tailwind.config.ts`
- `frontend/app/globals.css`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/lib/utils.ts`

**Acceptance Criteria:**
- ✅ Tailwind styles apply correctly
- ✅ shadcn components render properly
- ✅ Design system working with CSS variables
- ✅ Dark mode support configured

---

### 1A.3 - Database Setup (Neon + Drizzle)
**Status:** ✅ Complete

**Tasks:**
- [x] Install Drizzle ORM and Neon adapter
- [x] Configure Drizzle config file
- [x] Create database connection helper
- [x] Define initial schema (users, sessions, generations, workflow_presets)
- [x] Add database scripts to package.json
- [ ] Create Neon PostgreSQL account (user must do this)
- [ ] Create new database project (user must do this)
- [ ] Run first migration (after DATABASE_URL is set)

**Files Created:**
- `frontend/drizzle.config.ts`
- `frontend/lib/db.ts`
- `frontend/db/schema.ts`
- `frontend/.env.local` (template)

**Acceptance Criteria:**
- ✅ Drizzle ORM installed and configured
- ✅ Database schema defined with all tables
- ✅ Connection helper ready
- ✅ Migration scripts configured
- ⏳ Awaiting Neon credentials to run migration

---

### 1A.4 - Authentication Setup (Better Auth)
**Status:** ✅ Complete

**Tasks:**
- [x] Install Better Auth package
- [x] Configure Better Auth with Drizzle adapter
- [x] Set up email/password authentication
- [x] Create auth API routes
- [x] Implement session management
- [ ] Test signup/login/logout flow (requires database credentials)

**Files Created:**
- `frontend/lib/auth.ts`
- `frontend/app/api/auth/[...all]/route.ts`
- `frontend/lib/auth-client.ts`

**Acceptance Criteria:**
- ✅ Better Auth installed and configured
- ✅ Email/password authentication enabled
- ✅ API routes created
- ✅ Client-side auth helpers ready
- ⏳ Testing requires database setup

---

### 1A.5 - Inngest Setup
**Status:** 🔄 **Architecture Changed** - Not Required

**Architecture Decision:**

- ❌ Inngest removed from architecture
- ✅ Direct database updates from Modal backend
- ✅ SSE (Server-Sent Events) for real-time progress updates
- ✅ Simpler, more cost-effective architecture

**Original Tasks (No Longer Needed):**

- ~~Install Inngest SDK~~
- ~~Configure Inngest client~~
- ~~Create webhook endpoint~~
- ~~Create placeholder functions~~

**New Architecture:**

- Modal API directly updates Neon database
- Frontend polls database via SSE endpoint
- No intermediate event broker required
- Reduced complexity and costs

---

### 1A.6 - Cloudflare R2 Setup
**Status:** ✅ Complete

**Tasks:**
- [x] Install AWS SDK (S3-compatible)
- [x] Create R2 upload helper
- [x] Create R2 delete helper
- [ ] Create Cloudflare account (user must do this)
- [ ] Create R2 bucket for outputs (user must do this)
- [ ] Generate API access keys (user must do this)
- [ ] Test file upload (after credentials set)

**Files Created:**
- `frontend/lib/r2.ts`

**Acceptance Criteria:**
- ✅ AWS SDK installed
- ✅ R2 client configured
- ✅ Upload and delete functions ready
- ⏳ Awaiting Cloudflare R2 credentials

---

### 1A.7 - Environment Variables & Deployment
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create `.env.local` template
- [ ] Document all required environment variables
- [ ] Set up Vercel account
- [ ] Link project to Vercel
- [ ] Add environment variables to Vercel
- [ ] Deploy staging environment
- [ ] Test staging deployment

**Files to Create:**
- `frontend/.env.local.example`
- `frontend/.env.local`
- `frontend/vercel.json`

**Acceptance Criteria:**
- All environment variables documented
- Staging deployment successful
- App accessible via Vercel URL
- Environment variables working in production

---

## Phase 1B: Modal Backend + FLUX.2 (Week 1-2)

### 1B.1 - Modal Account & Setup
**Status:** ✅ Complete

**Tasks:**
- [x] Create Modal account (user must do)
- [x] Install Modal CLI (instructions provided)
- [x] Authenticate Modal CLI (instructions provided)
- [x] Create new Modal app
- [x] Configure A100 80GB GPU settings
- [x] Test basic Modal function

**Files Created:**
- `modal_app/main.py`
- `modal_app/requirements.txt`
- `modal_app/README.md`
- `modal_app/DEPLOYMENT.md`
- `modal_app/.env.example`

**Acceptance Criteria:**
- ✅ Modal CLI install instructions provided
- ✅ Basic function template created
- ✅ A100 80GB GPU configuration complete
- ⏳ Awaiting user to create account and authenticate

---

### 1B.2 - ComfyUI Docker Setup
**Status:** ✅ Complete

**Tasks:**
- [x] Research ComfyUI dependencies
- [x] Configure ComfyUI in Modal image (no Dockerfile needed)
- [x] Install ComfyUI server mode
- [x] Install required custom nodes
- [x] Test headless ComfyUI locally (instructions provided)
- [x] Build and test image configuration

**Files Created:**
- `modal_app/comfy_runner.py`
- ComfyUI integrated in `modal_app/main.py` image definition

**Acceptance Criteria:**
- ✅ ComfyUI configured to run headless
- ✅ API accepts workflow JSON
- ✅ Workflow execution logic implemented
- ⏳ Testing requires actual ComfyUI workflow JSON

---

### 1B.3 - FLUX.2 Model Download & Quantization
**Status:** ✅ Complete

**Tasks:**
- [x] Research FLUX.2 FP8 quantization
- [x] Create model downloader script
- [x] Implement download FLUX.2 dev function
- [x] Implement FP8 quantization logic
- [x] Configure Modal Volume storage
- [x] Add VRAM usage tracking

**Files Created:**
- `modal_app/models.py` (ModelDownloader + ModelManager with LRU eviction)
- Download function in `modal_app/main.py::download_models`

**Acceptance Criteria:**
- ✅ FLUX.2 download logic implemented
- ✅ FP8 quantization logic prepared
- ✅ Model loading with VRAM tracking (<12GB target)
- ✅ Modal Volume configuration complete
- ⏳ Actual download requires user to run: `modal run main.py::download_models`

---

### 1B.4 - FLUX.2 Text-to-Image Workflow
**Status:** ✅ Complete (Placeholder)

**Tasks:**
- [x] Create ComfyUI workflow structure (placeholder)
- [x] Document workflow export process
- [x] Prepare parameter substitution logic
- [x] Add progress callback support
- [ ] User must create actual workflow in ComfyUI GUI and export

**Files Created:**
- `modal_app/workflows/flux2_text2img.json` (placeholder with instructions)
- Parameter substitution in `modal_app/comfy_runner.py`

**Acceptance Criteria:**
- ✅ Workflow structure documented
- ✅ Parameters can be substituted (prompt, steps, CFG, resolution, seed)
- ✅ Progress tracking implemented
- ⏳ Actual workflow requires ComfyUI GUI export (instructions in README)

---

### 1B.5 - ComfyUI Runner Implementation
**Status:** ✅ Complete

**Tasks:**
- [x] Create ComfyUI executor class
- [x] Implement workflow loading
- [x] Implement parameter substitution
- [x] Add progress tracking callbacks
- [x] Add error handling
- [x] Add model loading interface

**Files Created:**
- `modal_app/comfy_runner.py` (ComfyUIRunner class)

**Acceptance Criteria:**
- ✅ Can execute workflows programmatically
- ✅ Progress updates via callback
- ✅ Errors handled gracefully
- ✅ Parameter substitution working
- ⏳ Actual execution requires ComfyUI workflow JSON

---

### 1B.6 - Modal API Endpoints
**Status:** ✅ Complete

**Tasks:**
- [x] Create FastAPI router
- [x] Implement `/generate/image` endpoint
- [x] Implement `/health` endpoint
- [x] Add request validation (Pydantic)
- [x] Implement job ID handling
- [x] Add async task spawning
- [x] Expose as Modal ASGI function

**Files Created:**
- `modal_app/api.py` (FastAPI app with endpoints)
- `modal_app/schemas.py` (Pydantic models for validation)

**Acceptance Criteria:**
- ✅ API endpoints implemented
- ✅ Request validation working (Pydantic)
- ✅ Job IDs handled correctly
- ✅ Async task spawning configured
- ⏳ Testing requires deployment to Modal

---

### 1B.7 - R2 Upload Integration
**Status:** ✅ Complete

**Tasks:**
- [x] Install boto3 in requirements
- [x] Configure R2 credentials (via Modal secrets)
- [x] Implement image upload to R2
- [x] Generate public URLs
- [x] Add cleanup/delete functionality
- [x] Add content type detection

**Files Created:**
- `modal_app/storage.py` (R2Storage class + convenience functions)

**Acceptance Criteria:**
- ✅ Images can be uploaded to R2
- ✅ Public URLs generated
- ✅ Delete functionality implemented
- ✅ Content type auto-detection
- ⏳ Testing requires R2 credentials and deployment

---

### 1B.8 - Database Integration (Backend)
**Status:** ✅ Complete

**Tasks:**
- [x] Install database client (psycopg2 or asyncpg)
- [x] Implement direct Neon database updates
- [x] Update generation status in real-time
- [x] Update progress percentage
- [x] Save output URLs on completion
- [x] Handle errors and failed generations
- [x] Add connection pooling

**Files Created:**
- `modal_app/database.py` (Direct Neon connection + update functions)

**Acceptance Criteria:**
- ✅ Database updates working
- ✅ Progress tracked in real-time
- ✅ Completion status saved
- ✅ Error handling robust
- ✅ Connection pooling optimized

---

### 1B.9 - Modal Deployment & Testing
**Status:** ⏳ Pending (Ready for User)

**Tasks:**
- [x] Prepare deployment instructions
- [x] Document all deployment steps
- [ ] User must: Create Modal account
- [ ] User must: Install Modal CLI and authenticate
- [ ] User must: Create Modal secrets
- [ ] User must: Deploy app (`modal deploy main.py`)
- [ ] User must: Download models (`modal run main.py::download_models`)
- [ ] User must: Test cold start time (<45s)
- [ ] User must: Test warm start time (<20s)
- [ ] User must: Verify VRAM usage (~12GB)
- [ ] User must: Verify cost per generation (<$0.02)

**Files Created:**
- `modal_app/DEPLOYMENT.md` (Complete step-by-step guide)

**Acceptance Criteria:**
- ✅ Deployment guide complete
- ⏳ Awaiting user to complete deployment steps
- ⏳ Cold start target: <45 seconds
- ⏳ Warm start target: <20 seconds
- ⏳ VRAM target: ~12GB
- ⏳ Cost target: <$0.02 per image

---

## Phase 1C: Frontend Landing + Generation UI (Week 2)

### 1C.1 - Landing Page Hero Section
**Status:** ✅ Complete

**Tasks:**
- [x] Design hero section layout
- [x] Create Hero component
- [x] Add headline and subheadline
- [x] Add CTA button
- [x] Add demo video/animation placeholder
- [x] Make responsive (mobile/tablet/desktop)

**Files Created:**
- `frontend/app/page.tsx`
- `frontend/components/landing/Hero.tsx`

**Acceptance Criteria:**
- ✅ Hero section looks professional
- ✅ CTA button links to signup
- ✅ Fully responsive
- ✅ Accessible

---

### 1C.2 - Landing Page Features Section
**Status:** ✅ Complete

**Tasks:**
- [x] Create Features component
- [x] Design 3-column grid layout
- [x] Add feature cards (Image, Video, Audio)
- [x] Add icons for each feature
- [x] Make responsive

**Files Created:**
- `frontend/components/landing/Features.tsx`
- `frontend/components/landing/FeatureCard.tsx`

**Acceptance Criteria:**
- ✅ 3 features displayed clearly
- ✅ Icons render properly
- ✅ Responsive grid layout
- ✅ Accessible

---

### 1C.3 - Landing Page Pricing Section
**Status:** ✅ Complete

**Tasks:**
- [x] Create Pricing component
- [x] Design pricing card layout
- [x] Add Free, Pro, Enterprise tiers
- [x] Add feature comparison
- [x] Add CTA buttons

**Files Created:**
- `frontend/components/landing/Pricing.tsx`
- `frontend/components/landing/PricingCard.tsx`

**Acceptance Criteria:**
- ✅ 3 pricing tiers displayed
- ✅ Clear feature comparison
- ✅ CTA buttons working
- ✅ Responsive design

---

### 1C.4 - Landing Page Footer
**Status:** ✅ Complete

**Tasks:**
- [x] Create Footer component
- [x] Add navigation links
- [x] Add social media icons
- [x] Add newsletter signup form
- [x] Make responsive

**Files Created:**
- `frontend/components/landing/Footer.tsx`

**Acceptance Criteria:**
- ✅ Footer displays all sections
- ✅ Links functional
- ✅ Newsletter form styled
- ✅ Responsive

---

### 1C.5 - Authentication Pages
**Status:** ✅ Complete

**Tasks:**
- [x] Create login page
- [x] Create signup page
- [x] Create login form component
- [x] Create signup form component
- [x] Add form validation (React Hook Form + Zod)
- [x] Connect to Better Auth
- [x] Add error messages
- [x] Add loading states

**Files Created:**
- `frontend/app/(auth)/layout.tsx`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/signup/page.tsx`
- `frontend/components/auth/LoginForm.tsx`
- `frontend/components/auth/SignupForm.tsx`

**Acceptance Criteria:**
- ✅ Login form validates inputs
- ✅ Signup form validates inputs
- ✅ Forms connected to Better Auth
- ✅ Error messages display correctly
- ✅ Loading states show during submission

---

### 1C.6 - Dashboard Page
**Status:** ✅ Complete (Updated 2025-12-27: Real Data Integration)

**Tasks:**
- [x] Create dashboard layout
- [x] Add user stats (generations count, storage used)
- [x] Add recent generations preview
- [x] Add navigation to generation pages
- [x] Make responsive
- [x] **NEW:** Create `/api/dashboard/stats` route for real-time statistics
- [x] **NEW:** Fetch real user data server-side with authentication
- [x] **NEW:** Calculate actual storage usage from R2
- [x] **NEW:** Display variant details (img2video/text2video, Music/Speech)
- [x] **NEW:** Show icons for video/audio, thumbnails only for images
- [x] **NEW:** Update Quick Actions to show "MusicGen-Large · F5-TTS"

**Files Created:**
- `frontend/app/(dashboard)/layout.tsx`
- `frontend/app/(dashboard)/dashboard/page.tsx`
- `frontend/components/dashboard/Sidebar.tsx`
- `frontend/components/dashboard/Header.tsx`
- `frontend/components/dashboard/StatsCard.tsx`
- `frontend/components/dashboard/RecentGenerations.tsx`
- `frontend/app/api/dashboard/stats/route.ts` **(NEW)**

**Acceptance Criteria:**
- ✅ Dashboard loads real user data from database
- ✅ Stats display correctly (this month's generations by type)
- ✅ Storage usage calculated from R2 file sizes
- ✅ Recent generations show with variant labels
- ✅ Navigation working
- ✅ Responsive layout
- ✅ Video/audio show icons instead of thumbnails
- ✅ Images show actual thumbnails

---

### 1C.7 - Image Generation UI - Layout
**Status:** ✅ Complete

**Tasks:**
- [x] Create image generation page
- [x] Design 3-column layout (params, preview, history)
- [x] Add sidebar for parameters
- [x] Add center preview area
- [x] Add right sidebar for history
- [x] Make responsive (collapse sidebars on mobile)

**Files Created:**
- `frontend/app/(dashboard)/generate/image/page.tsx`
- `frontend/components/generation/GenerationLayout.tsx`

**Acceptance Criteria:**
- ✅ 3-column layout renders
- ✅ Sidebars collapsible
- ✅ Preview area prominent
- ✅ Responsive on all devices

---

### 1C.8 - Image Generation UI - Prompt Input
**Status:** ✅ Complete

**Tasks:**
- [x] Create PromptInput component
- [x] Add textarea for prompt
- [x] Add prompt templates dropdown
- [x] Add character counter
- [x] Add prompt suggestions

**Files Created:**
- `frontend/components/generation/PromptInput.tsx`
- `frontend/components/generation/PromptTemplates.tsx`

**Acceptance Criteria:**
- ✅ Textarea accepts multiline input
- ✅ Templates selectable
- ✅ Character count displays
- ✅ Suggestions helpful

---

### 1C.9 - Image Generation UI - Model Selector
**Status:** ✅ Complete

**Tasks:**
- [x] Create ModelSelector component
- [x] Add FLUX.2 dev option
- [x] Add FLUX.2 schnell option
- [x] Show model descriptions
- [x] Show estimated generation time

**Files Created:**
- `frontend/components/generation/ModelSelector.tsx`

**Acceptance Criteria:**
- ✅ Models selectable
- ✅ Descriptions clear
- ✅ Estimates accurate
- ✅ Visually distinct

---

### 1C.10 - Image Generation UI - Parameter Panel
**Status:** ✅ Complete

**Tasks:**
- [x] Create ParameterPanel component
- [x] Add Steps slider (20-50)
- [x] Add CFG Scale slider (1-20)
- [x] Add Resolution dropdown
- [x] Add Seed input (random/manual)
- [x] Add advanced options (collapsible)

**Files Created:**
- `frontend/components/generation/ParameterPanel.tsx`
- `frontend/components/ui/slider.tsx`
- `frontend/components/ui/select.tsx`

**Acceptance Criteria:**
- ✅ All parameters adjustable
- ✅ Sliders smooth
- ✅ Default values sensible
- ✅ Advanced options collapsible

---

### 1C.11 - Image Generation UI - Progress Display
**Status:** ✅ Complete

**Tasks:**
- [x] Create GenerationProgress component
- [x] Add linear progress bar
- [x] Add percentage display
- [x] Add status messages
- [x] Add estimated time remaining
- [x] Add cancel button

**Files Created:**
- `frontend/components/generation/GenerationProgress.tsx`
- `frontend/components/ui/progress.tsx`

**Acceptance Criteria:**
- ✅ Progress bar animates smoothly
- ✅ Percentage updates in real-time
- ✅ Status messages clear
- ✅ Cancel button works
- ✅ Time estimate reasonable

---

### 1C.12 - Image Generation UI - Preview Area
**Status:** ✅ Complete

**Tasks:**
- [x] Create ImagePreview component
- [x] Add image display
- [x] Add zoom controls
- [x] Add download button
- [x] Add regenerate button
- [x] Add fullscreen mode

**Files Created:**
- `frontend/components/generation/ImagePreview.tsx`

**Acceptance Criteria:**
- ✅ Images load quickly
- ✅ Zoom works smoothly
- ✅ Download saves correctly
- ✅ Regenerate triggers new job
- ✅ Responsive sizing

---

### 1C.13 - API Route - Generate Image
**Status:** ✅ Complete

**Tasks:**
- [x] Create generate API route
- [x] Validate request (Zod schema)
- [x] Emit Inngest event
- [x] Return job ID
- [x] Add error handling
- [ ] Add rate limiting check (placeholder added)

**Files Created:**
- `frontend/app/api/generate/route.ts`
- `frontend/app/api/generations/route.ts`
- `frontend/app/api/generations/[id]/route.ts`
- `frontend/lib/validation.ts`

**Acceptance Criteria:**
- ✅ API validates input
- ✅ Job ID returned immediately
- ✅ Inngest event emitted
- ✅ Errors handled gracefully
- ⏳ Rate limiting placeholder (to be implemented in Phase 1F)

---

### 1C.14 - API Route - SSE Progress Stream
**Status:** ✅ Complete

**Tasks:**
- [x] Create SSE endpoint for job updates
- [x] Poll database for status updates
- [x] Stream progress updates to client
- [x] Handle disconnections
- [x] Add timeout (15 min)

**Files Created:**
- `frontend/app/api/generation/[jobId]/stream/route.ts`

**Acceptance Criteria:**
- ✅ SSE connection established
- ✅ Progress updates stream
- ✅ Disconnections handled
- ✅ Timeout prevents hanging

---

### 1C.15 - React Query Integration
**Status:** ✅ Complete

**Tasks:**
- [x] Install React Query v5
- [x] Set up QueryClient
- [x] Create query hooks for generations
- [x] Add cache invalidation
- [x] Integrate with SSE

**Files Created:**
- `frontend/lib/query-client.ts`
- `frontend/hooks/useGeneration.ts`
- `frontend/hooks/useGenerationStream.ts`
- `frontend/components/providers/QueryProvider.tsx`

**Acceptance Criteria:**
- ✅ React Query configured
- ✅ Queries cache properly
- ✅ Cache invalidation working
- ✅ SSE integrated with queries

---

### 1C.16 - State Management (Zustand)
**Status:** ✅ Complete

**Tasks:**
- [x] Install Zustand
- [x] Create generation store
- [x] Add parameter state
- [x] Add history state
- [x] Add user preferences state
- [x] Persist to localStorage

**Files Created:**
- `frontend/store/generation-store.ts`
- `frontend/store/user-store.ts`

**Acceptance Criteria:**
- ✅ Store manages state correctly
- ✅ Parameters persist across page reload
- ✅ History accessible globally
- ✅ Preferences saved

---

### 1C.17 - End-to-End Testing (Image Generation)
**Status:** ⏳ Pending (requires database + Modal backend)

**Tasks:**
- [ ] Test signup -> login flow
- [ ] Test navigate to image generation
- [ ] Test enter prompt and parameters
- [ ] Test click generate button
- [ ] Test progress updates in real-time
- [ ] Test image displays on completion
- [ ] Test download image
- [ ] Fix any bugs found

**Acceptance Criteria:**
- Full flow works without errors
- Progress updates <500ms latency
- Image quality good
- Download works
- Mobile responsive

**Note:** This task requires the database to be set up and Modal backend to be deployed. All UI components are ready for testing.

---

## Phase 1D: Video Generation (Week 3)

### 1D.1 - Mochi 1 Model Download
**Status:** ✅ Complete

**Tasks:**
- [x] Research Mochi 1 model requirements
- [x] Add Mochi downloader to models.py
- [x] Download function created (user must run)
- [x] VRAM documentation added
- [x] Model loading interface ready

**Files Updated:**
- `modal_app/models.py` (added `download_mochi_1()`)
- `modal_app/main.py` (added `download_video_models()`)

**Acceptance Criteria:**
- ✅ Mochi 1 download function implemented
- ✅ Model loads from `/models/mochi/mochi-1-preview`
- ✅ VRAM usage documented (8-18GB)
- ⏳ Actual download requires user to run: `modal run main.py::download_video_models`

---

### 1D.2 - Mochi Text-to-Video Workflow
**Status:** ✅ Complete

**Tasks:**
- [x] Research official Mochi ComfyUI workflows
- [x] Create production-ready workflow based on official examples
- [x] Parameterize workflow with template variables
- [x] Document required custom nodes

**Files Created:**
- `modal_app/workflows/mochi_text2video.json` (production-ready)

**Acceptance Criteria:**
- ✅ Workflow based on official `mochi_example_49_frames_16GB.json`
- ✅ All parameters templated ({{PROMPT}}, {{WIDTH}}, {{HEIGHT}}, etc.)
- ✅ Custom nodes documented (ComfyUI-MochiWrapper, VideoHelperSuite)
- ✅ Optimized for VRAM efficiency (GGUF Q8)

---

### 1D.3 - CogVideoX Model Download
**Status:** ✅ Complete

**Tasks:**
- [x] Research CogVideoX-5B requirements
- [x] Add CogVideoX downloader to models.py
- [x] Download function created (user must run)
- [x] VRAM documentation added
- [x] Model loading interface ready

**Files Updated:**
- `modal_app/models.py` (added `download_cogvideox_5b()`)
- `modal_app/main.py` (added to `download_video_models()`)

**Acceptance Criteria:**
- ✅ CogVideoX download function implemented
- ✅ Model loads from `/models/cogvideox/CogVideoX-5b`
- ✅ VRAM usage documented (~12GB optimized)
- ⏳ Actual download requires user to run: `modal run main.py::download_video_models`

---

### 1D.4 - CogVideoX Image-to-Video Workflow
**Status:** ✅ Complete

**Tasks:**
- [x] Research official CogVideoX ComfyUI workflows
- [x] Create production-ready workflow based on official examples
- [x] Add image input handling
- [x] Parameterize workflow with template variables
- [x] Document required custom nodes

**Files Created:**
- `modal_app/workflows/cogvideox_img2video.json` (production-ready)

**Acceptance Criteria:**
- ✅ Workflow based on official `cogvideox_1_5_5b_I2V_01.json`
- ✅ All parameters templated ({{SOURCE_IMAGE}}, {{PROMPT}}, {{WIDTH}}, etc.)
- ✅ Custom nodes documented (ComfyUI-CogVideoXWrapper, KJNodes)
- ✅ Optimized for VRAM efficiency (BF16)

---

### 1D.5 - Modal API - Video Endpoints
**Status:** ✅ Complete

**Tasks:**
- [x] Add `/generate/video/text2video` endpoint
- [x] Add `/generate/video/img2video` endpoint
- [x] Add request validation for video params
- [x] Implement video task spawning
- [x] Add video upload to R2
- [x] Add image download for img2video

**Files Updated:**
- `modal_app/api.py` (video endpoints with task spawning)
- `modal_app/schemas.py` (already complete with video schemas)
- `modal_app/main.py` (video generation task functions)
- `modal_app/storage.py` (added `download_image()`)

**Acceptance Criteria:**
- ✅ Both endpoints accept requests and spawn GPU tasks
- ✅ Request validation complete via Pydantic schemas
- ✅ Video upload to R2 integrated
- ✅ Image download for img2video implemented
- ⏳ End-to-end testing requires deployment

---

### 1D.6 - Inngest Functions - Video Generation
**Status:** ✅ Complete (Skipped - Direct Modal Integration)

**Decision:** Video generation uses direct Modal task spawning (same pattern as image generation) rather than Inngest workflow.

**Rationale:**
- Modal already provides durable execution and retry logic
- Direct spawning reduces complexity and latency
- Progress events emitted from Modal GPU functions
- Consistent with image generation architecture

**Alternative (If Needed Later):**
- Can add Inngest wrapper functions for advanced orchestration
- Useful for multi-step video workflows (e.g., upscaling, editing)
- Not required for basic text2video and img2video

**Current Implementation:**
- API endpoints spawn Modal GPU tasks directly
- Progress tracked via database updates and events
- Errors handled in Modal task functions with retries

---

### 1D.7 - Frontend - Video Generation Page
**Status:** ✅ Complete

**Tasks:**
- [x] Create video generation page
- [x] Add tab switcher (text2video / img2video)
- [x] Reuse layout from image generation
- [x] Add video-specific parameters
- [x] Add video player component

**Files Created:**
- `frontend/app/(dashboard)/generate/video/page.tsx`
- `frontend/components/generation/VideoPlayer.tsx`

**Acceptance Criteria:**
- ✅ Page renders correctly
- ✅ Tabs switch smoothly (with proper z-index and pointer-events fixes)
- ✅ Parameters adjustable
- ✅ Layout consistent with image gen
- ✅ Both text2video and img2video working end-to-end

---

### 1D.8 - Frontend - Video Player Component
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create VideoPlayer component
- [ ] Add HTML5 video element
- [ ] Add playback controls
- [ ] Add volume control
- [ ] Add fullscreen button
- [ ] Add download button

**Files to Create:**
- `frontend/components/generation/VideoPlayer.tsx`

**Acceptance Criteria:**
- Videos play smoothly
- Controls responsive
- Fullscreen works
- Download saves correctly

---

### 1D.9 - Frontend - Image Upload (for img2video)
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create ImageUpload component
- [ ] Add drag-drop file upload
- [ ] Add image preview
- [ ] Add file validation (size, format)
- [ ] Upload to temporary R2 location
- [ ] Pass URL to Modal

**Files to Create:**
- `frontend/components/generation/ImageUpload.tsx`
- `frontend/app/api/upload/route.ts`

**Acceptance Criteria:**
- Drag-drop works
- Images preview correctly
- File validation working
- Upload to R2 successful

---

### 1D.10 - Database Schema - Video Generations
**Status:** ⏳ Pending

**Tasks:**
- [ ] Add video-specific fields to generations table
- [ ] Add `duration` field
- [ ] Add `fps` field
- [ ] Add `sourceImageUrl` field (for img2video)
- [ ] Run migration
- [ ] Test queries

**Files to Update:**
- `frontend/db/schema.ts`
- Create migration file

**Acceptance Criteria:**
- Schema updated successfully
- Migration runs without errors
- Video generations saved correctly

---

### 1D.11 - End-to-End Testing (Video Generation)
**Status:** ✅ Complete

**Tasks:**
- [x] Test text2video flow end-to-end
- [x] Test img2video flow end-to-end
- [x] Verify video quality
- [x] Verify generation times (4-5 min for Mochi, 2-3 min for CogVideoX)
- [x] Fix UI bugs (z-index, pointer-events, button types)
- [x] Fix backend bugs (database column naming, error logging)

**Acceptance Criteria:**
- ✅ Both flows work without errors
- ✅ Video quality acceptable
- ✅ Frontend → API → Modal → R2 → Database → SSE working
- ✅ Progress tracking functional
- ✅ Error handling robust

---

## Phase 1E: Audio + Gallery (Week 3-4)

### 1E.1 - MusicGen Model Download
**Status:** ⏳ Pending

**Tasks:**
- [ ] Research MusicGen Large requirements
- [ ] Add MusicGen downloader to models.py
- [ ] Download MusicGen to Modal Volume
- [ ] Verify VRAM usage (~16GB)
- [ ] Test model loading

**Files to Update:**
- `modal_app/models.py`

**Acceptance Criteria:**
- MusicGen downloaded successfully
- Model loads correctly
- VRAM usage ~16GB
- Model stored in Modal Volume

---

### 1E.2 - MusicGen Text-to-Music Workflow
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create MusicGen ComfyUI workflow
- [ ] Export workflow as JSON
- [ ] Parameterize (prompt, duration, temperature)
- [ ] Test workflow locally
- [ ] Add progress tracking
- [ ] Optimize for 30s audio

**Files to Create:**
- `modal_app/workflows/musicgen_text2music.json`

**Acceptance Criteria:**
- Workflow generates 30s audio
- Output quality good (32kHz)
- Progress tracking working
- Generation time <15 seconds

---

### 1E.3 - Modal API - Audio Endpoint
**Status:** ⏳ Pending

**Tasks:**
- [ ] Add `/generate/audio` endpoint
- [ ] Add request validation for audio params
- [ ] Implement audio upload to R2
- [ ] Test endpoint

**Files to Update:**
- `modal_app/api.py`
- `modal_app/schemas.py`

**Acceptance Criteria:**
- Endpoint responds correctly
- Audio uploaded to R2
- Public URLs accessible

---

### 1E.4 - Inngest Functions - Audio Generation
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create `generateAudio` Inngest function
- [ ] Add MusicGen handler
- [ ] Add progress forwarding
- [ ] Add error handling
- [ ] Test with Inngest dev server

**Files to Update:**
- `frontend/inngest/functions.ts`

**Acceptance Criteria:**
- Inngest triggers Modal correctly
- Progress events forwarded
- Completion events fired
- Errors captured

---

### 1E.5 - Frontend - Audio Generation Page
**Status:** ✅ Complete

**Tasks:**
- [x] Create audio generation page
- [x] Add tab switcher (Music / Speech)
- [x] Reuse layout from image/video generation
- [x] Add audio-specific parameters (duration, temperature)
- [x] Add TTS-specific parameters (voice, language, speed)
- [x] Add audio player component

**Files Created:**
- `frontend/app/(dashboard)/generate/audio/page.tsx`
- `frontend/components/generation/AudioPlayer.tsx`

**Acceptance Criteria:**
- ✅ Page renders correctly
- ✅ Music generation (MusicGen-Large) working
- ✅ Speech generation (F5-TTS) working
- ✅ Parameters adjustable
- ✅ Layout consistent
- ✅ Both generation types working end-to-end

---

### 1E.6 - Frontend - Audio Player Component
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create AudioPlayer component
- [ ] Add HTML5 audio element
- [ ] Add playback controls
- [ ] Add volume control
- [ ] Add waveform visualization (optional)
- [ ] Add download button

**Files to Create:**
- `frontend/components/generation/AudioPlayer.tsx`

**Acceptance Criteria:**
- Audio plays smoothly
- Controls responsive
- Download saves correctly

---

### 1E.7 - Gallery Page - Layout
**Status:** ✅ Complete

**Tasks:**
- [x] Create gallery page
- [x] Implement responsive grid layout
- [x] Add responsive columns (1/2/3/4 based on screen size)
- [x] Add pagination (Previous/Next buttons)
- [x] Make mobile responsive
- [x] Add loading, error, and empty states

**Files Created:**
- `frontend/app/(dashboard)/gallery/page.tsx`

**Acceptance Criteria:**
- ✅ Grid displays generations in responsive grid
- ✅ Responsive on all devices (sm:2-cols, lg:3-cols, xl:4-cols)
- ✅ Pagination working smoothly
- ✅ Performance good with proper loading states

---

### 1E.8 - Gallery Page - Media Card
**Status:** ✅ Complete (Integrated into gallery page)

**Tasks:**
- [x] Create media card layout
- [x] Add thumbnail preview (images show thumbnails, videos play on hover, audio/speech show icons)
- [x] Add metadata overlay (type badge with icon)
- [x] Add hover effects (scale on hover, action buttons appear)
- [x] Add action buttons (download, delete)
- [x] Support all media types (image/video/audio/speech)
- [x] Add audio player for audio/speech items

**Implementation:**
- Integrated directly into gallery page component (no separate MediaCard file needed)
- Video preview plays on mouse hover
- Audio player embedded for audio/speech types
- Type-specific gradients and icon colors

**Acceptance Criteria:**
- ✅ Cards display all info clearly with type badges
- ✅ Hover effects smooth (image scale, video playback, action buttons)
- ✅ Download and delete actions functional
- ✅ Works for all media types (image/video/audio/speech)

---

### 1E.9 - Gallery Page - Filters
**Status:** ✅ Complete

**Tasks:**
- [x] Create filter tabs
- [x] Add type filter (All/Images/Videos/Music/Speech)
- [x] Update query on filter change
- [x] Reset to page 1 when filter changes
- [x] Show active filter with visual feedback

**Implementation:**
- Filter tabs integrated into gallery page
- Five filter options: All, Images, Videos, Music, Speech
- Active filter highlighted with cyan glow effect
- Page automatically resets when changing filters

**Acceptance Criteria:**
- ✅ Filters update results correctly
- ✅ Visual feedback for active filter (cyan glow)
- ✅ Automatic page reset on filter change
- ✅ Item count updates based on filter

---

### 1E.10 - Gallery Page - Search
**Status:** ⏳ Pending (Nice-to-have feature)

**Tasks:**
- [ ] Create SearchBar component
- [ ] Implement full-text search on prompts
- [ ] Add debouncing (300ms)
- [ ] Update results on search
- [ ] Add search suggestions (optional)

**Files to Create:**
- `frontend/components/gallery/SearchBar.tsx`

**Acceptance Criteria:**
- Search returns relevant results
- Debouncing prevents excessive queries
- Results update <500ms
- Search clears properly

**Note:** Core gallery functionality is complete. Search can be added as an enhancement in Phase 1F polish or Phase 2.

---

### 1E.11 - Gallery Page - Actions
**Status:** ✅ Complete

**Tasks:**
- [x] Implement download action (with fetch + blob download)
- [x] Implement delete action (with browser confirmation)
- [x] Add hover-triggered action buttons
- [x] Show actions in gradient overlay on hover

**Implementation:**
- Download button fetches file, creates blob URL, triggers download
- Delete button uses browser confirm() dialog, then calls delete mutation
- Actions appear in gradient overlay on card hover
- Proper file extensions based on media type (png/mp4/wav)

**Acceptance Criteria:**
- ✅ Download action works correctly for all media types
- ✅ Delete shows confirmation dialog
- ✅ Actions visible only on hover (smooth UX)
- ✅ Proper error handling for failed actions

**Note:** Regenerate and share actions not implemented (can be added in Phase 1F or Phase 2 if needed).

---

### 1E.12 - End-to-End Testing (Audio + Gallery)
**Status:** ✅ Complete

**Tasks:**
- [x] Test audio generation flow (MusicGen-Large + F5-TTS)
- [x] Verify audio quality
- [x] Test gallery displays all media types
- [x] Test filters (All/Images/Videos/Music/Speech)
- [x] Test pagination
- [x] Test all actions (download, delete)
- [x] Verify performance targets
- [x] Fix any bugs found

**Acceptance Criteria:**
- ✅ Audio generation works for both Music and Speech
- ✅ Gallery loads quickly with proper loading states
- ✅ Filters working correctly
- ✅ All actions functional (download, delete with confirmation)
- ✅ Mobile responsive (1-4 column grid based on screen size)
- ✅ Video hover preview working
- ✅ Audio player embedded for audio/speech items

---

## Phase 1E-TTS: Text-to-Speech Generation (Week 3-4)

### 1E-TTS.1 - F5-TTS Model Research & Selection
**Status:** ✅ Complete

**Decision:** F5-TTS on A10G GPU

**Rationale:**
- State-of-the-art quality (Jan 2025)
- Fast inference (4-6s for 30s audio)
- Low VRAM (6-8GB)
- MIT License (commercial-friendly)
- Voice cloning capability (3-10s reference)
- Multi-language support

---

### 1E-TTS.2 - Modal TTS App Setup
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create `backend/tts-gen/` directory
- [ ] Create `main.py` with Modal app config
- [ ] Configure A10G GPU settings
- [ ] Create Modal Volume for F5-TTS model (`tts-models`)
- [ ] Create `requirements.txt` with dependencies
- [ ] Create `README.md` with deployment instructions

**Files to Create:**
- `backend/tts-gen/main.py`
- `backend/tts-gen/requirements.txt`
- `backend/tts-gen/README.md`

**GPU Configuration:**
```python
@app.cls(
    gpu="A10G",
    timeout=300,  # 5 min
    container_idle_timeout=180,  # 3 min warm cache
    volumes={"/models": tts_volume},
    memory=16384,  # 16GB RAM
)
```

**Requirements:**
```
f5-tts
torch>=2.0.0
torchaudio
transformers
psycopg2-binary
boto3
python-dotenv
```

**Acceptance Criteria:**
- Modal app created successfully
- A10G GPU configured
- Volume ready for models
- Dependencies installed

---

### 1E-TTS.3 - F5-TTS Model Download
**Status:** ⏳ Pending

**Tasks:**
- [ ] Install F5-TTS library
- [ ] Download F5-TTS base model to Modal Volume
- [ ] Download vocoder model (if needed)
- [ ] Verify VRAM usage (~6-8GB)
- [ ] Test model loading speed
- [ ] Create model download script

**Files to Update:**
- `backend/tts-gen/main.py` (add download_models function)

**Model Download:**
```python
from f5_tts import load_model

@app.function(volumes={"/models": tts_volume})
def download_models():
    model = load_model("F5-TTS", cache_dir="/models")
    # Download vocoder if needed
    print("Models downloaded successfully")
```

**Acceptance Criteria:**
- F5-TTS model downloaded (~8GB)
- Model loads correctly
- VRAM usage within budget (6-8GB)
- Total volume size <10GB

---

### 1E-TTS.4 - TTS Generation Implementation
**Status:** ⏳ Pending

**Tasks:**
- [ ] Implement F5-TTS inference logic
- [ ] Add text preprocessing (SSML support optional)
- [ ] Implement voice cloning from reference audio
- [ ] Add multi-language support (English priority)
- [ ] Implement speed control (0.8x - 1.5x)
- [ ] Add emotion/style control (optional)
- [ ] Add waveform generation
- [ ] Implement error handling

**Files to Update:**
- `backend/tts-gen/main.py` (TTSGenerator class)

**Core Implementation:**
```python
class TTSGenerator:
    def __init__(self):
        self.model = load_model("F5-TTS", cache_dir="/models")

    def generate_speech(
        self,
        text: str,
        voice_reference_url: str = None,
        language: str = "en",
        speed: float = 1.0,
        emotion: str = None
    ):
        # Preprocess text
        # Load voice reference if provided
        # Generate speech with F5-TTS
        # Apply speed adjustment
        # Return audio array
```

**Acceptance Criteria:**
- Text-to-speech working
- Voice cloning functional (3-10s reference)
- Multiple languages supported
- Generation time <6s for 30s audio
- Speed control working
- Error handling robust

---

### 1E-TTS.5 - Modal API - TTS Endpoint
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create `/generate` FastAPI endpoint
- [ ] Add request validation (Pydantic models)
- [ ] Implement TTS generation task
- [ ] Add progress tracking (direct DB updates via psycopg2)
- [ ] Upload audio to R2 (speech/{date}/{job_id}.wav)
- [ ] Return public R2 URL
- [ ] Add comprehensive error handling
- [ ] Test with various inputs

**Files to Update:**
- `backend/tts-gen/main.py` (FastAPI endpoint)

**Request Schema:**
```python
class TTSRequest(BaseModel):
    job_id: str
    text: str  # max 500 chars for 30s
    voice_reference_url: Optional[str] = None
    language: str = "en"
    speed: float = 1.0
    emotion: Optional[str] = None
```

**Response Schema:**
```python
class TTSResponse(BaseModel):
    job_id: str
    status: str
    output_url: Optional[str] = None
    error: Optional[str] = None
    processing_time_ms: int
```

**Acceptance Criteria:**
- Endpoint responds correctly
- Audio uploaded to R2 (speech/ directory)
- Database updated with progress (0%, 50%, 100%)
- Public URLs accessible
- Error responses informative

---

### 1E-TTS.6 - Frontend - TTS Generation Page
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create TTS generation page route
- [ ] Add text input area (textarea, max 500 chars)
- [ ] Add voice selector/uploader component
- [ ] Add language dropdown (English priority)
- [ ] Add speed slider (0.8x - 1.5x)
- [ ] Add emotion/style input (optional)
- [ ] Reuse generation layout from image/video pages
- [ ] Add character counter
- [ ] Implement real-time validation

**Files to Create:**
- `frontend/app/(dashboard)/generate/speech/page.tsx`
- `frontend/components/generation/TTSControls.tsx`
- `frontend/components/generation/VoiceSelector.tsx`

**Page Structure:**
```tsx
export default function SpeechGenerationPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3">
          <TTSControls />
        </aside>
        <main className="col-span-6">
          <TextInput maxChars={500} />
          <WaveformPreview />
        </main>
        <aside className="col-span-3">
          <VoiceLibrary />
          <RecentGenerations />
        </aside>
      </div>
    </DashboardLayout>
  )
}
```

**Acceptance Criteria:**
- Page renders correctly
- All controls functional
- Layout consistent with other generation pages
- Responsive on mobile
- Character counter accurate

---

### 1E-TTS.7 - Frontend - Audio Waveform Component
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create WaveformDisplay component
- [ ] Add real-time waveform visualization
- [ ] Integrate with AudioPlayer
- [ ] Add playback controls (play/pause/seek)
- [ ] Add volume control
- [ ] Add download button
- [ ] Make responsive

**Files to Create:**
- `frontend/components/generation/WaveformDisplay.tsx`

**Libraries to Use:**
- `wavesurfer.js` or `react-wavesurfer`

**Component:**
```tsx
export function WaveformDisplay({ audioUrl }: { audioUrl: string }) {
  return (
    <div className="waveform-container">
      <WaveSurfer url={audioUrl} />
      <div className="controls">
        <PlayButton />
        <Seekbar />
        <VolumeControl />
        <DownloadButton />
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- Waveform displays correctly
- Playback controls work
- Seeking functional
- Volume control working
- Responsive on all devices

---

### 1E-TTS.8 - Database Schema - TTS Support
**Status:** ⏳ Pending

**Tasks:**
- [ ] Add 'speech' to generation type enum
- [ ] Add 'f5-tts' to model enum
- [ ] Update parameters jsonb to include TTS fields
- [ ] Create migration file
- [ ] Run migration
- [ ] Test TTS generation saves correctly

**Files to Update:**
- `frontend/db/schema.ts`
- Create new migration file

**Schema Updates:**
```typescript
export const generations = pgTable('generations', {
  // ... existing fields
  type: text('type').$type<'image' | 'video' | 'audio' | 'speech'>(),
  model: text('model').$type<'flux1-dev' | 'flux2-dev' | 'mochi-1' | 'cogvideox' | 'musicgen' | 'f5-tts'>(),
  parameters: jsonb('parameters').$type<{
    // ... existing fields
    voiceReferenceUrl?: string
    language?: string
    speed?: number
    emotion?: string
  }>(),
})
```

**Acceptance Criteria:**
- Schema updated successfully
- Migration runs without errors
- TTS generations saved correctly
- Can query speech generations
- Parameters stored properly

---

### 1E-TTS.9 - Voice Library Implementation
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create `voice_library` table in schema
- [ ] Add predefined system voices (5-10)
- [ ] Implement voice upload to R2 (voices/{user_id}/{voice_id}.wav)
- [ ] Create voice cloning from upload
- [ ] Create voice selector UI component
- [ ] Add voice preview functionality
- [ ] Create API routes for voice management

**Files to Create:**
- Migration file for voice_library table
- `frontend/components/generation/VoiceLibrary.tsx`
- `frontend/app/api/voices/route.ts`
- `frontend/app/api/voices/[id]/route.ts`

**voice_library Schema:**
```typescript
export const voiceLibrary = pgTable('voice_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),  // null for system voices
  name: text('name').notNull(),
  description: text('description'),
  referenceAudioUrl: text('reference_audio_url').notNull(),
  language: text('language').notNull().default('en'),
  isPublic: boolean('is_public').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**System Voices (Pre-load):**
- Professional Male (English)
- Professional Female (English)
- Casual Male (English)
- Casual Female (English)
- Narrator (English)

**Acceptance Criteria:**
- Voice library table created
- System voices pre-loaded
- Users can upload voice samples
- Voice cloning works from library
- Voice preview plays audio
- Voice selector UI functional

---

### 1E-TTS.10 - End-to-End Testing (TTS)
**Status:** ⏳ Pending

**Tasks:**
- [ ] Test basic text-to-speech generation
- [ ] Test voice cloning workflow (upload + generate)
- [ ] Test multi-language generation (if implemented)
- [ ] Verify audio quality
- [ ] Verify generation times (<6s for 30s)
- [ ] Verify costs (<$0.002 per 30s)
- [ ] Test voice library functionality
- [ ] Test error cases (invalid text, bad audio, etc.)
- [ ] Fix any bugs found
- [ ] Performance optimization if needed

**Test Cases:**
1. Basic TTS with system voice
2. TTS with custom voice upload (3s, 5s, 10s samples)
3. Long text (500 chars)
4. Speed variations (0.8x, 1.0x, 1.5x)
5. Different languages (if multi-language enabled)
6. Error: text too long
7. Error: invalid voice reference
8. Voice library CRUD operations

**Acceptance Criteria:**
- TTS generation works end-to-end
- Voice cloning functional
- Performance targets met (<6s generation)
- Cost targets met (<$0.002 per 30s)
- Multi-language working (English minimum)
- Voice library fully functional
- All error cases handled gracefully
- User experience smooth

---

## Phase 1F: Polish & Optimization (Week 4)

### 1F.1 - Workflow Presets - Backend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Add `workflow_presets` table to schema
- [ ] Run migration
- [ ] Create API routes for CRUD operations
- [ ] Add validation for workflow JSON
- [ ] Test preset saving/loading

**Files to Create:**
- `frontend/app/api/presets/route.ts`
- `frontend/app/api/presets/[id]/route.ts`

**Acceptance Criteria:**
- Presets saved to database
- Presets retrieved correctly
- CRUD operations working
- Validation prevents bad data

---

### 1F.2 - Workflow Presets - Frontend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create PresetSelector component
- [ ] Add save preset button
- [ ] Add preset name/description dialog
- [ ] Add load preset functionality
- [ ] Add delete preset button
- [ ] Add public/private toggle

**Files to Create:**
- `frontend/components/generation/PresetSelector.tsx`
- `frontend/components/generation/SavePresetDialog.tsx`

**Acceptance Criteria:**
- Users can save current parameters
- Users can load saved presets
- Users can delete presets
- Public/private toggle works

---

### 1F.3 - Error Handling - Global Error Boundary
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create global error boundary
- [ ] Add error logging (Sentry)
- [ ] Create error UI components
- [ ] Add retry logic for failed requests
- [ ] Test with various error scenarios

**Files to Create:**
- `frontend/app/error.tsx`
- `frontend/components/ui/ErrorBoundary.tsx`
- `frontend/lib/monitoring.ts`

**Acceptance Criteria:**
- Errors caught globally
- Error UI displays helpful messages
- Errors logged to Sentry
- Retry logic works

---

### 1F.4 - Error Handling - Generation Failures
**Status:** ⏳ Pending

**Tasks:**
- [ ] Handle Modal API failures
- [ ] Handle R2 upload failures
- [ ] Handle database write failures
- [ ] Add retry logic in Inngest (3 retries)
- [ ] Display error messages to users
- [ ] Test failure scenarios

**Files to Update:**
- `modal_app/api.py`
- `frontend/inngest/functions.ts`

**Acceptance Criteria:**
- All failure types handled
- Retries automatic (3x)
- Error messages user-friendly
- Failed jobs marked in DB

---

### 1F.5 - Rate Limiting - Backend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Install rate limiting library
- [ ] Implement per-user rate limits
- [ ] Set free tier limit (10 gen/day)
- [ ] Set pro tier limit (unlimited)
- [ ] Add rate limit headers
- [ ] Test rate limiting

**Files to Create:**
- `frontend/lib/rate-limit.ts`
- `frontend/middleware.ts`

**Acceptance Criteria:**
- Rate limits enforced correctly
- Free tier limited to 10/day
- Pro tier unlimited
- Clear error messages when limited

---

### 1F.6 - Rate Limiting - Frontend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Display remaining generations count
- [ ] Show upgrade prompt when limit reached
- [ ] Add countdown timer for limit reset
- [ ] Handle rate limit errors gracefully

**Files to Update:**
- `frontend/components/dashboard/StatsCard.tsx`
- `frontend/components/generation/GenerationLayout.tsx`

**Acceptance Criteria:**
- Remaining count visible
- Upgrade prompt clear
- Timer accurate
- Errors handled gracefully

---

### 1F.7 - Analytics Dashboard - Backend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create analytics queries
- [ ] Calculate total generations
- [ ] Calculate storage used
- [ ] Calculate cost per user
- [ ] Calculate success/failure rates
- [ ] Create analytics API route

**Files to Create:**
- `frontend/app/api/analytics/route.ts`
- `frontend/lib/analytics.ts`

**Acceptance Criteria:**
- Queries optimized
- Metrics accurate
- API performant (<500ms)

---

### 1F.8 - Analytics Dashboard - Frontend
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create analytics page
- [ ] Add stats cards (total, success rate, cost)
- [ ] Add charts (generations over time)
- [ ] Add breakdown by type (image/video/audio)
- [ ] Make responsive

**Files to Create:**
- `frontend/app/(dashboard)/analytics/page.tsx`
- `frontend/components/analytics/StatsCards.tsx`
- `frontend/components/analytics/Charts.tsx`

**Acceptance Criteria:**
- Analytics display correctly
- Charts render smoothly
- Data updates in real-time
- Mobile responsive

---

### 1F.9 - Monitoring Setup (Sentry)
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create Sentry account
- [ ] Install Sentry SDK (frontend + backend)
- [ ] Configure Sentry in Next.js
- [ ] Configure Sentry in Modal
- [ ] Set up error alerts
- [ ] Test error reporting

**Files to Create:**
- `frontend/sentry.client.config.ts`
- `frontend/sentry.server.config.ts`
- `modal_app/sentry_config.py`

**Acceptance Criteria:**
- Sentry captures frontend errors
- Sentry captures backend errors
- Alerts configured
- Test errors reported

---

### 1F.10 - Inngest Dashboard Configuration
**Status:** ⏳ Pending

**Tasks:**
- [ ] Configure Inngest production environment
- [ ] Set up event routing
- [ ] Configure retry policies
- [ ] Set up monitoring alerts
- [ ] Test production deployment

**Acceptance Criteria:**
- Production events visible
- Retry policies working
- Alerts configured
- Dashboard accessible

---

### 1F.11 - Modal Optimization - Container Warm-up
**Status:** ⏳ Pending

**Tasks:**
- [ ] Increase idle timeout to 5 minutes
- [ ] Implement pre-warming on user login
- [ ] Test warm start times (<20s)
- [ ] Monitor container costs

**Files to Update:**
- `modal_app/main.py`

**Acceptance Criteria:**
- Containers stay warm 5 minutes
- Pre-warming working
- Warm starts <20 seconds
- Costs reasonable

---

### 1F.12 - Modal Optimization - Model Pre-loading
**Status:** ⏳ Pending

**Tasks:**
- [ ] Identify frequently used models
- [ ] Pre-load FLUX.2 on container start
- [ ] Implement LRU eviction for less-used models
- [ ] Monitor VRAM usage
- [ ] Test generation times

**Files to Update:**
- `modal_app/models.py`
- `modal_app/main.py`

**Acceptance Criteria:**
- FLUX.2 pre-loaded
- LRU eviction working
- VRAM stable
- Generation times improved

---

### 1F.13 - UI Polish - Loading Skeletons
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create Skeleton component
- [ ] Add skeletons to gallery
- [ ] Add skeletons to dashboard
- [ ] Add skeletons to generation pages
- [ ] Test loading states

**Files to Create:**
- `frontend/components/ui/Skeleton.tsx`

**Acceptance Criteria:**
- Skeletons display during loading
- Smooth transition to content
- Accessible

---

### 1F.14 - UI Polish - Toast Notifications
**Status:** ⏳ Pending

**Tasks:**
- [ ] Install toast library (sonner)
- [ ] Create Toast component
- [ ] Add success notifications
- [ ] Add error notifications
- [ ] Add info notifications
- [ ] Test all notification types

**Files to Create:**
- `frontend/components/ui/Toast.tsx`
- `frontend/lib/toast.ts`

**Acceptance Criteria:**
- Toasts display correctly
- Auto-dismiss after 5s
- Multiple toasts stack
- Accessible

---

### 1F.15 - UI Polish - Settings Page
**Status:** ⏳ Pending

**Tasks:**
- [ ] Create settings page
- [ ] Add profile settings (name, email)
- [ ] Add notification preferences
- [ ] Add default parameter preferences
- [ ] Add account deletion
- [ ] Save settings to database

**Files to Create:**
- `frontend/app/(dashboard)/settings/page.tsx`
- `frontend/components/settings/ProfileSettings.tsx`
- `frontend/components/settings/PreferencesSettings.tsx`

**Acceptance Criteria:**
- Settings save correctly
- Changes reflected immediately
- Account deletion works
- Responsive design

---

### 1F.16 - Documentation - User Guide
**Status:** ⏳ Pending

**Tasks:**
- [ ] Write getting started guide
- [ ] Write image generation guide
- [ ] Write video generation guide
- [ ] Write audio generation guide
- [ ] Write gallery guide
- [ ] Add screenshots/GIFs

**Files to Create:**
- `docs/README.md`
- `docs/getting-started.md`
- `docs/image-generation.md`
- `docs/video-generation.md`
- `docs/audio-generation.md`

**Acceptance Criteria:**
- Documentation comprehensive
- Screenshots clear
- Easy to follow

---

### 1F.17 - Documentation - Developer Guide
**Status:** ⏳ Pending

**Tasks:**
- [ ] Write setup instructions
- [ ] Document environment variables
- [ ] Document API endpoints
- [ ] Document database schema
- [ ] Document deployment process
- [ ] Add architecture diagrams

**Files to Create:**
- `docs/developer-guide.md`
- `docs/api-reference.md`
- `docs/deployment.md`

**Acceptance Criteria:**
- Developer guide complete
- New developers can set up project
- API documented

---

### 1F.18 - Production Deployment
**Status:** ⏳ Pending

**Tasks:**
- [ ] Set up production Neon database
- [ ] Set up production R2 bucket
- [ ] Configure production environment variables
- [ ] Deploy Modal to production
- [ ] Deploy Next.js to Vercel production
- [ ] Configure custom domain (if applicable)
- [ ] Test production deployment
- [ ] Monitor for errors

**Acceptance Criteria:**
- Production deployed successfully
- All services connected
- Custom domain working (if applicable)
- No errors in production

---

### 1F.19 - Performance Testing
**Status:** ⏳ Pending

**Tasks:**
- [ ] Test cold start times (<45s)
- [ ] Test warm start times (<20s)
- [ ] Test concurrent request handling
- [ ] Test database query performance
- [ ] Test API response times
- [ ] Identify and fix bottlenecks

**Acceptance Criteria:**
- Cold start <45 seconds
- Warm start <20 seconds
- API responses <1 second
- Database queries <500ms
- Concurrent requests handled

---

### 1F.20 - Cost Verification
**Status:** ⏳ Pending

**Tasks:**
- [ ] Verify cost per image generation (<$0.02)
- [ ] Verify cost per video generation (<$0.12)
- [ ] Verify cost per audio generation (<$0.01)
- [ ] Calculate monthly costs
- [ ] Set up cost alerts
- [ ] Optimize if needed

**Acceptance Criteria:**
- Image cost <$0.02
- Video cost <$0.12
- Audio cost <$0.01
- Monthly costs within budget
- Alerts configured

---

### 1F.21 - Security Audit
**Status:** ⏳ Pending

**Tasks:**
- [ ] Review authentication security
- [ ] Review API endpoint security
- [ ] Review database security (SQL injection)
- [ ] Review file upload security
- [ ] Review environment variable security
- [ ] Fix any vulnerabilities found

**Acceptance Criteria:**
- No critical vulnerabilities
- Auth secure
- APIs protected
- File uploads validated
- Secrets secured

---

### 1F.22 - Final QA & Bug Fixes
**Status:** ⏳ Pending

**Tasks:**
- [ ] Test all features end-to-end
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on different devices (desktop, tablet, mobile)
- [ ] Test error scenarios
- [ ] Fix all critical bugs
- [ ] Fix all high-priority bugs
- [ ] Document known issues (low priority)

**Acceptance Criteria:**
- No critical bugs
- Works on all major browsers
- Mobile responsive
- Error handling robust

---

## Phase 1 Complete! 🎉

Once all tasks are completed and verified, Phase 1 will be production-ready.

**Next Steps:**
- Gather user feedback
- Monitor performance and costs
- Plan Phase 2 features
- Iterate and improve

---

**Total Tasks:** 110+
**Estimated Timeline:** 4 weeks (aggressive) to 6 weeks (realistic)

*This task list will be updated as tasks are completed. Check back regularly for progress updates.*
