import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function NeurodegenerativeDiseasesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "neurodegenerative-diseases",
    searchParams,
  });
}
