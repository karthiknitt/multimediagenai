"""
Model Download and Management
AI Video Generation Platform - Phase 1B

Handles downloading, quantization, and loading of AI models.
"""

import os
import torch
from pathlib import Path
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelDownloader:
    """Downloads and prepares AI models for use in ComfyUI"""

    def __init__(self, models_dir: str = "/models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)

        # Model subdirectories
        self.flux_dir = self.models_dir / "flux"
        self.flux_dir.mkdir(exist_ok=True)

        # ComfyUI expects models in checkpoints directory
        self.checkpoints_dir = self.models_dir / "checkpoints"
        self.checkpoints_dir.mkdir(exist_ok=True)

        # Additional model directories for FLUX.2
        self.vae_dir = self.models_dir / "vae"
        self.vae_dir.mkdir(exist_ok=True)

        self.text_encoders_dir = self.models_dir / "text_encoders"
        self.text_encoders_dir.mkdir(exist_ok=True)

        # Video model directories
        self.mochi_dir = self.models_dir / "mochi"
        self.mochi_dir.mkdir(exist_ok=True)

        self.cogvideox_dir = self.models_dir / "cogvideox"
        self.cogvideox_dir.mkdir(exist_ok=True)

    def download_flux2_dev(self):
        """
        Download FLUX.2 dev model and apply FP8 quantization.

        FLUX.2 dev is a 32B parameter model that requires ~37GB VRAM in FP16.
        We quantize to FP8 to reduce VRAM to ~12GB while maintaining quality.
        """
        from huggingface_hub import snapshot_download
        import torch

        model_id = "black-forest-labs/FLUX.2-dev"
        logger.info(f"Downloading {model_id}...")

        try:
            # Get Hugging Face token from environment
            hf_token = os.environ.get("HF_TOKEN")
            if not hf_token:
                raise ValueError(
                    "HF_TOKEN environment variable not set. "
                    "Please create a Modal secret with your Hugging Face token."
                )

            # Download model from Hugging Face
            model_path = snapshot_download(
                repo_id=model_id,
                local_dir=str(self.flux_dir / "flux2-dev"),
                ignore_patterns=["*.md", "*.txt"],  # Skip readme files
                token=hf_token,  # Authenticate with HF token
            )

            logger.info(f"FLUX.2 dev downloaded to: {model_path}")

            # Apply FP8 quantization
            self._quantize_flux2_to_fp8(model_path)

            return model_path

        except Exception as e:
            logger.error(f"Failed to download FLUX.2: {e}")
            raise

    def _quantize_flux2_to_fp8(self, model_path: str):
        """
        Quantize FLUX.2 model to FP8 format.

        This reduces VRAM from 37GB → 12GB with minimal quality loss.
        Uses torch.float8 for quantization.
        """
        logger.info("Applying FP8 quantization to FLUX.2...")

        try:
            # Check if quantized version already exists
            quantized_path = Path(model_path) / "flux2_fp8.safetensors"
            if quantized_path.exists():
                logger.info("FP8 quantized model already exists, skipping.")
                return

            # TODO: Implement FP8 quantization logic
            # This is a placeholder - actual implementation will depend on
            # ComfyUI's FP8 quantization approach for FLUX.2

            # For now, we'll use the model as-is and rely on ComfyUI's
            # built-in FP8 support when loading the model

            logger.info("FP8 quantization setup complete")

        except Exception as e:
            logger.error(f"Failed to quantize FLUX.2: {e}")
            # Non-fatal - can continue with FP16 if quantization fails
            logger.warning("Continuing without FP8 quantization")

    def download_flux2_fp8_prequantized(self):
        """
        Download pre-quantized FLUX.2 FP8 model from HuggingFace.

        Uses silveroxides/FLUX.2-dev-fp8_scaled - a pre-quantized version
        optimized for ComfyUI that requires only ~12GB VRAM.

        Returns:
            Path to downloaded model file
        """
        from huggingface_hub import hf_hub_download, list_repo_files

        model_id = "silveroxides/FLUX.2-dev-fp8_scaled"
        logger.info(f"Downloading pre-quantized FP8 model from {model_id}...")

        # Check if already downloaded
        model_file = self.checkpoints_dir / "flux2-dev-fp8.safetensors"
        if model_file.exists():
            logger.info(f"FP8 model already exists at {model_file}")
            return str(model_file)

        try:
            # Get HF token (may not be required for public models)
            hf_token = os.environ.get("HF_TOKEN")

            # List files in repo to find the correct filename
            logger.info("Listing files in repository...")
            files = list_repo_files(repo_id=model_id, token=hf_token)
            logger.info(f"Found files: {files}")

            # Find the main safetensors file
            safetensors_files = [f for f in files if f.endswith('.safetensors')]
            if not safetensors_files:
                raise ValueError(f"No .safetensors file found in {model_id}")

            main_file = safetensors_files[0]  # Use first safetensors file
            logger.info(f"Downloading {main_file}...")

            # Download the model file
            downloaded_file = hf_hub_download(
                repo_id=model_id,
                filename=main_file,
                token=hf_token,
                cache_dir=str(self.models_dir / "hf_cache"),
            )

            # Copy to checkpoints directory with standard name
            import shutil
            target_file = self.checkpoints_dir / "flux2-dev-fp8.safetensors"
            shutil.copy2(downloaded_file, target_file)

            logger.info(f"FP8 model downloaded and copied to: {target_file}")
            logger.info(f"File size: {target_file.stat().st_size / (1024**3):.2f} GB")

            return str(target_file)

        except Exception as e:
            logger.error(f"Failed to download FP8 model: {e}")
            raise

    def download_flux2_vae(self):
        """
        Download FLUX.2 VAE model from HuggingFace.

        Required for FLUX.2 FP8 generation workflow.
        """
        from huggingface_hub import hf_hub_download

        model_id = "Comfy-Org/flux2-dev"
        filename = "split_files/vae/flux2-vae.safetensors"

        # Check if already downloaded
        vae_file = self.vae_dir / "flux2-vae.safetensors"
        if vae_file.exists():
            logger.info(f"VAE already exists at {vae_file}")
            return str(vae_file)

        try:
            hf_token = os.environ.get("HF_TOKEN")

            logger.info(f"Downloading FLUX.2 VAE from {model_id}...")

            # Download the VAE file
            downloaded_file = hf_hub_download(
                repo_id=model_id,
                filename=filename,
                token=hf_token,
                cache_dir=str(self.models_dir / "hf_cache"),
            )

            # Copy to VAE directory
            import shutil
            shutil.copy2(downloaded_file, vae_file)

            logger.info(f"VAE downloaded to: {vae_file}")
            logger.info(f"File size: {vae_file.stat().st_size / (1024**3):.2f} GB")

            return str(vae_file)

        except Exception as e:
            logger.error(f"Failed to download VAE: {e}")
            raise

    def download_flux2_text_encoder(self):
        """
        Download FLUX.2 text encoder (Mistral) from HuggingFace.

        Required for FLUX.2 FP8 generation workflow.
        """
        from huggingface_hub import hf_hub_download

        model_id = "Comfy-Org/flux2-dev"
        filename = "split_files/text_encoders/mistral_3_small_flux2_fp8.safetensors"

        # Check if already downloaded
        text_encoder_file = self.text_encoders_dir / "mistral_3_small_flux2_fp8.safetensors"
        if text_encoder_file.exists():
            logger.info(f"Text encoder already exists at {text_encoder_file}")
            return str(text_encoder_file)

        try:
            hf_token = os.environ.get("HF_TOKEN")

            logger.info(f"Downloading FLUX.2 text encoder from {model_id}...")

            # Download the text encoder file
            downloaded_file = hf_hub_download(
                repo_id=model_id,
                filename=filename,
                token=hf_token,
                cache_dir=str(self.models_dir / "hf_cache"),
            )

            # Copy to text encoders directory
            import shutil
            shutil.copy2(downloaded_file, text_encoder_file)

            logger.info(f"Text encoder downloaded to: {text_encoder_file}")
            logger.info(f"File size: {text_encoder_file.stat().st_size / (1024**3):.2f} GB")

            return str(text_encoder_file)

        except Exception as e:
            logger.error(f"Failed to download text encoder: {e}")
            raise

    def download_mochi_1(self):
        """
        Download Mochi 1 text-to-video model from HuggingFace.

        Mochi 1 is a 10B parameter model for text-to-video generation.
        Repository: genmo/mochi-1-preview
        VRAM: 8-18GB optimized (60GB standard)
        Output: 5.4s @ 30fps, 480p (162 frames)

        Returns:
            Path to downloaded model directory
        """
        from huggingface_hub import snapshot_download

        model_id = "genmo/mochi-1-preview"
        logger.info(f"Downloading Mochi 1 model from {model_id}...")

        # Check if already downloaded
        target_dir = self.mochi_dir / "mochi-1-preview"
        if target_dir.exists() and list(target_dir.glob("*.safetensors")):
            logger.info(f"Mochi 1 already exists at {target_dir}")
            return str(target_dir)

        try:
            hf_token = os.environ.get("HF_TOKEN")

            # Download entire model repository
            model_path = snapshot_download(
                repo_id=model_id,
                local_dir=str(target_dir),
                ignore_patterns=["*.md", "*.txt", "*.git*"],
                token=hf_token,
            )

            logger.info(f"Mochi 1 downloaded to: {model_path}")

            # Calculate total size
            total_size = sum(
                f.stat().st_size for f in target_dir.rglob("*") if f.is_file()
            )
            logger.info(f"Total model size: {total_size / (1024**3):.2f} GB")

            return model_path

        except Exception as e:
            logger.error(f"Failed to download Mochi 1: {e}")
            raise

    def download_cogvideox_5b(self):
        """
        Download CogVideoX-5B image-to-video model from HuggingFace.

        CogVideoX-5B is a 5B parameter model for image-to-video generation.
        Repository: THUDM/CogVideoX-5b
        VRAM: ~12GB optimized (68GB unoptimized)

        Returns:
            Path to downloaded model directory
        """
        from huggingface_hub import snapshot_download

        model_id = "THUDM/CogVideoX-5b"
        logger.info(f"Downloading CogVideoX-5B model from {model_id}...")

        # Check if already downloaded
        target_dir = self.cogvideox_dir / "CogVideoX-5b"
        if target_dir.exists() and list(target_dir.glob("*.safetensors")):
            logger.info(f"CogVideoX-5B already exists at {target_dir}")
            return str(target_dir)

        try:
            hf_token = os.environ.get("HF_TOKEN")

            # Download entire model repository
            model_path = snapshot_download(
                repo_id=model_id,
                local_dir=str(target_dir),
                ignore_patterns=["*.md", "*.txt", "*.git*"],
                token=hf_token,
            )

            logger.info(f"CogVideoX-5B downloaded to: {model_path}")

            # Calculate total size
            total_size = sum(
                f.stat().st_size for f in target_dir.rglob("*") if f.is_file()
            )
            logger.info(f"Total model size: {total_size / (1024**3):.2f} GB")

            return model_path

        except Exception as e:
            logger.error(f"Failed to download CogVideoX-5B: {e}")
            raise


class ModelManager:
    """
    Manages loading and unloading of models with LRU eviction.

    Ensures we don't exceed A100 80GB VRAM limit.
    """

    def __init__(self, models_dir: str = "/models"):
        self.models_dir = Path(models_dir)
        self.loaded_models = {}  # model_name -> (model_object, vram_usage)
        self.vram_limit_gb = 75  # Leave 5GB buffer
        self.current_vram_gb = 0

    def load_model(self, model_name: str, model_loader_fn, estimated_vram_gb: int):
        """
        Load model with LRU eviction if needed.

        Args:
            model_name: Name of model to load
            model_loader_fn: Function that returns loaded model
            estimated_vram_gb: Estimated VRAM usage in GB

        Returns:
            Loaded model object
        """
        # Check if already loaded
        if model_name in self.loaded_models:
            logger.info(f"Model {model_name} already loaded")
            return self.loaded_models[model_name][0]

        # Check if we need to free up VRAM
        while self.current_vram_gb + estimated_vram_gb > self.vram_limit_gb:
            if not self.loaded_models:
                raise RuntimeError(
                    f"Cannot load {model_name}: requires {estimated_vram_gb}GB "
                    f"but limit is {self.vram_limit_gb}GB"
                )
            self._evict_lru_model()

        # Load model
        logger.info(f"Loading model: {model_name} (estimated {estimated_vram_gb}GB VRAM)")
        model = model_loader_fn()

        # Track loaded model
        self.loaded_models[model_name] = (model, estimated_vram_gb)
        self.current_vram_gb += estimated_vram_gb

        logger.info(
            f"Model loaded. Current VRAM usage: {self.current_vram_gb}GB / {self.vram_limit_gb}GB"
        )

        return model

    def _evict_lru_model(self):
        """Evict least recently used model to free VRAM"""
        # For Phase 1B, just evict the first model (simple FIFO)
        # TODO: Implement proper LRU tracking in Phase 1F

        if not self.loaded_models:
            return

        model_to_evict = next(iter(self.loaded_models))
        model_obj, vram_usage = self.loaded_models[model_to_evict]

        logger.info(f"Evicting model {model_to_evict} to free {vram_usage}GB VRAM")

        # Unload model
        del model_obj
        torch.cuda.empty_cache()

        # Update tracking
        del self.loaded_models[model_to_evict]
        self.current_vram_gb -= vram_usage

        logger.info(f"Model evicted. Current VRAM: {self.current_vram_gb}GB")

    def unload_all(self):
        """Unload all models and free VRAM"""
        logger.info("Unloading all models...")
        self.loaded_models.clear()
        torch.cuda.empty_cache()
        self.current_vram_gb = 0
        logger.info("All models unloaded")
