import type { NextConfig } from "next";

// Clerk FAPI domain (derived from publishable key: clerk.south-bay-bio.com)
const CLERK_DOMAIN = "https://clerk.south-bay-bio.com";

const sharedCsp = {
  connectSrc: `connect-src 'self' ${CLERK_DOMAIN} https://*.sanity.io wss://*.sanity.io`,
  frameSrc: `frame-src ${CLERK_DOMAIN} https://challenges.cloudflare.com`,
  imgSrc: "img-src 'self' data: blob: https://img.clerk.com https://cdn.sanity.io https://static.wixstatic.com https://images.unsplash.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  styleSrc: "style-src 'self' 'unsafe-inline'",
  fontSrc: "font-src 'self' data:",
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: `form-action 'self' ${CLERK_DOMAIN}`,
};

// App routes — no eval allowed
const appCspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CLERK_DOMAIN} https://challenges.cloudflare.com`,
  ...Object.values(sharedCsp),
].join("; ");

// Studio route — Sanity Studio requires eval
const studioCspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${CLERK_DOMAIN} https://challenges.cloudflare.com`,
  ...Object.values(sharedCsp),
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // Sanity Studio needs unsafe-eval
        source: "/(studio)(.*)",
        headers: [{ key: "Content-Security-Policy", value: studioCspHeader }],
      },
      {
        // All other routes — strict CSP, no eval
        source: "/((?!studio).*)",
        headers: [{ key: "Content-Security-Policy", value: appCspHeader }],
      },
    ];
  },
  async redirects() {
    return [
      // Remove legacy Wix shop aliases permanently.
      {
        source: "/shop",
        destination: "/proteasome?subcategory=26s-proteasome",
        permanent: true,
      },

      // Keep explicit old-friendly paths mapped to canonical destinations.
      {
        source: "/tr-fret",
        destination: "/category/tr-fret",
        permanent: true,
      },
      {
        source: "/26-s-proteasome",
        destination: "/proteasome?subcategory=26s-proteasome",
        permanent: true,
      },
      {
        source: "/26s-proteasome",
        destination: "/proteasome?subcategory=26s-proteasome",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
