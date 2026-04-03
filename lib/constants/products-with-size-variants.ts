const PRODUCTS_WITH_SIZE_VARIANTS = [
  "His-UBE2S  (Recombinant Human) (His-tagged)",
  "His-UBE2A  (Recombinant Human) (His-tagged)",
  "His-UBE2B  (Recombinant Human) (His-tagged)",
  "His-UBE2C  (Recombinant Human) (His-tagged)",
  "His-UBE2D4  (Recombinant Human) (His-tagged)",
  "UBE2N/UBE2V1 Complex (Recombinant Human) (untagged)",
  "UBE2I (Recombinant Human) (untagged)",
  "UBE2M (Recombinant Human) (untagged)",
  "His8- Avi-DDB1-biotinylated",
  "Skp1/His6-Skp2",
  "DDB1/Cereblon (CRBN)",
  "His6-UBE2K, human recombinant",
  "UBE2L3, human recombinant",
  "UBE2D3, human recombinant",
  "UBE2D2, human recombinant",
  "UBE2D1, human recombinant",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant",
] as const;

const PRODUCT_NAME_ALIASES = [
  "His8-Avi-DDB1-Biotinylated",
  "Skp1/Skp2 Recombinant Protein",
  "DDB1/Cereblon (CRBN) Protein",
] as const;

function normalizeProductName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PRODUCTS_WITH_SIZE_VARIANTS_SET = new Set(
  [...PRODUCTS_WITH_SIZE_VARIANTS, ...PRODUCT_NAME_ALIASES].map(normalizeProductName),
);

export function productHasSizeVariants(name?: string | null) {
  if (!name) return false;
  return PRODUCTS_WITH_SIZE_VARIANTS_SET.has(normalizeProductName(name));
}

export const productsWithSizeVariants = PRODUCTS_WITH_SIZE_VARIANTS;
