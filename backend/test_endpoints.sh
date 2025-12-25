#!/bin/bash
# ============================================================================
# API Endpoint Testing Script
# ============================================================================
#
# Tests all endpoints of the deployed Modal API.
#
# Usage:
#   ./test_endpoints.sh <api-url>
#
# Example:
#   ./test_endpoints.sh https://myuser--ai-video-gen-direct-fastapi-app.modal.run
#
# ============================================================================

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================

if [ -z "$1" ]; then
    echo "❌ ERROR: API URL required"
    echo ""
    echo "Usage: ./test_endpoints.sh <api-url>"
    echo ""
    echo "Example:"
    echo "  ./test_endpoints.sh https://myuser--ai-video-gen-direct-fastapi-app.modal.run"
    echo ""
    exit 1
fi

API_URL="$1"

# Remove trailing slash if present
API_URL="${API_URL%/}"

echo "============================================================================"
echo "API Endpoint Testing"
echo "============================================================================"
echo ""
echo "API URL: $API_URL"
echo "Test Time: $(date)"
echo ""
echo "============================================================================"

# ============================================================================
# Helper Functions
# ============================================================================

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"

    echo ""
    echo "📍 Testing: $name"
    echo "   Endpoint: $method $endpoint"
    echo ""

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n 1)
    # Extract body (all but last line)
    body=$(echo "$response" | head -n -1)

    echo "   Status: $status_code"
    echo "   Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""

    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo "   ✅ PASSED"
    else
        echo "   ❌ FAILED"
    fi

    echo "   ────────────────────────────────────────────────────────────"
}

generate_job_id() {
    # Generate valid UUID v4 using Python (cross-platform compatible)
    python3 -c "import uuid; print(str(uuid.uuid4()))" 2>/dev/null || \
    python -c "import uuid; print(str(uuid.uuid4()))"
}

# ============================================================================
# Test Suite
# ============================================================================

echo ""
echo "🧪 Starting Test Suite..."
echo ""

# Test 1: Root endpoint
test_endpoint \
    "Root Health Check" \
    "GET" \
    "/" \
    ""

# Test 2: Lightweight health check
test_endpoint \
    "Lightweight Health Check" \
    "GET" \
    "/health" \
    ""

# Test 3: GPU Information
test_endpoint \
    "GPU Information" \
    "GET" \
    "/gpu-info" \
    ""

# Test 4: Image generation
JOB_ID_IMAGE=$(generate_job_id)
test_endpoint \
    "Image Generation (FLUX.2)" \
    "POST" \
    "/generate/image" \
    '{
        "job_id": "'$JOB_ID_IMAGE'",
        "prompt": "A serene mountain landscape at sunset, photorealistic, 8k",
        "model": "flux2-dev",
        "parameters": {
            "width": 1024,
            "height": 1024,
            "steps": 50,
            "cfg_scale": 3.5
        }
    }'

# Test 5: Text-to-video generation
JOB_ID_T2V=$(generate_job_id)
test_endpoint \
    "Text-to-Video Generation (Mochi)" \
    "POST" \
    "/generate/video/text2video" \
    '{
        "job_id": "'$JOB_ID_T2V'",
        "prompt": "A cat walking in a garden, cinematic lighting",
        "model": "mochi-1",
        "parameters": {
            "num_frames": 84,
            "steps": 200,
            "guidance_scale": 4.5,
            "negative_prompt": "blurry, low quality"
        }
    }'

# Test 6: Image-to-video generation
JOB_ID_I2V=$(generate_job_id)
test_endpoint \
    "Image-to-Video Generation (CogVideoX)" \
    "POST" \
    "/generate/video/img2video" \
    '{
        "job_id": "'$JOB_ID_I2V'",
        "image_url": "https://example.com/sample-image.jpg",
        "prompt": "The image comes to life with gentle movement",
        "model": "cogvideox-5b",
        "parameters": {
            "num_frames": 49,
            "steps": 50,
            "guidance_scale": 6.0
        }
    }'

# Test 7: Audio generation
JOB_ID_AUDIO=$(generate_job_id)
test_endpoint \
    "Audio Generation (MusicGen)" \
    "POST" \
    "/generate/audio" \
    '{
        "job_id": "'$JOB_ID_AUDIO'",
        "prompt": "upbeat electronic dance music with heavy bass",
        "model": "musicgen-large",
        "parameters": {
            "duration": 30.0,
            "temperature": 1.0,
            "cfg_coef": 3.0
        }
    }'

# ============================================================================
# Test Summary
# ============================================================================

echo ""
echo "============================================================================"
echo "✅ Test Suite Complete!"
echo "============================================================================"
echo ""
echo "📋 Jobs Created:"
echo "   • Image:         $JOB_ID_IMAGE"
echo "   • Text-to-Video: $JOB_ID_T2V"
echo "   • Img-to-Video:  $JOB_ID_I2V"
echo "   • Audio:         $JOB_ID_AUDIO"
echo ""
echo "⏳ Note: Jobs are processed asynchronously"
echo "   Check Modal logs to monitor progress:"
echo "   https://modal.com/logs"
echo ""
echo "🔍 You can also check function logs:"
echo "   modal function logs ai-video-gen-direct.generate_image_task"
echo "   modal function logs ai-video-gen-direct.generate_video_text2video_task"
echo "   modal function logs ai-video-gen-direct.generate_video_img2video_task"
echo "   modal function logs ai-video-gen-direct.generate_audio_task"
echo ""
echo "📊 Expected Processing Times (warm container):"
echo "   • Image (FLUX.2):        15-25 seconds"
echo "   • Text-to-Video (Mochi): 4-6 minutes"
echo "   • Img-to-Video (CogVideoX): 90-180 seconds"
echo "   • Audio (MusicGen):      15-30 seconds"
echo ""
echo "⚠️  First Run Notes:"
echo "   • Cold start adds 30-60s"
echo "   • MusicGen model download adds ~60-90s on first audio generation"
echo ""
echo "============================================================================"
