"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Black Eagle Financial Group evaluation rules
const STARTING_BALANCE = 50_000;
const PROFIT_TARGET = 4_000;       // 8%
const MAX_TOTAL_DRAWDOWN = 5_000;  // 10%
const MAX_DAILY_DRAWDOWN = 2_500;  // 5%
const MIN_TRADING_DAYS = 10;

type SimTrade = {
  option_pnl: number;
  created_at: string;
};

type SimResult = {
  realizedPnl: number;
  profitTargetHit: boolean;
  totalDrawdownBreached: boolean;
  maxTotalDrawdownSeen: number;
  dailyDrawdownBreached: boolean;
  worstDailyLoss: number;
  tradingDays: number;
  minTradingDaysHit: boolean;
  ready: boolean;
  anyBreach: boolean;
};

function runSimulation(trades: SimTrade[]): SimResult {
  let balance = STARTING_BALANCE;
  let peak = STARTING_BALANCE;
  let maxTotalDrawdownSeen = 0;
  let totalDrawdownBreached = false;
  const dailyPnl: Record<string, number> = {};

  for (const trade of trades) {
    balance += trade.option_pnl;
    if (balance > peak) peak = balance;
    const drawdown = peak - balance;
    if (drawdown > maxTotalDrawdownSeen) maxTotalDrawdownSeen = drawdown;
    if (drawdown > MAX_TOTAL_DRAWDOWN) totalDrawdownBreached = true;
    const dayKey = trade.created_at.slice(0, 10);
    dailyPnl[dayKey] = (dailyPnl[dayKey] ?? 0) + trade.option_pnl;
  }

  const realizedPnl = balance - STARTING_BALANCE;
  const profitTargetHit = realizedPnl >= PROFIT_TARGET;

  let dailyDrawdownBreached = false;
  let worstDailyLoss = 0;
  for (const pnl of Object.values(dailyPnl)) {
    if (pnl < 0) {
      const loss = Math.abs(pnl);
      if (loss > worstDailyLoss) worstDailyLoss = loss;
      if (loss > MAX_DAILY_DRAWDOWN) dailyDrawdownBreached = true;
    }
  }

  const tradingDays = Object.keys(dailyPnl).length;
  const minTradingDaysHit = tradingDays >= MIN_TRADING_DAYS;
  const anyBreach = totalDrawdownBreached || dailyDrawdownBreached;

  return {
    realizedPnl,
    profitTargetHit,
    totalDrawdownBreached,
    maxTotalDrawdownSeen,
    dailyDrawdownBreached,
    worstDailyLoss,
    tradingDays,
    minTradingDaysHit,
    ready: profitTargetHit && !anyBreach && minTradingDaysHit,
    anyBreach,
  };
}

function fmt(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!showSign) return `$${formatted}`;
  if (value > 0) return `+$${formatted}`;
  if (value < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

type VerdictColor = "green" | "amber" | "red";

function verdictColor(result: SimResult): VerdictColor {
  if (result.ready) return "green";
  if (result.anyBreach) return "red";
  return "amber";
}

function topGradient(c: VerdictColor) {
  if (c === "green")
    return "linear-gradient(90deg, transparent 0%, #10b981 40%, #06b6d4 80%, transparent 100%)";
  if (c === "amber")
    return "linear-gradient(90deg, transparent 0%, #f59e0b 40%, #f97316 80%, transparent 100%)";
  return "linear-gradient(90deg, transparent 0%, #ef4444 40%, #f97316 80%, transparent 100%)";
}

function radialGlow(c: VerdictColor) {
  if (c === "green")
    return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(16,185,129,0.04) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(6,182,212,0.04) 0%, transparent 55%)";
  if (c === "amber")
    return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(245,158,11,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(249,115,22,0.04) 0%, transparent 55%)";
  return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(239,68,68,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(249,115,22,0.04) 0%, transparent 55%)";
}

