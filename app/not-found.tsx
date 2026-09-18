import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <FileQuestion className="size-10 text-zinc-300" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Back home
      </Link>
    </div>
  );
}