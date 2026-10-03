# Error Scan & Fix Plan — 2026-10-03

Scope: `backend/{image,video,audio,tts}-gen` (Modal) + `frontend/` (Next.js 16). Branch scanned: `feat/swap-models-z-image-wan22-acestep-qwen3tts` (uncommitted work-in-progress).

Method: `tsc --noEmit` (clean after `bun install`), `ruff check` (F/B/S/E7/E9), `py_compile` (clean), manual review of all API routes and all four Modal apps. Nothing was changed in code — this is findings + plan only.

## Findings

### P0 — Security
| # | Where | Problem |
|---|---|---|
| S1 | `frontend/app/api/test-generation/route.ts` | Unauthenticated; no ownership check. Anyone can POST any `jobId` and mark it `completed` with a placeholder image. Marked "TEMPORARY — remove". |
| S2 | `frontend/app/api/download/route.ts` | Unauthenticated open proxy. Allow-list is `url.includes(".r2.dev")`, so `https://evil.com/?.r2.dev` passes → SSRF + bandwidth abuse. Also hardcodes `.png` filename and `Content-Type` fallback for video/audio. |
| S3 | All Modal `fastapi_endpoint`s | No auth; anyone with the URL can burn H100/L40S GPU time and write arbitrary `job_id` rows' status. Need a shared-secret header checked in Modal and sent by the Next routes (`proxy_auth` or custom token). |
| S4 | `video-gen` (`image_url`), `tts-gen` (`voice_reference_url`) | Modal fetches user-supplied URLs with no scheme/host validation (SSRF into internal networks / metadata). Restrict to R2 host + https, size cap. |

### P1 — Functional bugs
| # | Where | Problem |
|---|---|---|
| F1 | `frontend/biome.json` | Config is Biome 1.x (`files.ignore`); installed Biome is 2.x → `bunx biome check` aborts. **Lint is entirely broken**, so nothing is being checked. |
| F2 | `generate-direct`, `generate-video` | If `*_API_URL` env is missing, a `pending` row is already inserted and never marked failed → orphan job stuck forever (UI polls 15 min). `generate-direct` also does the `fetch` *before* try-scoped failure handling — a network throw returns 500 but leaves row in `processing`. |
| F3 | `generate-direct` | Awaits the Modal call (blocks on a cold H100/L40S start; Modal answers long calls with a 303). `generate-video` already uses fire-and-forget + failure marking; image should match. |
| F4 | `generate-audio` | Sends `guidance_scale` but ACE-Step turbo ignores it (CFG unused); `lyrics` supported by backend is never forwarded or in the Zod schema. Dead/missing params. Also Zod errors detected by `error.name === "ZodError"` (fragile in zod 4 — use `instanceof z.ZodError` / `safeParse`). |
| F5 | `backend/image-gen/main.py` | `output_url = f"{os.environ['R2_PUBLIC_URL']}/…"` → `KeyError` if unset, while audio/video fall back to `pub-<account>.r2.dev`. Inconsistent; no `ContentType` set on upload. |
| F6 | `/api/generate` + `inngest/functions.ts` (legacy path) | Still validates old model params (`steps` default 30, `cfgScale` min 1 — contradicts Z-Image-Turbo cfg 0 / ≤12 steps), posts to `${MODAL_API_URL}/generate/image` (route shape that no longer exists), and audio/video events use different names than the one `/api/generate` emits. Dead and wrong; either delete or fix. |
| F7 | `*-gen` `_update_db` | Swallows every exception (prints only). A DB outage → job stays `processing` forever with no signal. Error message from `str(e)` is written verbatim to the user-visible `error` column (can leak internals). |
| F8 | `/tmp/{job_id}.*` in all Modal apps | Output files never deleted; warm containers (5-min scaledown, many jobs) accumulate. Use `tempfile` + `finally` cleanup. (Ruff S108.) |

