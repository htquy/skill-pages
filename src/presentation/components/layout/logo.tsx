import Link from "next/link";
import { Store } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { siteConfig } from "@/src/lib/site";

// "StoreWorks" → "Store" + "Works": tô màu từ cuối của tên ghép kiểu PascalCase.
const nameMatch = /^(.+?)([A-Z][a-z]+)$/.exec(siteConfig.name);
const nameHead = nameMatch ? nameMatch[1] : siteConfig.name;
const nameTail = nameMatch ? nameMatch[2] : "";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("group flex min-h-11 items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg text-white shadow-glow transition-transform duration-500 ease-out bg-brand-500">
        <Store className="size-4" aria-hidden="true" />
        {/* Đốm hổ phách: điểm nhấn ấm duy nhất của logo. */}
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-spark-400 ring-2 ring-surface" aria-hidden="true" />
      </span>
      <span className="text-base text-zinc-900 sm:text-lg">
        {nameHead}
        <span className="text-brand-600">{nameTail}</span>
      </span>
    </Link>
  );
}
