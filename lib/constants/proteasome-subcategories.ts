export const PROTEASOME_SUBCATEGORY_ORDER = [
  "substrates",
  "20s-proteasome",
  "26s-proteasome",
  "20s-immunoproteasomes",
  "proteasome-kits",
] as const;

type SubcategoryLike = {
  name?: string | null;
  slug?: string | null;
};

export function sortProteasomeSubcategories<T extends SubcategoryLike>(
  subcategories: readonly T[],
): T[] {
  const order = new Map(
    PROTEASOME_SUBCATEGORY_ORDER.map((slug, index) => [slug, index]),
  );

  return [...subcategories].sort((a, b) => {
    const aIndex = order.get(a.slug ?? "") ?? Number.MAX_SAFE_INTEGER;
    const bIndex = order.get(b.slug ?? "") ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}
