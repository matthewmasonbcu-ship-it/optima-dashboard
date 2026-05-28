import { SavedScan, HistoryFilter } from "@/lib/dashboardTypes";
import {
  getGradeStyle,
  formatGrade,
  getDecisionStyle,
  formatDecision,
} from "@/lib/dashboardFormatters";

type ScanHistoryTableProps = {
  scanHistory: SavedScan[];
  historyFilter: HistoryFilter;
  isLoadingHistory: boolean;
  onSetFilter: (filter: HistoryFilter) => void;
  onRefresh: () => void;
};

const FILTERS: { label: string; value: HistoryFilter; activeClass: string }[] =
  [
    {
      label: "All",
      value: "ALL",
      activeClass: "border-blue-500/40 bg-blue-500/15 text-blue-400",
    },
    {
      label: "A Setups",
      value: "A",
      activeClass: "border-green-500/40 bg-green-500/15 text-green-400",
    },
    {
      label: "Watch Closely",
      value: "WATCH",
      activeClass: "border-blue-500/40 bg-blue-500/15 text-blue-400",
    },
    {
      label: "Skip / Avoid",
      value: "SKIP",
      activeClass: "border-red-500/40 bg-red-500/15 text-red-400",
    },
  ];

function applyFilter(scans: SavedScan[], filter: HistoryFilter): SavedScan[] {
  if (filter === "ALL") return scans;
  if (filter === "A") return scans.filter((s) => s.setup_grade === "A");
  if (filter === "WATCH")
    return scans.filter((s) => s.decision === "WATCH_CLOSELY");
  if (filter === "SKIP")
    return scans.filter(
      (s) => s.decision === "SKIP" || s.setup_grade === "AVOID"
    );
  return scans;
}

export default function ScanHistoryTable({
  scanHistory,
  historyFilter,
  isLoadingHistory,
  onSetFilter,
  onRefresh,
}: ScanHistoryTableProps) {
  const filtered = applyFilter(scanHistory, historyFilter);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scan History</h2>
          <p className="text-sm text-slate-400">
            Newest saved rows pulled directly from Supabase.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ label, value, activeClass }) => (
            <button
              key={value}
              onClick={() => onSetFilter(value)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                historyFilter === value
                  ? activeClass
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={onRefresh}
            disabled={isLoadingHistory}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingHistory ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-4">Time</th>
              <th className="px-4 py-4">Ticker</th>
              <th className="px-4 py-4">Price</th>
              <th className="px-4 py-4">Grade</th>
              <th className="px-4 py-4">Decision</th>
              <th className="px-4 py-4">Reason</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={6}>
                  No saved scan history matches this filter yet.
                </td>
              </tr>
            ) : (
              filtered.map((scan) => (
                <tr
                  key={scan.id}
                  className="border-t border-slate-800 transition hover:bg-slate-900/70"
                >
                  <td className="px-4 py-4 text-slate-400">
                    {new Date(scan.created_at).toLocaleTimeString()}
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-bold text-white">{scan.ticker}</p>
                    <p className="text-xs text-slate-500">
                      {scan.company || "Unknown company"}
                    </p>
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {scan.price !== null
                      ? `$${Number(scan.price).toFixed(2)}`
                      : "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                        scan.setup_grade
                      )}`}
                    >
                      {formatGrade(scan.setup_grade)}
                    </span>
                  </td>

                  <td
                    className={`px-4 py-4 font-bold ${getDecisionStyle(
                      scan.decision
                    )}`}
                  >
                    {formatDecision(scan.decision)}
                  </td>

                  <td className="max-w-md px-4 py-4 text-xs text-slate-400">
                    {scan.reason || "No reason saved."}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
