"""
Local workflow validation script
Tests workflow loading and parameter substitution without requiring Modal/ComfyUI
"""
import json
import sys
import os
from pathlib import Path
from pprint import pprint

# Set encoding for Windows console
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Add modal_app to path
sys.path.insert(0, str(Path(__file__).parent))

from comfy_runner import ComfyUIRunner

def test_workflow_loading():
    """Test that workflows can be loaded from JSON files"""
    print("=" * 60)
    print("TEST 1: Workflow Loading")
    print("=" * 60)

    # Use local paths for testing
    workflows_path = str(Path(__file__).parent / "workflows")
    runner = ComfyUIRunner(workflows_path=workflows_path)

    try:
        # Test official workflow
        workflow = runner.load_workflow("flux2_fp8_official")
        print("[PASS] Loaded flux2_fp8_official.json")
        print(f"   Nodes: {len(workflow)}")
        print(f"   Node types: {[workflow[n]['class_type'] for n in workflow]}")

        # Verify required nodes exist
        required_nodes = [
            "ScaledFP8HybridUNetLoader",  # FP8 model loader
            "CLIPLoader",                  # Text encoder
            "VAELoader",                   # VAE decoder
            "CLIPTextEncode",              # Prompt encoding
            "EmptyLatentImage",            # Resolution setup
            "BasicGuider",                 # Guidance
            "RandomNoise",                 # Seed
            "BasicScheduler",              # Steps
            "SamplerCustomAdvanced",       # Sampler
            "KSamplerSelect",              # Sampler type
            "VAEDecode",                   # Decode latents
            "SaveImage"                    # Save output
        ]

        found_nodes = [workflow[n]['class_type'] for n in workflow]

        print("\n   Checking required nodes:")
        for node_type in required_nodes:
            if node_type in found_nodes:
                print(f"   [PASS] {node_type}")
            else:
                print(f"   [FAIL] {node_type} MISSING")

        return True
    except FileNotFoundError as e:
        print(f"[FAIL] Workflow file not found: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Error loading workflow: {e}")
        return False

