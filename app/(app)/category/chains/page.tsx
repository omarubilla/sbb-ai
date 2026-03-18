import {
  CategoryPageTemplate,
  type CategoryPageProps,
} from "../_shared/CategoryPageTemplate";

export default async function ChainsPage({ searchParams }: CategoryPageProps) {
  return CategoryPageTemplate({
    slug: "chains",
    searchParams,
  });
}
