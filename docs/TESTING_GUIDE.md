# 🧪 Testing Guide - Secure R2 Image Access

## ✅ Dev Server Status

**Frontend**: Running at http://localhost:3000
**Modal Backend**: Deployed and ready
**Build Cache**: Cleared (.next removed)

## Testing Steps

### 1. Login to Application

1. Navigate to http://localhost:3000
2. If not logged in, click "Login" or "Sign Up"
3. Use existing credentials or create new account

### 2. Generate New Image (Primary Test)

1. Go to http://localhost:3000/generate/image
2. Enter a prompt (e.g., "a beautiful sunset over mountains")
3. Click **Generate Image**
4. Watch the progress indicator

**Expected Behavior**:
- ✅ Progress updates in real-time (0% → 100%)
- ✅ Generation completes (usually 30-60 seconds for warm cache)
- ✅ Image displays automatically
- ✅ **No 401 Unauthorized errors in browser console**
- ✅ Image loads from secure pre-signed URL

**Check Browser Console**:
```
Network → /api/image/[generationId] → Status: 200 OK
Response: { "url": "https://27ff2bec75ad03d16fb004d0c44b8ce1.r2.cloudflarestorage.com/...", "expiresIn": 3600 }
```

### 3. Test Download Function

1. After image generates, click the **Download** button (arrow icon in toolbar)
2. Image should download as `generation-{timestamp}.png`

**Expected Behavior**:
- ✅ File downloads successfully
- ✅ No CORS errors
- ✅ File is valid PNG image

### 4. Test Image Persistence

1. Refresh the page
2. Click on the same generation in history (if available)
3. Image should display again via new pre-signed URL

**Expected Behavior**:
- ✅ Image loads even after page refresh
- ✅ New pre-signed URL is generated
- ✅ No authentication errors

### 5. Test Auto-Refresh (Optional - Long Test)

1. Generate an image
2. Leave the page open for 55+ minutes
3. Image should continue displaying without interruption

**Expected Behavior**:
- ✅ Pre-signed URL refreshes automatically at 55 minutes
- ✅ No visible interruption to user
- ✅ Image stays displayed continuously

## What to Check in Browser DevTools

### Network Tab

**When image loads**:
```
GET /api/image/62474cc5-0fda-4586-9bbf-e87f56bb9dda
Status: 200 OK
Response: {
  "url": "https://27ff2bec75ad03d16fb004d0c44b8ce1.r2.cloudflarestorage.com/img-vid-aud/images/20251225/xxx.png?X-Amz-Algorithm=...",
  "expiresIn": 3600
}

GET https://27ff2bec75ad03d16fb004d0c44b8ce1.r2.cloudflarestorage.com/...
Status: 200 OK
Content-Type: image/png
```

### Console Tab

**Should see**:
- ✅ No 401 Unauthorized errors
- ✅ No CORS errors
- ✅ No "Failed to load image" messages

**Should NOT see**:
- ❌ `Error: column "outputUrl" does not exist`
- ❌ `Failed to fetch`
- ❌ `Access to fetch blocked by CORS policy`

## Troubleshooting

### Issue: 401 Unauthorized

**Symptom**: Image doesn't display, console shows 401 error

**Possible Causes**:
1. R2 credentials incorrect in `.env.local`
2. Pre-signed URL generation failing
3. R2 bucket name mismatch

**Fix**:
```bash
# Verify credentials in .env.local
cat frontend/.env.local | grep R2_

# Should show:
R2_ACCOUNT_ID=27ff2bec75ad03d16fb004d0c44b8ce1
R2_ACCESS_KEY_ID=b8e1415cc494945480926c31b11596f4
R2_SECRET_ACCESS_KEY=a6b837277577c97b888d0fe45f5b6cdd7fd2ef64dba6f5a10ac4755dd44237e8
R2_BUCKET_NAME=img-vid-aud
```

### Issue: Image Not Found

**Symptom**: API returns 404

**Check Database**:
```sql
SELECT id, status, output_url
FROM generations
WHERE id = 'your-generation-id';
```

**Verify**:
- Status is `completed`
- `output_url` is not null
- User ID matches your session

### Issue: Download Fails

**Symptom**: Download button does nothing or shows error

**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. Pre-signed URL is valid (200 OK response)

**Fix**: Ensure pre-signed URL is being used, not original object key

### Issue: TypeScript Errors

**Symptom**: Dev server won't compile

**Fix**:
```bash
cd frontend
pnpm exec tsc --noEmit

# Should show no errors
```

## Success Checklist

Mark each item as you test:

- [ ] Frontend dev server running (http://localhost:3000)
- [ ] Can login successfully
- [ ] Generate new image works
- [ ] Image displays automatically (no 401 errors)
- [ ] Download button works
- [ ] No CORS errors in console
- [ ] Pre-signed URL visible in Network tab
- [ ] Image has `X-Amz-Algorithm` in URL (proves it's signed)
- [ ] Historical images load correctly
- [ ] Page refresh doesn't break image display

## Security Verification

### Test Authorization

**Setup**: Create two user accounts

**Test**:
1. User A generates an image (note the generation ID)
2. Login as User B
3. Try to access User A's image via API:
   ```
   GET /api/image/{user-a-generation-id}
   ```

**Expected**: `403 Forbidden - this generation belongs to another user`

### Test URL Expiry (Advanced)

**Test**:
1. Generate image and copy pre-signed URL from DevTools
2. Access URL in browser - should work
3. Wait 1 hour
4. Access same URL - should fail with `403 Forbidden`

**Note**: URL refresh mechanism means image stays displayed in app even after original URL expires

## Performance Benchmarks

**Expected Timings**:
- Pre-signed URL generation: <50ms
- Image load time: 500ms - 2s (depends on image size)
- Cold start generation: ~6 minutes (first image of the day)
- Warm cache generation: 30-60 seconds

## Next Steps After Testing

Once all tests pass:

1. ✅ Mark implementation as production-ready
2. ✅ Document any issues found
3. ✅ Consider optional enhancements (see [SECURE_IMAGE_ACCESS.md](SECURE_IMAGE_ACCESS.md))
4. ✅ Plan deployment to Vercel (when ready)

## Quick Commands

```bash
# Restart dev server
cd frontend
rm -rf .next
pnpm dev

# Check TypeScript
pnpm exec tsc --noEmit

# Check recent generations
node check-generations.mjs

# Check Modal logs
wsl bash -c "cd /mnt/d/ImageAndVideoGenerator/modal_app && ~/.local/bin/modal app logs ai-video-gen"
```

---

## 🎉 Happy Testing!

Your secure R2 image access implementation is ready. The R2 bucket stays **completely private** while providing seamless, authenticated access via pre-signed URLs!
