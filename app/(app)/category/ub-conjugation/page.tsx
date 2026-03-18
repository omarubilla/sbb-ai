import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function UbConjugationPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "ub-conjugation",
    searchParams,
  });
}
