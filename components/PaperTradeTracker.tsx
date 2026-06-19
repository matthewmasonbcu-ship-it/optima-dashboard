"use client";

// ─── UI ONLY — all Supabase, filter, close, and P/L logic untouched ──────────

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TradeFilter = "all" | "clean" | "override";

type PaperTrade = {
  id: string;
  created_at?: string | null;
  symbol?: string | null;
  ticker?: string | null;
  side?: string | null;
  direction?: string | null;
  strategy?: string | null;
  status?: string | null;
  entry_price?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  quantity?: number | null;
  shares?: number | null;
  confidence_score?: number | null;
  block_reason?: string | null;
  market_condition?: string | null;
  trade_reason?: string | null;
};

type OptionTradeDetail = {
  id: string;
  paper_trade_id: string;
  created_at?: string | null;
  stock_symbol?: string | null;
  trade_direction?: string | null;
  option_symbol?: string | null;
  expiration_date?: string | null;
  strike_price?: number | null;
  bid_price?: number | null;
  ask_price?: number | null;
  mid_price?: number | null;
  contracts?: number | null;
  estimated_cost?: number | null;
  max_risk?: number | null;
  risk_guard_status?: string | null;
  risk_guard_reason?: string | null;
  override_used?: boolean | null;
  override_reason?: string | null;
  option_status?: string | null;
  exit_option_price?: number | null;
  option_exit_price?: number | null;
  option_pnl?: number | null;
};

type TrackerSummary = {
  totalTrades: number;
  cleanTrades: number;
  overrideTrades: number;
  openStockTrades: number;
  closedStockTrades: number;
  stockWins: number;
  stockLosses: number;
  stockBreakEvens: number;
  stockPnl: number;
  optionTrades: number;
  openOptionTrades: number;
  closedOptionTrades: number;
  optionWins: number;
  optionLosses: number;
  optionBreakEvens: number;
  optionPnl: number;
  cleanOptionTrades: number;
  cleanClosedOptionTrades: number;
  cleanOptionWins: number;
  cleanOptionLosses: number;
  cleanOptionBreakEvens: number;
  cleanOptionPnl: number;
  overrideOptionTrades: number;
  overrideClosedOptionTrades: number;
  overrideOptionPnl: number;
  callCount: number;
  putCount: number;
  totalEstimatedCost: number;
  totalMaxRisk: number;
};

// ─── All helper functions — untouched ────────────────────────────────────────
function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "$0.00";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(decimals);
}

function getTradeSymbol(trade: PaperTrade) {
  return trade.symbol || trade.ticker || "UNKNOWN";
}

function getTradeQuantity(trade: PaperTrade) {
  return Number(trade.quantity || trade.shares || 1);
}

function isOverrideTrade(trade: PaperTrade, optionDetail?: OptionTradeDetail) {
  return trade.strategy === "manual_override_test" || optionDetail?.override_used === true;
}

function getStockPnl(trade: PaperTrade) {
  const entry = Number(trade.entry_price || 0);
  const exit = Number(trade.exit_price || 0);
  const quantity = getTradeQuantity(trade);
  if (!entry || !exit) return 0;
  return (exit - entry) * quantity;
}

function getOptionExitPrice(optionDetail: OptionTradeDetail) {
  return Number(optionDetail.exit_option_price || optionDetail.option_exit_price || 0);
}

function getOptionPnl(optionDetail: OptionTradeDetail) {
  if (optionDetail.option_pnl !== null && optionDetail.option_pnl !== undefined && !Number.isNaN(Number(optionDetail.option_pnl))) {
    return Number(optionDetail.option_pnl);
  }
  const entryMid = Number(optionDetail.mid_price || 0);
  const exitPrice = getOptionExitPrice(optionDetail);
  const contracts = Number(optionDetail.contracts || 1);
  if (!entryMid || !exitPrice) return 0;
  return (exitPrice - entryMid) * 100 * contracts;
}

