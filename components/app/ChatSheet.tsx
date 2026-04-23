"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { Sparkles, Send, Loader2, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useIsChatOpen,
  useChatActions,
  usePendingMessage,
} from "@/lib/store/chat-store-provider";

import {
  getMessageText,
  getToolParts,
  WelcomeScreen,
  MessageBubble,
  ToolCallUI,
} from "./chat";

export function ChatSheet() {
  const isOpen = useIsChatOpen();
  const { closeChat, clearPendingMessage } = useChatActions();
  const pendingMessage = usePendingMessage();
  const { isSignedIn } = useAuth();
  const [input, setInput] = useState("");
  const [isSupportMode, setIsSupportMode] = useState(false);
  const [supportDraftMessage, setSupportDraftMessage] = useState("");
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportInstitution, setSupportInstitution] = useState("");
  const [supportSendStatus, setSupportSendStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SUPPORT_INTAKE_TRIGGER = "__SBB_SUPPORT_INTAKE__";
  const SUPPORT_SEED_USER_MESSAGE =
    "Hi, I need scientific support for a custom project. Can you help me scope assay format, target, and timeline?";
  const SUPPORT_OPENING_MESSAGE = `Hello! I'd be happy to help you scope your custom project. South Bay Bio specializes in the Ubiquitin Proteasome System, and also many other areas where the team can provide expert guidance.

### Project Details
- **Research target:** What protein, pathway, or mechanism are you studying? (E3 ligase activity, proteasome function, specific ubiquitin linkages, etc.)
- **Research goal:** What are you trying to measure or demonstrate?
- **Current approach:** Do you have an existing assay format in mind, or are you open to recommendations?

### Assay Considerations
- **Sample type:** Cell lysates, purified proteins?
- **Detection method preference:** Fluorescence, luminescence, TR-FRET, etc.?
- **Throughput needs:** Single samples, 96-well, or 384-well format?
- **Quantitative vs qualitative:** Do you need precise measurements or yes/no readouts?

### Timeline and Scale
- **Project timeline:** When do you need preliminary results? Final data?
- **Budget considerations:** Any constraints on budget limitations?
- **Expertise level:** Are you experienced with ubiquitin/proteasome assays or new to this area?`;
  const SUPPORT_FOLLOW_UP_MESSAGE =
    "Would you like to send this message? Please add your **name**, **email**, and **institution** below.";

  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive or streaming updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger scroll on message/loading changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle pending message - send it when chat opens
  useEffect(() => {
    if (isOpen && pendingMessage && !isLoading) {
      if (pendingMessage === SUPPORT_INTAKE_TRIGGER) {
        setIsSupportMode(true);
        setSupportDraftMessage("");
        setSupportName("");
        setSupportEmail("");
        setSupportInstitution("");
        setSupportSendStatus("idle");
        setInput("");
        clearPendingMessage();
        return;
      }

      setIsSupportMode(false);
      sendMessage({ text: pendingMessage });
      clearPendingMessage();
    }
  }, [
    isOpen,
    pendingMessage,
    isLoading,
    sendMessage,
    clearPendingMessage,
  ]);

  const handleSupportSend = async () => {
    if (supportSendStatus === "sending") return;

    setSupportSendStatus("sending");

    try {
      const response = await fetch("/api/support-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: supportName.trim(),
          email: supportEmail.trim(),
          institution: supportInstitution.trim(),
          message: supportDraftMessage.trim(),
        }),
      });

      if (!response.ok) {
        setSupportSendStatus("failed");
        return;
      }

      setSupportSendStatus("sent");
    } catch {
      setSupportSendStatus("failed");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (isSupportMode) {
      if (!supportDraftMessage) {
        setSupportDraftMessage(input.trim());
        setInput("");
      }
      return;
    }

    sendMessage({ text: input });
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only visible on mobile/tablet (< xl) */}
      <div
        className="fixed inset-0 z-40 bg-black/50 xl:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-zinc-200 bg-white overscroll-contain dark:border-zinc-800 dark:bg-zinc-950 sm:w-[448px] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-blue-600" />
              South Bay Bio Research Assistant
            </div>
            <Button variant="ghost" size="icon" onClick={closeChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isSupportMode ? (
            <div className="space-y-4">
              <MessageBubble
                role="user"
                content={SUPPORT_SEED_USER_MESSAGE}
                closeChat={closeChat}
              />

              <MessageBubble
                role="assistant"
                content={SUPPORT_OPENING_MESSAGE}
                closeChat={closeChat}
                variant="support"
              />

              {supportDraftMessage && (
                <>
                  <MessageBubble
                    role="user"
                    content={supportDraftMessage}
                    closeChat={closeChat}
                  />
                  <MessageBubble
                    role="assistant"
                    content={SUPPORT_FOLLOW_UP_MESSAGE}
                    closeChat={closeChat}
                    variant="support"
                  />

                  <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                    <Input
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="Your name"
                    />
                    <Input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="Your email"
                    />
                    <Input
                      value={supportInstitution}
                      onChange={(e) => setSupportInstitution(e.target.value)}
                      placeholder="Your institution"
                    />

                    <Button
                      type="button"
                      onClick={handleSupportSend}
                      disabled={
                        supportSendStatus === "sending" ||
                        !supportName.trim() ||
                        !supportEmail.trim() ||
                        !supportInstitution.trim()
                      }
                      className="w-full bg-zinc-300 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-100 enabled:bg-gradient-to-r enabled:from-sky-500 enabled:to-teal-500 enabled:text-white enabled:hover:from-sky-600 enabled:hover:to-teal-600"
                    >
                      {supportSendStatus === "sending" ? "Sending..." : "Send"}
                    </Button>

                    {supportSendStatus === "sent" && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Inquiry sent to support and a copy was sent to your email.
                      </p>
                    )}
                    {supportSendStatus === "failed" && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Could not send inquiry right now. Please try again.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={sendMessage}
              isSignedIn={isSignedIn ?? false}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const content = getMessageText(message);
                const toolParts = getToolParts(message);
                const hasContent = content.length > 0;
                const hasTools = toolParts.length > 0;

                if (!hasContent && !hasTools) return null;

                return (
                  <div key={message.id} className="space-y-3">
                    {/* Tool call indicators */}
                    {hasTools &&
                      toolParts.map((toolPart) => (
                        <ToolCallUI
                          key={`tool-${message.id}-${toolPart.toolCallId}`}
                          toolPart={toolPart}
                          closeChat={closeChat}
                        />
                      ))}

                    {/* Message content */}
                    {hasContent && (
                      <MessageBubble
                        role={message.role}
                        content={content}
                        closeChat={closeChat}
                      />
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isSupportMode
                  ? supportDraftMessage
                    ? "Complete the form above to send"
                    : "Describe your project details..."
                  : "Ask about our bio products..."
              }
              disabled={isLoading || (isSupportMode && Boolean(supportDraftMessage))}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                !input.trim() ||
                isLoading ||
                (isSupportMode && Boolean(supportDraftMessage))
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
