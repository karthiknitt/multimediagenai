"""
Simple test to call Modal function and generate image
"""
import sys
import os
import json

# Add modal_app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_generation():
    """Call Modal deployed function to generate an image"""
    import uuid

    job_id = str(uuid.uuid4())

    job_data = {
        "job_id": job_id,
        "prompt": "A beautiful sunset over mountains, vibrant colors, photorealistic",
        "model": "flux2-dev",
        "parameters": {
            "steps": 20,  # Reduced steps for faster testing
            "cfg_scale": 3.5,
            "width": 1024,
            "height": 1024,
            "seed": 42
        }
    }

    print(f"Job ID: {job_id}")
    print(f"Prompt: {job_data['prompt']}")
    print(f"Parameters: {json.dumps(job_data['parameters'], indent=2)}")
    print("\nTo run this via Modal CLI, use:")
    print(f"modal run main.py::generate_image_task --data='{json.dumps(job_data)}'")

    # Return the command to run
    return job_data

if __name__ == "__main__":
    job_data = test_generation()

    # Save job data to file for easy Modal CLI usage
    with open("test_job_data.json", "w") as f:
        json.dump(job_data, f, indent=2)

    print("\nJob data saved to: test_job_data.json")
