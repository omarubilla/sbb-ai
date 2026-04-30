import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchSearchConsoleOverview } from "@/lib/google/search-console";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, sessionClaims } = await auth();

  if (!userId || sessionClaims?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const overview = await fetchSearchConsoleOverview();
    return NextResponse.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Search Console error";

    return NextResponse.json(
      {
        configured: false,
        error: message,
        requirements: [
          "Verify the service account has access to your Search Console property.",
          "Enable both Search Console API and URL Inspection API in Google Cloud.",
          "Set GSC_SITE_URL if your property is not the default sc-domain:* value.",
        ],
      },
      { status: 500 }
    );
  }
}