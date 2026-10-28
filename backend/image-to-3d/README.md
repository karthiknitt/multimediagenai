# image-to-3d (Modal app)

Photo -> 3D mesh (GLB, geometry only, no texture). Hi3D v1.0 only *refines* a coarse mesh, so two stages:
1. Hunyuan3D-2-mini (`tencent/Hunyuan3D-2mini`) builds the coarse mesh (optional background removal first).
2. Hi3D (`hi3d-official/Hi3Dv1.0`) refines it at 512 or 1024 (1536 only validated on 96 GB; not exposed).

`ImageTo3D.generate` (H100): POST `{job_id, image_url, parameters?{resolution, refine, refine_steps, coarse_steps, guidance_scale, seed, remove_background}}`.
`refine: false` returns the Hunyuan coarse mesh only. Output: `models3d/<date>/model-<job>.glb` in R2.

License: Hi3D Open License 1.0 — commercial use OK, must display "Powered by Hi3D 1.0"; separate license above 200k MAU / $1M monthly revenue.

## Setup
`cd backend/image-to-3d && modal run main.py::download_models && modal deploy main.py`

Verified live (512 res, ~25 s warm). Hi3D loads from a plain dir (`/models/hi3d`) because it rejects HF cache symlinks.
