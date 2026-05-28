type ScoreBarProps = {
  label: string;
  value: number | null | undefined;
};

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${value}/100`;
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  const safeValue = value ?? 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-xs font-bold text-gray-300">{formatScore(value)}</p>
      </div>

      <div className="h-2 rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-green-400"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}