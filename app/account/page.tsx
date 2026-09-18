export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, Shield, ArrowRight } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { requireUser } from "@/src/infrastructure/authentication/authorization";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <div className="flex flex-col items-center text-center">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Your avatar"}
            width={80}
            height={80}
            className="size-20 rounded-full border-4 border-white shadow-md ring-1 ring-zinc-200"
          />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-bold text-white shadow-md">
            {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
          </span>
        )}
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900">
          {user.name ?? "Your account"}
        </h1>
        <p className="mt-1 text-zinc-500">{user.email}</p>
        {user.role === "ADMIN" ? (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <Shield className="size-3.5" aria-hidden="true" />
            Admin
          </span>
        ) : null}
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <Link
          href="/account/saved"
          className="group flex items-center gap-4 border-b border-zinc-100 px-6 py-5 transition-colors hover:bg-zinc-50"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Bookmark className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-zinc-900">Saved skills</span>
            <span className="block text-sm text-zinc-500">
              Everything you&apos;ve bookmarked for later.
            </span>
          </span>
          <ArrowRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-4 px-6 py-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500">
            <Shield className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-zinc-900">Privacy</span>
            <span className="block text-sm text-zinc-500">
              Your saved skills and browsing are only visible to you.
            </span>
          </span>
        </div>
      </div>
    </Container>
  );
}