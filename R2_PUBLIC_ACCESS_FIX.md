# R2 Public Access Configuration

## Problem Identified

The generated images are returning `401 Unauthorized` when accessed via the public URL:
```
https://pub-27ff2bec75ad03d16fb004d0c44b8ce1.r2.dev/images/...
```

This is causing:
1. ❌ Images not displaying in the frontend
2. ❌ Download function failing (even with proxy)

## Root Cause

The R2 bucket `img-vid-aud` does not have public access enabled. By default, R2 buckets are private.

## Solution: Enable Public Access

### Option 1: Via Cloudflare Dashboard (Easiest)

1. Go to https://dash.cloudflare.com/
2. Navigate to **R2** → **Overview**
3. Click on your bucket: `img-vid-aud`
4. Click **Settings** tab
5. Scroll down to **Public Access**
6. Click **Allow Access** or **Connect Domain**
7. Choose **R2.dev subdomain**
8. Click **Enable** - this will activate the `pub-{account_id}.r2.dev` URL

The public URL will be:
```
https://pub-27ff2bec75ad03d16fb004d0c44b8ce1.r2.dev
```

### Option 2: Via Wrangler CLI

```bash
# Install wrangler (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Enable public access on the bucket
wrangler r2 bucket publicaccess enable img-vid-aud
```

### Option 3: Create Custom Domain (Production Recommended)

For production, you should use a custom domain instead of `pub-*.r2.dev`:

1. In Cloudflare Dashboard → R2 → `img-vid-aud` → Settings
2. Under **Public Access**, click **Connect Domain**
3. Enter a domain you own (e.g., `media.yourdomain.com`)
4. Follow the DNS setup instructions
5. Update `R2_PUBLIC_URL` in `.env.local` to your custom domain

## Verify Public Access

After enabling public access, test with:

```bash
curl -I "https://pub-27ff2bec75ad03d16fb004d0c44b8ce1.r2.dev/images/20251225/62474cc5-0fda-4586-9bbf-e87f56bb9dda.png"
```

You should see:
```
HTTP/1.1 200 OK
Content-Type: image/png
```

Instead of:
```
HTTP/1.1 401 Unauthorized  ❌
```

## Update Environment Variables (Optional)

If you set up a custom domain, update `frontend/.env.local`:

```bash
# Change from:
R2_PUBLIC_URL=https://27ff2bec75ad03d16fb004d0c44b8ce1.r2.cloudflarestorage.com/img-vid-aud

# To (if using R2.dev):
R2_PUBLIC_URL=https://pub-27ff2bec75ad03d16fb004d0c44b8ce1.r2.dev

# Or (if using custom domain):
R2_PUBLIC_URL=https://media.yourdomain.com
```

**Note**: The Modal backend doesn't use `R2_PUBLIC_URL` env var - it constructs the URL from `R2_ACCOUNT_ID` automatically. So this env var is currently unused.

## After Enabling Public Access

Once public access is enabled:
1. ✅ Images will display in the browser
2. ✅ Download function will work
3. ✅ No code changes needed - everything will work automatically

## Security Considerations

Enabling public access means:
- ✅ Anyone with the URL can view the images
- ❌ People cannot list all images in the bucket (bucket listing is still private)
- ✅ This is normal for user-generated content platforms
- 💡 Consider adding URL signing for sensitive content in the future

## Current Status

**Stuck Generation**: There's one generation stuck in "processing" status from 01:12:08.
After enabling R2 public access, you may want to check Modal logs to see if it completed:

```bash
# Check Modal logs
wsl bash -c "cd /mnt/d/ImageAndVideoGenerator/modal_app && ~/.local/bin/modal app logs ai-video-gen"
```

If it completed but didn't update the database, manually update it:

```javascript
// In browser console on frontend
await fetch('/api/admin/fix-stuck-generation', {
  method: 'POST',
  body: JSON.stringify({ jobId: '2ef8210c-b1c7-433c-b3b8-bc382531202a' })
});
```

Or via database:
```sql
UPDATE generations
SET status = 'failed', error = 'Timed out'
WHERE id = '2ef8210c-b1c7-433c-b3b8-bc382531202a';
```
