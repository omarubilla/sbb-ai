import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "Chains Category | South Bay Bio",
  description:
    "Browse ubiquitin and related chain products for biochemical and proteasome research.",
  alternates: {
    canonical: "/category/chains",
  },
  robots: getRobotsValue(true),
};

export default async function ChainsPage({ searchParams }: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "chains",
    searchParams,
  });
}
