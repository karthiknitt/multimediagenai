"""
Test script for image generation
"""
import modal
from main import app, generate_image_task

# Create test job data
job_data = {
    "job_id": "test-local-456",
    "prompt": "a beautiful sunset over mountains",
    "model": "flux2-dev",
    "parameters": {
        "steps": 28,
        "cfg_scale": 3.5,
        "width": 1024,
        "height": 1024,
        "seed": 42
    }
}

@app.local_entrypoint()
def main():
    """Run a test generation"""
    print("Starting test generation...")
    print(f"Job data: {job_data}")

    # Call the function
    result = generate_image_task.remote(job_data)

    print("\nGeneration complete!")
    print(f"Result: {result}")

if __name__ == "__main__":
    main()
