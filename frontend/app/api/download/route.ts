import { NextRequest, NextResponse } from "next/server";

/**
 * Download Proxy API Route
 *
 * Proxies image downloads from R2 to avoid CORS issues.
 * The frontend can't directly fetch from R2 due to CORS restrictions,
 * so this route acts as a proxy.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // Validate that the URL is from the R2 bucket
    if (!url.includes(".r2.dev")) {
      return NextResponse.json(
        { error: "Invalid URL - must be from R2 storage" },
        { status: 400 }
      );
    }

    // Fetch the image from R2
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image from storage" },
        { status: response.status }
      );
    }

    // Get the image data
    const blob = await response.blob();

    // Return the image with appropriate headers
    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Content-Disposition": `attachment; filename="generation-${Date.now()}.png"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 }
    );
  }
}
