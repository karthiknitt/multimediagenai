"""
ComfyUI Runner V2 - Fixed workflow execution using proper ComfyUI API
Based on official ComfyUI documentation
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


class ComfyUIRunnerV2:
    """
    Executes ComfyUI workflows in headless mode using the proper execution API.
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

        # CRITICAL FIX: Create mock utils package BEFORE adding ComfyUI to path
        # This prevents VideoHelperSuite and KJNodes from finding comfy/utils.py instead
        import types
        if 'utils' not in sys.modules:
            # Create mock utils package
            utils_module = types.ModuleType('utils')

            # Mock utils.install_util
            install_util = types.ModuleType('install_util')
            install_util.get_missing_requirements_message = lambda x: ""
            install_util.requirements_path = str(self.comfyui_path / "requirements.txt")
            setattr(utils_module, 'install_util', install_util)
            sys.modules['utils.install_util'] = install_util

            # Mock utils.json_util
            json_util = types.ModuleType('json_util')
            json_util.merge_json_recursive = lambda a, b: {**a, **b}  # Simple merge
            setattr(utils_module, 'json_util', json_util)
            sys.modules['utils.json_util'] = json_util

            # Register the main utils module
            sys.modules['utils'] = utils_module
            logger.info("Created mock utils package for headless mode")

        # Add ComfyUI to Python path AFTER mock utils is registered
        sys.path.insert(0, str(self.comfyui_path))

        # Configure ComfyUI model paths
        self._configure_model_paths()

    def _configure_model_paths(self):
        """Configure ComfyUI to find our models"""
        try:
            import folder_paths

            # CRITICAL: Load custom nodes first
            self._load_custom_nodes()

            # Add our model directories to ComfyUI's search paths
            checkpoints_dir = self.models_path / "checkpoints"
            if checkpoints_dir.exists():
                folder_paths.add_model_folder_path("checkpoints", str(checkpoints_dir))
                folder_paths.add_model_folder_path("unet", str(checkpoints_dir))
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

            logger.info("ComfyUI model paths configured")
        except ImportError as e:
            logger.warning(f"ComfyUI modules not yet available: {e}")

    def _load_custom_nodes(self):
        """Load all ComfyUI custom nodes by importing their __init__.py files"""
        try:
            import nodes
            import importlib.util

            # Pre-import ComfyUI core modules to ensure they're available
            try:
                import comfy
                import comfy.utils
                import execution
                import folder_paths
                logger.info("ComfyUI core modules loaded successfully")
            except Exception as e:
                logger.warning(f"Some ComfyUI core modules unavailable: {e}")

            # Mock PromptServer for headless mode (needed by VideoHelperSuite)
            # MUST be done BEFORE importing server module
            try:
                # Create mock classes first
                class MockPromptQueue:
                    def __init__(self):
                        self.currently_running = {}

                    def get_current_queue(self):
                        return ([], {})

                    def put(self, item):
                        pass  # No-op for headless mode

                # Create mock routes for registering endpoints
                class MockRoutes:
                    def get(self, path):
                        # Return a no-op decorator
                        def decorator(func):
                            return func
                        return decorator

                    def post(self, path):
                        def decorator(func):
                            return func
                        return decorator

                # Create mock PromptServer instance
                class MockPromptServer:
                    def __init__(self):
                        self.prompt_queue = MockPromptQueue()
                        self.routes = MockRoutes()

                    def send_sync(self, *args, **kwargs):
                        pass  # No-op for headless mode

                # Now import server and set the mock instance
                import server
                if not hasattr(server.PromptServer, 'instance'):
                    server.PromptServer.instance = MockPromptServer()
                    logger.info("Created mock PromptServer.instance for headless mode")
                else:
                    # Instance exists but might not have routes, add them
                    if not hasattr(server.PromptServer.instance, 'routes'):
                        server.PromptServer.instance.routes = MockRoutes()
                        logger.info("Added mock routes to existing PromptServer.instance")
                    if not hasattr(server.PromptServer.instance, 'prompt_queue'):
                        server.PromptServer.instance.prompt_queue = MockPromptQueue()
                        logger.info("Added mock prompt_queue to existing PromptServer.instance")
            except Exception as e:
                logger.warning(f"Could not create mock PromptServer: {e}")
                import traceback
                traceback.print_exc()

            custom_nodes_dir = self.comfyui_path / "custom_nodes"
            if not custom_nodes_dir.exists():
                logger.warning(f"Custom nodes directory not found: {custom_nodes_dir}")
                return

            critical_nodes = ["ComfyUI-MochiWrapper", "ComfyUI-CogVideoXWrapper", "ComfyUI-VideoHelperSuite", "ComfyUI-KJNodes"]

            for node_name in critical_nodes:
                node_dir = custom_nodes_dir / node_name
                init_file = node_dir / "__init__.py"

                if init_file.exists():
                    try:
                        spec = importlib.util.spec_from_file_location(node_name, init_file)
                        if spec and spec.loader:
                            module = importlib.util.module_from_spec(spec)
                            sys.modules[node_name] = module
                            spec.loader.exec_module(module)
                            logger.info(f"Loaded custom node: {node_name}")

                            if hasattr(module, 'NODE_CLASS_MAPPINGS'):
                                if not hasattr(nodes, 'NODE_CLASS_MAPPINGS'):
                                    nodes.NODE_CLASS_MAPPINGS = {}
                                nodes.NODE_CLASS_MAPPINGS.update(module.NODE_CLASS_MAPPINGS)
                                logger.info(f"  Registered {len(module.NODE_CLASS_MAPPINGS)} nodes from {node_name}")

                            if hasattr(module, 'NODE_DISPLAY_NAME_MAPPINGS'):
                                if not hasattr(nodes, 'NODE_DISPLAY_NAME_MAPPINGS'):
                                    nodes.NODE_DISPLAY_NAME_MAPPINGS = {}
                                nodes.NODE_DISPLAY_NAME_MAPPINGS.update(module.NODE_DISPLAY_NAME_MAPPINGS)

                    except Exception as e:
                        logger.error(f"Failed to load {node_name}: {e}")
                        import traceback
                        traceback.print_exc()

            if hasattr(nodes, 'NODE_CLASS_MAPPINGS'):
                mochi_nodes = [k for k in nodes.NODE_CLASS_MAPPINGS.keys() if 'Mochi' in k]
                logger.info(f"Total nodes registered: {len(nodes.NODE_CLASS_MAPPINGS)}")
                if mochi_nodes:
                    logger.info(f"SUCCESS: Mochi nodes loaded: {mochi_nodes}")
                else:
                    logger.error("ERROR: No Mochi nodes found!")
        except Exception as e:
            logger.error(f"Fatal error loading custom nodes: {e}")
            import traceback
            traceback.print_exc()

    def load_workflow(self, workflow_name: str) -> Dict[str, Any]:
        """Load a workflow JSON file"""
        workflow_file = self.workflows_path / f"{workflow_name}.json"

        if not workflow_file.exists():
            raise FileNotFoundError(f"Workflow not found: {workflow_file}")

        with open(workflow_file, 'r') as f:
            workflow = json.load(f)

        logger.info(f"Loaded workflow: {workflow_name}")
        return workflow

    def convert_workflow_to_api_format(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert ComfyUI workflow from UI export format to API format.

        UI format has 'nodes' array with links, API format needs dict with node IDs as keys
        and inputs as dict mapping names to values/connections.
        """
        if "nodes" not in workflow:
            # Already in API format
            return workflow

        nodes = workflow["nodes"]
        links = workflow.get("links", [])

        # Build link lookup table: link_id -> (from_node_id, from_slot)
        link_map = {}
        for link in links:
            if len(link) >= 5:
                link_id, from_node, from_slot, to_node, to_slot = link[:5]
                link_map[link_id] = (str(from_node), from_slot)

        # Convert nodes array to API dict format
        api_workflow = {}
        for node in nodes:
            node_id = str(node["id"])
            class_type = node["type"]

            # Build inputs dict from links and widget values
            inputs_dict = {}

            # Process input connections (from links)
            input_list = node.get("inputs", [])
            for inp in input_list:
                if isinstance(inp, dict):
                    link_id = inp.get("link")
                    if link_id and link_id in link_map:
                        from_node_id, from_slot = link_map[link_id]
                        inputs_dict[inp["name"]] = [from_node_id, from_slot]

            # Process widget values (parameters)
            widgets = node.get("widgets_values", [])
            if widgets and class_type:
                # Map widgets to input names based on node type
                # For most nodes, widgets are positional parameters
                # We'll add them with generic names if not already in inputs
                for i, val in enumerate(widgets):
                    # Try to find widget input name from the node definition
                    # For now, use generic names
                    widget_key = f"widget_{i}"
                    if widget_key not in inputs_dict:
                        inputs_dict[widget_key] = val

            api_workflow[node_id] = {
                "class_type": class_type,
                "inputs": inputs_dict
            }

        logger.info(f"Converted workflow with {len(api_workflow)} nodes to API format")
        return api_workflow

    def substitute_parameters(
        self,
        workflow: Dict[str, Any],
        prompt: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Substitute parameters into workflow JSON"""
        # Deep copy to avoid modifying original
        workflow = json.loads(json.dumps(workflow))

        for node_id, node in workflow.items():
            class_type = node.get("class_type", "")

            # Update prompt nodes
            if class_type in ["CLIPTextEncode", "TextEncode"]:
                if "inputs" in node and "text" in node["inputs"]:
                    node["inputs"]["text"] = prompt

            # Update sampler nodes
            if class_type in ["KSampler", "KSamplerAdvanced"]:
                if "inputs" in node:
                    node["inputs"]["steps"] = parameters.get("steps", 20)
                    node["inputs"]["cfg"] = parameters.get("cfg_scale", 1.0)
                    if parameters.get("seed") is not None:
                        node["inputs"]["seed"] = parameters["seed"]

            # Update scheduler nodes (new workflow)
            if class_type == "BasicScheduler":
                if "inputs" in node:
                    node["inputs"]["steps"] = parameters.get("steps", 20)

            # Update random noise seed
            if class_type == "RandomNoise":
                if "inputs" in node:
                    if parameters.get("seed") is not None:
                        node["inputs"]["noise_seed"] = parameters["seed"]

            # Update empty latent (resolution)
            if class_type == "EmptyLatentImage":
                if "inputs" in node:
                    node["inputs"]["width"] = parameters.get("width", 1024)
                    node["inputs"]["height"] = parameters.get("height", 1024)

        logger.info("Parameters substituted into workflow")
        return workflow

    def execute_workflow_properly(
        self,
        workflow: Dict[str, Any],
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Execute workflow using proper ComfyUI execution queue.
        Based on official ComfyUI API documentation.
        """
        try:
            # Import ComfyUI modules
            import execution
            import nodes
            import folder_paths
            from comfy.cli_args import args

            # Set output directory
            folder_paths.set_output_directory(str(self.output_path))
            logger.info(f"Output directory set to: {self.output_path}")

            if progress_callback:
                progress_callback(0.1)

            # Create prompt ID
            prompt_id = str(uuid.uuid4())

            # Create server mock for headless execution
            class ProgressTracker:
                def __init__(self, callback):
                    self.callback = callback
                    self.last_progress = 0

                def send_sync(self, event, data, sid=None):
                    if event == "executing":
                        node = data.get("node")
                        if node:
                            logger.info(f"Executing node: {node}")
                    elif event == "progress":
                        value = data.get("value", 0)
                        max_val = data.get("max", 100)
                        if max_val > 0:
                            progress = int((value / max_val) * 100)
                            if progress != self.last_progress:
                                logger.info(f"Progress: {progress}%")
                                self.last_progress = progress
                                if self.callback:
                                    # Map to 10-80% range
                                    self.callback(0.1 + (progress / 100) * 0.7)

                def send(self, event, data, sid=None):
                    self.send_sync(event, data, sid)

            tracker = ProgressTracker(progress_callback)

            # Execute using PromptExecutor
            # Must initialize cache_args before execution to avoid NoneType error
            executor = execution.PromptExecutor(server=tracker)

            # Set cache args manually if needed
            if not hasattr(executor, 'cache_args') or executor.cache_args is None:
                executor.cache_args = {
                    'ram': 1024 * 1024 * 1024,  # 1GB headroom
                    'vram': 512 * 1024 * 1024   # 512MB headroom
                }

            if progress_callback:
                progress_callback(0.2)

            logger.info(f"Executing workflow (prompt_id: {prompt_id})...")

            # Execute the workflow
            # CRITICAL FIX: Must pass list of output node IDs to execute
            # The old code passed empty list [] which told ComfyUI to execute nothing!
            outputs_to_execute = list(workflow.keys())
            logger.info(f"Output nodes to execute: {outputs_to_execute}")

            executor.execute(workflow, prompt_id, {}, outputs_to_execute)

            logger.info("Workflow execution completed")

            if progress_callback:
                progress_callback(0.9)

            # Find generated output files
            logger.info(f"Searching for output files in: {self.output_path}")

            # ComfyUI saves files in output directory with timestamp
            output_files = sorted(
                self.output_path.glob("**/*.png"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )

            logger.info(f"Found {len(output_files)} PNG files")

            if output_files:
                output_file = output_files[0]  # Most recent
                logger.info(f"Selected output: {output_file}")

                if progress_callback:
                    progress_callback(1.0)

                return str(output_file)
            else:
                # Check all files for debugging
                all_files = list(self.output_path.glob("**/*"))
                logger.error(f"No PNG files found. All files: {all_files}")
                raise FileNotFoundError(f"No output generated in {self.output_path}")

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            import traceback
            traceback.print_exc()
            raise

    def generate_image(
        self,
        prompt: str,
        parameters: Dict[str, Any],
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        High-level method to generate an image.
        """
        # Use the classic KSampler workflow (most compatible)
        try:
            workflow = self.load_workflow("flux2_classic")
            logger.info("Using flux2_classic workflow")
        except FileNotFoundError:
            try:
                workflow = self.load_workflow("flux2_simple")
                logger.info("Using flux2_simple workflow")
            except FileNotFoundError:
                workflow = self.load_workflow("flux2_fp8_official")
                logger.info("Using flux2_fp8_official workflow")

        # Substitute parameters
        workflow = self.substitute_parameters(workflow, prompt, parameters)

        # Execute workflow
        output_path = self.execute_workflow_properly(workflow, progress_callback)

        return output_path

    def load_model(self, model_name: str):
        """Load a specific model"""
        logger.info(f"Model loading handled by ComfyUI: {model_name}")
