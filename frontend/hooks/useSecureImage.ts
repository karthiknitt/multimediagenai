"use client";

import { useEffect, useState } from "react";

interface SecureImageResult {
  url: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch pre-signed URLs for secure R2 image access
 *
 * This hook automatically refreshes the pre-signed URL before it expires
 * to ensure continuous image display without public bucket access.
 */
export function useSecureImage(generationId: string | null | undefined): SecureImageResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let refreshTimer: NodeJS.Timeout | null = null;

    const fetchPresignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/image/${generationId}`);

        if (!response.ok) {
          if (response.status === 404) {
            const data = await response.json();
            setError(data.error || "Image not found");
          } else {
            throw new Error("Failed to fetch image");
          }
          setUrl(null);
          return;
        }

        const data = await response.json();
        setUrl(data.url);

        // Refresh the URL 5 minutes before it expires (expires in 1 hour)
        // This ensures the image stays accessible without interruption
        const refreshIn = (data.expiresIn - 300) * 1000; // Convert to ms, subtract 5 min
        refreshTimer = setTimeout(fetchPresignedUrl, refreshIn);
      } catch (err) {
        console.error("Error fetching pre-signed URL:", err);
        setError("Failed to load image");
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPresignedUrl();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [generationId]);

  return { url, loading, error };
}
