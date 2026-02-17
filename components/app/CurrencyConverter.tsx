"use client";

import { useState } from "react";
import { DollarSign, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CurrencyConverter() {
  const [open, setOpen] = useState(false);
  const [euros, setEuros] = useState("");
  const [dollars, setDollars] = useState("");

  // EUR to USD conversion rate (approximate, update as needed)
  const EUR_TO_USD = 1.08;

  const handleEuroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEuros(value);
    if (value) {
      const usd = (parseFloat(value) * EUR_TO_USD).toFixed(2);
      setDollars(usd);
    } else {
      setDollars("");
    }
  };

  const handleDollarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDollars(value);
    if (value) {
      const eur = (parseFloat(value) / EUR_TO_USD).toFixed(2);
      setEuros(eur);
    } else {
      setEuros("");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Convert EUR to USD"
      >
        <DollarSign className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Currency Converter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Euro className="h-4 w-4" />
                Euros (EUR)
              </label>
              <Input
                type="number"
                placeholder="Enter euros"
                value={euros}
                onChange={handleEuroChange}
                className="text-base"
              />
            </div>

            <div className="flex justify-center">
              <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800">
                <DollarSign className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                US Dollars (USD)
              </label>
              <Input
                type="number"
                placeholder="Enter dollars"
                value={dollars}
                onChange={handleDollarChange}
                className="text-base"
              />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Exchange rate: 1 EUR = ${EUR_TO_USD} USD
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
