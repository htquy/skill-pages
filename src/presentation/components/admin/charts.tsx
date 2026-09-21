export const PIE_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#84cc16",
];

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  data,
  size = 176,
  thickness = 26,
  centerLabel,
  centerValue,
  format,
  noDataLabel = "No data",
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  format?: (value: number) => string;
  noDataLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const rawSegments =
    total === 0 ? [{ label: noDataLabel, value: 1, color: "#e4e4e7" }] : data.filter((item) => item.value > 0);
  const prepared = rawSegments.reduce<
    { label: string; value: number; color: string; length: number; offset: number }[]
  >((acc, segment) => {
    const length = (segment.value / total) * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    acc.push({ label: segment.label, value: segment.value, color: segment.color ?? "#e4e4e7", length, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={prepared.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={thickness}
        />
        {prepared.map((segment) => (
          <circle
            key={segment.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={thickness}
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        {centerValue || centerLabel ? (
          <text
            x="50%"
            y={centerValue && centerLabel ? "46%" : "50%"}
            textAnchor="middle"
            className="fill-zinc-900 text-xl font-bold"
          >
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            className="fill-zinc-400 text-xs"
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>

      <ul className="w-full space-y-1.5 sm:w-auto">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-zinc-600">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: item.color ?? "#e4e4e7" }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span className="font-medium text-zinc-900">
              {format ? format(item.value) : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarChartV({
  data,
  format,
}: {
  data: ChartDatum[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div>
      <div className="flex h-48 gap-1.5">
        {data.map((item) => {
          const height = item.value > 0 ? Math.max((item.value / max) * 100, 3) : 0;
          return (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center justify-end gap-1 border-t border-zinc-100"
            >
              <span className="text-[10px] font-medium text-zinc-500">
                {format ? format(item.value) : item.value}
              </span>
              <div
                className="w-full max-w-8 rounded-t-md"
                style={{ height: `${height}%`, backgroundColor: item.color ?? "#6366f1" }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((item) => (
          <span key={item.label} className="flex-1 truncate text-center text-[10px] text-zinc-400">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProgressBars({
  data,
  format,
}: {
  data: ChartDatum[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <ul className="space-y-4">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-zinc-800">{item.label}</span>
            <span className="shrink-0 font-medium text-zinc-500">
              {format ? format(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color ?? "#6366f1" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}