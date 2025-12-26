"""
Cloudflare R2 Storage Integration
AI Video Generation Platform - Phase 1B

Handles uploading generated media to Cloudflare R2 (S3-compatible storage).
"""

import os
import boto3
from pathlib import Path
from typing import Optional
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class R2Storage:
    """Cloudflare R2 storage client (S3-compatible)"""

    def __init__(self):
        # Load credentials from environment variables
        self.account_id = os.environ.get("R2_ACCOUNT_ID")
        self.access_key_id = os.environ.get("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.environ.get("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.environ.get("R2_BUCKET_NAME", "ai-video-gen-outputs")

        logger.info(f"R2 Config - Account ID: {self.account_id}, Bucket: {self.bucket_name}")

        if not all([self.access_key_id, self.secret_access_key]):
            raise ValueError("R2 credentials not found in environment variables")

        # Create S3 client configured for R2
        endpoint_url = f'https://{self.account_id}.r2.cloudflarestorage.com' if self.account_id else None
        logger.info(f"R2 Endpoint URL: {endpoint_url}")

        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name='auto',  # R2 uses auto region
        )

        logger.info(f"R2 storage client initialized for bucket: {self.bucket_name}")

    def upload_file(
        self,
        file_path: str,
        object_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """
        Upload a file to R2.

        Args:
            file_path: Local path to file
            object_key: S3 object key (path in bucket)
            content_type: Optional MIME type

        Returns:
            Object key (for private bucket access via pre-signed URLs)
        """
        try:
            # Determine content type if not provided
            if content_type is None:
                content_type = self._guess_content_type(file_path)

            logger.info(f"Uploading {file_path} to R2 as {object_key}")

            # Upload file to private bucket
            with open(file_path, 'rb') as f:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=object_key,
                    Body=f,
                    ContentType=content_type,
                    # File is private - access via pre-signed URLs only
                )

            # Return the object key instead of public URL
            # Frontend will generate pre-signed URLs when needed
            logger.info(f"Upload successful: {object_key}")
            return object_key

        except Exception as e:
            logger.error(f"Failed to upload to R2: {e}")
            raise

    def delete_file(self, object_key: str):
        """
        Delete a file from R2.

        Args:
            object_key: S3 object key to delete
        """
        try:
            logger.info(f"Deleting {object_key} from R2")

            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )

            logger.info(f"Deleted successfully: {object_key}")

        except Exception as e:
            logger.error(f"Failed to delete from R2: {e}")
            raise

    def _guess_content_type(self, file_path: str) -> str:
        """Guess MIME type from file extension"""
        ext = Path(file_path).suffix.lower()

        content_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
        }

        return content_types.get(ext, 'application/octet-stream')

    def _get_public_url(self, object_key: str) -> str:
        """
        Get public URL for an object.

        Note: This assumes the bucket has a public URL configured.
        In production, use R2's custom domain or public bucket URL.
        """
        # R2 public URL format
        # Can use R2_PUBLIC_URL env var (full base URL) or construct from account_id
        public_url = os.environ.get("R2_PUBLIC_URL")

        if public_url:
            # Remove trailing slash and bucket name if present
            base_url = public_url.rstrip('/')
            # If URL already includes bucket name, remove it
            if base_url.endswith(f"/{self.bucket_name}"):
                base_url = base_url[:-len(f"/{self.bucket_name}")]
            return f"{base_url}/{self.bucket_name}/{object_key}"
        elif self.account_id:
            # Construct from account ID
            return f"https://pub-{self.account_id}.r2.dev/{object_key}"
        else:
            # Fallback
            return f"https://{self.bucket_name}.r2.dev/{object_key}"


# Convenience function for main.py
def upload_to_r2(file_path: str, bucket_folder: str, job_id: str) -> str:
    """
    Upload a file to R2 with automatic path generation.

    Args:
        file_path: Local file path
        bucket_folder: Folder in bucket (images, videos, audio)
        job_id: Unique job ID

    Returns:
        Public URL of uploaded file
    """
    storage = R2Storage()

    # Generate object key with timestamp
    timestamp = datetime.utcnow().strftime('%Y%m%d')
    file_ext = Path(file_path).suffix
    object_key = f"{bucket_folder}/{timestamp}/{job_id}{file_ext}"

    return storage.upload_file(file_path, object_key)


def delete_from_r2(object_url: str):
    """
    Delete a file from R2 given its public URL.

    Args:
        object_url: Public URL of file to delete
    """
    storage = R2Storage()

    # Extract object key from URL
    # Assumes URL format: https://domain.com/path/to/object
    object_key = object_url.split('/')[-3:]  # Get last 3 parts (folder/timestamp/filename)
    object_key = '/'.join(object_key)

    storage.delete_file(object_key)


def download_image(image_url: str, job_id: str) -> str:
    """
    Download an image from URL for use in img2video generation.

    Args:
        image_url: URL of the source image
        job_id: Unique job ID for filename

    Returns:
        Local path to downloaded image
    """
    import requests
    from tempfile import gettempdir

    try:
        logger.info(f"Downloading image from: {image_url}")

        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()

        # Guess file extension from content type
        content_type = response.headers.get('content-type', '')
        ext_map = {
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/webp': '.webp',
        }
        file_ext = ext_map.get(content_type, '.jpg')

        # Save to temp directory
        temp_dir = Path(gettempdir())
        temp_path = temp_dir / f"source_{job_id}{file_ext}"

        with open(temp_path, 'wb') as f:
            f.write(response.content)

        logger.info(f"Image downloaded to: {temp_path}")
        return str(temp_path)

    except Exception as e:
        logger.error(f"Failed to download image: {e}")
        raise


# Standalone test
if __name__ == "__main__":
    print("R2 Storage module loaded")
    print("To test, set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables")
