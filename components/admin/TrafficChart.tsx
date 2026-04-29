"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { Activity } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  created: number;
}

interface TrafficChartProps {
  transactions: Transaction[];
  primaryCurrency: string;
}

export function TrafficChart({ transactions, primaryCurrency }: TrafficChartProps) {
  // Process transactions into daily data points for the last 30 days
  const data = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      // Generate a beautiful 'mock' curve for the empty state
      return Array.from({ length: 30 }).map((_, i) => ({
        date: format(subDays(new Date(), 29 - i), "MMM dd"),
        amount: Math.sin(i / 3) * 50 + 50 + Math.random() * 20,
        isEmpty: true,
      }));
    }

    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      return {
        date: format(d, "MMM dd"),
        timestamp: d.getTime(),
        amount: 0,
        isEmpty: false,
      };
    });

    transactions.forEach((tx) => {
      const dateStr = format(new Date(tx.created * 1000), "MMM dd");
      const day = last30Days.find((d) => d.date === dateStr);
      if (day) {
        day.amount += tx.amount / 100;
      }
    });

    return last30Days;
  }, [transactions]);

  const isEmpty = transactions.length === 0;

  return (
    <div className="relative h-[350px] w-full rounded-2xl border border-zinc-200/50 bg-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Traffic & Revenue</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Net volume over the last 30 days</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/10">
          <Activity className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
      </div>

      <div className="h-[240px] w-full">
        {isEmpty && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/40 backdrop-blur-[2px] dark:bg-zinc-950/40">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-sky-900/30 dark:bg-zinc-900/80">
              <Activity className="mb-3 h-8 w-8 text-sky-500" />
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Awaiting Traffic</h4>
              <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400 max-w-[250px]">
                Your store is live. Once you receive your first payment, the real-time chart will appear here.
              </p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={isEmpty ? 0.1 : 0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#71717a' }}
              dy={10}
              minTickGap={20}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#71717a' }}
              tickFormatter={(value) => `$${value}`}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && !isEmpty) {
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        ${payload[0].value?.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={isEmpty ? "#cbd5e1" : "#0ea5e9"}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorAmount)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
