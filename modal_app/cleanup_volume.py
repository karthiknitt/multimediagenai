"""
Clean up Modal volume to remove unnecessary files and save storage costs
Usage: modal run cleanup_volume.py
"""
from main import app, model_volume
import modal

@app.function(
    volumes={"/models": model_volume},
    timeout=600
)
def cleanup_unnecessary_files():
    """
    Remove duplicate and unnecessary files from Modal volume.
    Keep only what's needed for FLUX.2 FP8 generation.
    """
    from pathlib import Path
    import shutil

    models_path = Path("/models")

    print("=" * 60)
    print("MODAL VOLUME CLEANUP")
    print("=" * 60)

    # Calculate initial size
    def get_dir_size(path):
        total = 0
        for item in path.rglob('*'):
            if item.is_file():
                total += item.stat().st_size
        return total

    initial_size = get_dir_size(models_path)
    print(f"\nInitial volume size: {initial_size / (1024**3):.2f} GB")

    # Track what we're removing
    removed_files = []
    removed_size = 0

    # Files we NEED (don't delete):
    # - checkpoints/flux2-dev-fp8.safetensors (30GB FP8 model)
    # - vae/flux2-vae.safetensors (VAE)
    # - text_encoders/mistral_3_small_flux2_fp8.safetensors (text encoder)

    print("\n" + "=" * 60)
    print("FILES TO KEEP (Required for generation):")
    print("=" * 60)

    keep_files = [
        "checkpoints/flux2-dev-fp8.safetensors",
        "vae/flux2-vae.safetensors",
        "text_encoders/mistral_3_small_flux2_fp8.safetensors"
    ]

    for file in keep_files:
        file_path = models_path / file
        if file_path.exists():
            size = file_path.stat().st_size / (1024**3)
            print(f"✓ {file} ({size:.2f} GB)")
        else:
            print(f"✗ {file} (NOT FOUND)")

    print("\n" + "=" * 60)
    print("REMOVING UNNECESSARY FILES:")
    print("=" * 60)

    # Remove entire flux directory (unused diffusers format)
    flux_dir = models_path / "flux"
    if flux_dir.exists():
        size = get_dir_size(flux_dir)
        print(f"\nRemoving flux/ directory ({size / (1024**3):.2f} GB)...")
        shutil.rmtree(flux_dir)
        removed_size += size
        removed_files.append("flux/")
        print("✓ Removed")

    # Remove HuggingFace cache (duplicates of downloaded models)
    hf_cache_dir = models_path / "hf_cache"
    if hf_cache_dir.exists():
        size = get_dir_size(hf_cache_dir)
        print(f"\nRemoving hf_cache/ directory ({size / (1024**3):.2f} GB)...")
        shutil.rmtree(hf_cache_dir)
        removed_size += size
        removed_files.append("hf_cache/")
        print("✓ Removed")

    # Calculate final size
    final_size = get_dir_size(models_path)

    print("\n" + "=" * 60)
    print("CLEANUP SUMMARY")
    print("=" * 60)
    print(f"Initial size:  {initial_size / (1024**3):.2f} GB")
    print(f"Final size:    {final_size / (1024**3):.2f} GB")
    print(f"Space freed:   {removed_size / (1024**3):.2f} GB")
    print(f"Savings:       ${(removed_size / (1024**3)) * 0.10:.2f}/month")

    print(f"\nRemoved {len(removed_files)} directories:")
    for f in removed_files:
        print(f"  - {f}")

    print("\n" + "=" * 60)
    print("REMAINING FILES:")
    print("=" * 60)

    for root_dir in ["checkpoints", "vae", "text_encoders"]:
        dir_path = models_path / root_dir
        if dir_path.exists():
            print(f"\n{root_dir}/")
            for file in dir_path.rglob("*"):
                if file.is_file():
                    size = file.stat().st_size / (1024**3)
                    rel_path = file.relative_to(models_path)
                    print(f"  - {rel_path} ({size:.2f} GB)")

    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE")
    print("=" * 60)

    return {
        "initial_size_gb": initial_size / (1024**3),
        "final_size_gb": final_size / (1024**3),
        "removed_size_gb": removed_size / (1024**3),
        "monthly_savings": (removed_size / (1024**3)) * 0.10,
        "removed_files": removed_files
    }

@app.local_entrypoint()
def main():
    """Run cleanup"""
    print("Starting Modal volume cleanup...")
    print("This will remove duplicate and unnecessary files.\n")

    result = cleanup_unnecessary_files.remote()

    print("\n" + "=" * 60)
    print(f"Monthly storage savings: ${result['monthly_savings']:.2f}")
    print("=" * 60)
