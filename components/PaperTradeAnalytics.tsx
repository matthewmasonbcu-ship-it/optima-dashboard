"use client";

// ─── UI ONLY — all Supabase, calculations, and analytics logic untouched ──────

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PaperTrade = {
  id: string;
  symbol: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  status: string | null;
  strategy: string | null;
  created_at: string | null;
};

type OptionDetails = {
  id: string;
  paper_trade_id: string;
  stock_symbol: string | null;
  trade_direction: string | null;
  option_symbol: string | null;
  expiration_date: string | null;
  strike_price: number | null;
  bid_price: number | null;
  ask_price: number | null;
  mid_price: number | null;
  contracts: number | null;
  estimated_cost: number | null;
  max_risk: number | null;
  risk_guard_status: string | null;
  risk_guard_reason: string | null;
  exit_option_price: number | null;
  option_pnl: number | null;
  option_status: string | null;
};

type TradeWithOption = PaperTrade & {
  optionDetails?: OptionDetails | null;
};

type PaperTradeAnalyticsProps = {
  refreshKey?: number;
};

// ─── All helper functions — untouched ────────────────────────────────────────
function formatMoney(value: number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function getStockTradeResult(trade: TradeWithOption) {
  if (trade.status !== "closed" || trade.exit_price === null) return "OPEN";
  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);
  if (!Number.isFinite(entry) || !Number.isFinite(exit)) return "UNKNOWN";
  if (exit > entry) return "WIN";
  if (exit < entry) return "LOSS";
  return "BE";
}

function getStockPnl(trade: TradeWithOption) {
  if (trade.status !== "closed" || trade.exit_price === null) return 0;
  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);
  if (!Number.isFinite(entry) || !Number.isFinite(exit)) return 0;
  return exit - entry;
}

function getOptionPnl(trade: TradeWithOption) {
  const pnl = Number(trade.optionDetails?.option_pnl);
  if (!Number.isFinite(pnl)) return 0;
  return pnl;
}