def test_parameter_substitution():
    """Test that parameters can be substituted correctly"""
    print("\n" + "=" * 60)
    print("TEST 2: Parameter Substitution")
    print("=" * 60)

    workflows_path = str(Path(__file__).parent / "workflows")
    runner = ComfyUIRunner(workflows_path=workflows_path)

    try:
        # Load workflow
        workflow = runner.load_workflow("flux2_fp8_official")

        # Test parameters
        test_prompt = "A majestic dragon flying over a medieval castle at sunset"
        test_params = {
            "steps": 40,
            "cfg_scale": 4.5,
            "width": 1920,
            "height": 1080,
            "seed": 12345
        }

        print(f"\n   Test Parameters:")
        print(f"   - Prompt: {test_prompt[:50]}...")
        print(f"   - Steps: {test_params['steps']}")
        print(f"   - CFG Scale: {test_params['cfg_scale']}")
        print(f"   - Resolution: {test_params['width']}x{test_params['height']}")
        print(f"   - Seed: {test_params['seed']}")

        # Substitute parameters
        modified_workflow = runner.substitute_parameters(
            workflow, test_prompt, test_params
        )

        # Verify substitutions
        print("\n   Verifying substitutions:")

        # Check prompt in CLIPTextEncode nodes
        for node_id, node in modified_workflow.items():
            if node['class_type'] == 'CLIPTextEncode':
                actual_prompt = node['inputs'].get('text', '')
                if actual_prompt == test_prompt:
                    print(f"   [PASS] Prompt substituted correctly")
                else:
                    print(f"   [FAIL] Prompt mismatch: {actual_prompt[:30]}...")

        # Check steps in BasicScheduler
        for node_id, node in modified_workflow.items():
            if node['class_type'] == 'BasicScheduler':
                actual_steps = node['inputs'].get('steps', 0)
                if actual_steps == test_params['steps']:
                    print(f"   [PASS] Steps substituted correctly: {actual_steps}")
                else:
                    print(f"   [FAIL] Steps mismatch: {actual_steps}")

        # Check seed in RandomNoise
        for node_id, node in modified_workflow.items():
            if node['class_type'] == 'RandomNoise':
                actual_seed = node['inputs'].get('noise_seed', 0)
                if actual_seed == test_params['seed']:
                    print(f"   [PASS] Seed substituted correctly: {actual_seed}")
                else:
                    print(f"   [FAIL] Seed mismatch: {actual_seed}")

        # Check resolution in EmptyLatentImage
        for node_id, node in modified_workflow.items():
            if node['class_type'] == 'EmptyLatentImage':
                actual_width = node['inputs'].get('width', 0)
                actual_height = node['inputs'].get('height', 0)
                if actual_width == test_params['width'] and actual_height == test_params['height']:
                    print(f"   [PASS] Resolution substituted correctly: {actual_width}x{actual_height}")
                else:
                    print(f"   [FAIL] Resolution mismatch: {actual_width}x{actual_height}")

        return True
    except Exception as e:
        print(f"[FAIL] Error during parameter substitution: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_workflow_structure():
    """Test workflow structure and model filenames"""
    print("\n" + "=" * 60)
    print("TEST 3: Workflow Structure & Model Files")
    print("=" * 60)

    workflows_path = str(Path(__file__).parent / "workflows")
    runner = ComfyUIRunner(workflows_path=workflows_path)

    try:
        workflow = runner.load_workflow("flux2_fp8_official")

        # Check model filenames match what will be downloaded
        print("\n   Model file references:")

        for node_id, node in workflow.items():
            class_type = node['class_type']

            if class_type == 'ScaledFP8HybridUNetLoader':
                unet_name = node['inputs'].get('unet_name', '')
                print(f"   - FLUX.2 Model: {unet_name}")
                if 'flux2-dev-fp8' in unet_name.lower():
                    print(f"     [PASS] Filename matches download function")
                else:
                    print(f"     [WARN]  Filename may not match downloaded file")

            elif class_type == 'CLIPLoader':
                clip_name = node['inputs'].get('clip_name', '')
                clip_type = node['inputs'].get('type', '')
                print(f"   - Text Encoder: {clip_name} (type: {clip_type})")
                if 'mistral' in clip_name.lower() and 'fp8' in clip_name.lower():
                    print(f"     [PASS] Filename matches download function")
                else:
                    print(f"     [WARN]  Filename may not match downloaded file")

            elif class_type == 'VAELoader':
                vae_name = node['inputs'].get('vae_name', '')
                print(f"   - VAE: {vae_name}")
                if 'flux2-vae' in vae_name.lower():
                    print(f"     [PASS] Filename matches download function")
                else:
                    print(f"     [WARN]  Filename may not match downloaded file")

        return True
    except Exception as e:
        print(f"[FAIL] Error checking workflow structure: {e}")
        return False

def main():
    """Run all tests"""
    print("\n")
    print("=" * 60)
    print("  Workflow Validation Test Suite".center(60))
    print("=" * 60)
    print()

    results = []

    # Run tests
    results.append(("Workflow Loading", test_workflow_loading()))
    results.append(("Parameter Substitution", test_parameter_substitution()))
    results.append(("Workflow Structure", test_workflow_structure()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results:
        status = "[PASS] PASS" if passed else "[FAIL] FAIL"
        print(f"   {status}: {test_name}")

    # Overall result
    all_passed = all(result[1] for result in results)
    print("\n" + "=" * 60)
    if all_passed:
        print("[PASS] ALL TESTS PASSED")
        print("\nWorkflow is valid and ready for Modal deployment!")
        print("\nNext steps:")
        print("1. Deploy to Modal: modal deploy main.py")
        print("2. Download models: modal run main.py::download_flux2_all_dependencies")
        print("3. Test generation: See DEPLOYMENT.md for curl commands")
    else:
        print("[FAIL] SOME TESTS FAILED")
        print("\nPlease fix the issues above before deploying.")
    print("=" * 60)
    print()

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
