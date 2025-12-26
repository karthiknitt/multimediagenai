# Quick Start Guide

## ✅ Setup Complete!

Your Phase 1A infrastructure is ready. Here's how to run everything:

---

## Running the Development Environment

You need **2 terminals running simultaneously**:

### Terminal 1: Inngest Dev Server
```bash
cd frontend
pnpm dev:inngest
```

This starts the Inngest development server at `http://localhost:8288`

### Terminal 2: Next.js App
```bash
cd frontend
pnpm dev
```

This starts your Next.js app at `http://localhost:3000`

---

## What's Working

✅ **Database**: Neon PostgreSQL with Drizzle ORM
- Tables created: `users`, `sessions`, `generations`, `workflow_presets`

✅ **Authentication**: Better Auth configured
- Email/password authentication ready
- Sessions managed automatically

✅ **Workflows**: Inngest configured
- Functions ready: `generate-image`, `generate-video`, `generate-audio`
- Dashboard at `http://localhost:8288`

✅ **Storage**: Cloudflare R2 helpers ready
- Upload/delete functions configured
- Awaiting R2 credentials

✅ **UI**: Tailwind CSS + shadcn/ui
- Button, Card, Input components ready
- Dark mode support configured

---

## Next Steps

### 1. Test the Setup
Open your browser and visit:
- **Next.js App**: http://localhost:3000
- **Inngest Dashboard**: http://localhost:8288

### 2. Still Need to Set Up

#### Cloudflare R2 (for file storage)
1. Create account at [cloudflare.com](https://cloudflare.com)
2. Create R2 bucket named `img-vid-aud`
3. Generate API keys
4. Add to `.env.local`:
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_PUBLIC_URL=https://your-r2-url.com
   ```

### 3. Ready for Phase 1B

Once R2 is set up, you're ready to start **Phase 1B: Modal Backend + FLUX.2 Image Generation**

This involves:
- Setting up Modal account
- Installing Modal CLI (`pip install modal` with uv)
- Setting up ComfyUI
- Downloading FLUX.2 model
- Creating backend API

---

## Common Commands

```bash
# Development
pnpm dev              # Start Next.js
pnpm dev:inngest      # Start Inngest Dev Server

# Database
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio (database GUI)
pnpm db:generate      # Generate migrations

# Code Quality
pnpm lint             # Check code
pnpm lint:fix         # Auto-fix issues
pnpm format           # Format code
```

---

## Troubleshooting

### Database connection issues
- Make sure `DATABASE_URL` in `.env.local` has no quotes
- Run `pnpm db:push` to create tables

### Inngest not discovering functions
- Make sure both servers are running
- Check `http://localhost:8288` for the dashboard
- Verify Next.js is running at `http://localhost:3000`

### Permission errors with Inngest
- Use `pnpm dev:inngest` instead of global `inngest` command
- This uses `npx` which doesn't require admin rights

---

## Project Status

📊 **Phase 1A: COMPLETE** ✅

All infrastructure is ready:
- ✅ Next.js 16 + TypeScript
- ✅ Tailwind CSS + shadcn/ui
- ✅ Database (Neon + Drizzle)
- ✅ Authentication (Better Auth)
- ✅ Workflows (Inngest)
- ✅ Storage helpers (R2)

🚀 **Next: Phase 1B - Modal Backend**

See `PROGRESS.md` for detailed information.
