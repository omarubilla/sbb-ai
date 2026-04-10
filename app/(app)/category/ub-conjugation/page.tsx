import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ub-Conjugation Category | South Bay Bio",
  description:
    "Shop ubiquitin conjugation reagents and assay components from South Bay Bio.",
  alternates: {
    canonical: "/category/ub-conjugation",
  },
  robots: getRobotsValue(true),
};

export default async function UbConjugationPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "ub-conjugation",
    searchParams,
  });
}
