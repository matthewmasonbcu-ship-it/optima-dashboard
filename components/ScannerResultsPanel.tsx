"use client";

type TradeDirection = "CALL" | "PUT" | "NO TRADE";
type MarketCondition = "BULLISH" | "BEARISH" | "CHOPPY" | "UNKNOWN";

type ScanResult = {
  symbol: string;
  price?: number;
  changePercent?: number;
  change_percent?: number;
  direction?: TradeDirection;
  tradeDirection?: TradeDirection;
  directionBias?: "BULLISH" | "BEARISH" | "NEUTRAL";
  setupScore?: number;
  setup_score?: number;
  confidenceScore?: number;
  confidence_score?: number;
  trendStrength?: number;
  trend_strength?: number;
  volumeConfirmation?: boolean;
  volume_confirmation?: boolean;
  marketAlignment?: boolean;
  market_alignment?: boolean;
  riskReward?: number;
  risk_reward?: number;
  stopLoss?: number;
  stop_loss?: number;
  takeProfit?: number;
  take_profit?: number;
  entryPrice?: number;
  entry_price?: number;
  blockReasons?: string[];
  block_reasons?: string[];
  tradeSummary?: string;
  trade_summary?: string;
  optionCandidateType?: string;
  preferredExpirationWindow?: string;
  preferredMoneyness?: string;
  liquidityWarning?: string;
  contractSelectionStatus?: string;
};

type ScannerResultsPanelProps = {
  scannerResults?: ScanResult[];
  results?: ScanResult[];
  selectedSymbol?: string | null;
  onSelectSetup?: (setup: ScanResult) => void;
  onSelectResult?: (setup: ScanResult) => void;
  marketCondition?: MarketCondition | string;
};

function getNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatMoney(value: unknown) {
  const num = getNumber(value, 0);

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercent(value: unknown) {
  const num = getNumber(value, 0);
  const sign = num > 0 ? "+" : "";

  return `${sign}${num.toFixed(2)}%`;
}

function getDirection(result: ScanResult): TradeDirection {
  return result.tradeDirection || result.direction || "NO TRADE";
}

function getSetupScore(result: ScanResult) {
  return getNumber(result.setupScore ?? result.setup_score, 0);
}

function getConfidenceScore(result: ScanResult) {
  return getNumber(result.confidenceScore ?? result.confidence_score, 0);
}

function getTrendStrength(result: ScanResult) {
  return getNumber(result.trendStrength ?? result.trend_strength, 0);
}

function getChangePercent(result: ScanResult) {
  return getNumber(result.changePercent ?? result.change_percent, 0);
}

function getRiskReward(result: ScanResult) {
  return getNumber(result.riskReward ?? result.risk_reward, 0);
}

function getBlockReasons(result: ScanResult) {
  return result.blockReasons || result.block_reasons || [];
}

function getTradeSummary(result: ScanResult) {
  return (
    result.tradeSummary ||
    result.trade_summary ||
    `${result.symbol} scanner setup`
  );
}

function getDirectionClass(direction: TradeDirection) {
  if (direction === "CALL") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (direction === "PUT") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-800 text-slate-300";
}

function getScoreClass(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-blue-300";
  if (score >= 50) return "text-yellow-300";
  return "text-red-300";
}

function getMarketAlignmentText(result: ScanResult) {
  const aligned = result.marketAlignment ?? result.market_alignment;

  if (aligned === true) return "Aligned";
  if (aligned === false) return "Not aligned";

  return "Unknown";
}

function getMarketAlignmentClass(result: ScanResult) {
  const aligned = result.marketAlignment ?? result.market_alignment;

  if (aligned === true) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (aligned === false) {
    return "border-red-400/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

function getVolumeText(result: ScanResult) {
  const confirmed = result.volumeConfirmation ?? result.volume_confirmation;

  if (confirmed === true) return "Confirmed";
  if (confirmed === false) return "Weak";

  return "Placeholder";
}

function getVolumeClass(result: ScanResult) {
  const confirmed = result.volumeConfirmation ?? result.volume_confirmation;

  if (confirmed === true) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (confirmed === false) {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

function getMarketClass(marketCondition?: string) {
  const condition = String(marketCondition || "UNKNOWN").toUpperCase();

  if (condition === "BULLISH") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (condition === "BEARISH") {
    return "border-red-400/40 bg-red-500/10 text-red-300";
  }

  if (condition === "CHOPPY") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function MiniStat({
  label,
  value,
  valueClass = "text-slate-100",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-sm font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

export default function ScannerResultsPanel({
  scannerResults,
  results,
  selectedSymbol,
  onSelectSetup,
  onSelectResult,
  marketCondition = "UNKNOWN",
}: ScannerResultsPanelProps) {
  const data = scannerResults || results || [];

  function handleSelect(result: ScanResult) {
    if (onSelectSetup) {
      onSelectSetup(result);
      return;
    }

    if (onSelectResult) {
      onSelectResult(result);
    }
  }

  const bestSetup = data[0];

  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 text-white shadow-xl shadow-black/30 backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Scanner Intelligence
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Live Setups
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Select a setup, then load the option chain and let Risk Guard check the contract.
          </p>
        </div>

        <div className={`rounded-2xl border px-4 py-3 ${getMarketClass(marketCondition)}`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
            Market
          </div>
          <div className="mt-1 text-sm font-black">
            {String(marketCondition || "UNKNOWN").toUpperCase()}
          </div>
        </div>
      </div>

      {bestSetup && (
        <div className="mb-5 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                Best Setup
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black">{bestSetup.symbol}</div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${getDirectionClass(
                    getDirection(bestSetup)
                  )}`}
                >
                  {getDirection(bestSetup)}
                </span>

                <span className="rounded-full border border-slate-700 bg-black/30 px-3 py-1 text-xs font-black text-slate-300">
                  Score {getSetupScore(bestSetup)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-300">
                {getTradeSummary(bestSetup)}
              </p>
            </div>

            <button
              onClick={() => handleSelect(bestSetup)}
              className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400"
            >
              Select Best Setup
            </button>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-black/30 p-8 text-center">
          <div className="text-lg font-black text-slate-300">
            No scanner results yet
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Run the scanner to load real quote-based setups.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((result) => {
            const direction = getDirection(result);
            const setupScore = getSetupScore(result);
            const confidenceScore = getConfidenceScore(result);
            const trendStrength = getTrendStrength(result);
            const changePercent = getChangePercent(result);
            const riskReward = getRiskReward(result);
            const blockReasons = getBlockReasons(result);
            const isSelected = selectedSymbol === result.symbol;

            return (
              <button
                key={result.symbol}
                onClick={() => handleSelect(result)}
                className={`w-full rounded-3xl border p-4 text-left transition hover:-translate-y-[1px] hover:border-blue-400/50 hover:bg-slate-900/90 ${
                  isSelected
                    ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-950/30"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-2xl font-black tracking-tight">
                        {result.symbol}
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getDirectionClass(
                          direction
                        )}`}
                      >
                        {direction}
                      </span>

                      {isSelected && (
                        <span className="rounded-full border border-blue-400/60 bg-blue-500/20 px-3 py-1 text-xs font-black text-blue-200">
                          SELECTED
                        </span>
                      )}

                      {blockReasons.length > 0 && (
                        <span className="rounded-full border border-yellow-400/40 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
                          {blockReasons.length} warning
                          {blockReasons.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      {getTradeSummary(result)}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <MiniStat
                        label="Price"
                        value={formatMoney(result.price)}
                      />

                      <MiniStat
                        label="Change"
                        value={formatPercent(changePercent)}
                        valueClass={
                          changePercent > 0
                            ? "text-emerald-300"
                            : changePercent < 0
                            ? "text-red-300"
                            : "text-slate-300"
                        }
                      />

                      <MiniStat
                        label="Setup Score"
                        value={setupScore}
                        valueClass={getScoreClass(setupScore)}
                      />

                      <MiniStat
                        label="Confidence"
                        value={`${confidenceScore}%`}
                        valueClass={getScoreClass(confidenceScore)}
                      />

                      <MiniStat
                        label="Trend"
                        value={trendStrength}
                        valueClass={getScoreClass(trendStrength)}
                      />

                      <MiniStat
                        label="Risk/Reward"
                        value={riskReward ? `${riskReward.toFixed(1)}R` : "-"}
                      />

                      <MiniStat
                        label="Stop"
                        value={formatMoney(result.stopLoss ?? result.stop_loss)}
                      />

                      <MiniStat
                        label="Target"
                        value={formatMoney(result.takeProfit ?? result.take_profit)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div
                        className={`rounded-2xl border px-3 py-2 text-xs font-bold ${getMarketAlignmentClass(
                          result
                        )}`}
                      >
                        Market: {getMarketAlignmentText(result)}
                      </div>

                      <div
                        className={`rounded-2xl border px-3 py-2 text-xs font-bold ${getVolumeClass(
                          result
                        )}`}
                      >
                        Volume: {getVolumeText(result)}
                      </div>

                      <div className="rounded-2xl border border-slate-700 bg-black/30 px-3 py-2 text-xs font-bold text-slate-300">
                        Contract: {result.contractSelectionStatus || "READY"}
                      </div>
                    </div>

                    {blockReasons.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                          Block / Caution Reasons
                        </div>

                        <ul className="mt-2 space-y-1 text-sm text-yellow-100">
                          {blockReasons.map((reason, index) => (
                            <li key={`${result.symbol}-reason-${index}`}>
                              • {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 xl:w-40">
                    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Action
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-200">
                        {isSelected ? "Loaded" : "Click to Load"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Option Type
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-200">
                        {result.optionCandidateType || direction}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Expiration
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-200">
                        {result.preferredExpirationWindow || "7-21 DTE"}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}