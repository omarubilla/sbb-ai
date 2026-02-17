"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatActions } from "@/lib/store/chat-store-provider";

interface AskAISimilarButtonProps {
  productName: string;
}

export function AskAISimilarButton({ productName }: AskAISimilarButtonProps) {
  const { openChatWithMessage } = useChatActions();

  const handleClick = () => {
    openChatWithMessage(`Show me products similar to "${productName}"`);
  };

  return (
    <Button
      onClick={handleClick}
      className="w-full gap-2 bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-lg hover:from-sky-500 hover:to-blue-700 hover:shadow-xl dark:from-sky-500 dark:to-blue-700 dark:hover:from-sky-600 dark:hover:to-blue-800"
    >
      <Sparkles className="h-4 w-4" />
      Ask AI for similar products
    </Button>
  );
}
