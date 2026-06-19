"use client";

import { motion, AnimatePresence } from "framer-motion";

// ─── UI ONLY — all scanner logic, props, types, and selection behavior untouched ───

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

// ─── All helper functions untouched ──────────────────────────────────────────
function getNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatMoney(value: unknown) {
  const num = getNumber(value, 0);
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
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
  return result.tradeSummary || result.trade_summary || `${result.symbol} scanner setup`;
}

// ─── Visual helpers — only colors and classes ─────────────────────────────────
function getDirectionBar(direction: TradeDirection) {
  if (direction === "CALL") return "bg-emerald-500";
  if (direction === "PUT") return "bg-red-500";
  return "bg-slate-600";
}

function getDirectionBadge(direction: TradeDirection) {
  if (direction === "CALL")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (direction === "PUT")
    return "border-red-500/40 bg-red-500/10 text-red-300";
  return "border-slate-600/60 bg-slate-800/60 text-slate-400";
}

function getDirectionRing(direction: TradeDirection) {
  if (direction === "CALL") return "ring-emerald-500/15";
  if (direction === "PUT") return "ring-red-500/15";
  return "ring-slate-700/20";
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-blue-300";
  if (score >= 50) return "text-yellow-300";
  return "text-red-400";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-500";
}

function getMarketBadge(marketCondition?: string) {
  const c = String(marketCondition || "UNKNOWN").toUpperCase();
  if (c === "BULLISH") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (c === "BEARISH") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (c === "CHOPPY") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
}

function getMarketBar(marketCondition?: string) {
  const c = String(marketCondition || "UNKNOWN").toUpperCase();
  if (c === "BULLISH") return "bg-emerald-500";
  if (c === "BEARISH") return "bg-red-500";
  if (c === "CHOPPY") return "bg-yellow-400";
  return "bg-slate-600";
}

function getAlignmentBadge(result: ScanResult) {
  const aligned = result.marketAlignment ?? result.market_alignment;
  if (aligned === true) return { label: "Aligned", cls: "text-emerald-400" };
  if (aligned === false) return { label: "Misaligned", cls: "text-red-400" };
  return { label: "Unknown", cls: "text-slate-500" };
}

function getVolumeBadge(result: ScanResult) {
  const confirmed = result.volumeConfirmation ?? result.volume_confirmation;
  if (confirmed === true) return { label: "Vol ✓", cls: "text-emerald-400" };
  if (confirmed === false) return { label: "Vol weak", cls: "text-yellow-400" };
  return { label: "Vol —", cls: "text-slate-500" };
}

