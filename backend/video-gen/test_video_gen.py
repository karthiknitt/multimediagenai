#!/usr/bin/env python3
"""Test video generation with proper R2 upload"""

import requests
import time
import json

# Test text-to-video endpoint
def test_text2video():
    url = "https://karthiknitt--video-generation-videogenerator-generate-te-dfe008.modal.run"

    payload = {
        "job_id": f"test-t2v-{int(time.time())}",
        "prompt": "A serene mountain landscape at sunrise with flowing water",
        "parameters": {
            "num_frames": 64,
            "cfg_scale": 7.5,
            "seed": 42
        }
    }

    print(f"Testing text-to-video with job_id: {payload['job_id']}")
    print(f"Endpoint: {url}")
    print(f"Request: {json.dumps(payload, indent=2)}")

    response = requests.post(url, json=payload)

    print(f"\nResponse status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")

    return response.json()

if __name__ == "__main__":
    print("=" * 80)
    print("Testing Video Generation with Lazy Loading + R2 Upload")
    print("=" * 80)
    print()

    result = test_text2video()

    print("\n" + "=" * 80)
    print("Test Summary:")
    print("=" * 80)

    if result.get("status") == "success":
        print("✓ Video generation succeeded!")
        print(f"✓ Output URL: {result.get('output_url')}")
        print(f"✓ Generation time: {result.get('generation_time_seconds')} seconds")
    else:
        print("✗ Video generation failed!")
        print(f"✗ Error: {result.get('message')}")
