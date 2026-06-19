"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type OptionTradeDetail = {
  id?: number | string;
  paper_trade_id?: number | string;
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
  option_status?: string | null;
  exit_option_price?: number | null;
  option_pnl?: number | null;
  contract_quality?: string | null;
  liquidity_score?: number | null;
  spread_percent?: number | null;
  volume?: number | null;
  open_interest?: number | null;
  implied_volatility?: number | null;
  delta?: number | null;
  created_at?: string | null;
};

type ContractQuality = "A+" | "A" | "B" | "C" | "BLOCKED" | "N/A";

type QualityStats = {
  quality: ContractQuality;
  total: number;
  closed: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalPnl: number;
  averagePnl: number;
  winRate: number;
};

const QUALITY_BUCKETS: ContractQuality[] = [
  "A+",
  "A",
  "B",
  "C",
  "BLOCKED",
  "N/A",
];

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "$0.00";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0.0%";
  }

  return `${Number(value).toFixed(1)}%`;
}

function normalizeQuality(value: string | null | undefined): ContractQuality {
  const q = String(value || "")
    .trim()
    .toUpperCase();

  if (!q || q === "UNKNOWN" || q === "NULL" || q === "N/A") return "N/A";

  // Backward compatibility with older saved records.
  if (q === "IDEAL") return "A+";
  if (q === "GOOD") return "A";
  if (q === "ACCEPTABLE") return "B";
  if (q === "AVOID") return "BLOCKED";

  if (q === "A+" || q === "A" || q === "B" || q === "C" || q === "BLOCKED") {
    return q;
  }

  return "N/A";
}

function isClosedOptionDetail(detail: OptionTradeDetail) {
  return (
    String(detail.option_status || "").toLowerCase() === "closed" ||
    detail.option_pnl != null
  );
}

function getPnlClass(value: number | null | undefined) {
  const v = Number(value || 0);
  if (v > 0) return "text-emerald-300";
  if (v < 0) return "text-red-400";
  return "text-slate-400";
}

function getPnlBar(value: number | null | undefined) {
  const v = Number(value || 0);
  if (v > 0) return "bg-emerald-500";
  if (v < 0) return "bg-red-500";
  return "bg-slate-600";
}

function getQualityBar(quality: string | null | undefined) {
  const q = normalizeQuality(quality);
  if (q === "A+" || q === "A") return "bg-emerald-500";
  if (q === "B") return "bg-blue-500";
  if (q === "C") return "bg-orange-400";
  if (q === "BLOCKED") return "bg-red-500";
  return "bg-slate-600";
}

function getQualityColor(quality: string | null | undefined) {
  const q = normalizeQuality(quality);
  if (q === "A+" || q === "A") return "text-emerald-300";
  if (q === "B") return "text-blue-300";
  if (q === "C") return "text-orange-300";
  if (q === "BLOCKED") return "text-red-400";
  return "text-slate-400";
}

