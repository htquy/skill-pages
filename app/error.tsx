"use client";

import { AlertTriangle } from "lucide-react";
import { isAppError } from "@/src/domain/errors";
import { useDict } from "@/src/lib/i18n/client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDict();
  const isExpected = isAppError(error);
  const message = isExpected ? error.message : dict.error.message;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <AlertTriangle className="size-10 text-amber-400" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">
        {isExpected ? dict.error.titleExpected : dict.error.title}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">{message}</p>
      {!isExpected ? (
        <p className="mt-1 text-xs text-zinc-400">{dict.error.retryHint}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        {dict.error.retry}
      </button>
    </div>
  );
}