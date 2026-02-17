"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Currency = "USD" | "EUR" | "CNY" | "JPY";

interface CurrencyContextType {
  currency: Currency;
  toggleCurrency: () => void;
  getExchangeRate: () => number;
  convertPrice: (priceInUsd: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

// Exchange rates relative to USD
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  CNY: 7.2,
  JPY: 159.77, // 1 CNY = 22.19 JPY
};

const CURRENCY_ORDER: Currency[] = ["USD", "EUR", "CNY", "JPY"];

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");

  const toggleCurrency = () => {
    const currentIndex = CURRENCY_ORDER.indexOf(currency);
    const nextIndex = (currentIndex + 1) % CURRENCY_ORDER.length;
    setCurrency(CURRENCY_ORDER[nextIndex]);
  };

  const getExchangeRate = () => EXCHANGE_RATES[currency];

  const convertPrice = (priceInUsd: number): number => {
    const rate = EXCHANGE_RATES[currency];
    return parseFloat((priceInUsd * rate).toFixed(2));
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, toggleCurrency, getExchangeRate, convertPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
