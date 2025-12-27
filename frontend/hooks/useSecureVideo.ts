"use client";

import { useEffect, useState } from "react";

interface SecureVideoResult {
  url: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch pre-signed URLs for secure R2 video access
 *
 * This hook automatically refreshes the pre-signed URL before it expires
 * to ensure continuous video playback without public bucket access.
 */
export function useSecureVideo(generationId: string | null | undefined): SecureVideoResult {
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
        const response = await fetch(`/api/video/${generationId}`);

        if (!response.ok) {
          if (response.status === 404) {
            const data = await response.json();
            setError(data.error || "Video not found");
          } else {
            throw new Error("Failed to fetch video");
          }
          setUrl(null);
          return;
        }

        const data = await response.json();
        setUrl(data.url);

        // Refresh the URL 5 minutes before it expires (expires in 1 hour)
        // This ensures the video stays accessible without interruption
        const refreshIn = (data.expiresIn - 300) * 1000; // Convert to ms, subtract 5 min
        refreshTimer = setTimeout(fetchPresignedUrl, refreshIn);
      } catch (err) {
        console.error("Error fetching pre-signed URL:", err);
        setError("Failed to load video");
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
