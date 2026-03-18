import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function CTerminalDerivativesPage({
  searchParams,
}: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "c-terminal-derivatives",
    searchParams,
  });
}
