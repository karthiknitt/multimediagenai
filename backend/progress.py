"""
Progress Callback System for Inngest Integration
Emits progress events during AI model generation

Integrates with diffusers callback system to provide real-time updates
to frontend via Inngest SSE.
"""

from typing import Callable, Optional
import logging

logger = logging.getLogger(__name__)


class ProgressCallback:
    """
    Progress callback wrapper for AI model generation.

    Emits Inngest events at regular intervals during generation.
    """

    def __init__(
        self,
        job_id: str,
        total_steps: int,
        emit_func: Optional[Callable[[str, int, str], None]] = None,
        update_interval: int = 5  # Emit every N steps
    ):
        """
        Initialize progress callback.

        Args:
            job_id: Unique job identifier
            total_steps: Total number of inference steps
            emit_func: Function to emit progress events (job_id, progress, message)
            update_interval: Emit progress every N steps (default: 5)
        """
        self.job_id = job_id
        self.total_steps = total_steps
        self.emit_func = emit_func
        self.update_interval = update_interval
        self.last_emitted_step = -1

        logger.info(f"[Progress] Initialized for job {job_id} ({total_steps} steps)")

    def __call__(self, step: int, timestep=None, latents=None):
        """
        Callback function called by diffusers pipeline.

        Args:
            step: Current step number (0-indexed)
            timestep: Current timestep (optional, not used)
            latents: Current latents (optional, not used)
        """
        # Calculate progress percentage
        progress = int((step / self.total_steps) * 100)

        # Emit only at intervals to avoid spam
        if step - self.last_emitted_step >= self.update_interval or step == self.total_steps - 1:
            self._emit(progress, f"Step {step+1}/{self.total_steps}")
            self.last_emitted_step = step

    def _emit(self, progress: int, message: str):
        """
        Emit progress event via Inngest.

        Args:
            progress: Progress percentage (0-100)
            message: Progress message
        """
        if self.emit_func:
            try:
                self.emit_func(self.job_id, progress, message)
                logger.debug(f"[Progress] {self.job_id}: {progress}% - {message}")
            except Exception as e:
                logger.error(f"[Progress] Failed to emit event: {e}")
        else:
            # Fallback: just log
            logger.info(f"[Progress] {self.job_id}: {progress}% - {message}")

    def emit_start(self, message: str = "Starting generation"):
        """Emit progress at start (0%)."""
        self._emit(0, message)

    def emit_complete(self, message: str = "Generation complete"):
        """Emit progress at completion (100%)."""
        self._emit(100, message)

    def emit_custom(self, progress: int, message: str):
        """Emit custom progress update."""
        self._emit(progress, message)


def create_diffusers_callback(
    job_id: str,
    total_steps: int,
    emit_func: Optional[Callable[[str, int, str], None]] = None,
    update_interval: int = 5
) -> Callable:
    """
    Factory function to create a diffusers-compatible callback.

    Args:
        job_id: Unique job identifier
        total_steps: Total number of inference steps
        emit_func: Function to emit progress events
        update_interval: Emit progress every N steps

    Returns:
        Callback function compatible with diffusers pipelines
    """
    callback = ProgressCallback(
        job_id=job_id,
        total_steps=total_steps,
        emit_func=emit_func,
        update_interval=update_interval
    )

    return callback


def create_simple_callback(job_id: str, total_steps: int) -> Callable:
    """
    Create a simple logging-only callback (no Inngest).

    Useful for testing without full infrastructure.

    Args:
        job_id: Unique job identifier
        total_steps: Total number of inference steps

    Returns:
        Callback function that logs progress
    """
    return create_diffusers_callback(
        job_id=job_id,
        total_steps=total_steps,
        emit_func=None  # No emission, just logging
    )


# Standalone test
if __name__ == "__main__":
    import time

    print("Progress Callback - Standalone Test")
    print("=" * 60)

    # Test callback (no Inngest integration)
    callback = create_simple_callback(job_id="test-123", total_steps=50)

    print("\nSimulating generation with 50 steps...")
    print("(Progress emitted every 5 steps)\n")

    callback.emit_start("Initializing model...")

    for step in range(50):
        # Simulate step
        time.sleep(0.01)

        # Call callback (diffusers will call this automatically)
        callback(step, None, None)

    callback.emit_complete("All done!")

    print("\n" + "=" * 60)
    print("Test complete! In production, this integrates with Inngest.")
    print("\nIntegration example:")
    print("""
    from events import emit_progress
    from progress import create_diffusers_callback

    # Create callback with Inngest integration
    callback = create_diffusers_callback(
        job_id=job_id,
        total_steps=50,
        emit_func=emit_progress
    )

    # Use with diffusers pipeline
    pipe(
        prompt=prompt,
        num_inference_steps=50,
        callback_on_step_end=callback,
        callback_on_step_end_tensor_inputs=["latents"]
    )
    """)
