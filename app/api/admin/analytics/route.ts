import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "edge";

// Vercel Web Analytics internal API base (powers the Vercel dashboard)
const VA_BASE = "https://vercel.com/api/web-analytics/v1";

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: Request) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID; // optional — required for team-owned projects

  if (!token || !projectId) {
    return NextResponse.json(
      {
        error: "VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID are required.",
        missingEnv: true,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const range = Number(searchParams.get("range") ?? "30");

  const from = daysAgoISO(range);
  const to = new Date().toISOString();

  const params = new URLSearchParams({
    projectId,
    from,
    to,
    environment: "production",
    granularity: range <= 7 ? "day" : range <= 30 ? "day" : "week",
  });
  if (teamId) params.set("teamId", teamId);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch timeseries summary and top pages in parallel
  const [summaryRes, pagesRes] = await Promise.all([
    fetch(`${VA_BASE}/timeseries?${params}`, { headers }),
    fetch(`${VA_BASE}/pages?${params}&limit=10`, { headers }),
  ]);

  if (!summaryRes.ok) {
    const text = await summaryRes.text().catch(() => "");
    let parsed: { error?: { message?: string } } = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    return NextResponse.json(
      {
        error: `Vercel Analytics API error ${summaryRes.status}: ${parsed?.error?.message ?? text}`,
        dashboardUrl: teamId
          ? `https://vercel.com/teams/${teamId}/${projectId}/analytics`
          : `https://vercel.com/dashboard`,
      },
      { status: summaryRes.status }
    );
  }

  const summaryJson = await summaryRes.json();
  const pagesJson = pagesRes.ok ? await pagesRes.json() : { data: [] };

  // Aggregate totals from timeseries buckets
  const buckets: Array<{ visitors?: number; pageviews?: number; bounceRate?: number; avgVisitDuration?: number }> =
    Array.isArray(summaryJson) ? summaryJson : (summaryJson.data ?? []);

  const totalPageviews = buckets.reduce((s, b) => s + (b.pageviews ?? 0), 0);
  const uniqueVisitors = buckets.reduce((s, b) => s + (b.visitors ?? 0), 0);
  const avgBounce = buckets.length
    ? buckets.reduce((s, b) => s + (b.bounceRate ?? 0), 0) / buckets.length
    : undefined;
  const avgDuration = buckets.length
    ? buckets.reduce((s, b) => s + (b.avgVisitDuration ?? 0), 0) / buckets.length
    : undefined;

  return NextResponse.json({
    summary: { totalPageviews, uniqueVisitors, bounceRate: avgBounce, avgVisitDuration: avgDuration },
    pages: pagesJson.data ?? [],
  });
}
