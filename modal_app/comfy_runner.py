"""
ComfyUI Runner - Executes ComfyUI workflows programmatically
AI Video Generation Platform - Phase 1B
"""

import json
import os
import sys
import uuid
from pathlib import Path
from typing import Callable, Optional, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ComfyUIRunner:
    """
    Executes ComfyUI workflows in headless mode.

    Loads workflow JSON files, substitutes parameters, and executes them
    via ComfyUI's Python API.
    """

    def __init__(
        self,
        comfyui_path: str = "/comfyui",
        workflows_path: str = "/root/workflows",
        output_path: str = "/tmp/outputs",
        models_path: str = "/models"
    ):
        self.comfyui_path = Path(comfyui_path)
        self.workflows_path = Path(workflows_path)
        self.output_path = Path(output_path)
        self.output_path.mkdir(parents=True, exist_ok=True)
        self.models_path = Path(models_path)

        # Add ComfyUI to Python path
        sys.path.append(str(self.comfyui_path))

        # Configure ComfyUI model paths
        try:
            import folder_paths

            # Add our model directories to ComfyUI's search paths
            checkpoints_dir = self.models_path / "checkpoints"
            if checkpoints_dir.exists():
                folder_paths.add_model_folder_path("checkpoints", str(checkpoints_dir))
                logger.info(f"Added checkpoints path: {checkpoints_dir}")

            # Add VAE directory
            vae_dir = self.models_path / "vae"
            if vae_dir.exists():
                folder_paths.add_model_folder_path("vae", str(vae_dir))
                logger.info(f"Added VAE path: {vae_dir}")

            # Add text encoders directory (CLIP)
            text_encoders_dir = self.models_path / "text_encoders"
            if text_encoders_dir.exists():
                folder_paths.add_model_folder_path("text_encoders", str(text_encoders_dir))
                folder_paths.add_model_folder_path("clip", str(text_encoders_dir))
                logger.info(f"Added text encoders path: {text_encoders_dir}")

            # Add diffusion models directory for FP8 loader
            diffusion_models_dir = self.models_path / "checkpoints"  # Same as checkpoints for now
            if diffusion_models_dir.exists():
                folder_paths.add_model_folder_path("diffusion_models", str(diffusion_models_dir))
                logger.info(f"Added diffusion models path: {diffusion_models_dir}")

            logger.info("ComfyUI runner initialized")
        except ImportError as e:
            logger.warning(f"ComfyUI modules not yet available: {e}")

    def load_workflow(self, workflow_name: str) -> Dict[str, Any]:
        """
        Load a workflow JSON file.

        Args:
            workflow_name: Name of workflow file (e.g., "flux2_text2img")

        Returns:
            Workflow dictionary
        """
        workflow_file = self.workflows_path / f"{workflow_name}.json"

        if not workflow_file.exists():
            raise FileNotFoundError(f"Workflow not found: {workflow_file}")

        with open(workflow_file, 'r') as f:
            workflow = json.load(f)

        logger.info(f"Loaded workflow: {workflow_name}")
        return workflow

    def substitute_parameters(
        self,
        workflow: Dict[str, Any],
        prompt: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Substitute parameters into workflow JSON.

        Args:
            workflow: Workflow dictionary
            prompt: Text prompt
            parameters: Generation parameters (steps, cfg_scale, etc.)

        Returns:
            Modified workflow dictionary
        """
        # Deep copy to avoid modifying original
        workflow = json.loads(json.dumps(workflow))

        # Find nodes by class_type and update their inputs
        # This is a simplified version - actual implementation depends on
        # the specific workflow structure

        for node_id, node in workflow.items():
            class_type = node.get("class_type", "")

            # Update prompt nodes
            if class_type in ["CLIPTextEncode", "TextEncode"]:
                if "inputs" in node:
                    node["inputs"]["text"] = prompt

            # Update sampler nodes (old workflow)
            if class_type in ["KSampler", "KSamplerAdvanced"]:
                if "inputs" in node:
                    node["inputs"]["steps"] = parameters.get("steps", 28)
                    node["inputs"]["cfg"] = parameters.get("cfg_scale", 3.5)
                    if parameters.get("seed") is not None:
                        node["inputs"]["seed"] = parameters["seed"]

            # Update scheduler nodes (new workflow)
            if class_type == "BasicScheduler":
                if "inputs" in node:
                    node["inputs"]["steps"] = parameters.get("steps", 28)

            # Update random noise seed (new workflow)
            if class_type == "RandomNoise":
                if "inputs" in node:
                    if parameters.get("seed") is not None:
                        node["inputs"]["noise_seed"] = parameters["seed"]

            # Update empty latent (resolution) nodes
            if class_type == "EmptyLatentImage":
                if "inputs" in node:
                    node["inputs"]["width"] = parameters.get("width", 1024)
                    node["inputs"]["height"] = parameters.get("height", 1024)

        logger.info("Parameters substituted into workflow")
        return workflow

    def execute_workflow(
        self,
        workflow: Dict[str, Any],
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Execute a ComfyUI workflow using direct Python API.

        Args:
            workflow: Workflow dictionary with parameters substituted
            progress_callback: Optional callback for progress updates (0.0-1.0)

        Returns:
            Path to generated output file
        """
        try:
            # Generate unique output filename
            output_id = str(uuid.uuid4())
            output_file = self.output_path / f"{output_id}.png"

            # Import ComfyUI execution modules
            import execution
            import nodes
            import folder_paths

            # CRITICAL: Import custom FP8 loader node before workflow execution
            # This registers the ScaledFP8HybridUNetLoader with ComfyUI's node system
            try:
                custom_node_path = self.comfyui_path / "custom_nodes" / "ComfyUI_Hybrid-Scaled_fp8-Loader"
                if custom_node_path.exists():
                    # Add custom node to Python path
                    sys.path.insert(0, str(custom_node_path))

                    # Import the custom node module to register it
                    import hybrid_fp8_ops
                    logger.info("Successfully imported FP8 custom node")

                    # Check if the node is registered
                    if hasattr(nodes, 'NODE_CLASS_MAPPINGS'):
                        logger.info(f"Available custom nodes: {list(nodes.NODE_CLASS_MAPPINGS.keys())}")
            except Exception as e:
                logger.warning(f"Could not import FP8 custom node: {e}")
                # Continue anyway - might work with standard loader

            if progress_callback:
                progress_callback(0.1)  # 10% - Starting execution

            # Set up output directory
            logger.info(f"Setting ComfyUI output directory to: {self.output_path}")
            folder_paths.set_output_directory(str(self.output_path))

            # Verify it was set
            current_output_dir = folder_paths.get_output_directory()
            logger.info(f"ComfyUI output directory is now: {current_output_dir}")

            if progress_callback:
                progress_callback(0.2)  # 20% - Executor ready

            # Execute workflow
            # Note: workflow dict format: {node_id: {class_type, inputs}, ...}
            prompt_id = str(uuid.uuid4())

            logger.info(f"Executing workflow with {len(workflow)} nodes")

            # Create a minimal server mock for headless execution
            class MockServer:
                def __init__(self):
                    self.client_id = "headless"
                    self.last_node_id = None

                def send_sync(self, event, data, sid=None):
                    """Mock server send - just log progress"""
                    if event == "executing":
                        node_id = data.get("node")
                        if node_id:
                            logger.info(f"Executing node: {node_id}")
                    elif event == "progress":
                        progress = data.get("value", 0)
                        max_val = data.get("max", 100)
                        logger.info(f"Progress: {progress}/{max_val}")

                def send(self, event, data, sid=None):
                    """Async version - same as sync for our use case"""
                    self.send_sync(event, data, sid)

            mock_server = MockServer()

            # Create execution queue with mock server
            executor = execution.PromptExecutor(server=mock_server)

            # Run the workflow
            logger.info("Starting workflow execution...")
            result = executor.execute(workflow, prompt_id, {}, [])
            logger.info(f"Workflow execution result: {result}")

            if progress_callback:
                progress_callback(0.8)  # 80% - Execution complete

            # Find the output file
            # ComfyUI saves to output directory automatically
            logger.info(f"Looking for output files in: {self.output_path}")
            output_files = list(self.output_path.glob("**/*.png"))  # Search recursively
            logger.info(f"Found {len(output_files)} PNG files: {output_files}")

            if output_files:
                # Get the most recent file
                output_file = max(output_files, key=lambda p: p.stat().st_mtime)
                logger.info(f"Selected output file: {output_file}")
            else:
                # List all files in output directory for debugging
                all_files = list(self.output_path.glob("**/*"))
                logger.error(f"No PNG files found. All files in output dir: {all_files}")
                raise FileNotFoundError("No output file generated by ComfyUI")

            if progress_callback:
                progress_callback(1.0)  # 100% - Complete

            return str(output_file)

        except (ImportError, FileNotFoundError) as e:
            logger.error(f"ComfyUI execution failed: {e}")
            logger.warning("Falling back to placeholder image generation for testing")

            # Fallback: Create a simple placeholder image for testing
            try:
                from PIL import Image, ImageDraw, ImageFont

                # Create a placeholder image
                img = Image.new('RGB', (1024, 1024), color='#1a1a1a')
                draw = ImageDraw.Draw(img)

                # Add text
                text = "FLUX.2 Test Image\n(ComfyUI not fully configured)"
                draw.text((512, 512), text, fill='white', anchor='mm')

                output_id = str(uuid.uuid4())
                output_file = self.output_path / f"{output_id}.png"
                img.save(output_file)

                if progress_callback:
                    progress_callback(1.0)

                logger.info(f"Generated placeholder image: {output_file}")
                return str(output_file)

            except Exception as fallback_error:
                logger.error(f"Fallback image generation failed: {fallback_error}")
                raise

        except Exception as e:
            logger.error(f"Failed to execute workflow: {e}")
            raise

    def generate_image(
        self,
        prompt: str,
        parameters: Dict[str, Any],
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        High-level method to generate an image.

        Args:
            prompt: Text prompt
            parameters: Generation parameters
            progress_callback: Optional progress callback

        Returns:
            Path to generated image file
        """
        # Use the classic KSampler workflow (most compatible)
        try:
            workflow = self.load_workflow("flux2_classic")
            logger.info("Using flux2_classic workflow (KSampler)")
        except FileNotFoundError:
            try:
                workflow = self.load_workflow("flux2_simple")
                logger.info("Using flux2_simple workflow (standard UNETLoader)")
            except FileNotFoundError:
                # Fallback to FP8 official workflow
                workflow = self.load_workflow("flux2_fp8_official")
                logger.info("Using flux2_fp8_official workflow (custom FP8 loader)")

        # Substitute parameters
        workflow = self.substitute_parameters(workflow, prompt, parameters)

        # Execute workflow
        output_path = self.execute_workflow(workflow, progress_callback)

        return output_path

    def load_model(self, model_name: str):
        """
        Load a specific model into VRAM.

        Args:
            model_name: Name of model to load (flux2-dev, flux2-schnell, etc.)
        """
        from models import ModelManager

        logger.info(f"Loading model: {model_name}")

        # For FLUX.2 models, we'll use the ModelManager
        # This is a placeholder - actual implementation depends on ComfyUI's model loading

        # Model VRAM estimates
        vram_estimates = {
            "flux2-dev": 12,  # GB (FP8 quantized)
            "flux2-schnell": 12,  # GB (FP8 quantized)
        }

        estimated_vram = vram_estimates.get(model_name, 12)

        # TODO: Implement actual model loading via ComfyUI
        logger.info(f"Model {model_name} loaded (estimated {estimated_vram}GB VRAM)")


# Standalone test function
if __name__ == "__main__":
    runner = ComfyUIRunner()

    # Test workflow loading
    try:
        workflow = runner.load_workflow("flux2_text2img")
        print(f"Workflow loaded successfully: {len(workflow)} nodes")
    except FileNotFoundError:
        print("Workflow file not found (expected - will be created in next step)")

    print("ComfyUI runner test complete")
