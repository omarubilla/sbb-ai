"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatActions } from "@/lib/store/chat-store-provider";

export function ServiceContactActions() {
  const { openChatWithMessage } = useChatActions();

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Button
        onClick={() =>
          openChatWithMessage(
            "Hi, I need scientific support for a custom project. Can you help me scope assay format, target, and timeline?",
          )
        }
        className="bg-gradient-to-r from-sky-400 to-blue-600 text-white hover:from-sky-500 hover:to-blue-700"
      >
        Contact Scientific Support
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <Button
        type="button"
        className="pointer-events-none bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        Call (415) 935-3226
      </Button>
    </div>
  );
}
