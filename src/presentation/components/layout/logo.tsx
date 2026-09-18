import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { siteConfig } from "@/src/lib/site";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <span className="text-base text-zinc-900 sm:text-lg">{siteConfig.name}</span>
    </Link>
  );
}