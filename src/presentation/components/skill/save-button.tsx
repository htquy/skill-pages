"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toggleFavoriteAction } from "@/src/presentation/actions/engagement-actions";

export function SaveButton({
  skillSlug,
  isFavorite,
  compact,
}: {
  skillSlug: string;
  isFavorite: boolean;
  compact?: boolean;
}) {
  const [isSaved, setIsSaved] = useState(isFavorite);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await toggleFavoriteAction({ skillSlug });
            setIsSaved(result.isFavorite);
          } catch {
            setIsSaved((value) => !value);
          }
        });
      }}
      aria-pressed={isSaved}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-60",
        isSaved
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
        compact ? "px-3 py-1.5" : undefined,
      )}
    >
      <Bookmark
        className={cn("size-4", isSaved && "fill-current")}
        aria-hidden="true"
      />
      {pending ? "Updating…" : isSaved ? "Saved" : "Save"}
    </button>
  );
}