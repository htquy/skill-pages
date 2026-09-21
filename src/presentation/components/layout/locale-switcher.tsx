"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { locales, trans, type Dict, type Locale } from "@/src/lib/i18n/config";
import { switchLocaleAction } from "@/src/presentation/actions/locale-actions";
import { cn } from "@/src/lib/utils";

export function LocaleSwitcher({ locale, dict }: { locale: Locale; dict: Dict }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5"
      title={trans(dict.locale.switchLanguage)}
    >
      <Languages className="ml-1 size-3.5 text-zinc-400" aria-hidden="true" />
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
              "rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase transition-colors disabled:opacity-60",
              isActive
                ? "bg-zinc-900 text-white"
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