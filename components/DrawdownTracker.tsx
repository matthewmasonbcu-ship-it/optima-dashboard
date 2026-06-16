"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ── Black Eagle Financial Group evaluation limits
const STARTING_BALANCE = 50_000;
const MAX_TOTAL_DRAWDOWN = 5_000;  // 10%
const MAX_DAILY_DRAWDOWN = 2_500;  // 5%
const PROFIT_TARGET = 4_000;       // 8%

type ClosedTrade = {
  option_pnl: number;
  created_at: string;
};

type DrawdownState = {
  realizedPnl: number;
  currentBalance: number;
  peakBalance: number;
  totalDrawdown: number;
  totalBuffer: number;
  totalBufferPct: number;
  dailyPnl: number;
  dailyDrawdown: number;
  dailyBuffer: number;
  dailyBufferPct: number;
  profitPct: number;
};

function computeDrawdown(trades: ClosedTrade[]): DrawdownState {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let runningBalance = STARTING_BALANCE;
  let peak = STARTING_BALANCE;
  let dailyPnl = 0;

  for (const trade of trades) {
    runningBalance += trade.option_pnl;
    if (runningBalance > peak) peak = runningBalance;
    if (new Date(trade.created_at) >= startOfDay) dailyPnl += trade.option_pnl;
  }

  const totalDrawdown = Math.max(0, peak - runningBalance);
  const totalBuffer = MAX_TOTAL_DRAWDOWN - totalDrawdown;
  const dailyDrawdown = Math.max(0, -dailyPnl);
  const dailyBuffer = MAX_DAILY_DRAWDOWN - dailyDrawdown;

  return {
    realizedPnl: runningBalance - STARTING_BALANCE,
    currentBalance: runningBalance,
    peakBalance: peak,
    totalDrawdown,
    totalBuffer,
    totalBufferPct: (totalBuffer / MAX_TOTAL_DRAWDOWN) * 100,
    dailyPnl,
    dailyDrawdown,
    dailyBuffer,
    dailyBufferPct: (dailyBuffer / MAX_DAILY_DRAWDOWN) * 100,
    profitPct: Math.min(100, Math.max(0, ((runningBalance - STARTING_BALANCE) / PROFIT_TARGET) * 100)),
  };
}

type SafetyColor = "green" | "amber" | "red";

function safetyColor(bufferPct: number): SafetyColor {
  if (bufferPct > 50) return "green";
  if (bufferPct >= 25) return "amber";
  return "red";
}

function worstOf(a: SafetyColor, b: SafetyColor): SafetyColor {
  if (a === "red" || b === "red") return "red";
  if (a === "amber" || b === "amber") return "amber";
  return "green";
}

function accentBarClass(c: SafetyColor) {
  if (c === "green") return "bg-emerald-500";
  if (c === "amber") return "bg-amber-400";
  return "bg-red-500";
}

function fillClass(c: SafetyColor) {
  if (c === "green") return "bg-emerald-500";
  if (c === "amber") return "bg-amber-400";
  return "bg-red-500";
}

function labelTextClass(c: SafetyColor) {
  if (c === "green") return "text-emerald-600";
  if (c === "amber") return "text-amber-600";
  return "text-red-600";
}

function statusTextClass(c: SafetyColor) {
  if (c === "green") return "text-emerald-400";
  if (c === "amber") return "text-amber-300";
  return "text-red-400";
}

function topGradient(c: SafetyColor) {
  if (c === "green")
    return "linear-gradient(90deg, transparent 0%, #10b981 40%, #06b6d4 80%, transparent 100%)";
  if (c === "amber")
    return "linear-gradient(90deg, transparent 0%, #f59e0b 40%, #f97316 80%, transparent 100%)";
  return "linear-gradient(90deg, transparent 0%, #ef4444 40%, #f97316 80%, transparent 100%)";
}

function radialGlow(c: SafetyColor) {
  if (c === "green")
    return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(16,185,129,0.04) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(6,182,212,0.04) 0%, transparent 55%)";
  if (c === "amber")
    return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(245,158,11,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(249,115,22,0.04) 0%, transparent 55%)";
  return "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(239,68,68,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(249,115,22,0.04) 0%, transparent 55%)";
}

