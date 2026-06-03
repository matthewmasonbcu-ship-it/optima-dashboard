type BestSetupCardProps = {
  bestSetup?: any;
  setup?: any;
  scanResult?: any;
  marketCondition?: string;
  onSavePaperTrade?: () => void;
  onAddToPaperTrades?: () => void;
  onSelect?: () => void;
};

function formatDollar(value: any) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "$0.00";
  }

  return `$${numberValue.toFixed(2)}`;
}

function formatPercent(value: any) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0.00%";
  }

  return `${numberValue.toFixed(2)}%`;
}

function formatValue(value: any, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default function BestSetupCard({
  bestSetup,
  setup,
  scanResult,
  marketCondition,
  onSavePaperTrade,
  onAddToPaperTrades,
  onSelect,
}: BestSetupCardProps) {
  const activeSetup = setup ?? bestSetup ?? scanResult;

  if (!activeSetup) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-400">
          No best setup yet. Run the scanner first.
        </p>
      </div>
    );
  }

  const symbol = activeSetup.symbol ?? "N/A";

  const price =
    activeSetup.price ??
    activeSetup.currentPrice ??
    activeSetup.quote?.c ??
    0;

  const changePercent =
    activeSetup.changePercent ??
    activeSetup.percentChange ??
    activeSetup.quote?.dp ??
    0;

  const direction =
    activeSetup.tradeDirection ??
    activeSetup.direction ??
    "NO TRADE";

  const score =
    activeSetup.score ??
    activeSetup.setupScore ??
    activeSetup.confidenceScore ??
    0;

  const grade = activeSetup.grade ?? "N/A";

  const decision = activeSetup.decision ?? "N/A";

  const activeMarketCondition =
    activeSetup.marketCondition ?? marketCondition ?? "UNKNOWN";

  const marketAlignment =
    activeSetup.marketAlignment ??
    activeSetup.directionBias ??
    activeSetup.marketBias ??
    "N/A";

  const stopLoss = activeSetup.stopLoss ?? activeSetup.stop_loss ?? null;
  const takeProfit = activeSetup.takeProfit ?? activeSetup.take_profit ?? null;
  const riskReward = activeSetup.riskReward ?? activeSetup.risk_reward ?? "N/A";

  const blockReasons = Array.isArray(activeSetup.blockReasons)
    ? activeSetup.blockReasons
    : [];

  const handleSave = onSavePaperTrade ?? onAddToPaperTrades;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Best Setup
          </p>
          <h3 className="text-2xl font-bold text-white">{symbol}</h3>
          <p className="text-sm text-slate-400">
            {direction} • {formatPercent(changePercent)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-right">
          <p className="text-xs text-slate-400">Score</p>
          <p className="text-xl font-bold text-white">{score}/100</p>
        </div>
      </div>

      <div className="space-y-1">
        <InfoRow label="Price" value={formatDollar(price)} />
        <InfoRow label="Direction" value={formatValue(direction)} />
        <InfoRow label="Grade" value={formatValue(grade)} />
        <InfoRow label="Decision" value={formatValue(decision)} />
        <InfoRow label="Market" value={formatValue(activeMarketCondition)} />
        <InfoRow label="Market Alignment" value={formatValue(marketAlignment)} />
        <InfoRow label="Stop Loss" value={formatDollar(stopLoss)} />
        <InfoRow label="Take Profit" value={formatDollar(takeProfit)} />
        <InfoRow label="Risk/Reward" value={formatValue(riskReward)} />
      </div>

      {activeSetup.tradeSummary ? (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
          {activeSetup.tradeSummary}
        </div>
      ) : null}

      {blockReasons.length > 0 ? (
        <div className="mt-4 rounded-lg border border-yellow-700/50 bg-yellow-950/30 p-3">
          <p className="mb-2 text-sm font-semibold text-yellow-300">
            Block Reasons
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-yellow-100">
            {blockReasons.map((reason: string, index: number) => (
              <li key={`${reason}-${index}`}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onSelect ? (
          <button
            onClick={onSelect}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Select Setup
          </button>
        ) : null}

        {handleSave ? (
          <button
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Add Best Setup to Paper Trades
          </button>
        ) : null}
      </div>
    </div>
  );
}