### P2 — Hygiene / drift
- Ruff: 16 auto-fixable `F401/F811` (unused `Path`, `uuid`, duplicate `datetime`/`timezone` imports in audio/image/video; unused `psycopg2` in image-gen `generate`). `test_video_gen.py` `requests.post` without timeout (S113). E501 ignorable (no ruff config) — add `pyproject.toml` with line-length 100.
- `backend/**/__pycache__/*.pyc` (7 files) tracked in git; no `__pycache__` ignore for backend. `.gitignore` needs `__pycache__/`, `*.pyc`.
- `frontend/*.mjs` ad-hoc scripts (`check-db`, `check-generations`, `check-latest`, `fix-stuck-generation`) committed at repo root of frontend; move to `frontend/scripts/` or delete.
- Two lockfiles (`bun.lock` + `pnpm-lock.yaml` + `pnpm-workspace.yaml`); `package.json` scripts reference `pnpm dlx`. Standard here is bun → pick bun, delete pnpm files.
- `.claude/skills/{flux1,flux2,mochi1,musicgen,cogvideox}*.md` describe removed models. `CLAUDE.md` still says "pre-development" and lists old stack/models. 26 stale `docs/*.md` status/"MISSION_ACCOMPLISHED" files (some contain `DATABASE_URL=postgresql://...` placeholders — verified no real secrets via grep).
- Uncommitted work: ~47 changed paths on the model-swap branch (flux2-gen deletion staged, README/main.py modified). Needs a clean commit/PR before more fixes pile on.

## Plan

Branch: `fix/scan-2026-10-03` off the model-swap branch once it's committed (so fixes don't tangle with the swap).

### Phase 0 — Land the in-flight work (blocker for everything)
1. Commit the model-swap branch (conventional commits), open PR to `dev`/`main`.
2. Add `.gitignore` entries (`__pycache__/`, `*.pyc`), `git rm --cached` the 7 pyc files.

### Phase 1 — Security (P0), TDD where testable
3. **S1**: delete `app/api/test-generation/route.ts`.
4. **S2**: rewrite `download` route: require session; parse URL; allow only `https:` + host equal to the `R2_PUBLIC_URL` host; derive filename/content-type from the object extension. Test: bypass URL (`?.r2.dev`), non-https, unauthenticated, valid R2 URL.
5. **S3**: add `MODAL_SHARED_SECRET`; Modal secret + check `X-Api-Key` (or `requires_proxy_auth=True` with Modal proxy tokens) in all 4 endpoints; send from the 5 Next routes. Test: 401 without header.
6. **S4**: helper `assert_r2_url(url)` in each backend (https + R2 host + size/content-type cap); apply to `image_url` and `voice_reference_url`.

### Phase 2 — Reliability (P1)
7. **F1**: fix `biome.json` for Biome 2 (`files.includes`, `"!**/.next"` etc.) — run `bunx biome migrate`; then run `biome check --write` and triage the resulting diff separately (expect noise).
8. **F2/F3**: extract one `startModalJob(endpoint, payload, jobId)` helper (fire-and-forget, marks failed on non-OK / `status:"error"` / throw, and on missing env *before* inserting the row). Use it in image/video/audio/speech routes. Unit tests with mocked `fetch` + db.
9. **F4**: audio route — use `safeParse`, drop `guidanceScale` (or keep UI-only), add optional `lyrics` end-to-end.
10. **F5/F7/F8** (backends, one shared pattern per app): R2 URL fallback + `ContentType`; `_update_db` retries once and logs with `logging`; sanitized user-facing `error`; `tempfile.TemporaryDirectory` for outputs.
11. **F6**: decide — recommend deleting `/api/generate`, `inngest/*`, `lib/modal-poller.ts`, `MODAL_API_URL` (all superseded by direct routes). Confirm nothing in `hooks/`/`components/` calls `/api/generate` (grep) before removing.

### Phase 3 — Hygiene (P2)
12. `ruff check --fix` + add `backend/pyproject.toml` (ruff config); fix S113 timeout in test script.
13. Remove pnpm files, move/delete `.mjs` scripts, delete stale `.claude/skills/*` for removed models, rewrite `CLAUDE.md` for current stack, archive old `docs/*.md` into `docs/archive/`.

### Verification gates (per phase)
- Frontend: `bunx tsc --noEmit` clean, `bunx biome check .` clean, `bun test` for new route tests, `next build`.
- Backend: `uvx ruff check backend`, `uvx ruff format --check`, `modal run` smoke on `health`, then one end-to-end generation per modality against dev Modal deploy (image, video t2v, audio, tts) confirming DB row reaches `completed` and a bad `job_id`/missing env reaches `failed`.

### Suggested order / effort
Phase 0 (15 min) → Phase 1 (≈½ day) → Phase 2 (≈1 day; F6 deletion shrinks it) → Phase 3 (≈2 h). Phases 1 steps 3–6 and Phase 3 are independent and can run as parallel subagents; Phase 2 step 8 should land before 9.

## Open questions
- Is `/api/generate` + Inngest still wanted for any future queueing (retries/rate-limits)? If yes, fix F6 instead of deleting.
- Modal auth: proxy-auth tokens (platform feature, no code) vs shared-secret header (portable)?
