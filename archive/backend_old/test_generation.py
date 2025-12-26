"""Quick test script to verify image generation is working"""
import requests
import time
import uuid

# Generate a valid UUID for the job
job_id = str(uuid.uuid4())

print(f"Testing image generation with job_id: {job_id}")

# Submit generation request
url = "https://karthiknitt--ai-video-gen-direct-v4-fastapi-app.modal.run/generate/image"
payload = {
    "job_id": job_id,
    "prompt": "A serene mountain landscape at sunrise with snow-capped peaks",
    "model": "flux2-dev",
    "parameters": {
        "width": 512,
        "height": 512,
        "steps": 10,  # Fewer steps for faster testing
        "cfg_scale": 3.5
    }
}

print("Submitting generation request...")
response = requests.post(url, json=payload)
print(f"Response: {response.json()}")

if response.status_code == 200:
    print("\n✓ Generation request accepted!")
    print(f"Job ID: {job_id}")
    print("\nTo check if it succeeded, look for logs with this job_id in Modal dashboard")
    print("or wait ~30 seconds and check your R2 bucket for the generated image.")
else:
    print(f"\n✗ Request failed with status {response.status_code}")
    print(response.text)
