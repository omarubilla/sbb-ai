const CATEGORY_PAGE_SLUG_BY_TITLE: Record<string, string> = {
  "C-Terminal Derivatives": "c-terminal-derivatives",
  Chains: "chains",
  "E3 Ligases": "e3-ligases",
  "Neurodegenerative Diseases": "neurodegenerative-diseases",
  Proteasome: "proteasome",
  "TR-FRET": "tr-fret",
  "UB Conjugation": "ub-conjugation",
  "UB Deconjugation": "ub-deconjugation",
};

export function getCategoryPageSlug(
  title?: string | null,
  fallbackSlug?: string | null,
) {
  if (title && CATEGORY_PAGE_SLUG_BY_TITLE[title]) {
    return CATEGORY_PAGE_SLUG_BY_TITLE[title];
  }

  return fallbackSlug ?? "";
}
