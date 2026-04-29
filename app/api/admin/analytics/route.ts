import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "edge";

const VERCEL_API = "https://vercel.com/api/v1/analytics";

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
  const teamId = process.env.VERCEL_TEAM_ID; // optional

  if (!token || !projectId) {
    return NextResponse.json(
      { error: "VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID are required. Add them in your Vercel project environment variables." },
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
  });
  if (teamId) params.set("teamId", teamId);

  // Fetch page-view summary and top pages in parallel
  const [summaryRes, pagesRes] = await Promise.all([
    fetch(`${VERCEL_API}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${VERCEL_API}/pages?${params}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  if (!summaryRes.ok) {
    const text = await summaryRes.text();
    return NextResponse.json(
      { error: `Vercel Analytics API error ${summaryRes.status}: ${text}` },
      { status: summaryRes.status }
    );
  }

  const summary = await summaryRes.json();
  const pages = pagesRes.ok ? await pagesRes.json() : { data: [] };

  return NextResponse.json({ summary, pages: pages.data ?? [] });
}
