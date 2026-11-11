"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { locales, trans, type Dict, type Locale } from "@/src/lib/i18n/config";
import { switchLocaleAction } from "@/src/presentation/actions/locale-actions";
import { cn } from "@/src/lib/utils";

export function LocaleSwitcher({
  locale,
  dict,
  className,
}: {
  locale: Locale;
  dict: Dict;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn("flex items-center gap-1 rounded-lg border border-zinc-200 bg-surface p-0.5", className)}
      title={trans(dict.locale.switchLanguage)}
    >
      <Languages className="ml-1 hidden size-3.5 text-zinc-400 sm:block" aria-hidden="true" />
      {locales.map((option) => {
        const isActive = option === locale;
        return (
          <button
            key={option}
            type="button"
            disabled={pending}
            aria-pressed={isActive}
            onClick={() => {
              startTransition(async () => {
                await switchLocaleAction(option, pathname);
                router.refresh();
              });
            }}
            className={cn(
              "min-h-9 min-w-9 rounded-md px-2 py-0.5 text-xs font-semibold uppercase sm:min-h-0 sm:min-w-0 sm:px-1.5 transition-colors disabled:opacity-60",
              isActive
                ? "bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-sm"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}