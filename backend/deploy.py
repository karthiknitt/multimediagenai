#!/usr/bin/env python3
"""
Deployment script to avoid Windows encoding issues with Modal CLI.
This script wraps the modal deploy command with proper encoding handling.
"""

import subprocess
import sys
import os

# Set UTF-8 encoding
os.environ["PYTHONIOENCODING"] = "utf-8"

def main():
    print("=" * 80)
    print("Deploying AI Video Generation Backend to Modal...")
    print("=" * 80)
    print()

    # Run modal deploy command
    try:
        result = subprocess.run(
            ["modal", "deploy", "main.py"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=False,  # Let output stream directly
            text=True,
            encoding="utf-8",
            errors="replace"  # Replace unencodable characters
        )

        if result.returncode == 0:
            print()
            print("=" * 80)
            print("✅ Deployment Successful!")
            print("=" * 80)
            print()
            print("Next steps:")
            print("  1. Run test suite: ./test_endpoints.sh <url>")
            print("  2. Monitor logs: modal app logs ai-video-gen-direct")
            print()
            return 0
        else:
            print()
            print("=" * 80)
            print("❌ Deployment Failed")
            print("=" * 80)
            print()
            print("Check the error messages above.")
            print("You may need to deploy from WSL or Linux instead.")
            return 1

    except FileNotFoundError:
        print("❌ Error: 'modal' command not found")
        print()
        print("Please install Modal CLI:")
        print("  pip install modal")
        print()
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