function bottomEdge(c: SafetyColor) {
  if (c === "green")
    return "linear-gradient(90deg, transparent, #10b981, #06b6d4, transparent)";
  if (c === "amber")
    return "linear-gradient(90deg, transparent, #f59e0b, #f97316, transparent)";
  return "linear-gradient(90deg, transparent, #ef4444, #f97316, transparent)";
}

function titleGradient(c: SafetyColor) {
  if (c === "green") return "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)";
  if (c === "amber") return "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)";
  return "linear-gradient(135deg, #ef4444 0%, #f97316 100%)";
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

// ── Profit target progress bar
function ProfitTargetBar({
  realized,
  target,
}: {
  realized: number;
  target: number;
}) {
  const pct = Math.min(100, Math.max(0, (Math.max(0, realized) / target) * 100));
  const hit = realized >= target;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${hit ? "bg-emerald-500" : "bg-cyan-500"}`} />
      <div className="px-5 py-4 pl-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Profit Target Progress
          </p>
          <span className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${hit ? "text-emerald-400" : "text-cyan-400"}`}>
            {hit ? "TARGET HIT" : "IN PROGRESS"}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`font-mono text-sm font-black ${realized >= 0 ? "text-emerald-300" : "text-red-400"}`}>
            {fmt(realized, true)} realized
          </span>
          <span className="font-mono text-[9px] text-slate-700">/</span>
          <span className="font-mono text-[10px] text-slate-400">{fmt(target)} target</span>
          <span className="font-mono text-[9px] text-slate-700">·</span>
          <span className={`font-mono text-[10px] font-bold ${hit ? "text-emerald-400" : "text-slate-300"}`}>
            {hit ? "Evaluation threshold cleared" : `${fmt(Math.max(0, target - realized))} to go`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${hit ? "bg-emerald-500" : "bg-cyan-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-right">
          <span className="font-mono text-[8px] text-slate-600">
            {pct.toFixed(1)}% of {fmt(target)} target reached
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stat cell — matches OptionTradeCommandCenter context strip style
function StatCell({
  label,
  value,
  barClass = "bg-slate-600",
  valueClass = "text-slate-200",
}: {
  label: string;
  value: string;
  barClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2.5">
      <div className={`absolute inset-y-0 left-0 w-[2px] ${barClass}`} />
      <p className="pl-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </p>
      <p className={`pl-1 font-mono text-xs font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

// ── Drawdown bar — one for total, one for daily
function DrawdownBar({
  label,
  used,
  limit,
  buffer,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  buffer: number;
  color: SafetyColor;
}) {
  const fillPct = Math.min(100, Math.max(0, (used / limit) * 100));
  const breached = buffer <= 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accentBarClass(color)}`} />
      <div className="px-5 py-4 pl-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
            {label}
          </p>
          <span
            className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${statusTextClass(color)}`}
          >
            {color === "green" ? "SAFE" : color === "amber" ? "CAUTION" : "WARNING"}
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={`font-mono text-sm font-black ${breached ? "text-red-400" : "text-white"}`}
          >
            {fmt(used)} used
          </span>
          <span className="font-mono text-[9px] text-slate-700">/</span>
          <span className="font-mono text-[10px] text-slate-400">{fmt(limit)} limit</span>
          <span className="font-mono text-[9px] text-slate-700">·</span>
          <span
            className={`font-mono text-[10px] font-bold ${breached ? "text-red-400" : "text-slate-300"}`}
          >
            {breached ? "LIMIT BREACHED" : `${fmt(buffer)} remaining`}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${fillClass(color)}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="mt-1 text-right">
          <span className="font-mono text-[8px] text-slate-600">
            {fillPct.toFixed(1)}% of limit consumed
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DrawdownTracker() {
  const [state, setState] = useState<DrawdownState | null>(null);
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
        console.error("DrawdownTracker load error:", error);
        setLoadError(error.message);
        return;
      }

      setState(computeDrawdown((data ?? []) as ClosedTrade[]));
    } catch (err) {
      console.error("DrawdownTracker unexpected error:", err);
      setLoadError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onRefresh() {
      load();
    }
    window.addEventListener("paper-trade-saved", onRefresh);
    window.addEventListener("option-trade-saved", onRefresh);
    return () => {
      window.removeEventListener("paper-trade-saved", onRefresh);
      window.removeEventListener("option-trade-saved", onRefresh);
    };
  }, []);

  const totalColor = state ? safetyColor(state.totalBufferPct) : "green";
  const dailyColor = state ? safetyColor(state.dailyBufferPct) : "green";
  const worst = worstOf(totalColor, dailyColor);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* Background layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: radialGlow(worst) }}
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
        style={{ background: topGradient(worst) }}
      />

      <div className="relative p-5">

        {/* Header */}
        <div className="mb-5">
          <p
            className={`mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] ${labelTextClass(worst)}`}
          >
            OPTIMA-SYS · Drawdown Monitor
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Drawdown{" "}
            <span
              style={{
                background: titleGradient(worst),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tracker
            </span>
          </h2>
          <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
            Black Eagle limits — ${MAX_TOTAL_DRAWDOWN.toLocaleString()} total (10%) ·
            ${MAX_DAILY_DRAWDOWN.toLocaleString()} daily (5%) · profit target $
            {PROFIT_TARGET.toLocaleString()} (8%)
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-6">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] text-slate-500">
              Loading drawdown data…
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div className="mb-4 relative overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-red-500" />
            <div className="px-4 py-3 pl-5">
              <span className="font-mono text-[9px] text-red-400">
                Load error: {loadError}
              </span>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && state && (
          <>
            {/* Stat cells */}
            <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatCell
                label="Starting Balance"
                value={`$${STARTING_BALANCE.toLocaleString()}`}
                barClass="bg-slate-600"
                valueClass="text-slate-400"
              />
              <StatCell
                label="Current Balance"
                value={fmt(state.currentBalance)}
                barClass={state.currentBalance >= STARTING_BALANCE ? "bg-emerald-500" : "bg-red-500"}
                valueClass={state.currentBalance >= STARTING_BALANCE ? "text-emerald-300" : "text-red-400"}
              />
              <StatCell
                label="Peak Balance"
                value={fmt(state.peakBalance)}
                barClass="bg-cyan-500"
                valueClass="text-cyan-300"
              />
              <StatCell
                label="Realized P&L"
                value={fmt(state.realizedPnl, true)}
                barClass={state.realizedPnl >= 0 ? "bg-emerald-500" : "bg-red-500"}
                valueClass={state.realizedPnl >= 0 ? "text-emerald-300" : "text-red-400"}
              />
            </div>

            {/* Drawdown bars + profit target */}
            <div className="space-y-3">
              <DrawdownBar
                label="Total Drawdown"
                used={state.totalDrawdown}
                limit={MAX_TOTAL_DRAWDOWN}
                buffer={state.totalBuffer}
                color={totalColor}
              />
              <DrawdownBar
                label="Daily Drawdown"
                used={state.dailyDrawdown}
                limit={MAX_DAILY_DRAWDOWN}
                buffer={state.dailyBuffer}
                color={dailyColor}
              />
              <ProfitTargetBar realized={state.realizedPnl} target={PROFIT_TARGET} />
            </div>

            {/* Status footer */}
            <div
              className={`relative mt-4 overflow-hidden rounded-lg border ${
                worst === "red"
                  ? "border-red-500/20 bg-red-500/5"
                  : worst === "amber"
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
              }`}
            >
              <div className={`absolute inset-y-0 left-0 w-[2px] ${accentBarClass(worst)}`} />
              <div className="px-4 py-3 pl-5">
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${statusTextClass(worst)}`}
                >
                  {worst === "red"
                    ? "Danger Zone › "
                    : worst === "amber"
                    ? "Caution › "
                    : "Account Protected › "}
                </span>
                <span className="font-mono text-[9px] leading-5 text-slate-500">
                  {worst === "red"
                    ? "Less than 25% buffer remaining on one or more limits. Review positions immediately."
                    : worst === "amber"
                    ? "25–50% buffer remaining. Stay disciplined — no revenge trades."
                    : "More than 50% buffer on all drawdown limits. Account in good standing."}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: bottomEdge(worst) }}
      />
    </div>
  );
}
