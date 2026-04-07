export interface ProductSizeVariantOption {
  label: string;
  // Optional per-size price. If omitted, product base price is used.
  price?: number;
}

export const LEGACY_PRODUCTS_WITH_SIZE_VARIANTS = [
  "His-UBE2S  (Recombinant Human) (His-tagged)",
  "His-UBE2A  (Recombinant Human) (His-tagged)",
  "His-UBE2B  (Recombinant Human) (His-tagged)",
  "His-UBE2C  (Recombinant Human) (His-tagged)",
  "His-UBE2D4  (Recombinant Human) (His-tagged)",
  "UBE2N/UBE2V1 Complex (Recombinant Human) (untagged)",
  "UBE2I (Recombinant Human) (untagged)",
  "UBE2M (Recombinant Human) (untagged)",
  "His8- Avi-DDB1-biotinylated",
  "His8-Avi-DDB1-Biotinylated",
  "Skp1/His6-Skp2",
  "Skp1/Skp2 Recombinant Protein",
  "DDB1/Cereblon (CRBN)",
  "DDB1/Cereblon (CRBN) Protein",
  "His6-UBE2K, human recombinant",
  "UBE2L3 (Recombinant Human)",
  "UBE2D3 (Recombinant Human)",
  "UBE2D2 (Recombinant Human)",
  "UBE2D1 (Recombinant Human)",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant",
] as const;

export const SANITY_PRODUCTS_NEED_TO_UPDATE = {
  title: "need to update",
  names: [
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
    "UBE2L3 (Recombinant Human)",
    "UBE2D3 (Recombinant Human)",
    "UBE2D2 (Recombinant Human)",
    "UBE2D1 (Recombinant Human)",
  ],
} as const;

const PRODUCTS_WITH_SIZE_VARIANTS_CONFIG = [
  {
    names: ["His-UBE2S  (Recombinant Human) (His-tagged)"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 242 },
    ],
  },
  {
    names: ["His-UBE2A  (Recombinant Human) (His-tagged)"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 242 },
    ],
  },
  {
    names: ["His-UBE2B  (Recombinant Human) (His-tagged)"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 242 },
    ],
  },
  {
    names: ["His-UBE2C  (Recombinant Human) (His-tagged)"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 242 },
    ],
  },
  {
    names: ["His-UBE2D4  (Recombinant Human) (His-tagged)"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 242 },
    ],
  },
  {
    names: ["UBE2N/UBE2V1 Complex (Recombinant Human) (untagged)"],
    options: [
      { label: "25 µg", price: 121 },
      { label: "50 µg", price: 242 },
    ],
  },
  {
    names: ["UBE2I (Recombinant Human) (untagged)"],
    options: [
      { label: "25 µg", price: 121 },
      { label: "50 µg", price: 242 },
    ],
  },
  {
    names: ["UBE2M (Recombinant Human) (untagged)"],
    options: [
      { label: "25 µg", price: 121 },
      { label: "50 µg", price: 242 },
    ],
  },
  {
    // aliases — same product, same price
    names: ["His8- Avi-DDB1-biotinylated", "His8-Avi-DDB1-Biotinylated"],
    options: [
      { label: "25 µg", price: 295 },
      { label: "50 µg", price: 395 },
    ],
  },
  {
    // aliases — same product, same price
    names: ["Skp1/His6-Skp2", "Skp1/Skp2 Recombinant Protein"],
    options: [
      { label: "25 µg", price: 295 },
      { label: "50 µg", price: 490 },
    ],
  },
  {
    // aliases — same product, same price
    names: ["DDB1/Cereblon (CRBN)", "DDB1/Cereblon (CRBN) Protein"],
    options: [
      { label: "25 µg", price: 295 },
      { label: "50 µg", price: 395 },
    ],
  },
  {
    names: ["His6-UBE2K, human recombinant"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 235 },
    ],
  },
  {
    names: ["UBE2L3 (Recombinant Human)", "UBE2L3, human recombinant"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 235 },
    ],
  },
  {
    names: ["UBE2D3 (Recombinant Human)", "UBE2D3, human recombinant"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 235 },
    ],
  },
  {
    names: ["UBE2D2 (Recombinant Human)", "UBE2D2, human recombinant"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 235 },
    ],
  },
  {
    names: ["UBE2D1 (Recombinant Human)", "UBE2D1, human recombinant"],
    options: [
      { label: "50 µg", price: 121 },
      { label: "100 µg", price: 235 },
    ],
  },
  {
    names: ["Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)"],
    options: [
      { label: "25 µg", price: 102 },
      { label: "50 µg", price: 198 },
    ],
  },
  {
    names: ["Ubiquitin Activating Enzyme (UBA1), human recombinant"],
    options: [
      { label: "25 µg", price: 121 },
      { label: "50 µg", price: 235 },
    ],
  },
] as const;

function normalizeProductName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join("");
}

const PRODUCT_SIZE_VARIANTS_BY_NAME = new Map<string, readonly ProductSizeVariantOption[]>();

for (const config of PRODUCTS_WITH_SIZE_VARIANTS_CONFIG) {
  for (const name of config.names) {
    PRODUCT_SIZE_VARIANTS_BY_NAME.set(normalizeProductName(name), config.options);
  }
}

const PRODUCTS_WITH_SIZE_VARIANTS_SET = new Set(PRODUCT_SIZE_VARIANTS_BY_NAME.keys());

export function getProductSizeVariants(name?: string | null): readonly ProductSizeVariantOption[] {
  if (!name) return [];
  return PRODUCT_SIZE_VARIANTS_BY_NAME.get(normalizeProductName(name)) ?? [];
}

export function productHasSizeVariants(name?: string | null) {
  if (!name) return false;
  return PRODUCTS_WITH_SIZE_VARIANTS_SET.has(normalizeProductName(name));
}

export const productsWithSizeVariants = PRODUCTS_WITH_SIZE_VARIANTS_CONFIG.flatMap(
  (entry) => entry.names,
);
