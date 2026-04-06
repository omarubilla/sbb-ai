"use client";

import { useIsChatOpen } from "@/lib/store/chat-store-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isChatOpen = useIsChatOpen();

  return (
    <div
      className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
        isChatOpen ? "max-xl:overflow-hidden max-xl:h-screen" : ""
      }`}
    >
      {children}
    </div>
  );
}
