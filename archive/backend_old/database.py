"""
Database utilities for Modal backend
Updates generation records in Neon PostgreSQL
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class DatabaseClient:
    """Client for updating generation records in PostgreSQL"""

    def __init__(self):
        self.database_url = os.environ.get("DATABASE_URL")
        if not self.database_url:
            logger.warning("DATABASE_URL not configured - database updates disabled")

    def get_connection(self):
        """Create a database connection"""
        if not self.database_url:
            raise ValueError("DATABASE_URL not configured")
        return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)

    def update_generation_status(
        self,
        job_id: str,
        status: str,
        output_url: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
        error: Optional[str] = None,
    ):
        """
        Update generation record in database

        Args:
            job_id: Job ID to update
            status: New status (pending, processing, completed, failed)
            output_url: Output URL (for completed jobs)
            processing_time_ms: Processing time in milliseconds
            error: Error message (for failed jobs)
        """
        if not self.database_url:
            logger.warning(f"Skipping database update for {job_id} - no DATABASE_URL")
            return

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Build UPDATE query dynamically
                    set_clauses = ["status = %s"]
                    values = [status]

                    if output_url is not None:
                        set_clauses.append('output_url = %s')
                        values.append(output_url)

                    if processing_time_ms is not None:
                        set_clauses.append('processing_time_ms = %s')
                        values.append(processing_time_ms)

                    if error is not None:
                        set_clauses.append("error = %s")
                        values.append(error)

                    if status == "completed":
                        set_clauses.append('completed_at = NOW()')

                    # Add job_id for WHERE clause
                    values.append(job_id)

                    query = f"""
                        UPDATE generations
                        SET {', '.join(set_clauses)}
                        WHERE id = %s::uuid
                    """

                    cur.execute(query, values)
                    conn.commit()

                    logger.info(f"Updated generation {job_id} to status: {status}")

        except Exception as e:
            logger.error(f"Failed to update database for {job_id}: {e}")
            # Don't raise - database update failures should not crash generation


# Global client instance
_db_client: Optional[DatabaseClient] = None


def get_db_client() -> DatabaseClient:
    """Get or create database client singleton"""
    global _db_client
    if _db_client is None:
        _db_client = DatabaseClient()
    return _db_client


def update_generation_completed(job_id: str, output_url: str, processing_time_ms: int):
    """Update generation as completed"""
    client = get_db_client()
    client.update_generation_status(
        job_id=job_id,
        status="completed",
        output_url=output_url,
        processing_time_ms=processing_time_ms,
    )


def update_generation_failed(job_id: str, error: str):
    """Update generation as failed"""
    client = get_db_client()
    client.update_generation_status(
        job_id=job_id,
        status="failed",
        error=error,
    )


def update_generation_processing(job_id: str):
    """Update generation as processing"""
    client = get_db_client()
    client.update_generation_status(
        job_id=job_id,
        status="processing",
    )
