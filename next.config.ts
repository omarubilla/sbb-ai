import type { NextConfig } from "next";

// Clerk FAPI domain (derived from publishable key: clerk.south-bay-bio.com)
const CLERK_DOMAIN = "https://clerk.south-bay-bio.com";

const cspHeader = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its inline scripts; Clerk + Cloudflare Turnstile (bot protection)
  `script-src 'self' 'unsafe-inline' ${CLERK_DOMAIN} https://challenges.cloudflare.com`,
  // Clerk API calls + Sanity live queries (EventSource)
  `connect-src 'self' ${CLERK_DOMAIN} https://*.sanity.io wss://*.sanity.io`,
  // Clerk hosted UI + Cloudflare Turnstile challenge iframe
  `frame-src ${CLERK_DOMAIN} https://challenges.cloudflare.com`,
  // Images from Clerk, Sanity, OAuth providers (Google, GitHub), existing sources
  "img-src 'self' data: blob: https://img.clerk.com https://cdn.sanity.io https://static.wixstatic.com https://images.unsplash.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  // Tailwind / Clerk UI inline styles
  "style-src 'self' 'unsafe-inline'",
  // Geist font is self-hosted by next/font
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  // Clerk sign-in form posts back to the Clerk domain
  `form-action 'self' ${CLERK_DOMAIN}`,
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
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
