import { User, Bot } from "lucide-react";
import { MessageContent } from "./MessageContent";

interface MessageBubbleProps {
  role: string;
  content: string;
  closeChat: () => void;
  variant?: "default" | "support";
}

export function MessageBubble({
  role,
  content,
  closeChat,
  variant = "default",
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isSupportAssistant = variant === "support" && !isUser;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-zinc-900 dark:bg-zinc-100"
            : isSupportAssistant
              ? "bg-blue-100"
              : "bg-sky-100 dark:bg-sky-950"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white dark:text-zinc-900" />
        ) : (
          <Bot
            className={`h-4 w-4 ${
              isSupportAssistant ? "text-blue-600" : "text-blue-600 dark:text-blue-400"
            }`}
          />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : isSupportAssistant
              ? "border border-zinc-200 bg-zinc-100 text-zinc-900"
              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <MessageContent
          content={content}
          closeChat={closeChat}
          isUser={isUser}
        />
      </div>
    </div>
  );
}
