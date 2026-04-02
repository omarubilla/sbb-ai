import type { Metadata } from "next";
import { getRobotsValue } from "@/lib/site";
import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "@/app/(app)/category/_shared/CategoryPageTemplate";

export const metadata: Metadata = {
  title: "Proteasome | South Bay Bio",
  description:
    "Browse proteasome products with the same filters and layout used across product categories.",
  alternates: {
    canonical: "/proteasome",
  },
  robots: getRobotsValue(true),
};

export default function ProteasomePage({ searchParams }: CategoryPageProps) {
  return (
    <CategoryPageTemplate slug="proteasome" searchParams={searchParams} />
  );
}
