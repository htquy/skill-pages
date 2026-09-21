"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, Sparkles, User } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";
import { signOutAction } from "@/src/presentation/actions/auth-actions";

export interface AccountMenuUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

export function AccountMenu({ user, dict }: { user: AccountMenuUser | null; dict: Dict }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
      >
        {dict.account.signIn}
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <User className="size-4" aria-hidden="true" />
          </span>
        )}
        <span className="hidden max-w-36 truncate sm:block">
          {user.name ?? dict.account.signedIn}
        </span>
        <ChevronDown className="size-4 text-zinc-400" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg"
        >
          <div role="menuitem" className="px-3 py-2">
            <p className="truncate text-sm font-medium text-zinc-900">
              {user.name ?? dict.account.signedIn}
            </p>
            {user.email ? (
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            ) : null}
          </div>
          <hr className="my-1 border-zinc-100" />
          <Link
            href="/account/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Sparkles className="size-4 text-zinc-400" aria-hidden="true" />
            {dict.account.savedSkills}
          </Link>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <User className="size-4 text-zinc-400" aria-hidden="true" />
            {dict.account.account}
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2",
                "text-sm text-zinc-700 hover:bg-zinc-50",
              )}
            >
              <LogOut className="size-4 text-zinc-400" aria-hidden="true" />
              {dict.account.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}