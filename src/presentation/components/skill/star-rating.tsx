import { Star } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";

export async function StarRating({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  const dict = await getDictionary();
  const rounded = Math.round(rating);
  const ratingLabel = trans(dict.skillDetail.ratingAria, { rating: rating.toFixed(1) });
  const countLabel = count != null ? trans(dict.skillDetail.ratingCountAria, { count }) : "";
  const ariaLabel = `${ratingLabel}${countLabel}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm", className)}
      aria-label={ariaLabel}
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