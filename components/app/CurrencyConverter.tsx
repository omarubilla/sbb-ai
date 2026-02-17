"use client";

import { DollarSign, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/context/CurrencyContext";

function getCurrencyIcon(currency: string) {
  switch (currency) {
    case "USD":
      return <DollarSign className="h-5 w-4" />;
    case "EUR":
      return <Euro className="h-5 w-4" />;
    case "CNY":
      return <span className="text-sm font-bold">¥</span>;
    case "JPY":
      return <span className="text-xs font-bold">¥</span>;
    default:
      return <DollarSign className="h-5 w-4" />;
  }
}

export function CurrencyConverter() {
  const { currency, toggleCurrency } = useCurrency();

  const currencyNames: Record<string, string> = {
    USD: "US Dollar",
    EUR: "Euro",
    CNY: "Chinese Yuan",
    JPY: "Japanese Yen",
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleCurrency}
      title={`Current: ${currencyNames[currency]} (${currency}) - Click to switch currency`}
    >
      {getCurrencyIcon(currency)}
    </Button>
  );
}
