import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAllowedMediaUrl } from "@/lib/media-url";

/**
 * Download Proxy API Route
 *
 * Proxies media downloads from R2 to avoid CORS issues. Requires a session and only
 * fetches URLs under the configured R2 public base (see lib/media-url.ts).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  if (!isAllowedMediaUrl(url, process.env.R2_PUBLIC_URL)) {
    return NextResponse.json({ error: "Invalid URL - must be from R2 storage" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { redirect: "error" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: response.status },
      );
    }

    const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
    const safeExt = ext && /^[a-z0-9]{2,4}$/.test(ext) ? ext : "bin";

    return new NextResponse(await response.blob(), {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="generation-${Date.now()}.${safeExt}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
