export const SIZE_VARIANT_ALLOWLIST_BY_CATEGORY = {
  e2Enzymes: [
    "His-UBE2S  (Recombinant Human) (His-tagged)",
    "His-UBE2A  (Recombinant Human) (His-tagged)",
    "His-UBE2B  (Recombinant Human) (His-tagged)",
    "His-UBE2C  (Recombinant Human) (His-tagged)",
    "His-UBE2D4  (Recombinant Human) (His-tagged)",
    "UBE2I (Recombinant Human) (untagged)",
    "UBE2M (Recombinant Human) (untagged)",
    "His6-UBE2K, human recombinant",
    "UBE2L3 (Recombinant Human)",
    "UBE2D3 (Recombinant Human)",
    "UBE2D2 (Recombinant Human)",
    "UBE2D1 (Recombinant Human)",
  ],
  complexesAndLigaseComponents: [
    "UBE2N/UBE2V1 Complex (Recombinant Human) (untagged)",
    "His8- Avi-DDB1-biotinylated",
    "His8-Avi-DDB1-Biotinylated",
    "Skp1/His6-Skp2",
    "Skp1/Skp2 Recombinant Protein",
    "DDB1/Cereblon (CRBN)",
    "DDB1/Cereblon (CRBN) Protein",
  ],
  e1Enzymes: [
    "Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)",
    "Ubiquitin Activating Enzyme (UBA1), human recombinant",
  ],
} as const;

export const SIZE_VARIANT_ALLOWLIST = Object.values(
  SIZE_VARIANT_ALLOWLIST_BY_CATEGORY,
).flat();
