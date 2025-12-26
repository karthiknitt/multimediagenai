"""
Run image generation via Modal
Usage: modal run run_generation.py
"""
import json
from main import app, generate_image_task

@app.local_entrypoint()
def main():
    """Run image generation test"""

    # Load job data
    with open("test_job_data.json", "r", encoding="utf-8") as f:
        job_data = json.load(f)

    print("=" * 60)
    print("AI VIDEO GENERATION - IMAGE TEST")
    print("=" * 60)
    print(f"\nJob ID: {job_data['job_id']}")
    print(f"Prompt: {job_data['prompt']}")
    print(f"Steps: {job_data['parameters']['steps']}")
    print(f"Resolution: {job_data['parameters']['width']}x{job_data['parameters']['height']}")
    print(f"Seed: {job_data['parameters']['seed']}")
    print("\n" + "=" * 60)
    print("Starting generation on Modal GPU...")
    print("=" * 60 + "\n")

    # Call the function remotely (deployed on Modal)
    result = generate_image_task.remote(job_data)

    print("\n" + "=" * 60)
    print("GENERATION RESULT")
    print("=" * 60)
    print(json.dumps(result, indent=2))

    if result.get('status') == 'completed':
        print(f"\nSUCCESS!")
        print(f"Output URL: {result.get('output_url')}")
        print(f"Processing time: {result.get('processing_time_ms')}ms")
        print(f"\nView your image at: {result.get('output_url')}")
    else:
        print(f"\nFAILED")
        print(f"Error: {result.get('error')}")
