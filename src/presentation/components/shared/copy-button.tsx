"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";

export function CopyButton({ text, dict }: { text: string; dict: Dict }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors",
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
      )}
      aria-label={copied ? dict.copyButton.copiedAria : dict.copyButton.copyAria}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? dict.copyButton.copied : dict.copyButton.copyPrompt}
    </button>
  );
}