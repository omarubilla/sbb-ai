import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
