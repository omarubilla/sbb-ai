"use client";

import { useCurrency } from "@/lib/context/CurrencyContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  CNY: "CN¥",
  JPY: "¥",
};

/**
 * Hook to format prices with current currency context
 * Automatically converts USD prices to selected currency
 */
export function useFormattedPrice() {
  const { currency, convertPrice } = useCurrency();

  const formatPrice = (amount: number | null | undefined): string => {
    const numAmount = amount ?? 0;
    const convertedAmount = convertPrice(numAmount);
    const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";
    return `${currencySymbol}${convertedAmount.toFixed(2)}`;
  };

  return formatPrice;
}
