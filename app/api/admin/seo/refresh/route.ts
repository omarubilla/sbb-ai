import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { client, writeClient } from "@/sanity/lib/client";

type ProductForSeo = {
  _id: string;
  name: string;
  slug: string;
};

type SerpApiOrganicResult = {
  position?: number;
  link?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
};

const PRODUCTS_FOR_SEO_QUERY = `*[_type == "product" && !(name match "Bankful Test*")] | order(name asc){
  _id,
  name,
  "slug": slug.current
}`;

const DOMAIN_GROUPS = {
  southBayBio: ["south-bay-bio.com", "southbaybio.com"],
  ubpBio: ["ubpbio.com"],
  rdSystems: ["rndsystems.com"],
};

function normalizeHost(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function extractPositionForDomains(
  organicResults: SerpApiOrganicResult[],
  domains: string[]
): number {
  for (const result of organicResults) {
    const host = normalizeHost(result.link ?? "");
    if (!host) {
      continue;
    }

    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return result.position ?? 0;
    }
  }

  return 0;
}

async function fetchGoogleRanks(query: string, apiKey: string): Promise<{
  southBayBio: number;
  ubpBio: number;
  rdSystems: number;
}> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("num", "30");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SerpApi request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as SerpApiResponse;
  const organicResults = payload.organic_results ?? [];

  return {
    southBayBio: extractPositionForDomains(organicResults, DOMAIN_GROUPS.southBayBio),
    ubpBio: extractPositionForDomains(organicResults, DOMAIN_GROUPS.ubpBio),
    rdSystems: extractPositionForDomains(organicResults, DOMAIN_GROUPS.rdSystems),
  };
}

function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const isCron = isCronAuthorized(request);

  if (!isCron) {
    const { userId, sessionClaims } = await auth();
    const role = sessionClaims?.publicMetadata?.role;

    if (!userId || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (!serpApiKey) {
    return NextResponse.json(
      { error: "SERPAPI_API_KEY is missing" },
      { status: 500 }
    );
  }

  const products = await client.fetch<ProductForSeo[]>(PRODUCTS_FOR_SEO_QUERY);
  const checkedAt = new Date().toISOString();

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const ranks = await fetchGoogleRanks(product.name, serpApiKey);

      await writeClient
        .patch(product._id)
        .set({
          seoRankSouthBayBio: ranks.southBayBio,
          seoRankUbpBio: ranks.ubpBio,
          seoRankRdSystems: ranks.rdSystems,
          seoLastCheckedAt: checkedAt,
        })
        .commit();

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error("SEO rank refresh failed for product", product._id, error);
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt,
    totalProducts: products.length,
    updated,
    failed,
  });
}
