"""
Mochi 1 Text-to-Video Direct Implementation - No ComfyUI
Uses Hugging Face Diffusers with CPU offload + VAE tiling

Performance:
- 84 frames (~2.8s video @ 30fps): 4-6 minutes
- VRAM: ~22GB with optimizations (BF16 + CPU offload + VAE tiling)
- Cost: ~$0.125 per video (A100 80GB @ $2.50/hr)

Quality Settings (user preference):
- Default: 84 frames, 200 inference steps (high quality)
- Alternative: 49 frames, 100-150 steps (cost-optimized)
"""

import torch
import io
from pathlib import Path
from typing import Callable, Optional
from diffusers.utils import export_to_video


class MochiGenerator:
    """
    Direct Mochi 1 text-to-video generation using diffusers library.

    Loads from Hugging Face with heavy optimizations for A100 80GB.
    """

    def __init__(
        self,
        models_path: str = "/models",
        device: str = "cuda"
    ):
        """
        Initialize Mochi generator.

        Args:
            models_path: Path to Modal Volume for model caching
            device: CUDA device (default: cuda)
        """
        self.models_path = Path(models_path)
        self.device = device
        self.pipe = None

        print(f"[Mochi] Initializing generator (cache: {self.models_path})")

    def load_model(self):
        """
        Load Mochi 1 model with heavy optimizations.

        Optimizations:
        - CPU offloading: Offload layers to CPU when not in use (~40-50% VRAM reduction)
        - VAE tiling: Process VAE in tiles (essential for 163 frames)
        - BF16 precision: 50% memory vs FP32
        """
        from diffusers import MochiPipeline

        print("[Mochi] Loading model from Hugging Face...")

        # Load Mochi pipeline with BF16
        self.pipe = MochiPipeline.from_pretrained(
            "genmo/mochi-1-preview",
            torch_dtype=torch.bfloat16,
            cache_dir=str(self.models_path)
        )

        print("[Mochi] Applying optimizations...")

        # Critical optimization: CPU offloading (reduces VRAM by ~40%)
        self.pipe.enable_model_cpu_offload()

        # VAE tiling (essential for generating 163 frames without OOM)
        self.pipe.enable_vae_tiling()

        print("[Mochi] Model loaded successfully!")
        print(f"[Mochi] VRAM usage: {torch.cuda.memory_allocated() / (1024**3):.2f} GB")

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        num_frames: int = 84,  # Default: 84 frames (~2.8s @ 30fps) - quality optimized
        num_inference_steps: int = 200,  # Default: 200 steps - high quality
        guidance_scale: float = 4.5,
        height: int = 480,
        width: int = 848,
        seed: Optional[int] = None,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> bytes:
        """
        Generate video from text prompt.

        Args:
            prompt: Text description of desired video
            negative_prompt: What to avoid in generation
            num_frames: Number of frames (default: 84 for ~2.8s @ 30fps)
                        Options: 49 (~1.6s), 84 (~2.8s), 163 (~5.4s)
            num_inference_steps: Sampling steps (default: 200 for quality)
                                Can use 100-150 for faster/cheaper
            guidance_scale: CFG scale (default: 4.5)
            height: Video height (default: 480p)
            width: Video width (default: 848)
            seed: Random seed for reproducibility
            progress_callback: Callback for progress updates (0-100)

        Returns:
            MP4 video as bytes
        """
        if self.pipe is None:
            self.load_model()

        print(f"[Mochi] Generating: {prompt[:50]}...")
        print(f"[Mochi] Settings: {num_frames} frames, {num_inference_steps} steps")

        # Set seed for reproducibility
        if seed is not None:
            torch.manual_seed(seed)

        # Progress callback wrapper (called every 10 steps for Mochi)
        def on_step(step, timestep, latents):
            if progress_callback:
                progress = int((step / num_inference_steps) * 100)
                if step % 10 == 0:  # Update every 10 steps
                    progress_callback(progress)

        # Generate video frames
        with torch.autocast("cuda", torch.bfloat16):
            output = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                height=height,
                width=width,
                callback_on_step_end=on_step if progress_callback else None,
                callback_on_step_end_tensor_inputs=["latents"]
            )

        frames = output.frames[0]

        print(f"[Mochi] Generated {len(frames)} frames")

        # Convert frames to MP4 bytes
        video_bytes = self._frames_to_mp4_bytes(frames, fps=30)

        print(f"[Mochi] Video complete! Size: {len(video_bytes) / (1024**2):.1f} MB")

        return video_bytes

    def _frames_to_mp4_bytes(self, frames, fps: int = 30) -> bytes:
        """
        Convert frames to MP4 video bytes.

        Args:
            frames: List of PIL Images or numpy arrays
            fps: Frames per second

        Returns:
            MP4 video as bytes
        """
        import tempfile

        # Export to temporary file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        export_to_video(frames, tmp_path, fps=fps)

        # Read back as bytes
        with open(tmp_path, 'rb') as f:
            video_bytes = f.read()

        # Clean up
        Path(tmp_path).unlink()

        return video_bytes

    def unload_model(self):
        """Unload model to free VRAM."""
        if self.pipe is not None:
            print("[Mochi] Unloading model...")
            del self.pipe
            self.pipe = None
            torch.cuda.empty_cache()
            print(f"[Mochi] VRAM after unload: {torch.cuda.memory_allocated() / (1024**3):.2f} GB")


# Standalone test function
if __name__ == "__main__":
    print("Mochi Text-to-Video Direct Runner - Standalone Test")

    # Test initialization
    generator = MochiGenerator(models_path="/models")
    print("Generator initialized successfully")

    print("\nDefault settings:")
    print("- Frames: 84 (~2.8s @ 30fps)")
    print("- Steps: 200 (high quality)")
    print("- Cost: ~$0.125 per video")

    print("\nCost-optimized alternative:")
    print("- Frames: 49 (~1.6s @ 30fps)")
    print("- Steps: 100-150")
    print("- Cost: ~$0.06-0.08 per video")

    print("\nTo test generation:")
    print("1. Deploy to Modal: modal deploy backend/main.py")
    print("2. Call via API: POST /generate/video/text2video")
