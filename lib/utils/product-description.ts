function normalizeDescription(description?: string | null) {
  return (
    description
      ?.replace(/\u00b5/g, "\u03bc")
      // Normalize line endings
      .replace(/\r\n?/g, "\n")
      // Collapse horizontal whitespace (not newlines) to single space
      .replace(/[^\S\n]+/g, " ")
      // Collapse 3+ consecutive newlines down to 2
      .replace(/\n{3,}/g, "\n\n")
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
    /^Catalog\s*(?:[Nn]umber|#|[Nn]o\.?)\s*:?[\s\u00a0]*/,
  );

  if (catalogPrefixMatch) {
    const rest = normalized.slice(catalogPrefixMatch[0].length).trim();

    // Split at the first newline boundary (explicit paragraph break in the data)
    const newlineSplit = rest.match(/^([^\n]+)\n+([\s\S]+)$/);
    if (newlineSplit) {
      return {
        meta: `Catalog number: ${newlineSplit[1].trim()}`,
        summary: newlineSplit[2].trim() || "Product details coming soon.",
      };
    }

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