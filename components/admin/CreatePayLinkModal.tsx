"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Copy, CheckCircle2, Loader2, Link as LinkIcon } from "lucide-react";
import { createBankfulPayLink } from "@/lib/actions/bankful-checkout";

export default function CreatePayLinkModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendEmailNow, setSendEmailNow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setWarning("");
    setSuccessUrl("");
    setCopied(false);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      setIsLoading(false);
      return;
    }

    const normalizedEmail = customerEmail.trim();
    if (sendEmailNow && !normalizedEmail) {
      setError("Enter a customer email to send the invoice now.");
      setIsLoading(false);
      return;
    }

    const res = await createBankfulPayLink({
      amount: numericAmount,
      description,
      customerEmail: sendEmailNow ? normalizedEmail : undefined,
    });

    if (res.success && res.url) {
      setSuccessUrl(res.url);
      if (res.warning) {
        setWarning(res.warning);
      }
      router.refresh(); // Refresh the page to show the new link in the background list
    } else {
      setError(res.error || "Failed to generate link.");
    }
    setIsLoading(false);
  };

  const copyToClipboard = () => {
    if (!successUrl) return;
    navigator.clipboard.writeText(successUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setSuccessUrl("");
    setAmount("");
    setDescription("");
    setCustomerEmail("");
    setSendEmailNow(false);
    setError("");
    setWarning("");
    setCopied(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="group gap-2 rounded-full bg-sky-600 px-6 shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-500/40"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
        Create Link
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/80">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Create Payment Link
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!successUrl ? (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="pl-8 bg-white/50 dark:bg-zinc-950/50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Invoice Number or Description
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Invoice #4920"
                    className="bg-white/50 dark:bg-zinc-950/50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Customer Email (optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="customer@company.com"
                    className="bg-white/50 dark:bg-zinc-950/50"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={sendEmailNow}
                    onChange={(e) => setSendEmailNow(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Send invoice email now
                </label>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-sky-600 hover:bg-sky-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Link"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Link Ready!
                </h3>
                <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                  Your Bankful payment link has been generated and saved to your dashboard.
                </p>

                {warning && (
                  <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {warning}
                  </p>
                )}
                
                <div className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white dark:bg-zinc-900">
                    <LinkIcon className="h-4 w-4 text-zinc-500" />
                  </div>
                  <Input
                    readOnly
                    value={successUrl}
                    className="h-8 border-0 bg-transparent px-2 text-sm focus-visible:ring-0"
                  />
                  <Button
                    size="sm"
                    onClick={copyToClipboard}
                    className={`shrink-0 transition-colors ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200'}`}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>
                
                <div className="mt-6 flex w-full flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={resetForm}
                  >
                    Create Another Link
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