function bottomEdge(c: VerdictColor) {
  if (c === "green")
    return "linear-gradient(90deg, transparent, #10b981, #06b6d4, transparent)";
  if (c === "amber")
    return "linear-gradient(90deg, transparent, #f59e0b, #f97316, transparent)";
  return "linear-gradient(90deg, transparent, #ef4444, #f97316, transparent)";
}

function titleGradient(c: VerdictColor) {
  if (c === "green") return "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)";
  if (c === "amber") return "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)";
  return "linear-gradient(135deg, #ef4444 0%, #f97316 100%)";
}

function labelTextClass(c: VerdictColor) {
  if (c === "green") return "text-emerald-600";
  if (c === "amber") return "text-amber-600";
  return "text-red-600";
}

function accentBarClass(c: VerdictColor) {
  if (c === "green") return "bg-emerald-500";
  if (c === "amber") return "bg-amber-400";
  return "bg-red-500";
}

export default function EvaluationSimulator({ refreshKey }: { refreshKey?: number }) {
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("option_trade_details")
        .select("option_pnl, created_at")
        .not("option_pnl", "is", null)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("EvaluationSimulator load error:", error);
        setLoadError(error.message);
        return;
      }

      setResult(runSimulation((data ?? []) as SimTrade[]));
    } catch (err) {
      console.error("EvaluationSimulator unexpected error:", err);
      setLoadError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const vc: VerdictColor = result ? verdictColor(result) : "amber";

  const criteria = result
    ? [
        {
          label: "Profit Target ≥ 8%",
          rule: `Realize ≥ ${fmt(PROFIT_TARGET)} (8% of ${fmt(STARTING_BALANCE)})`,
          current: fmt(result.realizedPnl, true),
          pass: result.profitTargetHit,
          detail: result.profitTargetHit
            ? "Target reached — evaluation threshold cleared"
            : `${fmt(Math.max(0, PROFIT_TARGET - result.realizedPnl))} remaining to reach target`,
        },
        {
          label: "No Daily Drawdown Breach",
          rule: `Never lose more than ${fmt(MAX_DAILY_DRAWDOWN)} in a single day (5%)`,
          current:
            result.worstDailyLoss > 0
              ? `-${fmt(result.worstDailyLoss)} worst day`
              : "No losing days yet",
          pass: !result.dailyDrawdownBreached,
          detail: result.dailyDrawdownBreached
            ? `BREACHED — single-day loss exceeded ${fmt(MAX_DAILY_DRAWDOWN)} limit`
            : result.worstDailyLoss > 0
            ? `Worst day: -${fmt(result.worstDailyLoss)} — within ${fmt(MAX_DAILY_DRAWDOWN)} limit`
            : "No daily breach on record",
        },
        {
          label: "No Total Drawdown Breach",
          rule: `Peak-to-trough never exceeds ${fmt(MAX_TOTAL_DRAWDOWN)} (10%)`,
          current: `${fmt(result.maxTotalDrawdownSeen)} max seen`,
          pass: !result.totalDrawdownBreached,
          detail: result.totalDrawdownBreached
            ? `BREACHED — max drawdown of ${fmt(result.maxTotalDrawdownSeen)} exceeded ${fmt(MAX_TOTAL_DRAWDOWN)} limit`
            : `Max drawdown ${fmt(result.maxTotalDrawdownSeen)} — within ${fmt(MAX_TOTAL_DRAWDOWN)} limit`,
        },
        {
          label: `≥ ${MIN_TRADING_DAYS} Trading Days`,
          rule: `At least ${MIN_TRADING_DAYS} calendar days with at least one closed trade`,
          current: `${result.tradingDays} day${result.tradingDays === 1 ? "" : "s"} logged`,
          pass: result.minTradingDaysHit,
          detail: result.minTradingDaysHit
            ? `${result.tradingDays} days logged — minimum satisfied`
            : `${MIN_TRADING_DAYS - result.tradingDays} more day${MIN_TRADING_DAYS - result.tradingDays === 1 ? "" : "s"} needed`,
        },
      ]
    : [];

  const passingCount = criteria.filter((c) => c.pass).length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* Background layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: radialGlow(vc) }}
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
        style={{ background: topGradient(vc) }}
      />

      <div className="relative p-5">

        {/* Header */}
        <div className="mb-5">
          <p className={`mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] ${labelTextClass(vc)}`}>
            OPTIMA-SYS · Evaluation Simulator
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Evaluation{" "}
              <span
                style={{
                  background: titleGradient(vc),
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Simulator
              </span>
            </h2>
            {result && (
              <div
                className={`relative overflow-hidden rounded-lg border px-4 py-2 ${
                  result.ready
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : result.anyBreach
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-[3px] ${accentBarClass(vc)}`} />
                <p
                  className={`pl-1 font-mono text-[10px] font-black uppercase tracking-[0.25em] ${
                    result.ready
                      ? "text-emerald-400"
                      : result.anyBreach
                      ? "text-red-400"
                      : "text-amber-300"
                  }`}
                >
                  {result.ready
                    ? "READY TO EVALUATE"
                    : result.anyBreach
                    ? "DISQUALIFIED"
                    : "NOT READY YET"}
                </p>
                <p className="pl-1 font-mono text-[8px] text-slate-500">
                  {passingCount} / 4 criteria passing
                </p>
              </div>
            )}
          </div>
          <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
            Black Eagle Financial Group — 8% profit target, 10% total drawdown limit, 5% daily limit, 10 trading days
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-6">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] text-slate-500">Running simulation…</span>
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-red-500" />
            <div className="px-4 py-3 pl-5">
              <span className="font-mono text-[9px] text-red-400">Load error: {loadError}</span>
            </div>
          </div>
        )}

        {/* Criteria */}
        {!loading && result && (
          <div className="space-y-3">
            {criteria.map((criterion, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-xl border bg-slate-900/40 ${
                  criterion.pass
                    ? "border-emerald-500/20"
                    : "border-red-500/20"
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-[3px] ${
                    criterion.pass ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <div className="px-5 py-3.5 pl-6">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span
                      className={`mt-0.5 shrink-0 font-mono text-base font-black leading-none ${
                        criterion.pass ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {criterion.pass ? "✓" : "✗"}
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Criterion label + current value */}
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p className="font-mono text-[10px] font-black text-slate-200">
                          {criterion.label}
                        </p>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            criterion.pass ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {criterion.current}
                        </span>
                      </div>
                      {/* Rule */}
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">
                        {criterion.rule}
                      </p>
                      {/* Detail */}
                      <p
                        className={`mt-1 font-mono text-[9px] leading-4 ${
                          criterion.pass ? "text-slate-500" : "text-red-500/80"
                        }`}
                      >
                        {criterion.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Verdict footer */}
            <div
              className={`relative overflow-hidden rounded-lg border ${
                result.ready
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : result.anyBreach
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
              }`}
            >
              <div className={`absolute inset-y-0 left-0 w-[2px] ${accentBarClass(vc)}`} />
              <div className="px-4 py-3 pl-5">
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                    result.ready
                      ? "text-emerald-400"
                      : result.anyBreach
                      ? "text-red-400"
                      : "text-amber-300"
                  }`}
                >
                  {result.ready
                    ? "Ready to Evaluate › "
                    : result.anyBreach
                    ? "Disqualified › "
                    : "Keep Trading › "}
                </span>
                <span className="font-mono text-[9px] leading-5 text-slate-500">
                  {result.ready
                    ? "All four criteria satisfied. You may proceed with a Black Eagle evaluation attempt."
                    : result.anyBreach
                    ? "A drawdown limit was breached during this simulation period. Reset required before a real evaluation."
                    : `${4 - passingCount} criterion${4 - passingCount === 1 ? "" : "a"} still pending. Continue paper trading and building the track record.`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: bottomEdge(vc) }}
      />
    </div>
  );
}
