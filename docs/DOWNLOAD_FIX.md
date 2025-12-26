# Download Function Fix

## Issue
The download button was failing with `Failed to fetch` error when trying to download generated images from Cloudflare R2 storage.

## Root Cause
The browser was attempting to directly fetch the R2 image URL, which caused CORS (Cross-Origin Resource Sharing) errors because:
1. R2 buckets don't have CORS enabled by default
2. The frontend at `localhost:3000` trying to fetch from `pub-{account_id}.r2.dev` is a cross-origin request

## Solution Implemented

### 1. Created Download Proxy API Route
**File**: `frontend/app/api/download/route.ts`

This Next.js API route acts as a proxy:
- Accepts the R2 URL as a query parameter
- Fetches the image server-side (no CORS restrictions)
- Returns the image with proper download headers
- Validates that URLs are from the R2 bucket

### 2. Updated ImagePreview Component
**File**: `frontend/components/generation/ImagePreview.tsx`

Changed the download handler from:
```typescript
// OLD - Direct fetch (fails with CORS)
const response = await fetch(imageUrl);
const blob = await response.blob();
```

To:
```typescript
// NEW - Use proxy route (works)
const a = document.createElement("a");
a.href = `/api/download?url=${encodeURIComponent(imageUrl)}`;
a.download = `generation-${Date.now()}.png`;
```

## Testing

### Test the Download Function
1. Navigate to http://localhost:3000/generate/image
2. Generate an image (or use an existing one)
3. Click the download button in the toolbar
4. Image should download successfully as `generation-{timestamp}.png`

## Image Display

Image display should work fine without CORS configuration because:
- HTML `<img>` tags don't enforce CORS for simple display
- Only `fetch()` and canvas operations require CORS headers
- The R2 bucket is already publicly accessible

## Optional: Enable CORS on R2 (For Future Features)

If you plan to add canvas-based features (like editing, filters, etc.), you'll need to enable CORS on the R2 bucket.

### Configure CORS via Cloudflare Dashboard

1. Go to Cloudflare Dashboard → R2 → Your bucket
2. Click "Settings" tab
3. Scroll to "CORS Policy"
4. Add this CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Configure CORS via Wrangler CLI

Or use the Wrangler CLI:

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create cors.json file
cat > cors.json <<EOF
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Set CORS policy
wrangler r2 bucket cors set img-vid-aud --cors-policy cors.json
```

## Summary

✅ **Fixed**: Download function now works via proxy API route
✅ **Working**: Image display (doesn't require CORS)
⏳ **Optional**: CORS configuration (only needed for canvas features)

The download function is now fully operational without requiring any R2 configuration changes!
