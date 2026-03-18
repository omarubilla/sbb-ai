import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function E3LigasesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "e3-ligases",
    searchParams,
  });
}
