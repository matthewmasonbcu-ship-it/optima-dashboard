"use client";

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

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "$0.00";
  }

  return `$${numberValue.toFixed(2)}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function getStockTradeResult(trade: TradeWithOption) {
  if (trade.status !== "closed" || trade.exit_price === null) {
    return "OPEN";
  }

  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);

  if (!Number.isFinite(entry) || !Number.isFinite(exit)) {
    return "UNKNOWN";
  }

  if (exit > entry) return "WIN";
  if (exit < entry) return "LOSS";
  return "BE";
}

function getStockPnl(trade: TradeWithOption) {
  if (trade.status !== "closed" || trade.exit_price === null) {
    return 0;
  }

  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);

  if (!Number.isFinite(entry) || !Number.isFinite(exit)) {
    return 0;
  }

  return exit - entry;
}

function getOptionPnl(trade: TradeWithOption) {
  const pnl = Number(trade.optionDetails?.option_pnl);

  if (!Number.isFinite(pnl)) {
    return 0;
  }

  return pnl;
}

function getOptionTradeResult(trade: TradeWithOption) {
  const option = trade.optionDetails;

  if (!option || option.option_status !== "closed") {
    return "OPEN";
  }

  const pnl = Number(option.option_pnl);

  if (!Number.isFinite(pnl)) {
    return "UNKNOWN";
  }

  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {subtext ? <p className="mt-1 text-sm text-slate-400">{subtext}</p> : null}
    </div>
  );
}

export default function PaperTradeAnalytics({
  refreshKey,
}: PaperTradeAnalyticsProps) {
  const [trades, setTrades] = useState<TradeWithOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      const tradeIds = tradeRows.map((trade) => trade.id).filter(Boolean);

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

      const combined = tradeRows.map((trade) => {
        const optionDetails =
          optionRows.find((option) => option.paper_trade_id === trade.id) ??
          null;

        return {
          ...trade,
          optionDetails,
        };
      });

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

  const analytics = useMemo(() => {
    const totalTrades = trades.length;

    const openStockTrades = trades.filter((trade) => trade.status === "open")
      .length;

    const closedStockTrades = trades.filter(
      (trade) => trade.status === "closed"
    ).length;

    const stockWins = trades.filter(
      (trade) => getStockTradeResult(trade) === "WIN"
    ).length;

    const stockLosses = trades.filter(
      (trade) => getStockTradeResult(trade) === "LOSS"
    ).length;

    const stockBreakEvens = trades.filter(
      (trade) => getStockTradeResult(trade) === "BE"
    ).length;

    const stockWinRate =
      closedStockTrades > 0 ? (stockWins / closedStockTrades) * 100 : 0;

    const totalStockPnl = trades.reduce(
      (sum, trade) => sum + getStockPnl(trade),
      0
    );

    const optionTrades = trades.filter((trade) => trade.optionDetails);

    const openOptionTrades = optionTrades.filter((trade) => {
      const status = trade.optionDetails?.option_status ?? "open";
      return status === "open";
    }).length;

    const closedOptionTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.option_status === "closed"
    ).length;

    const optionWins = optionTrades.filter(
      (trade) => getOptionTradeResult(trade) === "WIN"
    ).length;

    const optionLosses = optionTrades.filter(
      (trade) => getOptionTradeResult(trade) === "LOSS"
    ).length;

    const optionBreakEvens = optionTrades.filter(
      (trade) => getOptionTradeResult(trade) === "BE"
    ).length;

    const optionWinRate =
      closedOptionTrades > 0 ? (optionWins / closedOptionTrades) * 100 : 0;

    const totalOptionPnl = optionTrades.reduce(
      (sum, trade) => sum + getOptionPnl(trade),
      0
    );

    const averageOptionPnl =
      closedOptionTrades > 0 ? totalOptionPnl / closedOptionTrades : 0;

    const approvedTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.risk_guard_status === "APPROVED"
    ).length;

    const cautionTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.risk_guard_status === "CAUTION"
    ).length;

    const blockedTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.risk_guard_status === "BLOCKED"
    ).length;

    const totalEstimatedCost = optionTrades.reduce((sum, trade) => {
      const cost = Number(trade.optionDetails?.estimated_cost);
      return sum + (Number.isFinite(cost) ? cost : 0);
    }, 0);

    const totalMaxRisk = optionTrades.reduce((sum, trade) => {
      const risk = Number(trade.optionDetails?.max_risk);
      return sum + (Number.isFinite(risk) ? risk : 0);
    }, 0);

    const averageEstimatedCost =
      optionTrades.length > 0 ? totalEstimatedCost / optionTrades.length : 0;

    const manualTrades = trades.filter(
      (trade) => trade.strategy === "manual"
    ).length;

    const autoTrades = trades.filter((trade) => trade.strategy === "auto").length;
    const testTrades = trades.filter((trade) => trade.strategy === "test").length;

    const callTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.trade_direction === "CALL"
    ).length;

    const putTrades = optionTrades.filter(
      (trade) => trade.optionDetails?.trade_direction === "PUT"
    ).length;

    return {
      totalTrades,
      openStockTrades,
      closedStockTrades,
      stockWins,
      stockLosses,
      stockBreakEvens,
      stockWinRate,
      totalStockPnl,
      optionTrades: optionTrades.length,
      openOptionTrades,
      closedOptionTrades,
      optionWins,
      optionLosses,
      optionBreakEvens,
      optionWinRate,
      totalOptionPnl,
      averageOptionPnl,
      approvedTrades,
      cautionTrades,
      blockedTrades,
      totalEstimatedCost,
      totalMaxRisk,
      averageEstimatedCost,
      manualTrades,
      autoTrades,
      testTrades,
      callTrades,
      putTrades,
    };
  }, [trades]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Paper Trade Analytics
          </h3>
          <p className="text-sm text-slate-400">
            True option P/L, stock tracking, Risk Guard breakdown, and strategy
            stats.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      {loading && trades.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Loading analytics...
        </div>
      ) : null}

      {!loading && trades.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          No paper trade analytics yet. Save a paper trade first.
        </div>
      ) : null}

      {trades.length > 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Total Trades"
              value={analytics.totalTrades}
              subtext={`${analytics.openStockTrades} stock open / ${analytics.closedStockTrades} stock closed`}
            />

            <StatCard
              label="Stock Win Rate"
              value={formatPercent(analytics.stockWinRate)}
              subtext={`${analytics.stockWins}W / ${analytics.stockLosses}L / ${analytics.stockBreakEvens}BE`}
            />

            <StatCard
              label="Stock P/L"
              value={formatMoney(analytics.totalStockPnl)}
              subtext="Based on stock entry/exit prices"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Option P/L"
              value={formatMoney(analytics.totalOptionPnl)}
              subtext={`${analytics.closedOptionTrades} closed option trades`}
            />

            <StatCard
              label="Option Win Rate"
              value={formatPercent(analytics.optionWinRate)}
              subtext={`${analytics.optionWins}W / ${analytics.optionLosses}L / ${analytics.optionBreakEvens}BE`}
            />

            <StatCard
              label="Avg Option P/L"
              value={formatMoney(analytics.averageOptionPnl)}
              subtext={`${analytics.openOptionTrades} option trades still open`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Option Trades"
              value={analytics.optionTrades}
              subtext={`${analytics.callTrades} CALL / ${analytics.putTrades} PUT`}
            />

            <StatCard
              label="Avg Option Cost"
              value={formatMoney(analytics.averageEstimatedCost)}
              subtext={`${formatMoney(
                analytics.totalEstimatedCost
              )} total estimated cost`}
            />

            <StatCard
              label="Total Max Risk"
              value={formatMoney(analytics.totalMaxRisk)}
              subtext="Sum of saved option max risk"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h4 className="font-semibold text-white">Risk Guard Breakdown</h4>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
                <p className="text-sm text-emerald-300">Approved</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {analytics.approvedTrades}
                </p>
              </div>

              <div className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-4">
                <p className="text-sm text-yellow-300">Caution</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {analytics.cautionTrades}
                </p>
              </div>

              <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
                <p className="text-sm text-red-300">Blocked Saved</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {analytics.blockedTrades}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Should usually be 0 because blocked trades do not save.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h4 className="font-semibold text-white">Strategy Breakdown</h4>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Manual</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {analytics.manualTrades}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Auto</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {analytics.autoTrades}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Test</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {analytics.testTrades}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}