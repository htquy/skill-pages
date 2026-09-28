"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";

export function CopyButton({
  text,
  dict,
  iconOnly = false,
}: {
  text: string;
  dict: Dict;
  /** Chỉ hiện icon, dùng khi nút nằm cạnh giá trị đã có sẵn nhãn. */
  iconOnly?: boolean;
}) {
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
        "inline-flex items-center rounded-lg border shadow-sm transition-colors",
        iconOnly ? "size-8 justify-center" : "gap-1.5 px-3 py-2 text-sm font-medium",
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
      )}
      aria-label={copied ? dict.copyButton.copiedAria : dict.copyButton.copyAria}
      title={copied ? dict.copyButton.copied : dict.copyButton.copyAria}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {iconOnly ? null : copied ? dict.copyButton.copied : dict.copyButton.copyPrompt}
    </button>
  );
}