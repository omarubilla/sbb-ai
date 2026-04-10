import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ub-Deconjugation Category | South Bay Bio",
  description:
    "Browse ubiquitin deconjugation reagents and tools from South Bay Bio for pathway analysis.",
  alternates: {
    canonical: "/category/ub-deconjugation",
  },
  robots: getRobotsValue(true),
};

export default async function UbDeconjugationPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "ub-deconjugation",
    searchParams,
  });
}
