import { Star } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function StarRating({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5${count != null ? ` (${count} ratings)` : ""}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              "size-3.5",
              index < rounded ? "fill-amber-400 text-amber-400" : "text-zinc-300",
            )}
          />
        ))}
      </span>
      <span className="font-medium text-zinc-700">{rating.toFixed(1)}</span>
      {count != null ? <span className="text-zinc-500">({count})</span> : null}
    </span>
  );
}