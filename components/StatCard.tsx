type StatCardProps = {
  label: string;
  value: string | number;
  valueClassName?: string;
};

export default function StatCard({
  label,
  value,
  valueClassName = "text-white",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}