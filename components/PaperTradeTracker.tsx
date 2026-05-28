import { PaperTrade, TradeResult } from "@/lib/dashboardTypes";
import {
  getGradeStyle,
  formatGrade,
  getRiskStyle,
  getResultStyle,
} from "@/lib/dashboardFormatters";

type PaperTradeTrackerProps = {
  validPaperTrades: PaperTrade[];
  isLoadingPaperTrades: boolean;
  closeTradeStatus: string;
  closingTradeId: string | null;
  onLoadPaperTrades: () => void;
  onClosePaperTrade: (tradeId: string, result: TradeResult) => void;
};

export default function PaperTradeTracker({
  validPaperTrades,
  isLoadingPaperTrades,
  closeTradeStatus,
  closingTradeId,
  onLoadPaperTrades,
  onClosePaperTrade,
}: PaperTradeTrackerProps) {
  const openPaperTrades = validPaperTrades.filter(
    (t) => t.status === "OPEN"
  ).length;

  const closedPaperTrades = validPaperTrades.filter(
    (t) => t.status === "CLOSED"
  );

  const winningTrades = closedPaperTrades.filter(
    (t) => t.result === "WIN"
  ).length;

  const losingTrades = closedPaperTrades.filter(
    (t) => t.result === "LOSS"
  ).length;

  const breakevenTrades = closedPaperTrades.filter(
    (t) => t.result === "BREAKEVEN"
  ).length;

  const winRate =
    closedPaperTrades.length > 0
      ? Math.round((winningTrades / closedPaperTrades.length) * 100)
      : 0;

  const closeStatusColor = closeTradeStatus.startsWith("Paper trade closed")
    ? "text-green-400"
    : closeTradeStatus.startsWith("Close failed")
    ? "text-red-400"
    : "text-slate-400";

  return (
    <section className="mb-8 rounded-3xl border border-purple-500/20 bg-slate-950/70 p-5 shadow-2xl">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-purple-400">
            Paper Trade Tracker
          </p>
          <h2 className="text-2xl font-bold">Open Paper Trades</h2>
          <p className="text-sm text-slate-400">
            Saved trade ideas pulled directly from Supabase.
          </p>
          <p className={`mt-1 text-sm ${closeStatusColor}`}>
            {closeTradeStatus}
          </p>
        </div>

        <button
          onClick={onLoadPaperTrades}
          disabled={isLoadingPaperTrades}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingPaperTrades ? "Loading..." : "Refresh Paper Trades"}
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid gap-4 md:grid-cols-6">
        {[
          { label: "Total Trades", value: validPaperTrades.length, valueClass: "text-white" },
          { label: "Open Trades", value: openPaperTrades, valueClass: "text-purple-400" },
          { label: "Wins", value: winningTrades, valueClass: "text-green-400" },
          { label: "Losses", value: losingTrades, valueClass: "text-red-400" },
          { label: "Breakeven", value: breakevenTrades, valueClass: "text-yellow-400" },
          { label: "Win Rate", value: `${winRate}%`, valueClass: "text-blue-400" },
        ].map(({ label, value, valueClass }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800 bg-black/20 p-4"
          >
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-4">Time</th>
              <th className="px-4 py-4">Ticker</th>
              <th className="px-4 py-4">Entry</th>
              <th className="px-4 py-4">Grade</th>
              <th className="px-4 py-4">Risk</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Result</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {validPaperTrades.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={8}>
                  No paper trades saved yet.
                </td>
              </tr>
            ) : (
              validPaperTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-t border-slate-800 transition hover:bg-slate-900/70"
                >
                  <td className="px-4 py-4 text-slate-400">
                    {new Date(trade.created_at).toLocaleTimeString()}
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-bold text-white">
                      {trade.ticker || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {trade.company || "Unknown company"}
                    </p>
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {trade.entry_price !== null
                      ? `$${Number(trade.entry_price).toFixed(2)}`
                      : "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                        trade.setup_grade
                      )}`}
                    >
                      {formatGrade(trade.setup_grade)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getRiskStyle(
                        trade.risk_level
                      )}`}
                    >
                      {trade.risk_level || "Unknown"}
                    </span>
                  </td>

                  <td className="px-4 py-4 font-bold text-purple-400">
                    {trade.status || "OPEN"}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getResultStyle(
                        trade.result
                      )}`}
                    >
                      {trade.result || "Pending"}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {trade.status === "OPEN" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onClosePaperTrade(trade.id, "WIN")}
                          disabled={closingTradeId === trade.id}
                          className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Win
                        </button>

                        <button
                          onClick={() => onClosePaperTrade(trade.id, "LOSS")}
                          disabled={closingTradeId === trade.id}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Loss
                        </button>

                        <button
                          onClick={() =>
                            onClosePaperTrade(trade.id, "BREAKEVEN")
                          }
                          disabled={closingTradeId === trade.id}
                          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                        >
                          BE
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Closed</span>
                    )}
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
