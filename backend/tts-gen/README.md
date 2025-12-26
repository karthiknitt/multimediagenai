# TTS Generation Service (F5-TTS)

Text-to-speech generation service using F5-TTS on Modal A10G GPU.

## Features

- State-of-the-art F5-TTS model (Jan 2025)
- Voice cloning with 3-10s reference audio
- Multi-language support (English priority)
- Speed control (0.8x - 1.5x)
- Low VRAM (6-8GB on A10G)
- Fast inference (~4-6s for 30s audio)

## Deployment

### Prerequisites

1. Modal account and token configured
2. Required Modal secrets:
   - `database-secret`: PostgreSQL connection details
   - `r2-secret`: Cloudflare R2 credentials

### Deploy to Modal

```bash
cd backend/tts-gen
modal deploy main.py
```

### Download Models

```bash
modal run main.py::download_models
```

This will download F5-TTS models (~8GB) to the Modal Volume `tts-models`.

## API Endpoint

### POST /generate

Generate speech from text.

**Request:**
```json
{
  "job_id": "uuid-string",
  "text": "Text to convert to speech (max 500 chars)",
  "voice_reference_url": "https://r2-url/voice-sample.wav",  // optional
  "language": "en",  // default: "en"
  "speed": 1.0  // 0.8 - 1.5
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "output_url": "https://r2-url/speech/2025-01-15/uuid.wav",
  "processing_time_ms": 4523
}
```

## Environment Variables

Required secrets in Modal:

**database-secret:**
- `DATABASE_HOST`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_PORT`

**r2-secret:**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_DOMAIN`

## GPU Configuration

- **GPU:** A10G (24GB VRAM)
- **Cost:** $1.10/hr
- **VRAM Usage:** 6-8GB
- **Timeout:** 5 minutes
- **Idle Timeout:** 3 minutes (warm cache)

## Cost Analysis

- Generation time: 4-6s for 30s audio
- Cost per generation: ~$0.0012-0.0018
- Monthly cost (50 generations/day): ~$2.25

## Testing

```bash
# Local test (requires Modal token)
modal run main.py

# Test with curl
curl -X POST https://your-modal-url/generate \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-001",
    "text": "Hello, this is a test.",
    "language": "en",
    "speed": 1.0
  }'
```

## Database Schema

The service updates the `generations` table:

```sql
UPDATE generations
SET status = 'completed',
    output_url = 'https://r2-url/speech/...',
    processing_time_ms = 4523,
    completed_at = NOW()
WHERE id = 'job_id';
```

## Troubleshooting

### Model download fails
- Check internet connectivity
- Verify Modal Volume permissions
- Check disk space (needs ~10GB)

### CUDA out of memory
- A10G has 24GB VRAM, should be sufficient
- Check if other processes are using GPU
- Reduce batch size if processing multiple requests

### R2 upload fails
- Verify R2 credentials in Modal secrets
- Check bucket name and permissions
- Verify public domain configuration

## Future Enhancements

- [ ] Multi-language support (Chinese, French, German, etc.)
- [ ] Emotion/style control
- [ ] Real-time streaming TTS
- [ ] Batch processing for efficiency
- [ ] Voice library integration
