import { getRiskStyle } from "@/lib/dashboardFormatters";

type TradePlan = {
  ticker: string;
  bias: string;
  action: string;
  entryZone: string;
  stopRule: string;
  profitRule: string;
  notes: string;
  riskLevel: string;
};

type TradePlanPreviewProps = {
  tradePlan: TradePlan;
  isSavingPaperTrade: boolean;
  paperTradeStatus: string;
  onSavePaperTrade: () => void;
};

export default function TradePlanPreview({
  tradePlan,
  isSavingPaperTrade,
  paperTradeStatus,
  onSavePaperTrade,
}: TradePlanPreviewProps) {
  const statusColor =
    paperTradeStatus.startsWith("Saved") ||
    paperTradeStatus.includes("already in open paper trades") ||
    paperTradeStatus.startsWith("Auto-checking")
      ? "text-green-400"
      : paperTradeStatus.startsWith("Paper trade save failed") ||
        paperTradeStatus.startsWith("Auto paper trade failed")
      ? "text-red-400"
      : "text-slate-400";

  return (
    <section className="mb-8 rounded-3xl border border-blue-500/20 bg-slate-950/70 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
            Trade Plan Preview
          </p>
          <h2 className="text-2xl font-bold">{tradePlan.ticker} Plan</h2>
          <p className="mt-2 text-sm text-slate-400">
            This is a paper-trading plan generated from the current best setup.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div
            className={`rounded-full border px-4 py-2 text-sm font-bold ${getRiskStyle(
              tradePlan.riskLevel
            )}`}
          >
            {tradePlan.riskLevel} Risk
          </div>

          <button
            onClick={onSavePaperTrade}
            disabled={isSavingPaperTrade}
            className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingPaperTrade ? "Saving..." : "Add to Paper Trades"}
          </button>

          <p className={`text-xs ${statusColor}`}>{paperTradeStatus}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Bias", value: tradePlan.bias, valueClass: "text-white" },
          { label: "Action", value: tradePlan.action, valueClass: "text-blue-400" },
          { label: "Entry Zone", value: tradePlan.entryZone, valueClass: "text-slate-200" },
          { label: "Stop Rule", value: tradePlan.stopRule, valueClass: "text-slate-200" },
          { label: "Profit Rule", value: tradePlan.profitRule, valueClass: "text-slate-200" },
          { label: "Notes", value: tradePlan.notes, valueClass: "text-slate-200" },
        ].map(({ label, value, valueClass }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800 bg-black/20 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {label}
            </p>
            <p className={`mt-2 text-sm font-semibold ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
