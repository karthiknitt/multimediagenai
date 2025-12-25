"""
Inngest Event Emission
AI Video Generation Platform - Phase 1B

Emits events to Inngest for progress tracking and job orchestration.
"""

import os
import httpx
import time
import logging
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InngestClient:
    """Client for emitting events to Inngest"""

    def __init__(self):
        self.event_key = os.environ.get("INNGEST_EVENT_KEY")
        self.inngest_url = os.environ.get(
            "INNGEST_API_URL",
            "https://inn.gs/e/YOUR_EVENT_KEY"  # Default Inngest event endpoint
        )

        if not self.event_key:
            logger.warning("INNGEST_EVENT_KEY not found - events will not be sent")

    def send_event(self, name: str, data: Dict[str, Any]):
        """
        Send an event to Inngest.

        Args:
            name: Event name (e.g., "generation/progress")
            data: Event data payload
        """
        if not self.event_key:
            logger.warning(f"Skipping event {name} - no Inngest key configured")
            return

        event_payload = {
            "name": name,
            "data": data,
            "ts": int(time.time() * 1000),  # Timestamp in milliseconds
        }

        try:
            # Send event to Inngest
            response = httpx.post(
                self.inngest_url,
                json=event_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.event_key}",
                },
                timeout=5.0,  # 5 second timeout
            )

            response.raise_for_status()
            logger.info(f"Event sent: {name} (job_id: {data.get('job_id')})")

        except httpx.HTTPError as e:
            logger.error(f"Failed to send event {name}: {e}")
            # Don't raise - event emission failures should not crash generation
        except Exception as e:
            logger.error(f"Unexpected error sending event {name}: {e}")


# Global client instance
_inngest_client: Optional[InngestClient] = None


def get_inngest_client() -> InngestClient:
    """Get or create Inngest client singleton"""
    global _inngest_client
    if _inngest_client is None:
        _inngest_client = InngestClient()
    return _inngest_client


def emit_progress(job_id: str, progress: int, message: str):
    """
    Emit progress event for a generation job.

    Args:
        job_id: Unique job identifier
        progress: Progress percentage (0-100)
        message: Status message
    """
    client = get_inngest_client()

    client.send_event(
        name="generation/progress",
        data={
            "job_id": job_id,
            "progress": progress,
            "message": message,
            "timestamp": time.time(),
        }
    )


def emit_completion(job_id: str, result: Dict[str, Any]):
    """
    Emit completion event for a generation job.

    Args:
        job_id: Unique job identifier
        result: Generation result (output_url, processing_time_ms, etc.)
    """
    client = get_inngest_client()

    client.send_event(
        name="generation/completed",
        data={
            "job_id": job_id,
            "result": result,
            "timestamp": time.time(),
        }
    )


def emit_error(job_id: str, error: str):
    """
    Emit error event for a generation job.

    Args:
        job_id: Unique job identifier
        error: Error message
    """
    client = get_inngest_client()

    client.send_event(
        name="generation/failed",
        data={
            "job_id": job_id,
            "error": error,
            "timestamp": time.time(),
        }
    )


def emit_model_loaded(model_name: str, vram_usage_gb: float):
    """
    Emit event when a model is loaded.

    Useful for monitoring and debugging.

    Args:
        model_name: Name of loaded model
        vram_usage_gb: VRAM usage in GB
    """
    client = get_inngest_client()

    client.send_event(
        name="modal/model-loaded",
        data={
            "model_name": model_name,
            "vram_usage_gb": vram_usage_gb,
            "timestamp": time.time(),
        }
    )


# Standalone test
if __name__ == "__main__":
    print("Inngest events module loaded")
    print("To test, set INNGEST_EVENT_KEY environment variable")

    # Test event emission (won't actually send without key)
    emit_progress("test-job-123", 50, "Test progress event")
    print("Test event emitted (check logs)")
