import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function UbDeconjugationPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "ub-deconjugation",
    searchParams,
  });
}
