import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "Neurodegenerative Diseases Category | South Bay Bio",
  description:
    "Browse South Bay Bio products supporting neurodegenerative disease and proteostasis research.",
  alternates: {
    canonical: "/category/neurodegenerative-diseases",
  },
  robots: getRobotsValue(true),
};

export default async function NeurodegenerativeDiseasesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "neurodegenerative-diseases",
    searchParams,
  });
}
