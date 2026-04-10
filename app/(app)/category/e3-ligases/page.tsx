import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "E3 Ligases Category | South Bay Bio",
  description:
    "Discover E3 ligase proteins and tools from South Bay Bio for ubiquitin pathway studies.",
  alternates: {
    canonical: "/category/e3-ligases",
  },
  robots: getRobotsValue(true),
};

export default async function E3LigasesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "e3-ligases",
    searchParams,
  });
}
