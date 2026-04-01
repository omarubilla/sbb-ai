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

  const catalogPrefixMatch = normalized.match(/^Catalog\s+[Nn]umber:\s*/);

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

    const unitMatch = rest.match(/([μµ]g|ug)/i);

    if (unitMatch && unitMatch.index !== undefined) {
      const splitAt = unitMatch.index + unitMatch[0].length;
      const metaBody = rest.slice(0, splitAt).trim();
      const summary = rest.slice(splitAt).trim();

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