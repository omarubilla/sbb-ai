"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">Copy Link</span>
    </Button>
  );
}
