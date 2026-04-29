"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SeoStatusResponse = {
  ok: boolean;
  quota: {
    totalSearchesLeft: number | null;
    thisMonthUsage: number | null;
    thisMonthLimit: number | null;
  } | null;
  latestCheckedAt: string | null;
  productCount: number;
  error?: string;
};

export function SeoControls({ initialLastRefresh }: { initialLastRefresh: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SeoStatusResponse | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/admin/seo/status", { cache: "no-store" });
        const data = (await response.json()) as SeoStatusResponse;
        setStatus(data);
      } catch {
        setStatus(null);
      }
    };

    void fetchStatus();
  }, []);

  const quotaText = useMemo(() => {
    if (!status?.quota) {
      return "Quota: unavailable";
    }

    const { totalSearchesLeft, thisMonthUsage, thisMonthLimit } = status.quota;

    if (typeof totalSearchesLeft === "number") {
      return `Quota left: ${totalSearchesLeft}`;
    }

    if (typeof thisMonthUsage === "number" && typeof thisMonthLimit === "number") {
      return `Quota: ${thisMonthUsage}/${thisMonthLimit}`;
    }

    return "Quota: unavailable";
  }, [status]);

  const handleRefresh = () => {
    startTransition(async () => {
      setMessage("Refreshing rankings...");

      const response = await fetch("/api/admin/seo/refresh", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        updated?: number;
        failed?: number;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setMessage(payload.error ?? "Refresh failed.");
        return;
      }

      setMessage(`Refresh complete. Updated ${payload.updated ?? 0}, failed ${payload.failed ?? 0}.`);
      router.refresh();

      try {
        const statusResponse = await fetch("/api/admin/seo/status", { cache: "no-store" });
        const statusPayload = (await statusResponse.json()) as SeoStatusResponse;
        setStatus(statusPayload);
      } catch {
        // keep previous status
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {quotaText}
        </div>

        <Button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-full bg-sky-600 px-5 text-white hover:bg-sky-700"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Refreshing" : "Refresh Now"}
        </Button>

        <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Last refresh: {initialLastRefresh}
        </div>
      </div>

      {message && <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}
    </div>
  );
}