function getOptionTradeResult(trade: TradeWithOption) {
  const option = trade.optionDetails;
  if (!option || option.option_status !== "closed") return "OPEN";
  const pnl = Number(option.option_pnl);
  if (!Number.isFinite(pnl)) return "UNKNOWN";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
function pnlBar(v: number) {
  if (v > 0) return "bg-emerald-500";
  if (v < 0) return "bg-red-500";
  return "bg-slate-600";
}
function pnlColor(v: number) {
  if (v > 0) return "text-emerald-300";
  if (v < 0) return "text-red-400";
  return "text-slate-400";
}
function winBar(r: number) {
  if (r >= 60) return "bg-emerald-500";
  if (r >= 40) return "bg-yellow-400";
  return "bg-red-500";
}
function winColor(r: number) {
  if (r >= 60) return "text-emerald-300";
  if (r >= 40) return "text-yellow-300";
  return "text-red-400";
}

// ─── SummaryCell — left-bar KPI card ─────────────────────────────────────────
function SummaryCell({
  label,
  value,
  sub,
  bar = "bg-slate-600",
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  bar?: string;
  valueClass?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 ring-1 ring-slate-700/10">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} />
      <div className="pl-1">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
          {label}
        </p>
        <p className={`mt-1 font-mono text-2xl font-black ${valueClass}`}>
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 font-mono text-[9px] text-slate-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── RiskCell — colored border card for APPROVED / CAUTION / BLOCKED ─────────
function RiskCell({
  status,
  count,
  sub,
}: {
  status: string;
  count: number;
  sub?: string;
}) {
  const bar =
    status === "APPROVED" ? "bg-emerald-500" :
    status === "CAUTION"  ? "bg-yellow-400"  :
    "bg-red-500";
  const valueColor =
    status === "APPROVED" ? "text-emerald-300" :
    status === "CAUTION"  ? "text-yellow-300"  :
    "text-red-400";
  const border =
    status === "APPROVED" ? "border-emerald-500/25 ring-emerald-500/10" :
    status === "CAUTION"  ? "border-yellow-500/25 ring-yellow-500/10"  :
    "border-red-500/25 ring-red-500/10";

  return (
    <div className={`relative overflow-hidden rounded-xl border ring-1 ${border} bg-black/30 p-4`}>
      <div className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} />
      <div className="pl-1">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
          {status}
        </p>
        <p className={`mt-1 font-mono text-3xl font-black ${valueColor}`}>
          {count}
        </p>
        {sub && (
          <p className="mt-0.5 font-mono text-[9px] text-slate-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function PaperTradeAnalytics({ refreshKey }: PaperTradeAnalyticsProps) {
  // ─── All state — untouched ────────────────────────────────────────────────
  const [trades, setTrades] = useState<TradeWithOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ─── Supabase load — untouched ────────────────────────────────────────────
  async function loadAnalytics() {
    try {
      setLoading(true);
      setMessage("");

      const { data: paperTrades, error: paperError } = await supabase
        .from("paper_trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (paperError) {
        setMessage(`Could not load analytics: ${paperError.message}`);
        setTrades([]);
        return;
      }

      const tradeRows = (paperTrades ?? []) as PaperTrade[];
      const tradeIds = tradeRows.map((t) => t.id).filter(Boolean);
      let optionRows: OptionDetails[] = [];

      if (tradeIds.length > 0) {
        const { data: optionDetails, error: optionError } = await supabase
          .from("option_trade_details")
          .select("*")
          .in("paper_trade_id", tradeIds);

        if (optionError) {
          console.warn("Could not load option analytics:", optionError.message);
        } else {
          optionRows = (optionDetails ?? []) as OptionDetails[];
        }
      }

      const combined = tradeRows.map((trade) => ({
        ...trade,
        optionDetails:
          optionRows.find((o) => o.paper_trade_id === trade.id) ?? null,
      }));

      setTrades(combined);
    } catch (error: any) {
      setMessage(
        `Could not load analytics: ${error?.message ?? "Unknown error"}`
      );
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [refreshKey]);

  // ─── All calculations — untouched ─────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalTrades = trades.length;
    const openStockTrades = trades.filter((t) => t.status === "open").length;
    const closedStockTrades = trades.filter((t) => t.status === "closed").length;
    const stockWins = trades.filter((t) => getStockTradeResult(t) === "WIN").length;
    const stockLosses = trades.filter((t) => getStockTradeResult(t) === "LOSS").length;
    const stockBreakEvens = trades.filter((t) => getStockTradeResult(t) === "BE").length;
    const stockWinRate = closedStockTrades > 0 ? (stockWins / closedStockTrades) * 100 : 0;
    const totalStockPnl = trades.reduce((s, t) => s + getStockPnl(t), 0);

    const optionTrades = trades.filter((t) => t.optionDetails);
    const openOptionTrades = optionTrades.filter(
      (t) => (t.optionDetails?.option_status ?? "open") === "open"
    ).length;
    const closedOptionTrades = optionTrades.filter(
      (t) => t.optionDetails?.option_status === "closed"
    ).length;
    const optionWins = optionTrades.filter(
      (t) => getOptionTradeResult(t) === "WIN"
    ).length;
    const optionLosses = optionTrades.filter(
      (t) => getOptionTradeResult(t) === "LOSS"
    ).length;
    const optionBreakEvens = optionTrades.filter(
      (t) => getOptionTradeResult(t) === "BE"
    ).length;
    const optionWinRate =
      closedOptionTrades > 0 ? (optionWins / closedOptionTrades) * 100 : 0;
    const totalOptionPnl = optionTrades.reduce(
      (s, t) => s + getOptionPnl(t),
      0
    );
    const averageOptionPnl =
      closedOptionTrades > 0 ? totalOptionPnl / closedOptionTrades : 0;

    const approvedTrades = optionTrades.filter(
      (t) => t.optionDetails?.risk_guard_status === "APPROVED"
    ).length;
    const cautionTrades = optionTrades.filter(
      (t) => t.optionDetails?.risk_guard_status === "CAUTION"
    ).length;
    const blockedTrades = optionTrades.filter(
      (t) => t.optionDetails?.risk_guard_status === "BLOCKED"
    ).length;

    const totalEstimatedCost = optionTrades.reduce((s, t) => {
      const c = Number(t.optionDetails?.estimated_cost);
      return s + (Number.isFinite(c) ? c : 0);
    }, 0);
    const totalMaxRisk = optionTrades.reduce((s, t) => {
      const r = Number(t.optionDetails?.max_risk);
      return s + (Number.isFinite(r) ? r : 0);
    }, 0);
    const averageEstimatedCost =
      optionTrades.length > 0 ? totalEstimatedCost / optionTrades.length : 0;

    const manualTrades = trades.filter((t) => t.strategy === "manual").length;
    const autoTrades = trades.filter((t) => t.strategy === "auto").length;
    const testTrades = trades.filter((t) => t.strategy === "test").length;

    const callTrades = optionTrades.filter(
      (t) => t.optionDetails?.trade_direction === "CALL"
    ).length;
    const putTrades = optionTrades.filter(
      (t) => t.optionDetails?.trade_direction === "PUT"
    ).length;

    return {
      totalTrades, openStockTrades, closedStockTrades,
      stockWins, stockLosses, stockBreakEvens, stockWinRate, totalStockPnl,
      optionTrades: optionTrades.length, openOptionTrades, closedOptionTrades,
      optionWins, optionLosses, optionBreakEvens, optionWinRate,
      totalOptionPnl, averageOptionPnl,
      approvedTrades, cautionTrades, blockedTrades,
      totalEstimatedCost, totalMaxRisk, averageEstimatedCost,
      manualTrades, autoTrades, testTrades,
      callTrades, putTrades,
    };
  }, [trades]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(6,182,212,0.04) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(37,99,235,0.04) 0%, transparent 55%)",
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
            "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative p-5">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-600">
              OPTIMA-SYS · Analytics
            </p>
            <h3 className="text-2xl font-black tracking-tight text-white">
              Paper Trade{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Analytics
              </span>
            </h3>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              True option P/L · stock tracking · Risk Guard breakdown · strategy stats
            </p>
          </div>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="group relative shrink-0 self-start overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
              }}
            />
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                Loading...
              </span>
            ) : (
              "⟳ Refresh"
            )}
          </button>
        </div>

        {/* ── MESSAGE ───────────────────────────────────────────────────── */}
        {message && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-slate-800 bg-black/30">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-red-500" />
            <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-slate-400">
              {message}
            </p>
          </div>
        )}

        {/* ── LOADING STATE ─────────────────────────────────────────────── */}
        {loading && trades.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-black/30 px-4 py-3">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
            <p className="font-mono text-[9px] text-slate-500">Loading analytics...</p>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
        {!loading && trades.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </p>
            <p className="mt-1 font-mono text-sm font-black text-slate-500">
              No paper trades yet
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-600">
              Save a paper trade to populate analytics.
            </p>
          </div>
        )}

        {/* ── ANALYTICS CONTENT ─────────────────────────────────────────── */}
        {trades.length > 0 && (
          <div className="space-y-5">

            {/* Stock performance */}
            <div>
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Stock Performance
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <SummaryCell
                  label="Total Trades"
                  value={analytics.totalTrades}
                  sub={`${analytics.openStockTrades} open · ${analytics.closedStockTrades} closed`}
                  bar="bg-blue-500"
                />
                <SummaryCell
                  label="Stock Win Rate"
                  value={formatPercent(analytics.stockWinRate)}
                  sub={`${analytics.stockWins}W · ${analytics.stockLosses}L · ${analytics.stockBreakEvens}BE`}
                  bar={winBar(analytics.stockWinRate)}
                  valueClass={winColor(analytics.stockWinRate)}
                />
                <SummaryCell
                  label="Stock P/L"
                  value={formatMoney(analytics.totalStockPnl)}
                  sub="Based on stock entry / exit"
                  bar={pnlBar(analytics.totalStockPnl)}
                  valueClass={pnlColor(analytics.totalStockPnl)}
                />
              </div>
            </div>

            {/* Option performance */}
            <div>
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Option Performance
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <SummaryCell
                  label="Option P/L"
                  value={formatMoney(analytics.totalOptionPnl)}
                  sub={`${analytics.closedOptionTrades} closed options`}
                  bar={pnlBar(analytics.totalOptionPnl)}
                  valueClass={pnlColor(analytics.totalOptionPnl)}
                />
                <SummaryCell
                  label="Option Win Rate"
                  value={formatPercent(analytics.optionWinRate)}
                  sub={`${analytics.optionWins}W · ${analytics.optionLosses}L · ${analytics.optionBreakEvens}BE`}
                  bar={winBar(analytics.optionWinRate)}
                  valueClass={winColor(analytics.optionWinRate)}
                />
                <SummaryCell
                  label="Avg Option P/L"
                  value={formatMoney(analytics.averageOptionPnl)}
                  sub={`${analytics.openOptionTrades} options still open`}
                  bar={pnlBar(analytics.averageOptionPnl)}
                  valueClass={pnlColor(analytics.averageOptionPnl)}
                />
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <SummaryCell
                  label="Option Trades"
                  value={analytics.optionTrades}
                  sub={`${analytics.callTrades} CALL · ${analytics.putTrades} PUT`}
                  bar="bg-blue-500"
                />
                <SummaryCell
                  label="Avg Option Cost"
                  value={formatMoney(analytics.averageEstimatedCost)}
                  sub={`${formatMoney(analytics.totalEstimatedCost)} total cost`}
                  bar="bg-slate-500"
                />
                <SummaryCell
                  label="Total Max Risk"
                  value={formatMoney(analytics.totalMaxRisk)}
                  sub="Sum of saved option max risk"
                  bar="bg-red-500"
                  valueClass="text-red-400"
                />
              </div>
            </div>

            {/* Risk Guard breakdown */}
            <div>
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Risk Guard Breakdown
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <RiskCell
                  status="APPROVED"
                  count={analytics.approvedTrades}
                  sub="Clean approved contracts"
                />
                <RiskCell
                  status="CAUTION"
                  count={analytics.cautionTrades}
                  sub="Caution-flagged contracts"
                />
                <RiskCell
                  status="BLOCKED"
                  count={analytics.blockedTrades}
                  sub="Should usually be 0"
                />
              </div>
            </div>

            {/* Strategy breakdown */}
            <div>
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Strategy Breakdown
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <SummaryCell
                  label="Manual"
                  value={analytics.manualTrades}
                  sub="Manual paper trades"
                  bar="bg-slate-500"
                />
                <SummaryCell
                  label="Auto"
                  value={analytics.autoTrades}
                  sub="Auto strategy trades"
                  bar="bg-blue-500"
                />
                <SummaryCell
                  label="Test"
                  value={analytics.testTrades}
                  sub="Test strategy trades"
                  bar="bg-orange-500"
                  valueClass={analytics.testTrades > 0 ? "text-orange-300" : "text-white"}
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background:
            "linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)",
        }}
      />
    </div>
  );
}