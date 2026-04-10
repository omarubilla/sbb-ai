import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "C-Terminal Derivatives Category | South Bay Bio",
  description:
    "Explore C-terminal derivative reagents and related products from South Bay Bio.",
  alternates: {
    canonical: "/category/c-terminal-derivatives",
  },
  robots: getRobotsValue(true),
};

export default async function CTerminalDerivativesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "c-terminal-derivatives",
    searchParams,
  });
}
