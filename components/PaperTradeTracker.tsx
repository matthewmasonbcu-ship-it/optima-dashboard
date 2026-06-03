"use client";

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

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "$0.00";
  }

  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toFixed(decimals);
}

function getTradeSymbol(trade: PaperTrade) {
  return trade.symbol || trade.ticker || "UNKNOWN";
}

function getTradeQuantity(trade: PaperTrade) {
  return Number(trade.quantity || trade.shares || 1);
}

function isOverrideTrade(trade: PaperTrade, optionDetail?: OptionTradeDetail) {
  return (
    trade.strategy === "manual_override_test" ||
    optionDetail?.override_used === true
  );
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
  if (
    optionDetail.option_pnl !== null &&
    optionDetail.option_pnl !== undefined &&
    !Number.isNaN(Number(optionDetail.option_pnl))
  ) {
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

function getStatusClass(status: string | null | undefined) {
  const cleanStatus = String(status || "").toUpperCase();

  if (cleanStatus === "APPROVED") {
    return "border-emerald-400 bg-emerald-500/10 text-emerald-300";
  }

  if (cleanStatus === "CAUTION") {
    return "border-yellow-400 bg-yellow-500/10 text-yellow-300";
  }

  if (cleanStatus === "BLOCKED") {
    return "border-red-400 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-800 text-slate-300";
}

function getPnlClass(value: number) {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-300";
}

function StatCard({
  label,
  value,
  subtext,
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}

export default function PaperTradeTracker() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [optionDetails, setOptionDetails] = useState<OptionTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("all");

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
      setMessage(
        error instanceof Error ? error.message : "Failed to load paper trades."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();

    function handleRefresh() {
      loadTrades();
    }

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

  async function closeStockTrade(
    trade: PaperTrade,
    result: "win" | "loss" | "be"
  ) {
    const entry = Number(trade.entry_price || 0);
    const stopLoss = Number(trade.stop_loss || 0);
    const takeProfit = Number(trade.take_profit || 0);

    let exitPrice = entry;

    if (result === "win") exitPrice = takeProfit || entry;
    if (result === "loss") exitPrice = stopLoss || entry;
    if (result === "be") exitPrice = entry;

    const { error } = await supabase
      .from("paper_trades")
      .update({
        status: "closed",
        exit_price: exitPrice,
      })
      .eq("id", trade.id);

    if (error) {
      console.error("Close trade error:", error);
      setMessage(error.message);
      return;
    }

    setMessage(`${getTradeSymbol(trade)} stock trade closed as ${result.toUpperCase()}.`);
    await loadTrades();
  }

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

  const summary = useMemo<TrackerSummary>(() => {
    const cleanTrades = trades.filter((trade) => {
      const optionDetail = optionDetails.find((detail) => detail.paper_trade_id === trade.id);
      return !isOverrideTrade(trade, optionDetail);
    });

    const overrideTrades = trades.filter((trade) => {
      const optionDetail = optionDetails.find((detail) => detail.paper_trade_id === trade.id);
      return isOverrideTrade(trade, optionDetail);
    });

    const closedStockTrades = filteredTrades.filter(
      (trade) => trade.status === "closed" || trade.exit_price !== null
    );

    const openStockTrades = filteredTrades.filter(
      (trade) => trade.status !== "closed" && trade.exit_price === null
    );

    const stockPnls = closedStockTrades.map(getStockPnl);
    const stockWins = stockPnls.filter((pnl) => pnl > 0).length;
    const stockLosses = stockPnls.filter((pnl) => pnl < 0).length;
    const stockBreakEvens = stockPnls.filter((pnl) => pnl === 0).length;
    const stockPnl = stockPnls.reduce((sum, pnl) => sum + pnl, 0);

    const closedOptions = filteredOptionDetails.filter(
      (detail) => getOptionStatus(detail).toLowerCase() === "closed"
    );

    const openOptions = filteredOptionDetails.filter(
      (detail) => getOptionStatus(detail).toLowerCase() !== "closed"
    );

    const optionPnls = closedOptions.map(getOptionPnl);
    const optionWins = optionPnls.filter((pnl) => pnl > 0).length;
    const optionLosses = optionPnls.filter((pnl) => pnl < 0).length;
    const optionBreakEvens = optionPnls.filter((pnl) => pnl === 0).length;
    const optionPnl = optionPnls.reduce((sum, pnl) => sum + pnl, 0);

    const cleanTradeIds = new Set(cleanTrades.map((trade) => trade.id));
    const overrideTradeIds = new Set(overrideTrades.map((trade) => trade.id));

    const cleanOptions = optionDetails.filter((detail) =>
      cleanTradeIds.has(detail.paper_trade_id)
    );

    const overrideOptions = optionDetails.filter((detail) =>
      overrideTradeIds.has(detail.paper_trade_id)
    );

    const cleanClosedOptions = cleanOptions.filter(
      (detail) => getOptionStatus(detail).toLowerCase() === "closed"
    );

    const overrideClosedOptions = overrideOptions.filter(
      (detail) => getOptionStatus(detail).toLowerCase() === "closed"
    );

    const cleanOptionPnls = cleanClosedOptions.map(getOptionPnl);
    const overrideOptionPnls = overrideClosedOptions.map(getOptionPnl);

    const cleanOptionWins = cleanOptionPnls.filter((pnl) => pnl > 0).length;
    const cleanOptionLosses = cleanOptionPnls.filter((pnl) => pnl < 0).length;
    const cleanOptionBreakEvens = cleanOptionPnls.filter((pnl) => pnl === 0).length;
    const cleanOptionPnl = cleanOptionPnls.reduce((sum, pnl) => sum + pnl, 0);
    const overrideOptionPnl = overrideOptionPnls.reduce((sum, pnl) => sum + pnl, 0);

    const callCount = filteredOptionDetails.filter((detail) => {
      const direction = String(detail.trade_direction || "").toUpperCase();
      return direction.includes("CALL");
    }).length;

    const putCount = filteredOptionDetails.filter((detail) => {
      const direction = String(detail.trade_direction || "").toUpperCase();
      return direction.includes("PUT");
    }).length;

    const totalEstimatedCost = filteredOptionDetails.reduce(
      (sum, detail) => sum + Number(detail.estimated_cost || 0),
      0
    );

    const totalMaxRisk = filteredOptionDetails.reduce(
      (sum, detail) => sum + Number(detail.max_risk || 0),
      0
    );

    return {
      totalTrades: filteredTrades.length,
      cleanTrades: cleanTrades.length,
      overrideTrades: overrideTrades.length,

      openStockTrades: openStockTrades.length,
      closedStockTrades: closedStockTrades.length,
      stockWins,
      stockLosses,
      stockBreakEvens,
      stockPnl,

      optionTrades: filteredOptionDetails.length,
      openOptionTrades: openOptions.length,
      closedOptionTrades: closedOptions.length,
      optionWins,
      optionLosses,
      optionBreakEvens,
      optionPnl,

      cleanOptionTrades: cleanOptions.length,
      cleanClosedOptionTrades: cleanClosedOptions.length,
      cleanOptionWins,
      cleanOptionLosses,
      cleanOptionBreakEvens,
      cleanOptionPnl,

      overrideOptionTrades: overrideOptions.length,
      overrideClosedOptionTrades: overrideClosedOptions.length,
      overrideOptionPnl,

      callCount,
      putCount,
      totalEstimatedCost,
      totalMaxRisk,
    };
  }, [trades, optionDetails, filteredTrades, filteredOptionDetails]);

  const stockWinRate =
    summary.closedStockTrades > 0
      ? (summary.stockWins / summary.closedStockTrades) * 100
      : 0;

  const optionWinRate =
    summary.closedOptionTrades > 0
      ? (summary.optionWins / summary.closedOptionTrades) * 100
      : 0;

  const cleanOptionWinRate =
    summary.cleanClosedOptionTrades > 0
      ? (summary.cleanOptionWins / summary.cleanClosedOptionTrades) * 100
      : 0;

  const avgOptionPnl =
    summary.closedOptionTrades > 0
      ? summary.optionPnl / summary.closedOptionTrades
      : 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 to-black p-5 text-white shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-300">
            Road to Funded Account
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Paper Trade Tracker
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Clean system trades are separated from manual override tests so your real stats stay honest.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-2xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setTradeFilter("all")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                tradeFilter === "all"
                  ? "bg-white text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Trades
            </button>

            <button
              onClick={() => setTradeFilter("clean")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                tradeFilter === "clean"
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Clean Only
            </button>

            <button
              onClick={() => setTradeFilter("override")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                tradeFilter === "override"
                  ? "bg-orange-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Overrides
            </button>
          </div>

          <button
            onClick={loadTrades}
            disabled={loading}
            className="rounded-2xl border border-blue-500/40 bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Visible Trades"
          value={summary.totalTrades}
          subtext={`${summary.cleanTrades} clean / ${summary.overrideTrades} override total`}
        />

        <StatCard
          label="Filtered Stock Win Rate"
          value={`${stockWinRate.toFixed(1)}%`}
          subtext={`${summary.stockWins}W / ${summary.stockLosses}L / ${summary.stockBreakEvens}BE`}
        />

        <StatCard
          label="Filtered Stock P/L"
          value={formatMoney(summary.stockPnl)}
          valueClass={getPnlClass(summary.stockPnl)}
          subtext="Based on visible filtered trades"
        />

        <StatCard
          label="Filtered Option P/L"
          value={formatMoney(summary.optionPnl)}
          valueClass={getPnlClass(summary.optionPnl)}
          subtext={`${summary.closedOptionTrades} closed visible options`}
        />

        <StatCard
          label="Filtered Option Win Rate"
          value={`${optionWinRate.toFixed(1)}%`}
          subtext={`${summary.optionWins}W / ${summary.optionLosses}L / ${summary.optionBreakEvens}BE`}
        />

        <StatCard
          label="Clean Option Win Rate"
          value={`${cleanOptionWinRate.toFixed(1)}%`}
          subtext={`${summary.cleanOptionWins}W / ${summary.cleanOptionLosses}L / ${summary.cleanOptionBreakEvens}BE`}
        />

        <StatCard
          label="Clean Option P/L"
          value={formatMoney(summary.cleanOptionPnl)}
          valueClass={getPnlClass(summary.cleanOptionPnl)}
          subtext={`${summary.cleanOptionTrades} clean option trades`}
        />

        <StatCard
          label="Override Test P/L"
          value={formatMoney(summary.overrideOptionPnl)}
          valueClass={getPnlClass(summary.overrideOptionPnl)}
          subtext={`${summary.overrideOptionTrades} override option trades`}
        />

        <StatCard
          label="Option Trades"
          value={summary.optionTrades}
          subtext={`${summary.callCount} CALL / ${summary.putCount} PUT visible`}
        />

        <StatCard
          label="Total Max Risk"
          value={formatMoney(summary.totalMaxRisk)}
          subtext={`${formatMoney(summary.totalEstimatedCost)} visible estimated cost`}
        />

        <StatCard
          label="Open Options"
          value={summary.openOptionTrades}
          subtext={`${summary.closedOptionTrades} closed visible options`}
        />

        <StatCard
          label="Avg Option P/L"
          value={formatMoney(avgOptionPnl)}
          valueClass={getPnlClass(avgOptionPnl)}
          subtext="Average of closed visible options"
        />
      </div>

      {filteredTrades.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">
          No trades found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
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
                className={`rounded-3xl border p-4 shadow-xl shadow-black/20 ${
                  override
                    ? "border-orange-500/40 bg-orange-950/20"
                    : "border-slate-800 bg-slate-900/80"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black">{symbol}</h3>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-bold text-slate-300">
                        {String(trade.status || "open").toUpperCase()}
                      </span>

                      <span className="rounded-full border border-blue-700/60 bg-blue-950 px-2 py-1 text-xs font-bold text-blue-200">
                        {strategy}
                      </span>

                      {override && (
                        <span className="rounded-full border border-orange-400 bg-orange-500/15 px-2 py-1 text-xs font-black text-orange-200">
                          TEST OVERRIDE
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300 md:grid-cols-4">
                      <div>
                        <span className="text-slate-500">Entry: </span>
                        {formatMoney(trade.entry_price)}
                      </div>

                      <div>
                        <span className="text-slate-500">Exit: </span>
                        {trade.exit_price ? formatMoney(trade.exit_price) : "Open"}
                      </div>

                      <div>
                        <span className="text-slate-500">Stop: </span>
                        {formatMoney(trade.stop_loss)}
                      </div>

                      <div>
                        <span className="text-slate-500">Target: </span>
                        {formatMoney(trade.take_profit)}
                      </div>
                    </div>

                    {isClosed && (
                      <div className={`mt-2 text-sm font-black ${getPnlClass(stockPnl)}`}>
                        Stock P/L: {formatMoney(stockPnl)}
                      </div>
                    )}
                  </div>

                  {!isClosed && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => closeStockTrade(trade, "win")}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"
                      >
                        Win
                      </button>

                      <button
                        onClick={() => closeStockTrade(trade, "loss")}
                        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-500"
                      >
                        Loss
                      </button>

                      <button
                        onClick={() => closeStockTrade(trade, "be")}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white hover:bg-slate-600"
                      >
                        BE
                      </button>
                    </div>
                  )}
                </div>

                {override && (
                  <div className="mt-4 rounded-2xl border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-100">
                    <div className="font-black">TEST OVERRIDE TRADE</div>
                    <div className="mt-1 text-orange-200">
                      This trade was manually forced through for testing. It should not count toward clean system performance.
                    </div>
                  </div>
                )}

                {optionDetail ? (
                  <div className="mt-4 rounded-3xl border border-slate-700 bg-black/40 p-4">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-200">
                          Connected Option Details
                        </div>
                        <div className="text-xs text-slate-500">
                          {optionDetail.option_symbol || "No option symbol saved"}
                        </div>
                      </div>

                      {optionDetail.risk_guard_status && (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                            optionDetail.risk_guard_status
                          )}`}
                        >
                          Risk Guard: {optionDetail.risk_guard_status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 md:grid-cols-4">
                      <div>
                        <div className="text-xs text-slate-500">Direction</div>
                        <div className="font-bold">
                          {optionDetail.trade_direction || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Expiration</div>
                        <div className="font-bold">
                          {optionDetail.expiration_date || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Strike</div>
                        <div className="font-bold">
                          {optionDetail.strike_price
                            ? `$${formatNumber(optionDetail.strike_price, 2)}`
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Contracts</div>
                        <div className="font-bold">
                          {optionDetail.contracts || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Bid</div>
                        <div className="font-bold">
                          {formatMoney(optionDetail.bid_price)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Ask</div>
                        <div className="font-bold">
                          {formatMoney(optionDetail.ask_price)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Entry Mid</div>
                        <div className="font-bold">
                          {formatMoney(optionDetail.mid_price)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Exit Option</div>
                        <div className="font-bold">
                          {getOptionExitPrice(optionDetail) > 0
                            ? formatMoney(getOptionExitPrice(optionDetail))
                            : "Open"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Estimated Cost</div>
                        <div className="font-bold">
                          {formatMoney(optionDetail.estimated_cost)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Max Risk</div>
                        <div className="font-bold">
                          {formatMoney(optionDetail.max_risk)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Option Status</div>
                        <div className="font-bold">
                          {getOptionStatus(optionDetail).toUpperCase()}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Option P/L</div>
                        <div
                          className={`font-black ${getPnlClass(
                            getOptionPnl(optionDetail)
                          )}`}
                        >
                          {getOptionStatus(optionDetail).toLowerCase() === "closed"
                            ? formatMoney(getOptionPnl(optionDetail))
                            : "Open"}
                        </div>
                      </div>
                    </div>

                    {optionDetail.risk_guard_reason && (
                      <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-300">
                        <div className="font-black text-slate-200">
                          Risk Guard Reason
                        </div>
                        <div className="mt-1">{optionDetail.risk_guard_reason}</div>
                      </div>
                    )}

                    {optionDetail.override_used && (
                      <div className="mt-3 rounded-2xl border border-orange-400/60 bg-orange-500/10 p-3 text-sm text-orange-100">
                        <div className="font-black">Testing Override Audit</div>

                        <div className="mt-1">
                          Override Used: <span className="font-bold">YES</span>
                        </div>

                        {optionDetail.override_reason && (
                          <div className="mt-1">
                            Reason: {optionDetail.override_reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-black/30 p-3 text-sm text-slate-500">
                    No connected option details found for this trade.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}