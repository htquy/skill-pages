import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getDictionary } from "@/src/lib/i18n";

export default async function NotFound() {
  const dict = await getDictionary();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <FileQuestion className="size-10 text-zinc-300" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        {dict.notFound.title}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        {dict.notFound.description}
      </p>
      <Link
        href="/"
        className="btn-primary mt-6 text-sm"
      >
        {dict.notFound.backHome}
      </Link>
    </div>
  );
}