// ─── MiniStat — compact terminal data cell ───────────────────────────────────
function MiniStat({
  label,
  value,
  valueClass = "text-slate-200",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
      <span className="font-mono text-[10px] sm:text-[8px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-xs font-black ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Score bar — compact visual score indicator ───────────────────────────────
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-16 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-black ${getScoreColor(score)}`}>
        {score}
      </span>
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
  // ─── Data + handler — untouched ────────────────────────────────────────────
  const data = scannerResults || results || [];

  function handleSelect(result: ScanResult) {
    if (onSelectSetup) { onSelectSetup(result); return; }
    if (onSelectResult) { onSelectResult(result); }
  }

  const bestSetup = data[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 10% 0%, rgba(139,92,246,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 90% 100%, rgba(37,99,235,0.04) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #8b5cf6 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative p-5">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Scanner Intelligence
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Live{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Setups
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              Select a setup → load option chain → Risk Guard checks contract.
            </p>
          </div>

          {/* Market condition badge */}
          <div
            className={`relative overflow-hidden rounded-xl border px-4 py-3 ring-1 ${getMarketBadge(marketCondition)} ring-current/10`}
          >
            <div
              className={`absolute inset-y-0 left-0 w-[3px] ${getMarketBar(marketCondition)}`}
            />
            <div className="pl-1">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] opacity-60">
                Market
              </p>
              <p className="font-mono text-sm font-black tracking-tight">
                {String(marketCondition || "UNKNOWN").toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* ── BEST SETUP BANNER ─────────────────────────────────────────── */}
        {bestSetup && (
          <div className="relative mb-4 overflow-hidden rounded-xl border border-violet-500/20 bg-violet-500/5 ring-1 ring-violet-500/10">
            <div className="absolute inset-x-0 top-0 h-px opacity-60"
              style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
            />
            <div className="absolute inset-y-0 left-0 w-[3px] bg-violet-500" />
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="pl-1">
                <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-600">
                  Top Ranked Setup
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xl font-black text-white">
                    {bestSetup.symbol}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${getDirectionBadge(getDirection(bestSetup))}`}
                  >
                    {getDirection(bestSetup)}
                  </span>
                  <ScoreBar score={getSetupScore(bestSetup)} />
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {getTradeSummary(bestSetup)}
                </p>
              </div>
              <button
                onClick={() => handleSelect(bestSetup)}
                className="group relative shrink-0 overflow-hidden rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300 transition-all hover:bg-violet-500/20 hover:text-violet-200"
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
                />
                Load Best Setup ›
              </button>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-14">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </div>
            <p className="font-mono text-sm font-black text-slate-400">
              No scanner results yet
            </p>
            <p className="mt-1 font-mono text-[10px] text-slate-600">
              Run the scanner to load real quote-based setups.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
            {data.map((result, index) => {
              const direction = getDirection(result);
              const setupScore = getSetupScore(result);
              const confidenceScore = getConfidenceScore(result);
              const trendStrength = getTrendStrength(result);
              const changePercent = getChangePercent(result);
              const riskReward = getRiskReward(result);
              const blockReasons = getBlockReasons(result);
              const isSelected = selectedSymbol === result.symbol;
              const alignment = getAlignmentBadge(result);
              const volume = getVolumeBadge(result);

              return (
                <motion.button
                  key={result.symbol}
                  onClick={() => handleSelect(result)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: index * 0.05 } }}
                  exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
                  whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.99, transition: { duration: 0.15 } }}
                  className={`group relative w-full overflow-hidden rounded-xl border text-left transition-all duration-150
                    ${isSelected
                      ? "border-violet-500/40 bg-slate-900/90 ring-1 ring-violet-500/20 shadow-lg shadow-violet-950/20"
                      : `border-slate-700/60 bg-slate-900/60 ring-1 ${getDirectionRing(direction)} hover:border-slate-600/80 hover:bg-slate-900/80`
                    }`}
                >
                  {/* Selected: top cyan highlight line */}
                  {isSelected && (
                    <div
                      className="absolute inset-x-0 top-0 h-px"
                      style={{ background: "linear-gradient(90deg, transparent, #8b5cf6 40%, #3b82f6 70%, transparent)" }}
                    />
                  )}

                  {/* Left direction accent bar */}
                  <div
                    className={`absolute inset-y-0 left-0 w-[3px] transition-all ${
                      isSelected ? "bg-violet-500" : getDirectionBar(direction)
                    }`}
                  />

                  <div className="px-5 py-4 pl-6">
                    {/* ── Row 1: Symbol + badges + score ─────────────────── */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xl font-black tracking-tight text-white">
                        {result.symbol}
                      </span>

                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${getDirectionBadge(direction)}`}
                      >
                        {direction}
                      </span>

                      {isSelected && (
                        <span className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                          Selected
                        </span>
                      )}

                      {blockReasons.length > 0 && (
                        <span className="rounded border border-yellow-500/30 bg-yellow-500/8 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-yellow-400">
                          {blockReasons.length} warning{blockReasons.length > 1 ? "s" : ""}
                        </span>
                      )}

                      {/* Score bar — right-aligned on the same row */}
                      <span className="ml-auto">
                        <ScoreBar score={setupScore} />
                      </span>
                    </div>

                    {/* ── Row 2: Summary ──────────────────────────────────── */}
                    <p className="mt-1.5 font-mono text-[10px] leading-5 text-slate-500">
                      {getTradeSummary(result)}
                    </p>

                    {/* ── Row 3: Stat grid ────────────────────────────────── */}
                    <div className="mt-3 grid grid-cols-4 gap-1.5 md:grid-cols-8">
                      <MiniStat label="Price" value={formatMoney(result.price)} />
                      <MiniStat
                        label="Chg"
                        value={formatPercent(changePercent)}
                        valueClass={
                          changePercent > 0
                            ? "text-emerald-300"
                            : changePercent < 0
                            ? "text-red-400"
                            : "text-slate-400"
                        }
                      />
                      <MiniStat
                        label="Conf"
                        value={`${confidenceScore}%`}
                        valueClass={getScoreColor(confidenceScore)}
                      />
                      <MiniStat
                        label="Trend"
                        value={trendStrength}
                        valueClass={getScoreColor(trendStrength)}
                      />
                      <MiniStat
                        label="R:R"
                        value={riskReward ? `${riskReward.toFixed(1)}R` : "—"}
                      />
                      <MiniStat
                        label="Stop"
                        value={formatMoney(result.stopLoss ?? result.stop_loss)}
                      />
                      <MiniStat
                        label="Target"
                        value={formatMoney(result.takeProfit ?? result.take_profit)}
                      />
                      <MiniStat
                        label="DTE"
                        value={result.preferredExpirationWindow || "7-21"}
                      />
                    </div>

                    {/* ── Row 4: Inline signal strip ──────────────────────── */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <span className={`font-mono text-[9px] font-bold ${alignment.cls}`}>
                        Mkt: {alignment.label}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className={`font-mono text-[9px] font-bold ${volume.cls}`}>
                        {volume.label}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="font-mono text-[9px] text-slate-600">
                        Contract: {result.contractSelectionStatus || "READY"}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="font-mono text-[9px] text-slate-600">
                        {result.preferredMoneyness || "Near the money"}
                      </span>

                      {/* Load arrow — right side */}
                      <span
                        className={`ml-auto font-mono text-[9px] font-bold tracking-widest transition-colors ${
                          isSelected ? "text-violet-400" : "text-slate-700 group-hover:text-slate-500"
                        }`}
                      >
                        {isSelected ? "● LOADED" : "LOAD ›"}
                      </span>
                    </div>

                    {/* ── Row 5: Block reasons — slim strip ───────────────── */}
                    {blockReasons.length > 0 && (
                      <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {blockReasons.map((reason, i) => (
                            <span
                              key={`${result.symbol}-r-${i}`}
                              className="font-mono text-[9px] text-yellow-500/80"
                            >
                              › {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)" }}
      />
    </div>
  );
}