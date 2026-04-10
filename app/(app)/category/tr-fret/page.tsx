import type { Metadata } from "next";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";
import { getRobotsValue } from "@/lib/site";

export const metadata: Metadata = {
  title: "TR-FRET Category | South Bay Bio",
  description:
    "Explore TR-FRET reagents and tools from South Bay Bio for sensitive assay development.",
  alternates: {
    canonical: "/category/tr-fret",
  },
  robots: getRobotsValue(true),
};

export default async function TrFretPage({ searchParams }: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "tr-fret",
    searchParams,
  });
}
