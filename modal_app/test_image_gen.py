"""
Quick test script to generate an image and upload to R2
Usage: modal run test_image_gen.py
"""

import modal
import uuid

# Import the app from main.py
from main import app, generate_image_task

@app.local_entrypoint()
def main():
    """Test image generation"""

    job_id = str(uuid.uuid4())

    job_data = {
        "job_id": job_id,
        "prompt": "A beautiful sunset over mountains, vibrant colors, photorealistic",
        "model": "flux2-dev",
        "parameters": {
            "steps": 28,
            "cfg_scale": 3.5,
            "width": 1024,
            "height": 1024,
            "seed": None
        }
    }

    print(f"Starting image generation with job_id: {job_id}")
    print(f"Prompt: {job_data['prompt']}")
    print("\nCalling Modal function...")

    # Call the function remotely
    result = generate_image_task.remote(job_data)

    print("\n=== Generation Complete ===")
    print(f"Status: {result.get('status')}")
    if result.get('status') == 'completed':
        print(f"Output URL: {result.get('output_url')}")
        print(f"Processing time: {result.get('processing_time_ms')}ms")
        print(f"\nYou can view your image at: {result.get('output_url')}")
    else:
        print(f"Error: {result.get('error')}")
