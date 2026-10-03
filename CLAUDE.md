# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

AI media generation web app: users sign in, enter a prompt, and get an image, video, music or speech clip. A Next.js frontend creates a `generations` row and calls a Modal GPU endpoint; Modal updates the row (progress, `output_url`, status) itself and uploads the result to Cloudflare R2. The UI polls the row via SSE.

```
frontend/   Next.js 16 (App Router) + Better Auth + Drizzle (Neon Postgres) + Tailwind v4 / shadcn
backend/    One Modal app per modality (Python)
docs/       Plans and (archived) status reports. docs/plans/ holds current plans.
```

## Backend (Modal apps)

| Dir | Modal app | Model | GPU |
|---|---|---|---|
| `backend/image-gen` | `image-generation` | Z-Image-Turbo (distilled, 8 steps, guidance fixed at 0) | L40S |
| `backend/video-gen` | `video-generation` | Wan2.2 T2V-A14B / I2V-A14B (16 fps, frames = 4k+1) | H100 |
| `backend/audio-gen` | `audio-generation` | ACE-Step 1.5 turbo (+ optional 5Hz LM planner) | L40S |
| `backend/tts-gen` | `tts-generation` | Qwen3-TTS (presets + voice cloning) | A10G |

Conventions that are easy to get wrong:
- Every endpoint is `@modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)`. Callers must send `Modal-Key` / `Modal-Secret` (see `frontend/lib/modal.ts`).
- Endpoints do the whole job synchronously and write status to the DB with `_update_db` (retries once, never raises). User-facing `error` text must stay generic; log details with `logger`. `ValueError` messages (our own validation) may pass through.
- User-supplied URLs (`image_url`, `voice_reference_url`) are fetched only via `fetch_r2_bytes` (R2 origin only, no redirects, size cap). Keep it that way.
- Temp files go through `tempfile` and are removed in `finally`.
- Modal secrets: `r2-credentials`, `database-credentials`. Model weights live on Modal volumes (`download_models` fills them once).
- Python tooling: `uv`/`uvx`, ruff (`backend/pyproject.toml`), pytest in `backend/tests` (loads each `main.py` directly).

Checks: `cd backend && uvx ruff check . && uvx ruff format --check . && uvx --with modal --with pytest pytest -q`

## Frontend

Routes that start jobs (all require a session): `/api/generate-direct` (image), `/api/generate-video`, `/api/generate-audio` (music or tts variant), `/api/generate/speech`. Each one: validate body → check endpoint env **before** inserting → insert row → `dispatchModalJob` (`lib/modal-job.ts`, fire-and-forget, records failure on the row). Do not await the Modal call.

Other routes: `/api/generations[...]`, `/api/generation/[jobId]/stream` (SSE), `/api/image|video/[generationId]` (presigned R2 URLs, owner-checked), `/api/download` (session + exact R2 origin via `lib/media-url.ts`), `/api/dashboard/stats`, `/api/auth/[...all]`.

DB schema: `frontend/db/schema.ts` (`users`, `sessions`, `accounts`, `generations`, `workflow_presets`, `voice_library`). Migrations via drizzle-kit.

Env vars: see `frontend/.env.local.example` (DB, Better Auth, R2, the four `*_API_URL` Modal endpoints, `MODAL_PROXY_TOKEN_ID/SECRET`).

Commands (bun, not npm/pnpm):
```
cd frontend
bun install
bun run dev          # run via PM2 on this machine (port 3060, Tailscale-only)
bun test             # lib/*.test.ts
bunx tsc --noEmit --pretty false   # TS 7: use --pretty false when grepping output
bun run lint         # biome; pre-commit hook runs this
```

Dev loop after UI changes: serve with `/portless`, verify with `/agent-browser`.

## Working rules for this repo

- Never commit secrets; docs use placeholders (`DATABASE_URL=postgresql://<user>:<password>@<host>/db`).
- Auth schema changes: better-auth expects specific tables/columns (see `frontend/db/schema.ts`); a mismatch is logged as `Drizzle schema mismatch` at build time. Apply new drizzle migrations to Neon before deploying a build that needs them.
- `frontend/lib/` is matched by a gitignore pattern: use `git add -f` for **new** files there.
- Keep new generation parameters in sync across three places: Zod schema (`frontend/lib/validation.ts` or the route), the Modal payload, and the backend `params.get(...)`.
- Models were swapped on 2026-10 (FLUX/Mochi/CogVideoX/MusicGen/F5-TTS removed). Old status docs in `docs/archive/` describe the previous stack.
- Open fix plan and history: `docs/plans/2026-10-03-error-fix-plan.md`.
