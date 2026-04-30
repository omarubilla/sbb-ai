import { google, searchconsole_v1 } from "googleapis";
import { getSiteUrl } from "@/lib/site";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

type SearchAnalyticsRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

type InspectionRow = {
  url: string;
  verdict: string;
  coverageState: string;
  lastCrawlTime: string | null;
  referringUrls: string[];
};

function getDefaultSiteProperty() {
  const hostname = new URL(getSiteUrl()).hostname.replace(/^www\./, "");
  return `sc-domain:${hostname}`;
}

function getConfig() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return {
    clientEmail,
    privateKey,
    siteUrl: process.env.GSC_SITE_URL || getDefaultSiteProperty(),
    sitemapUrl: process.env.GSC_SITEMAP_URL || `${getSiteUrl()}/sitemap.xml`,
    maxUrlInspections: Number(process.env.GSC_MAX_URL_INSPECTIONS || "25"),
  };
}

function mapRow(row: SearchAnalyticsRow) {
  return {
    key: row.keys?.[0] || "Unknown",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  };
}

async function runSearchAnalyticsQuery(
  searchconsole: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  requestBody: searchconsole_v1.Schema$SearchAnalyticsQueryRequest
) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody,
  });

  return response.data.rows ?? [];
}

async function getSitemapUrls(sitemapUrl: string) {
  const response = await fetch(sitemapUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to fetch sitemap (${response.status})`);
  }

  const xml = await response.text();
  const matches = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g));

  return Array.from(
    new Set(
      matches
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function isIndexed(coverageState: string, verdict: string) {
  const state = coverageState.toLowerCase();

  if (state.includes("not indexed")) {
    return false;
  }

  if (state.includes("indexed")) {
    return true;
  }

  return verdict === "PASS";
}

async function inspectSitemapUrls(
  searchconsole: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  sitemapUrl: string,
  maxUrlInspections: number
) {
  const sitemapUrls = await getSitemapUrls(sitemapUrl);
  const limitedUrls = sitemapUrls.slice(0, Math.max(1, Math.min(maxUrlInspections, sitemapUrls.length)));
  const inspections: InspectionRow[] = [];
  const failures: string[] = [];

  for (const inspectionUrl of limitedUrls) {
    try {
      const response = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl,
          siteUrl,
          languageCode: "en-US",
        },
      });

      const result = response.data.inspectionResult?.indexStatusResult;

      inspections.push({
        url: inspectionUrl,
        verdict: result?.verdict || "UNKNOWN",
        coverageState: result?.coverageState || "Unknown",
        lastCrawlTime: result?.lastCrawlTime || null,
        referringUrls: result?.referringUrls || [],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown URL inspection error";
      failures.push(`${inspectionUrl}: ${message}`);
    }
  }

  const indexed = inspections.filter((entry) => isIndexed(entry.coverageState, entry.verdict)).length;
  const unindexed = inspections.filter((entry) => !isIndexed(entry.coverageState, entry.verdict)).length;
  const reasons = inspections.reduce<Record<string, number>>((accumulator, entry) => {
    const key = entry.coverageState || entry.verdict || "Unknown";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return {
    sitemapUrl,
    sitemapUrlCount: sitemapUrls.length,
    inspectedUrlCount: inspections.length,
    indexed,
    unindexed,
    unknown: Math.max(0, sitemapUrls.length - inspections.length),
    limitations: [
      `Only the first ${limitedUrls.length} sitemap URLs are inspected per refresh to stay within Google URL Inspection quotas.`,
    ],
    reasonBreakdown: Object.entries(reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count),
    pages: inspections,
    failures,
  };
}

export async function fetchSearchConsoleOverview() {
  const { clientEmail, privateKey, siteUrl, sitemapUrl, maxUrlInspections } = getConfig();

  if (!clientEmail || !privateKey) {
    return {
      configured: false,
      requirements: [
        "Set GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY in your Vercel environment variables.",
        `Add ${clientEmail || "your service account email"} as an owner or full user on ${siteUrl} in Google Search Console.`,
      ],
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [SEARCH_CONSOLE_SCOPE],
  });

  const searchconsole = google.searchconsole({ version: "v1", auth });
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 27);

  const [summaryRows, topQueries, topPages, topCountries, topDevices, trendRows, indexing] = await Promise.all([
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dataState: "all",
      rowLimit: 1,
    }),
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dimensions: ["query"],
      rowLimit: 10,
      dataState: "all",
    }),
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dimensions: ["page"],
      rowLimit: 10,
      dataState: "all",
    }),
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dimensions: ["country"],
      rowLimit: 10,
      dataState: "all",
    }),
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dimensions: ["device"],
      rowLimit: 10,
      dataState: "all",
    }),
    runSearchAnalyticsQuery(searchconsole, siteUrl, {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      dimensions: ["date"],
      rowLimit: 30,
      dataState: "all",
    }),
    inspectSitemapUrls(searchconsole, siteUrl, sitemapUrl, maxUrlInspections),
  ]);

  const summary = mapRow(summaryRows[0] || {});

  return {
    configured: true,
    property: siteUrl,
    period: {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    },
    performance: {
      clicks: summary.clicks,
      impressions: summary.impressions,
      ctr: summary.ctr,
      avgPosition: summary.position,
      trends: trendRows.map((row) => ({
        date: row.keys?.[0] || "",
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
      })),
      topQueries: topQueries.map(mapRow),
      topPages: topPages.map(mapRow),
      topCountries: topCountries.map(mapRow),
      topDevices: topDevices.map(mapRow),
    },
    indexing,
  };
}