function getQualityBadge(quality: string | null | undefined) {
  const q = normalizeQuality(quality);
  if (q === "A+")
    return "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  if (q === "A")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (q === "B") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (q === "C") return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  if (q === "BLOCKED") return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
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

function getRiskBadge(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (s === "CAUTION")
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  if (s === "BLOCKED") return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
}

function winRateBar(rate: number) {
  if (rate >= 60) return "bg-emerald-500";
  if (rate >= 40) return "bg-yellow-400";
  return "bg-red-500";
}

function calculateQualityStats(details: OptionTradeDetail[]): QualityStats[] {
  return QUALITY_BUCKETS.map((quality) => {
    const trades = details.filter(
      (d) => normalizeQuality(d.contract_quality) === quality,
    );
    const closedTrades = trades.filter(isClosedOptionDetail);
    const wins = closedTrades.filter((d) => Number(d.option_pnl || 0) > 0);
    const losses = closedTrades.filter((d) => Number(d.option_pnl || 0) < 0);
    const breakevens = closedTrades.filter(
      (d) => Number(d.option_pnl || 0) === 0,
    );
    const totalPnl = closedTrades.reduce(
      (s, d) => s + Number(d.option_pnl || 0),
      0,
    );
    const averagePnl =
      closedTrades.length > 0 ? totalPnl / closedTrades.length : 0;
    const winRate =
      closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    return {
      quality,
      total: trades.length,
      closed: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      totalPnl,
      averagePnl,
      winRate,
    };
  }).filter((bucket) => bucket.total > 0);
}

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
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-800/80 bg-black/30 px-2.5 py-2">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-xs font-black ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

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

type OptionPerformanceScoreboardProps = {
  refreshKey?: number;
};

export default function OptionPerformanceScoreboard({
  refreshKey,
}: OptionPerformanceScoreboardProps) {
  const [details, setDetails] = useState<OptionTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading option performance...");

  useEffect(() => {
    loadOptionDetails();
  }, [refreshKey]);

  async function loadOptionDetails() {
    setLoading(true);
    setMessage("Loading option performance...");

    try {
      const { data, error } = await supabase
        .from("option_trade_details")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Option performance load failed:", error);
        setMessage(`Option performance load failed: ${error.message}`);
        setLoading(false);
        return;
      }

      setDetails(data || []);
      setMessage(`Loaded ${(data || []).length} option trade detail records.`);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Option performance failed.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalTrades = details.length;
    const openTrades = details.filter((d) => !isClosedOptionDetail(d));
    const closedTrades = details.filter(isClosedOptionDetail);
    const wins = closedTrades.filter((d) => Number(d.option_pnl || 0) > 0);
    const losses = closedTrades.filter((d) => Number(d.option_pnl || 0) < 0);
    const breakevens = closedTrades.filter(
      (d) => Number(d.option_pnl || 0) === 0,
    );
    const realizedPnl = closedTrades.reduce(
      (s, d) => s + Number(d.option_pnl || 0),
      0,
    );
    const totalEstimatedCost = details.reduce(
      (s, d) => s + Number(d.estimated_cost || 0),
      0,
    );
    const totalMaxRisk = details.reduce(
      (s, d) => s + Number(d.max_risk || 0),
      0,
    );
    const openRisk = openTrades.reduce(
      (s, d) => s + Number(d.max_risk || 0),
      0,
    );
    const averageWinner =
      wins.length > 0
        ? wins.reduce((s, d) => s + Number(d.option_pnl || 0), 0) / wins.length
        : 0;
    const averageLoser =
      losses.length > 0
        ? losses.reduce((s, d) => s + Number(d.option_pnl || 0), 0) /
          losses.length
        : 0;
    const bestTrade =
      closedTrades.length > 0
        ? [...closedTrades].sort(
            (a, b) => Number(b.option_pnl || 0) - Number(a.option_pnl || 0),
          )[0]
        : null;
    const worstTrade =
      closedTrades.length > 0
        ? [...closedTrades].sort(
            (a, b) => Number(a.option_pnl || 0) - Number(b.option_pnl || 0),
          )[0]
        : null;
    const optionWinRate =
      closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const averageOptionPnl =
      closedTrades.length > 0 ? realizedPnl / closedTrades.length : 0;
    const approvedTrades = details.filter(
      (d) => String(d.risk_guard_status || "").toUpperCase() === "APPROVED",
    );
    const cautionTrades = details.filter(
      (d) => String(d.risk_guard_status || "").toUpperCase() === "CAUTION",
    );
    const blockedTrades = details.filter(
      (d) => String(d.risk_guard_status || "").toUpperCase() === "BLOCKED",
    );
    const riskGuardQuality =
      details.length > 0 ? (approvedTrades.length / details.length) * 100 : 0;
    const avgLiquidity =
      details.length > 0
        ? details.reduce((s, d) => s + Number(d.liquidity_score || 0), 0) /
          details.length
        : 0;
    const avgSpread =
      details.length > 0
        ? details.reduce((s, d) => s + Number(d.spread_percent || 0), 0) /
          details.length
        : 0;
    const winningTradesWithSpread = wins.filter(
      (d) => d.spread_percent !== null && d.spread_percent !== undefined,
    );
    const averageSpreadOnWinners =
      winningTradesWithSpread.length > 0
        ? winningTradesWithSpread.reduce(
            (s, d) => s + Number(d.spread_percent || 0),
            0,
          ) / winningTradesWithSpread.length
        : 0;
    const qualityStats = calculateQualityStats(details);
    const bestQualityBucket =
      qualityStats.length > 0
        ? [...qualityStats]
            .filter((b) => b.closed > 0)
            .sort((a, b) => b.averagePnl - a.averagePnl)[0] || null
        : null;
    const worstQualityBucket =
      qualityStats.length > 0
        ? [...qualityStats]
            .filter((b) => b.closed > 0)
            .sort((a, b) => a.averagePnl - b.averagePnl)[0] || null
        : null;

    const qualityCounts = QUALITY_BUCKETS.reduce<
      Record<ContractQuality, number>
    >(
      (acc, quality) => {
        acc[quality] = details.filter(
          (d) => normalizeQuality(d.contract_quality) === quality,
        ).length;
        return acc;
      },
      {
        "A+": 0,
        A: 0,
        B: 0,
        C: 0,
        BLOCKED: 0,
        "N/A": 0,
      },
    );

    return {
      totalTrades,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      realizedPnl,
      totalEstimatedCost,
      totalMaxRisk,
      openRisk,
      averageWinner,
      averageLoser,
      bestTrade,
      worstTrade,
      optionWinRate,
      averageOptionPnl,
      approvedTrades: approvedTrades.length,
      cautionTrades: cautionTrades.length,
      blockedTrades: blockedTrades.length,
      riskGuardQuality,
      avgLiquidity,
      avgSpread,
      averageSpreadOnWinners,
      qualityStats,
      bestQualityBucket,
      worstQualityBucket,
      qualityCounts,
    };
  }, [details]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(139,92,246,0.04) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(37,99,235,0.04) 0%, transparent 55%)",
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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Analytics
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Option Performance{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Scoreboard
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              True option P/L · Risk Guard quality · Performance by A+ / A / B /
              C / BLOCKED contract buckets
            </p>
          </div>

          <button
            type="button"
            onClick={loadOptionDetails}
            disabled={loading}
            className="group relative shrink-0 overflow-hidden self-start rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
              }}
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

        <div className="relative mb-5 overflow-hidden rounded-lg border border-slate-800 bg-black/30">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-violet-500" />
          <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-slate-500">
            {message}
          </p>
        </div>

        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Key Metrics
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryCell
            label="Realized Option P/L"
            value={formatMoney(stats.realizedPnl)}
            sub={`${stats.closedTrades} closed trades`}
            bar={getPnlBar(stats.realizedPnl)}
            valueClass={getPnlClass(stats.realizedPnl)}
          />
          <SummaryCell
            label="Option Win Rate"
            value={formatPercent(stats.optionWinRate)}
            sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakevens}BE`}
            bar={winRateBar(stats.optionWinRate)}
            valueClass={
              stats.optionWinRate >= 50 ? "text-emerald-300" : "text-yellow-300"
            }
          />
          <SummaryCell
            label="Open Option Risk"
            value={formatMoney(stats.openRisk)}
            sub={`${stats.openTrades} open trades`}
            bar="bg-red-500"
            valueClass="text-red-400"
          />
          <SummaryCell
            label="Avg Option P/L"
            value={formatMoney(stats.averageOptionPnl)}
            sub="Per closed trade"
            bar={getPnlBar(stats.averageOptionPnl)}
            valueClass={getPnlClass(stats.averageOptionPnl)}
          />
        </div>

        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Trade Extremes
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryCell
            label="Avg Winner"
            value={formatMoney(stats.averageWinner)}
            sub={`${stats.wins} winning trades`}
            bar="bg-emerald-500"
            valueClass="text-emerald-300"
          />
          <SummaryCell
            label="Avg Loser"
            value={formatMoney(stats.averageLoser)}
            sub={`${stats.losses} losing trades`}
            bar="bg-red-500"
            valueClass="text-red-400"
          />
          <SummaryCell
            label="Best Trade"
            value={
              stats.bestTrade
                ? formatMoney(stats.bestTrade.option_pnl)
                : "$0.00"
            }
            sub={stats.bestTrade?.stock_symbol || "No closed winner"}
            bar="bg-emerald-500"
            valueClass="text-emerald-300"
          />
          <SummaryCell
            label="Worst Trade"
            value={
              stats.worstTrade
                ? formatMoney(stats.worstTrade.option_pnl)
                : "$0.00"
            }
            sub={stats.worstTrade?.stock_symbol || "No closed loser"}
            bar="bg-red-500"
            valueClass="text-red-400"
          />
        </div>

        <div className="relative mb-5 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />
          <div className="px-5 py-4 pl-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                  Contract Quality Mix
                </p>
                <p className="mt-0.5 font-mono text-sm font-black text-white">
                  What kind of contracts are being saved?
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUALITY_BUCKETS.map((quality) => (
                  <span
                    key={quality}
                    className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getQualityBadge(quality)}`}
                  >
                    {quality} · {stats.qualityCounts[quality]}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <MiniStat
                label="Avg Liquidity"
                value={stats.avgLiquidity.toFixed(1)}
                valueClass={
                  stats.avgLiquidity >= 80
                    ? "text-emerald-300"
                    : stats.avgLiquidity >= 60
                      ? "text-yellow-300"
                      : "text-red-400"
                }
              />
              <MiniStat
                label="Avg Spread"
                value={formatPercent(stats.avgSpread)}
                valueClass={
                  stats.avgSpread <= 10
                    ? "text-emerald-300"
                    : stats.avgSpread <= 20
                      ? "text-yellow-300"
                      : "text-red-400"
                }
              />
              <MiniStat
                label="Spread on Winners"
                value={formatPercent(stats.averageSpreadOnWinners)}
                valueClass={
                  stats.averageSpreadOnWinners <= 10
                    ? "text-emerald-300"
                    : stats.averageSpreadOnWinners <= 20
                      ? "text-yellow-300"
                      : "text-red-400"
                }
              />
              <MiniStat
                label="Risk Guard Quality"
                value={formatPercent(stats.riskGuardQuality)}
                valueClass={
                  stats.riskGuardQuality >= 80
                    ? "text-emerald-300"
                    : stats.riskGuardQuality >= 50
                      ? "text-yellow-300"
                      : "text-red-400"
                }
              />
            </div>
          </div>
        </div>

        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          P/L by Contract Quality
        </p>
        {stats.qualityStats.length === 0 ? (
          <div className="mb-5 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </p>
            <p className="mt-1 font-mono text-sm font-black text-slate-500">
              No quality data yet
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-600">
              Save option trades with contract quality fields.
            </p>
          </div>
        ) : (
          <div className="mb-5 space-y-2">
            {stats.qualityStats.map((bucket) => (
              <div
                key={bucket.quality}
                className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10"
              >
                <div
                  className={`absolute inset-y-0 left-0 w-[3px] ${getQualityBar(bucket.quality)}`}
                />
                <div className="px-5 py-3 pl-6">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getQualityBadge(bucket.quality)}`}
                      >
                        {bucket.quality}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="relative h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${winRateBar(bucket.winRate)}`}
                            style={{
                              width: `${Math.min(bucket.winRate, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[9px] font-bold ${bucket.winRate >= 50 ? "text-emerald-300" : "text-yellow-300"}`}
                        >
                          {formatPercent(bucket.winRate)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-lg font-black ${getPnlClass(bucket.totalPnl)}`}
                    >
                      {formatMoney(bucket.totalPnl)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
                    <MiniStat label="Total" value={bucket.total} />
                    <MiniStat label="Closed" value={bucket.closed} />
                    <MiniStat
                      label="Win Rate"
                      value={formatPercent(bucket.winRate)}
                      valueClass={
                        bucket.winRate >= 50
                          ? "text-emerald-300"
                          : "text-yellow-300"
                      }
                    />
                    <MiniStat
                      label="Avg P/L"
                      value={formatMoney(bucket.averagePnl)}
                      valueClass={getPnlClass(bucket.averagePnl)}
                    />
                    <MiniStat
                      label="W · L · BE"
                      value={`${bucket.wins} · ${bucket.losses} · ${bucket.breakevens}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-5 grid gap-2 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
            <div
              className={`absolute inset-y-0 left-0 w-[3px] ${stats.bestQualityBucket ? getQualityBar(stats.bestQualityBucket.quality) : "bg-slate-600"}`}
            />
            <div className="px-5 py-4 pl-6">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Best Quality Bucket
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-black ${stats.bestQualityBucket ? getQualityColor(stats.bestQualityBucket.quality) : "text-slate-500"}`}
              >
                {stats.bestQualityBucket?.quality || "N/A"}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                Avg P/L ·{" "}
                {stats.bestQualityBucket
                  ? formatMoney(stats.bestQualityBucket.averagePnl)
                  : "$0.00"}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
            <div
              className={`absolute inset-y-0 left-0 w-[3px] ${stats.worstQualityBucket ? getQualityBar(stats.worstQualityBucket.quality) : "bg-slate-600"}`}
            />
            <div className="px-5 py-4 pl-6">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Worst Quality Bucket
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-black ${stats.worstQualityBucket ? getQualityColor(stats.worstQualityBucket.quality) : "text-slate-500"}`}
              >
                {stats.worstQualityBucket?.quality || "N/A"}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                Avg P/L ·{" "}
                {stats.worstQualityBucket
                  ? formatMoney(stats.worstQualityBucket.averagePnl)
                  : "$0.00"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />
          <div className="px-5 py-4 pl-6">
            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Risk Guard Breakdown
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { status: "APPROVED", count: stats.approvedTrades },
                { status: "CAUTION", count: stats.cautionTrades },
                { status: "BLOCKED", count: stats.blockedTrades },
              ].map(({ status, count }) => (
                <div
                  key={status}
                  className={`relative overflow-hidden rounded-lg border px-4 py-2 ${getRiskBadge(status)}`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-[2px] ${getRiskBar(status)}`}
                  />
                  <span
                    className={`pl-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${getRiskColor(status)}`}
                  >
                    {status} · {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background:
            "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
        }}
      />
    </section>
  );
}
