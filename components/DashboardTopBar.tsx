"use client";

type DashboardTopBarProps = {
  marketCondition?: string;
  autoTradeEnabled?: boolean;
  autoScanEnabled?: boolean;
  todayAutoTrades?: number;
  maxAutoTradesPerDay?: number;
  selectedSymbol?: string | null;
  selectedDirection?: string | null;
  riskMode?: string;
};

function getMarketClass(marketCondition?: string) {
  const condition = String(marketCondition || "").toUpperCase();

  if (condition === "BULLISH") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (condition === "BEARISH") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  if (condition === "CHOPPY") {
    return "border-yellow-400/50 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function StatusPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "red" | "yellow" | "blue" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
      : tone === "red"
      ? "border-red-400/40 bg-red-500/10 text-red-300"
      : tone === "yellow"
      ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-300"
      : tone === "blue"
      ? "border-blue-400/40 bg-blue-500/10 text-blue-300"
      : tone === "orange"
      ? "border-orange-400/40 bg-orange-500/10 text-orange-300"
      : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

export default function DashboardTopBar({
  marketCondition = "UNKNOWN",
  autoTradeEnabled = false,
  autoScanEnabled = false,
  todayAutoTrades = 0,
  maxAutoTradesPerDay = 3,
  selectedSymbol = null,
  selectedDirection = null,
  riskMode = "Paper Trading",
}: DashboardTopBarProps) {
  const cleanMarket = String(marketCondition || "UNKNOWN").toUpperCase();
  const selectedSetup =
    selectedSymbol && selectedDirection
      ? `${selectedSymbol} ${selectedDirection}`
      : "None selected";

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-950 to-black p-5 text-white shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Road to Funded Account
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Trading Command Center
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Scanner, Risk Guard, option contract selection, paper trading, and performance tracking.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          <span className="text-slate-500">Mode:</span>{" "}
          <span className="font-black text-white">{riskMode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className={`rounded-2xl border px-4 py-3 ${getMarketClass(cleanMarket)}`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
            Market Condition
          </div>
          <div className="mt-1 text-sm font-black">{cleanMarket}</div>
        </div>

        <StatusPill
          label="Auto Scan"
          value={autoScanEnabled ? "ON" : "OFF"}
          tone={autoScanEnabled ? "green" : "default"}
        />

        <StatusPill
          label="Auto Trade"
          value={autoTradeEnabled ? "ON" : "OFF"}
          tone={autoTradeEnabled ? "green" : "default"}
        />

        <StatusPill
          label="Auto Trades Today"
          value={`${todayAutoTrades}/${maxAutoTradesPerDay}`}
          tone={todayAutoTrades >= maxAutoTradesPerDay ? "red" : "blue"}
        />

        <StatusPill
          label="Selected Setup"
          value={selectedSetup}
          tone={selectedSymbol ? "orange" : "default"}
        />
      </div>
    </div>
  );
}