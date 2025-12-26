"""
Model Manager with LRU Eviction
Handles lazy loading and VRAM management for multiple AI models on A100 80GB

VRAM Budget (A100 80GB):
- FLUX.2: 15GB (FP8 quantized)
- Mochi: 22GB (with CPU offload + VAE tiling)
- CogVideoX: 5GB (with optimizations)
- MusicGen: 16GB

Feasible Combinations:
- FLUX + CogVideoX: 20GB ✅
- Mochi + MusicGen: 38GB ✅
- FLUX + CogVideoX + MusicGen: 36GB ✅
- All 4 models: 58GB ✅ (tight but doable)
"""

import torch
import time
from typing import Dict, Optional, Literal
from collections import OrderedDict

ModelType = Literal["flux2", "mochi", "cogvideox", "musicgen"]


class ModelManager:
    """
    Lazy-loading model manager with LRU eviction.

    Automatically loads models on-demand and evicts least-recently-used
    models when VRAM is insufficient.
    """

    def __init__(
        self,
        models_path: str = "/models",
        max_vram_gb: int = 80  # A100 80GB
    ):
        """
        Initialize model manager.

        Args:
            models_path: Path to Modal Volume with models
            max_vram_gb: Maximum VRAM available (default: 80 for A100)
        """
        self.models_path = models_path
        self.max_vram = max_vram_gb

        # LRU cache: {model_name: {instance, last_used}}
        self.loaded_models: OrderedDict[str, Dict] = OrderedDict()

        # VRAM estimates (GB) - conservative estimates
        self.model_vram = {
            "flux2": 15,      # 14.8GB actual with FP8
            "mochi": 22,      # With CPU offload + VAE tiling
            "cogvideox": 5,   # With BF16 optimizations
            "musicgen": 16    # Standard
        }

        print(f"[ModelManager] Initialized (max VRAM: {max_vram_gb}GB)")

    def get_current_vram_usage(self) -> float:
        """
        Get current VRAM usage in GB.

        Returns:
            VRAM usage in gigabytes
        """
        if not torch.cuda.is_available():
            return 0.0
        return torch.cuda.memory_allocated() / (1024**3)

    def get_estimated_vram(self) -> float:
        """
        Get estimated VRAM based on loaded models.

        Returns:
            Estimated VRAM in GB
        """
        total = 0.0
        for model_name in self.loaded_models:
            total += self.model_vram.get(model_name, 0)
        return total

    def evict_lru_model(self):
        """
        Evict the least-recently-used model to free VRAM.

        Uses FIFO (first item in OrderedDict is oldest).
        """
        if not self.loaded_models:
            print("[ModelManager] No models to evict")
            return

        # Get LRU model (first item in OrderedDict)
        lru_model_name = next(iter(self.loaded_models))
        lru_model_data = self.loaded_models[lru_model_name]

        print(f"[ModelManager] Evicting LRU model: {lru_model_name}")
        print(f"[ModelManager] Last used: {time.time() - lru_model_data['last_used']:.1f}s ago")

        # Unload model
        generator = lru_model_data['instance']
        generator.unload_model()

        # Remove from cache
        del self.loaded_models[lru_model_name]

        # Force garbage collection
        torch.cuda.empty_cache()

        print(f"[ModelManager] Eviction complete. VRAM: {self.get_current_vram_usage():.2f}GB")

    def load_model(self, model_type: ModelType):
        """
        Load model with automatic LRU eviction if needed.

        Args:
            model_type: Type of model to load (flux2, mochi, cogvideox, musicgen)

        Returns:
            Model generator instance
        """
        # Check if already loaded
        if model_type in self.loaded_models:
            print(f"[ModelManager] Model '{model_type}' already loaded (cache hit)")
            # Move to end (mark as most recently used)
            self.loaded_models.move_to_end(model_type)
            self.loaded_models[model_type]['last_used'] = time.time()
            return self.loaded_models[model_type]['instance']

        print(f"[ModelManager] Loading model: {model_type}")

        # Check if we need to evict models
        required_vram = self.model_vram[model_type]
        estimated_usage = self.get_estimated_vram()

        print(f"[ModelManager] Current VRAM estimate: {estimated_usage:.1f}GB")
        print(f"[ModelManager] Required for {model_type}: {required_vram}GB")
        print(f"[ModelManager] Total if loaded: {estimated_usage + required_vram:.1f}GB / {self.max_vram}GB")

        # Evict models until we have enough VRAM
        while (estimated_usage + required_vram) > self.max_vram:
            if not self.loaded_models:
                print(f"[ModelManager] WARNING: No models to evict but need {required_vram}GB")
                break

            print(f"[ModelManager] Insufficient VRAM, evicting LRU model...")
            self.evict_lru_model()
            estimated_usage = self.get_estimated_vram()

        # Load the requested model
        generator = self._instantiate_model(model_type)
        generator.load_model()

        # Add to cache (at the end, most recently used)
        self.loaded_models[model_type] = {
            'instance': generator,
            'last_used': time.time()
        }

        actual_vram = self.get_current_vram_usage()
        print(f"[ModelManager] Model '{model_type}' loaded successfully")
        print(f"[ModelManager] Actual VRAM: {actual_vram:.2f}GB")
        print(f"[ModelManager] Loaded models: {list(self.loaded_models.keys())}")

        return generator

    def _instantiate_model(self, model_type: ModelType):
        """
        Instantiate model generator (without loading weights yet).

        Args:
            model_type: Type of model to instantiate

        Returns:
            Model generator instance (unloaded)
        """
        if model_type == "flux2":
            from models.flux2_runner import Flux2Generator
            return Flux2Generator(models_path=self.models_path, compile_model=True)

        elif model_type == "mochi":
            from models.mochi_runner import MochiGenerator
            return MochiGenerator(models_path=self.models_path)

        elif model_type == "cogvideox":
            from models.cogvideox_runner import CogVideoXGenerator
            # Use FP16 for 2x speedup
            return CogVideoXGenerator(models_path=self.models_path, use_fp16=True)

        elif model_type == "musicgen":
            from models.musicgen_runner import MusicGenGenerator
            return MusicGenGenerator(models_path=self.models_path)

        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def unload_all(self):
        """Unload all models and free VRAM."""
        print("[ModelManager] Unloading all models...")

        for model_name, model_data in list(self.loaded_models.items()):
            generator = model_data['instance']
            generator.unload_model()

        self.loaded_models.clear()
        torch.cuda.empty_cache()

        print(f"[ModelManager] All models unloaded. VRAM: {self.get_current_vram_usage():.2f}GB")

    def get_status(self) -> dict:
        """
        Get current status of model manager.

        Returns:
            Dictionary with status information
        """
        return {
            "loaded_models": list(self.loaded_models.keys()),
            "vram_usage_gb": self.get_current_vram_usage(),
            "estimated_vram_gb": self.get_estimated_vram(),
            "max_vram_gb": self.max_vram,
            "available_vram_gb": self.max_vram - self.get_estimated_vram()
        }


# Standalone test
if __name__ == "__main__":
    print("Model Manager - Standalone Test")
    print("=" * 60)

    # Initialize manager
    manager = ModelManager(models_path="/models", max_vram_gb=80)

    print("\nVRAM Budget Analysis:")
    print("-" * 60)
    for model, vram in manager.model_vram.items():
        print(f"  {model:12s}: {vram:2d}GB")

    print("\nFeasible Combinations:")
    print("-" * 60)
    combinations = [
        ("FLUX + CogVideoX", ["flux2", "cogvideox"]),
        ("Mochi + MusicGen", ["mochi", "musicgen"]),
        ("FLUX + CogVideoX + MusicGen", ["flux2", "cogvideox", "musicgen"]),
        ("All 4 models", ["flux2", "mochi", "cogvideox", "musicgen"]),
    ]

    for name, models in combinations:
        total = sum(manager.model_vram[m] for m in models)
        status = "✅" if total <= 80 else "❌"
        print(f"  {name:30s}: {total:2d}GB / 80GB {status}")

    print("\nTo test with actual models:")
    print("1. Deploy to Modal: modal deploy backend/main.py")
    print("2. Watch VRAM management in action via logs")
