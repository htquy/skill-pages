export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Image from "next/image";
import { Bookmark } from "lucide-react";
import { getCurrentUser } from "@/src/infrastructure/authentication/authorization";
import { signInWithGoogle } from "@/src/presentation/actions/auth-actions";
import { siteConfig } from "@/src/lib/site";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/account");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-indigo-50/60 via-white to-white px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-md">
            {siteConfig.name.slice(0, 2)}
          </span>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-zinc-900">
          Sign in to {siteConfig.name}
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Save skills you love, track engagement and get a personalized
          ranking view.
        </p>

        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <Image
              src="/brand/google.svg"
              alt=""
              width={18}
              height={18}
              className="size-[18px]"
            />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          By continuing you agree to our terms of service and privacy policy.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-50/70 px-4 py-3 text-xs text-indigo-700">
          <Bookmark className="size-4" aria-hidden="true" />
          Your saved skills stay private to your account.
        </div>
      </div>
    </div>
  );
}