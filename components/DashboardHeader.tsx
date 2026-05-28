type DashboardHeaderProps = {
  loading: boolean;
  generating: boolean;
  clearing: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
  onClear: () => void;
};

export function DashboardHeader({
  loading,
  generating,
  clearing,
  onRefresh,
  onGenerate,
  onClear,
}: DashboardHeaderProps) {
  const systemBusy = loading || generating || clearing;

  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-gray-900 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400">
          OPTIMA
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
          Trading Command Center
        </h1>

        <p className="mt-3 max-w-2xl text-gray-400">
          Live scan results pulled from Supabase with setup quality, risk,
          entries, stops, profit targets, score breakdowns, filters, search, and
          sorting.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRefresh}
          disabled={systemBusy}
          className="w-fit rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh Scans"}
        </button>

        <button
          onClick={onGenerate}
          disabled={systemBusy}
          className="w-fit rounded-xl bg-green-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "Generating..." : "Generate Scan"}
        </button>

        <button
          onClick={onClear}
          disabled={systemBusy}
          className="w-fit rounded-xl border border-red-700 bg-red-950 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {clearing ? "Clearing..." : "Clear Scans"}
        </button>
      </div>
    </header>
  );
}