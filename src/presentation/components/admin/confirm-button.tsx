"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/src/lib/utils";

export function ConfirmButton({
  action,
  id,
  message,
  workingLabel,
  children,
  className,
}: {
  action: (id: string) => void | Promise<void>;
  id: string;
  message: string;
  workingLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const bound = action.bind(null, id) as unknown as () => void;
  return (
    <form
      action={bound}
      className="inline-flex"
      onSubmit={(event) => {
        if (typeof window !== "undefined" && !window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton className={className} workingLabel={workingLabel}>
        {children}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  workingLabel,
  className,
}: {
  children: React.ReactNode;
  workingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? workingLabel : children}
    </button>
  );
}