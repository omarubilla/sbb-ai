import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

type SerpApiAccountResponse = {
  total_searches_left?: number;
  this_month_usage?: number;
  this_month_limit?: number;
};

type SeoMeta = {
  latestCheckedAt: string | null;
  productCount: number;
};

const SEO_META_QUERY = `{
  "latestCheckedAt": *[_type == "product" && defined(seoLastCheckedAt)] | order(seoLastCheckedAt desc)[0].seoLastCheckedAt,
  "productCount": count(*[_type == "product" && !(name match "Bankful Test*")])
}`;

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.publicMetadata?.role;
  if (!userId || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (!serpApiKey) {
    return NextResponse.json({
      ok: false,
      quota: null,
      latestCheckedAt: null,
      productCount: 0,
      error: "SERPAPI_API_KEY is missing",
    });
  }

  const [meta, quotaResponse] = await Promise.all([
    client.fetch<SeoMeta>(SEO_META_QUERY),
    fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(serpApiKey)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }),
  ]);

  let quota: {
    totalSearchesLeft: number | null;
    thisMonthUsage: number | null;
    thisMonthLimit: number | null;
  } = {
    totalSearchesLeft: null,
    thisMonthUsage: null,
    thisMonthLimit: null,
  };

  if (quotaResponse.ok) {
    const payload = (await quotaResponse.json()) as SerpApiAccountResponse;
    quota = {
      totalSearchesLeft:
        typeof payload.total_searches_left === "number"
          ? payload.total_searches_left
          : null,
      thisMonthUsage:
        typeof payload.this_month_usage === "number"
          ? payload.this_month_usage
          : null,
      thisMonthLimit:
        typeof payload.this_month_limit === "number"
          ? payload.this_month_limit
          : null,
    };
  }

  return NextResponse.json({
    ok: true,
    quota,
    latestCheckedAt: meta.latestCheckedAt,
    productCount: meta.productCount,
  });
}
