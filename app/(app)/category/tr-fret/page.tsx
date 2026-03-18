import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function TrFretPage({ searchParams }: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "tr-fret",
    searchParams,
  });
}
