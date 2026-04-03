function normalizeDescription(description?: string | null) {
  return (
    description
      ?.replace(/\s+/g, " ")
      .replace(/\u00b5/g, "\u03bc")
      .trim() ?? ""
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitAtMicrogramBoundary(value: string) {
  const match = value.match(/^(.*?\b\d+(?:\.\d+)?\s*(?:[μµu]g))\s*(?=[A-Za-z(])/i);

  if (!match) return null;

  const before = match[1].trim();
  const after = value.slice(match[0].length).trim();

  if (!before || !after) return null;

  return { before, after };
}

export function splitProductDescription(
  description?: string | null,
  quantity?: string | null,
) {
  const normalized = normalizeDescription(description);

  if (!normalized) {
    return {
      meta: quantity ? `Quantity: ${quantity}` : "",
      summary: "Product details coming soon.",
    };
  }

  const catalogPrefixMatch = normalized.match(
    /^Catalog\s*(?:[Nn]umber|#|[Nn]o\.?)\s*:\s*/,
  );

  if (catalogPrefixMatch) {
    const rest = normalized.slice(catalogPrefixMatch[0].length).trim();
    const normalizedQuantity = normalizeDescription(quantity);

    if (normalizedQuantity) {
      const quantityMatch = rest.match(
        new RegExp(`^.*?${escapeRegex(normalizedQuantity)}`),
      );

      if (quantityMatch) {
        const metaBody = quantityMatch[0].trim();
        const summary = rest.slice(metaBody.length).trim();

        return {
          meta: `Catalog number: ${metaBody}`,
          summary: summary || "Product details coming soon.",
        };
      }
    }

    const microgramSplit = splitAtMicrogramBoundary(rest);

    if (microgramSplit) {
      const { before: metaBody, after: summary } = microgramSplit;

      return {
        meta: `Catalog number: ${metaBody}`,
        summary: summary || "Product details coming soon.",
      };
    }

    const firstSentenceIndex = rest.indexOf(".");
    if (firstSentenceIndex >= 0) {
      const metaBody = rest.slice(0, firstSentenceIndex + 1).trim();
      const summary = rest.slice(firstSentenceIndex + 1).trim();

      return {
        meta: `Catalog number: ${metaBody}`,
        summary: summary || "Product details coming soon.",
      };
    }

    return {
      meta: `Catalog number: ${rest}`,
      summary: "Product details coming soon.",
    };
  }

  return {
    meta: quantity ? `Quantity: ${quantity}` : "",
    summary: normalized,
  };
}