function getOptionStatus(optionDetail: OptionTradeDetail) {
  if (optionDetail.option_status) return optionDetail.option_status;
  const exitPrice = getOptionExitPrice(optionDetail);
  return exitPrice > 0 ? "closed" : "open";
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
function getPnlColor(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-400";
}

function getRiskBar(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500";
  if (s === "CAUTION") return "bg-yellow-400";
  if (s === "BLOCKED") return "bg-red-500";
  return "bg-slate-600";
}

function getRiskColor(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "text-emerald-300";
  if (s === "CAUTION") return "text-yellow-300";
  if (s === "BLOCKED") return "text-red-400";
  return "text-slate-400";
}

function getRiskBorder(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "border-emerald-500/25 ring-emerald-500/10";
  if (s === "CAUTION") return "border-yellow-500/25 ring-yellow-500/10";
  if (s === "BLOCKED") return "border-red-500/25 ring-red-500/10";
  return "border-slate-700/60 ring-slate-700/10";
}

function getDirectionColor(dir: string | null | undefined) {
  const d = String(dir || "").toUpperCase();
  if (d.includes("CALL")) return "text-emerald-300";
  if (d.includes("PUT")) return "text-red-400";
  return "text-slate-400";
}

function getDirectionBadge(dir: string | null | undefined) {
  const d = String(dir || "").toUpperCase();
  if (d.includes("CALL")) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (d.includes("PUT")) return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700/60 bg-slate-800 text-slate-400";
}

// ─── MiniStat — matches suite ─────────────────────────────────────────────────
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
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-xs font-black ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── SummaryCell — left-bar stat cell for the summary grid ───────────────────
function SummaryCell({
  label,
  value,
  sub,
  bar = "bg-slate-700",
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  bar?: string;
  valueClass?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 ring-1 ring-slate-700/10">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} />
      <div className="pl-1">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
          {label}
        </p>
        <p className={`mt-1 font-mono text-lg font-black ${valueClass}`}>{value}</p>
        {sub && (
          <p className="mt-0.5 font-mono text-[9px] text-slate-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function PaperTradeTracker() {
  // ─── All state — untouched ────────────────────────────────────────────────
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [optionDetails, setOptionDetails] = useState<OptionTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("all");

  // ─── All data loading — untouched ─────────────────────────────────────────
  async function loadTrades() {
    setLoading(true);
    setMessage("");
    try {
      const { data: paperTradeData, error: paperTradeError } = await supabase
        .from("paper_trades")
        .select("*")
        .order("created_at", { ascending: false });
      if (paperTradeError) throw paperTradeError;

      const { data: optionDetailData, error: optionDetailError } = await supabase
        .from("option_trade_details")
        .select("*")
        .order("created_at", { ascending: false });
      if (optionDetailError) throw optionDetailError;

      setTrades((paperTradeData || []) as PaperTrade[]);
      setOptionDetails((optionDetailData || []) as OptionTradeDetail[]);
    } catch (error) {
      console.error("PaperTradeTracker load error:", error);
      setMessage(error instanceof Error ? error.message : "Failed to load paper trades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
    function handleRefresh() { loadTrades(); }
    window.addEventListener("paper-trade-saved", handleRefresh);
    window.addEventListener("option-trade-saved", handleRefresh);
    return () => {
      window.removeEventListener("paper-trade-saved", handleRefresh);
      window.removeEventListener("option-trade-saved", handleRefresh);
    };
  }, []);

  function getOptionDetailForTrade(tradeId: string) {
    return optionDetails.find((detail) => detail.paper_trade_id === tradeId);
  }

  // ─── Trade close logic — untouched ───────────────────────────────────────
  async function closeStockTrade(trade: PaperTrade, result: "win" | "loss" | "be") {
    const entry = Number(trade.entry_price || 0);
    const stopLoss = Number(trade.stop_loss || 0);
    const takeProfit = Number(trade.take_profit || 0);
    let exitPrice = entry;
    if (result === "win") exitPrice = takeProfit || entry;
    if (result === "loss") exitPrice = stopLoss || entry;
    if (result === "be") exitPrice = entry;

    const { error } = await supabase
      .from("paper_trades")
      .update({ status: "closed", exit_price: exitPrice })
      .eq("id", trade.id);

    if (error) { console.error("Close trade error:", error); setMessage(error.message); return; }
    setMessage(`${getTradeSymbol(trade)} stock trade closed as ${result.toUpperCase()}.`);
    await loadTrades();
  }

  // ─── Filter logic — untouched ─────────────────────────────────────────────
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const optionDetail = getOptionDetailForTrade(trade.id);
      const override = isOverrideTrade(trade, optionDetail);
      if (tradeFilter === "clean") return !override;
      if (tradeFilter === "override") return override;
      return true;
    });
  }, [trades, optionDetails, tradeFilter]);

  const filteredOptionDetails = useMemo(() => {
    const filteredTradeIds = new Set(filteredTrades.map((trade) => trade.id));
    return optionDetails.filter((detail) => filteredTradeIds.has(detail.paper_trade_id));
  }, [filteredTrades, optionDetails]);

  // ─── Summary calculations — untouched ────────────────────────────────────
  const summary = useMemo<TrackerSummary>(() => {
    const cleanTrades = trades.filter((trade) => {
      const optionDetail = optionDetails.find((d) => d.paper_trade_id === trade.id);
      return !isOverrideTrade(trade, optionDetail);
    });
    const overrideTrades = trades.filter((trade) => {
      const optionDetail = optionDetails.find((d) => d.paper_trade_id === trade.id);
      return isOverrideTrade(trade, optionDetail);
    });
    const closedStockTrades = filteredTrades.filter((t) => t.status === "closed" || t.exit_price !== null);
    const openStockTrades = filteredTrades.filter((t) => t.status !== "closed" && t.exit_price === null);
    const stockPnls = closedStockTrades.map(getStockPnl);
    const stockWins = stockPnls.filter((p) => p > 0).length;
    const stockLosses = stockPnls.filter((p) => p < 0).length;
    const stockBreakEvens = stockPnls.filter((p) => p === 0).length;
    const stockPnl = stockPnls.reduce((s, p) => s + p, 0);
    const closedOptions = filteredOptionDetails.filter((d) => getOptionStatus(d).toLowerCase() === "closed");
    const openOptions = filteredOptionDetails.filter((d) => getOptionStatus(d).toLowerCase() !== "closed");
    const optionPnls = closedOptions.map(getOptionPnl);
    const optionWins = optionPnls.filter((p) => p > 0).length;
    const optionLosses = optionPnls.filter((p) => p < 0).length;
    const optionBreakEvens = optionPnls.filter((p) => p === 0).length;
    const optionPnl = optionPnls.reduce((s, p) => s + p, 0);
    const cleanTradeIds = new Set(cleanTrades.map((t) => t.id));
    const overrideTradeIds = new Set(overrideTrades.map((t) => t.id));
    const cleanOptions = optionDetails.filter((d) => cleanTradeIds.has(d.paper_trade_id));
    const overrideOptions = optionDetails.filter((d) => overrideTradeIds.has(d.paper_trade_id));
    const cleanClosedOptions = cleanOptions.filter((d) => getOptionStatus(d).toLowerCase() === "closed");
    const overrideClosedOptions = overrideOptions.filter((d) => getOptionStatus(d).toLowerCase() === "closed");
    const cleanOptionPnls = cleanClosedOptions.map(getOptionPnl);
    const overrideOptionPnls = overrideClosedOptions.map(getOptionPnl);
    const cleanOptionWins = cleanOptionPnls.filter((p) => p > 0).length;
    const cleanOptionLosses = cleanOptionPnls.filter((p) => p < 0).length;
    const cleanOptionBreakEvens = cleanOptionPnls.filter((p) => p === 0).length;
    const cleanOptionPnl = cleanOptionPnls.reduce((s, p) => s + p, 0);
    const overrideOptionPnl = overrideOptionPnls.reduce((s, p) => s + p, 0);
    const callCount = filteredOptionDetails.filter((d) => String(d.trade_direction || "").toUpperCase().includes("CALL")).length;
    const putCount = filteredOptionDetails.filter((d) => String(d.trade_direction || "").toUpperCase().includes("PUT")).length;
    const totalEstimatedCost = filteredOptionDetails.reduce((s, d) => s + Number(d.estimated_cost || 0), 0);
    const totalMaxRisk = filteredOptionDetails.reduce((s, d) => s + Number(d.max_risk || 0), 0);

    return {
      totalTrades: filteredTrades.length,
      cleanTrades: cleanTrades.length,
      overrideTrades: overrideTrades.length,
      openStockTrades: openStockTrades.length,
      closedStockTrades: closedStockTrades.length,
      stockWins, stockLosses, stockBreakEvens, stockPnl,
      optionTrades: filteredOptionDetails.length,
      openOptionTrades: openOptions.length,
      closedOptionTrades: closedOptions.length,
      optionWins, optionLosses, optionBreakEvens, optionPnl,
      cleanOptionTrades: cleanOptions.length,
      cleanClosedOptionTrades: cleanClosedOptions.length,
      cleanOptionWins, cleanOptionLosses, cleanOptionBreakEvens, cleanOptionPnl,
      overrideOptionTrades: overrideOptions.length,
      overrideClosedOptionTrades: overrideClosedOptions.length,
      overrideOptionPnl,
      callCount, putCount, totalEstimatedCost, totalMaxRisk,
    };
  }, [trades, optionDetails, filteredTrades, filteredOptionDetails]);

  // ─── Derived display values — untouched ──────────────────────────────────
  const stockWinRate = summary.closedStockTrades > 0 ? (summary.stockWins / summary.closedStockTrades) * 100 : 0;
  const optionWinRate = summary.closedOptionTrades > 0 ? (summary.optionWins / summary.closedOptionTrades) * 100 : 0;
  const cleanOptionWinRate = summary.cleanClosedOptionTrades > 0 ? (summary.cleanOptionWins / summary.cleanClosedOptionTrades) * 100 : 0;
  const avgOptionPnl = summary.closedOptionTrades > 0 ? summary.optionPnl / summary.closedOptionTrades : 0;

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
          background: "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative p-5">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Trade Journal
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Paper Trade{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Tracker
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              Clean trades separated from override tests · real stats stay honest
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Filter tab strip */}
            <div className="flex overflow-hidden rounded-lg border border-slate-700/60 bg-black/40">
              {(
                [
                  { key: "all", label: "All Trades", active: "bg-slate-700 text-white", bar: "bg-slate-400" },
                  { key: "clean", label: "Clean", active: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-500" },
                  { key: "override", label: "Overrides", active: "bg-orange-500/20 text-orange-300", bar: "bg-orange-500" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTradeFilter(tab.key)}
                  className={`relative px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                    tradeFilter === tab.key
                      ? tab.active
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tradeFilter === tab.key && (
                    <span className={`absolute inset-x-0 bottom-0 h-[2px] ${tab.bar}`} />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <button
              onClick={loadTrades}
              disabled={loading}
              className="group relative overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg, transparent, #06b6d4, transparent)" }}
              />
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
                  Loading...
                </span>
              ) : (
                "⟳ Refresh"
              )}
            </button>
          </div>
        </div>

        {/* ── STATUS MESSAGE ────────────────────────────────────────────── */}
        {message && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-slate-800 bg-black/30">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-violet-500" />
            <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-slate-400">
              {message}
            </p>
          </div>
        )}

        {/* ── SUMMARY GRID ──────────────────────────────────────────────── */}
        <div className="mb-6">
          {/* Clean stats section */}
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
            Clean Trades
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryCell
              label="Clean Option W/R"
              value={`${cleanOptionWinRate.toFixed(1)}%`}
              sub={`${summary.cleanOptionWins}W · ${summary.cleanOptionLosses}L · ${summary.cleanOptionBreakEvens}BE`}
              bar="bg-emerald-500"
              valueClass={cleanOptionWinRate >= 50 ? "text-emerald-300" : "text-red-400"}
            />
            <SummaryCell
              label="Clean Option P/L"
              value={formatMoney(summary.cleanOptionPnl)}
              sub={`${summary.cleanOptionTrades} clean option trades`}
              bar="bg-emerald-500"
              valueClass={getPnlColor(summary.cleanOptionPnl)}
            />
            <SummaryCell
              label="Clean Trades"
              value={summary.cleanTrades}
              sub={`${summary.cleanClosedOptionTrades} closed options`}
              bar="bg-emerald-500"
            />
            <SummaryCell
              label="Stock Win Rate"
              value={`${stockWinRate.toFixed(1)}%`}
              sub={`${summary.stockWins}W · ${summary.stockLosses}L · ${summary.stockBreakEvens}BE`}
              bar="bg-blue-500"
              valueClass={stockWinRate >= 50 ? "text-emerald-300" : "text-red-400"}
            />
          </div>

          {/* Option + risk stats */}
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
            Option Performance
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryCell
              label="Filtered Option W/R"
              value={`${optionWinRate.toFixed(1)}%`}
              sub={`${summary.optionWins}W · ${summary.optionLosses}L`}
              bar="bg-blue-500"
              valueClass={optionWinRate >= 50 ? "text-emerald-300" : "text-red-400"}
            />
            <SummaryCell
              label="Filtered Option P/L"
              value={formatMoney(summary.optionPnl)}
              sub={`${summary.closedOptionTrades} closed visible`}
              bar="bg-blue-500"
              valueClass={getPnlColor(summary.optionPnl)}
            />
            <SummaryCell
              label="Avg Option P/L"
              value={formatMoney(avgOptionPnl)}
              sub="Per closed visible option"
              bar="bg-blue-500"
              valueClass={getPnlColor(avgOptionPnl)}
            />
            <SummaryCell
              label="Open / Closed"
              value={`${summary.openOptionTrades} / ${summary.closedOptionTrades}`}
              sub={`${summary.callCount} CALL · ${summary.putCount} PUT`}
              bar="bg-slate-500"
            />
          </div>

          {/* Override + risk */}
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
            Override Audit · Risk
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryCell
              label="Override Test P/L"
              value={formatMoney(summary.overrideOptionPnl)}
              sub={`${summary.overrideOptionTrades} override trades`}
              bar="bg-orange-500"
              valueClass={getPnlColor(summary.overrideOptionPnl)}
            />
            <SummaryCell
              label="Total Overrides"
              value={summary.overrideTrades}
              sub="Excluded from clean stats"
              bar="bg-orange-500"
              valueClass="text-orange-300"
            />
            <SummaryCell
              label="Total Max Risk"
              value={formatMoney(summary.totalMaxRisk)}
              sub={`${formatMoney(summary.totalEstimatedCost)} est. cost`}
              bar="bg-red-500"
              valueClass="text-red-400"
            />
            <SummaryCell
              label="Visible Trades"
              value={summary.totalTrades}
              sub={`${summary.cleanTrades} clean · ${summary.overrideTrades} override`}
              bar="bg-slate-600"
            />
          </div>
        </div>

        {/* ── TRADE LIST ────────────────────────────────────────────────── */}
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-12">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </p>
            <p className="mt-1 font-mono text-sm font-black text-slate-500">
              No trades found for this filter
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrades.map((trade) => {
              const optionDetail = getOptionDetailForTrade(trade.id);
              const symbol = getTradeSymbol(trade);
              const strategy = trade.strategy || "manual";
              const override = isOverrideTrade(trade, optionDetail);
              const isClosed = trade.status === "closed" || trade.exit_price !== null;
              const stockPnl = getStockPnl(trade);

              return (
                <div
                  key={trade.id}
                  className={`relative overflow-hidden rounded-xl border ring-1 ${
                    override
                      ? "border-orange-500/30 bg-orange-500/5 ring-orange-500/10"
                      : "border-slate-700/60 bg-slate-900/60 ring-slate-700/10"
                  }`}
                >
                  {/* Left accent bar */}
                  <div
                    className={`absolute inset-y-0 left-0 w-[3px] ${
                      override ? "bg-orange-500" : isClosed ? "bg-slate-600" : "bg-blue-500"
                    }`}
                  />

                  {/* Override top glow */}
                  {override && (
                    <div
                      className="absolute inset-x-0 top-0 h-px opacity-50"
                      style={{ background: "linear-gradient(90deg, transparent, #f97316, transparent)" }}
                    />
                  )}

                  <div className="px-5 py-4 pl-6">

                    {/* ── Trade header row ────────────────────────────── */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xl font-black text-white">
                            {symbol}
                          </span>

                          {/* Status badge */}
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${
                              isClosed
                                ? "border-slate-600/60 bg-slate-800/60 text-slate-400"
                                : "border-blue-500/40 bg-blue-500/10 text-blue-300"
                            }`}
                          >
                            {isClosed ? "Closed" : "Open"}
                          </span>

                          {/* Strategy badge */}
                          <span className="rounded border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            {strategy}
                          </span>

                          {/* Override badge */}
                          {override && (
                            <span className="rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-orange-300">
                              Test Override
                            </span>
                          )}
                        </div>

                        {/* Stock price fields */}
                        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                          <MiniStat label="Entry" value={formatMoney(trade.entry_price)} />
                          <MiniStat
                            label="Exit"
                            value={trade.exit_price ? formatMoney(trade.exit_price) : "Open"}
                            valueClass={trade.exit_price ? "text-slate-200" : "text-blue-400"}
                          />
                          <MiniStat label="Stop" value={formatMoney(trade.stop_loss)} />
                          <MiniStat label="Target" value={formatMoney(trade.take_profit)} />
                        </div>

                        {/* Stock P/L */}
                        {isClosed && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="font-mono text-[9px] text-slate-600">
                              Stock P/L ›
                            </span>
                            <span className={`font-mono text-xs font-black ${getPnlColor(stockPnl)}`}>
                              {formatMoney(stockPnl)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Close buttons — only on open trades */}
                      {!isClosed && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => closeStockTrade(trade, "win")}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            Win
                          </button>
                          <button
                            onClick={() => closeStockTrade(trade, "loss")}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-red-400 transition hover:bg-red-500/20"
                          >
                            Loss
                          </button>
                          <button
                            onClick={() => closeStockTrade(trade, "be")}
                            className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 transition hover:text-slate-200"
                          >
                            BE
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── Override audit strip ─────────────────────────── */}
                    {override && (
                      <div className="relative mt-3 overflow-hidden rounded-lg border border-orange-500/20 bg-orange-500/5">
                        <div className="absolute inset-y-0 left-0 w-[2px] bg-orange-500" />
                        <div className="px-4 py-2.5 pl-5">
                          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-orange-500">
                            Audit · Test Override Trade
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] leading-4 text-orange-700">
                            Forced through for testing. Excluded from clean system performance stats.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Why I Took This ─────────────────────────────── */}
                    {trade.trade_reason && (
                      <div className="relative mt-3 overflow-hidden rounded-lg border border-violet-500/20 bg-violet-500/5">
                        <div className="absolute inset-y-0 left-0 w-[2px] bg-violet-500" />
                        <div className="px-4 py-2.5 pl-5">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-violet-600">
                            Why I Took This ›{" "}
                          </span>
                          <span className="font-mono text-[9px] leading-4 text-slate-400">
                            {trade.trade_reason}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ── Connected option details ─────────────────────── */}
                    {optionDetail ? (
                      <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-700/60 bg-black/30 ring-1 ring-slate-700/10">
                        <div className={`absolute inset-y-0 left-0 w-[2px] ${getRiskBar(optionDetail.risk_guard_status)}`} />

                        <div className="px-4 py-3 pl-5">
                          {/* Option detail header */}
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
                                Connected Option
                              </p>
                              <p className="mt-0.5 break-all font-mono text-xs font-black text-slate-300">
                                {optionDetail.option_symbol || "No option symbol saved"}
                              </p>
                            </div>

                            {optionDetail.risk_guard_status && (
                              <div
                                className={`relative overflow-hidden rounded-lg border ring-1 px-3 py-1.5 ${getRiskBorder(optionDetail.risk_guard_status)}`}
                              >
                                <div className={`absolute inset-y-0 left-0 w-[2px] ${getRiskBar(optionDetail.risk_guard_status)}`} />
                                <span className={`pl-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${getRiskColor(optionDetail.risk_guard_status)}`}>
                                  Risk Guard · {optionDetail.risk_guard_status}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Option stats grid */}
                          <div className="grid grid-cols-4 gap-1.5 md:grid-cols-6 xl:grid-cols-12">
                            <MiniStat
                              label="Dir"
                              value={String(optionDetail.trade_direction || "—").toUpperCase()}
                              valueClass={getDirectionColor(optionDetail.trade_direction)}
                            />
                            <MiniStat label="Exp" value={optionDetail.expiration_date || "—"} />
                            <MiniStat
                              label="Strike"
                              value={optionDetail.strike_price ? `$${formatNumber(optionDetail.strike_price, 2)}` : "—"}
                            />
                            <MiniStat label="Qty" value={optionDetail.contracts ?? "—"} />
                            <MiniStat label="Bid" value={formatMoney(optionDetail.bid_price)} />
                            <MiniStat label="Ask" value={formatMoney(optionDetail.ask_price)} />
                            <MiniStat label="Mid" value={formatMoney(optionDetail.mid_price)} valueClass="text-emerald-300" />
                            <MiniStat
                              label="Exit"
                              value={getOptionExitPrice(optionDetail) > 0 ? formatMoney(getOptionExitPrice(optionDetail)) : "Open"}
                              valueClass={getOptionExitPrice(optionDetail) > 0 ? "text-slate-200" : "text-blue-400"}
                            />
                            <MiniStat label="Cost" value={formatMoney(optionDetail.estimated_cost)} />
                            <MiniStat label="Max Risk" value={formatMoney(optionDetail.max_risk)} valueClass="text-red-400" />
                            <MiniStat
                              label="Status"
                              value={getOptionStatus(optionDetail).toUpperCase()}
                              valueClass={getOptionStatus(optionDetail).toLowerCase() === "closed" ? "text-slate-400" : "text-blue-400"}
                            />
                            <MiniStat
                              label="Option P/L"
                              value={
                                getOptionStatus(optionDetail).toLowerCase() === "closed"
                                  ? formatMoney(getOptionPnl(optionDetail))
                                  : "Open"
                              }
                              valueClass={
                                getOptionStatus(optionDetail).toLowerCase() === "closed"
                                  ? getPnlColor(getOptionPnl(optionDetail))
                                  : "text-blue-400"
                              }
                            />
                          </div>

                          {/* Risk Guard reason */}
                          {optionDetail.risk_guard_reason && (
                            <div className="relative mt-2.5 overflow-hidden rounded-lg border border-slate-800 bg-black/20">
                              <div className={`absolute inset-y-0 left-0 w-[2px] ${getRiskBar(optionDetail.risk_guard_status)}`} />
                              <div className="px-4 py-2 pl-5">
                                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                  Risk Guard Reason ›{" "}
                                </span>
                                <span className="font-mono text-[9px] text-slate-500">
                                  {optionDetail.risk_guard_reason}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Override audit for option */}
                          {optionDetail.override_used && (
                            <div className="relative mt-2.5 overflow-hidden rounded-lg border border-orange-500/20 bg-orange-500/5">
                              <div className="absolute inset-y-0 left-0 w-[2px] bg-orange-500" />
                              <div className="px-4 py-2.5 pl-5">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-orange-500">
                                  Testing Override Audit · Override Used: YES
                                </p>
                                {optionDetail.override_reason && (
                                  <p className="mt-0.5 font-mono text-[9px] leading-4 text-orange-700">
                                    {optionDetail.override_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-800/60 bg-black/20">
                        <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-700" />
                        <p className="px-4 py-2.5 pl-5 font-mono text-[9px] text-slate-600">
                          No connected option details for this trade.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)" }}
      />
    </div>
  );
}