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

type QualityStats = {
  quality: string;
  total: number;
  closed: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalPnl: number;
  averagePnl: number;
  winRate: number;
};

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

function getPnlClass(value: number | null | undefined) {
  const safeValue = Number(value || 0);

  if (safeValue > 0) return "text-emerald-300";
  if (safeValue < 0) return "text-red-300";
  return "text-slate-300";
}

function getQualityClass(quality: string | null | undefined) {
  const safeQuality = quality || "N/A";

  if (safeQuality === "IDEAL") {
    return "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
  }

  if (safeQuality === "GOOD") {
    return "border-blue-500/50 bg-blue-500/15 text-blue-300";
  }

  if (safeQuality === "ACCEPTABLE") {
    return "border-yellow-500/50 bg-yellow-500/15 text-yellow-300";
  }

  if (safeQuality === "AVOID") {
    return "border-red-500/50 bg-red-500/15 text-red-300";
  }

  return "border-slate-600 bg-slate-800 text-slate-300";
}

function getRiskGuardClass(status: string | null | undefined) {
  const safeStatus = status || "UNKNOWN";

  if (safeStatus === "APPROVED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (safeStatus === "CAUTION") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (safeStatus === "BLOCKED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-800 text-slate-300";
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p>
      {subtext ? <p className="mt-1 text-xs text-slate-400">{subtext}</p> : null}
    </div>
  );
}

function SmallStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function calculateQualityStats(details: OptionTradeDetail[]): QualityStats[] {
  const qualities = ["IDEAL", "GOOD", "ACCEPTABLE", "AVOID", "N/A"];

  return qualities
    .map((quality) => {
      const trades = details.filter(
        (detail) => (detail.contract_quality || "N/A") === quality
      );

      const closedTrades = trades.filter(
        (detail) =>
          detail.option_status === "closed" ||
          detail.option_pnl !== null ||
          detail.option_pnl !== undefined
      );

      const wins = closedTrades.filter((detail) => Number(detail.option_pnl || 0) > 0);
      const losses = closedTrades.filter((detail) => Number(detail.option_pnl || 0) < 0);
      const breakevens = closedTrades.filter(
        (detail) => Number(detail.option_pnl || 0) === 0
      );

      const totalPnl = closedTrades.reduce(
        (sum, detail) => sum + Number(detail.option_pnl || 0),
        0
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
    })
    .filter((bucket) => bucket.total > 0);
}

export default function OptionPerformanceScoreboard() {
  const [details, setDetails] = useState<OptionTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading option performance...");

  useEffect(() => {
    loadOptionDetails();
  }, []);

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

    const openTrades = details.filter(
      (detail) => (detail.option_status || "open") !== "closed"
    );

    const closedTrades = details.filter(
      (detail) =>
        detail.option_status === "closed" ||
        detail.option_pnl !== null ||
        detail.option_pnl !== undefined
    );

    const wins = closedTrades.filter((detail) => Number(detail.option_pnl || 0) > 0);
    const losses = closedTrades.filter((detail) => Number(detail.option_pnl || 0) < 0);
    const breakevens = closedTrades.filter(
      (detail) => Number(detail.option_pnl || 0) === 0
    );

    const realizedPnl = closedTrades.reduce(
      (sum, detail) => sum + Number(detail.option_pnl || 0),
      0
    );

    const totalEstimatedCost = details.reduce(
      (sum, detail) => sum + Number(detail.estimated_cost || 0),
      0
    );

    const totalMaxRisk = details.reduce(
      (sum, detail) => sum + Number(detail.max_risk || 0),
      0
    );

    const openRisk = openTrades.reduce(
      (sum, detail) => sum + Number(detail.max_risk || 0),
      0
    );

    const averageWinner =
      wins.length > 0
        ? wins.reduce((sum, detail) => sum + Number(detail.option_pnl || 0), 0) /
          wins.length
        : 0;

    const averageLoser =
      losses.length > 0
        ? losses.reduce((sum, detail) => sum + Number(detail.option_pnl || 0), 0) /
          losses.length
        : 0;

    const bestTrade =
      closedTrades.length > 0
        ? [...closedTrades].sort(
            (a, b) => Number(b.option_pnl || 0) - Number(a.option_pnl || 0)
          )[0]
        : null;

    const worstTrade =
      closedTrades.length > 0
        ? [...closedTrades].sort(
            (a, b) => Number(a.option_pnl || 0) - Number(b.option_pnl || 0)
          )[0]
        : null;

    const optionWinRate =
      closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const averageOptionPnl =
      closedTrades.length > 0 ? realizedPnl / closedTrades.length : 0;

    const approvedTrades = details.filter(
      (detail) => detail.risk_guard_status === "APPROVED"
    );

    const cautionTrades = details.filter(
      (detail) => detail.risk_guard_status === "CAUTION"
    );

    const blockedTrades = details.filter(
      (detail) => detail.risk_guard_status === "BLOCKED"
    );

    const riskGuardQuality =
      details.length > 0 ? (approvedTrades.length / details.length) * 100 : 0;

    const avgLiquidity =
      details.length > 0
        ? details.reduce((sum, detail) => sum + Number(detail.liquidity_score || 0), 0) /
          details.length
        : 0;

    const avgSpread =
      details.length > 0
        ? details.reduce((sum, detail) => sum + Number(detail.spread_percent || 0), 0) /
          details.length
        : 0;

    const winningTradesWithSpread = wins.filter(
      (detail) => detail.spread_percent !== null && detail.spread_percent !== undefined
    );

    const averageSpreadOnWinners =
      winningTradesWithSpread.length > 0
        ? winningTradesWithSpread.reduce(
            (sum, detail) => sum + Number(detail.spread_percent || 0),
            0
          ) / winningTradesWithSpread.length
        : 0;

    const qualityStats = calculateQualityStats(details);

    const bestQualityBucket =
      qualityStats.length > 0
        ? [...qualityStats]
            .filter((bucket) => bucket.closed > 0)
            .sort((a, b) => b.averagePnl - a.averagePnl)[0] || null
        : null;

    const worstQualityBucket =
      qualityStats.length > 0
        ? [...qualityStats]
            .filter((bucket) => bucket.closed > 0)
            .sort((a, b) => a.averagePnl - b.averagePnl)[0] || null
        : null;

    const idealCount = details.filter((detail) => detail.contract_quality === "IDEAL").length;
    const goodCount = details.filter((detail) => detail.contract_quality === "GOOD").length;
    const acceptableCount = details.filter(
      (detail) => detail.contract_quality === "ACCEPTABLE"
    ).length;
    const avoidCount = details.filter((detail) => detail.contract_quality === "AVOID").length;

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
      idealCount,
      goodCount,
      acceptableCount,
      avoidCount,
    };
  }, [details]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Option Performance Scoreboard
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            Contract quality feedback system
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Tracks true option P/L, Risk Guard quality, and performance by contract quality bucket.
          </p>
        </div>

        <button
          onClick={loadOptionDetails}
          disabled={loading}
          className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Scoreboard"}
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-sm font-semibold text-slate-300">{message}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Realized Option P/L"
          value={formatMoney(stats.realizedPnl)}
          valueClass={getPnlClass(stats.realizedPnl)}
          subtext={`${stats.closedTrades} closed option trades`}
        />

        <StatCard
          label="Option Win Rate"
          value={formatPercent(stats.optionWinRate)}
          valueClass={stats.optionWinRate >= 50 ? "text-emerald-300" : "text-yellow-300"}
          subtext={`${stats.wins}W / ${stats.losses}L / ${stats.breakevens}BE`}
        />

        <StatCard
          label="Open Option Risk"
          value={formatMoney(stats.openRisk)}
          valueClass="text-red-300"
          subtext={`${stats.openTrades} open option trades`}
        />

        <StatCard
          label="Avg Option P/L"
          value={formatMoney(stats.averageOptionPnl)}
          valueClass={getPnlClass(stats.averageOptionPnl)}
          subtext="Average closed trade result"
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <StatCard
          label="Avg Winner"
          value={formatMoney(stats.averageWinner)}
          valueClass="text-emerald-300"
          subtext={`${stats.wins} winning option trades`}
        />

        <StatCard
          label="Avg Loser"
          value={formatMoney(stats.averageLoser)}
          valueClass="text-red-300"
          subtext={`${stats.losses} losing option trades`}
        />

        <StatCard
          label="Best Trade"
          value={stats.bestTrade ? formatMoney(stats.bestTrade.option_pnl) : "$0.00"}
          valueClass="text-emerald-300"
          subtext={stats.bestTrade?.stock_symbol || "No closed winner yet"}
        />

        <StatCard
          label="Worst Trade"
          value={stats.worstTrade ? formatMoney(stats.worstTrade.option_pnl) : "$0.00"}
          valueClass="text-red-300"
          subtext={stats.worstTrade?.stock_symbol || "No closed loser yet"}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Contract Quality Mix
            </p>
            <h3 className="mt-1 text-lg font-black text-white">
              What kind of contracts are being saved?
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getQualityClass("IDEAL")}`}>
              IDEAL {stats.idealCount}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getQualityClass("GOOD")}`}>
              GOOD {stats.goodCount}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getQualityClass("ACCEPTABLE")}`}>
              ACCEPTABLE {stats.acceptableCount}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getQualityClass("AVOID")}`}>
              AVOID {stats.avoidCount}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat
            label="Average Liquidity"
            value={stats.avgLiquidity.toFixed(1)}
            valueClass={
              stats.avgLiquidity >= 80
                ? "text-emerald-300"
                : stats.avgLiquidity >= 60
                ? "text-yellow-300"
                : "text-red-300"
            }
          />

          <SmallStat
            label="Average Spread"
            value={formatPercent(stats.avgSpread)}
            valueClass={
              stats.avgSpread <= 10
                ? "text-emerald-300"
                : stats.avgSpread <= 20
                ? "text-yellow-300"
                : "text-red-300"
            }
          />

          <SmallStat
            label="Avg Spread on Winners"
            value={formatPercent(stats.averageSpreadOnWinners)}
            valueClass={
              stats.averageSpreadOnWinners <= 10
                ? "text-emerald-300"
                : stats.averageSpreadOnWinners <= 20
                ? "text-yellow-300"
                : "text-red-300"
            }
          />

          <SmallStat
            label="Risk Guard Quality"
            value={formatPercent(stats.riskGuardQuality)}
            valueClass={
              stats.riskGuardQuality >= 80
                ? "text-emerald-300"
                : stats.riskGuardQuality >= 50
                ? "text-yellow-300"
                : "text-red-300"
            }
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            P/L by Contract Quality
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            Which quality bucket is performing best?
          </h3>
        </div>

        {stats.qualityStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-center">
            <p className="text-sm font-bold text-white">No quality data yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Save option trades with contract quality fields to populate this section.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.qualityStats.map((bucket) => (
              <div
                key={bucket.quality}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getQualityClass(
                      bucket.quality
                    )}`}
                  >
                    {bucket.quality}
                  </span>

                  <p className={`text-xl font-black ${getPnlClass(bucket.totalPnl)}`}>
                    {formatMoney(bucket.totalPnl)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  <SmallStat label="Total" value={bucket.total} />
                  <SmallStat label="Closed" value={bucket.closed} />
                  <SmallStat
                    label="Win Rate"
                    value={formatPercent(bucket.winRate)}
                    valueClass={
                      bucket.winRate >= 50 ? "text-emerald-300" : "text-yellow-300"
                    }
                  />
                  <SmallStat
                    label="Avg P/L"
                    value={formatMoney(bucket.averagePnl)}
                    valueClass={getPnlClass(bucket.averagePnl)}
                  />
                  <SmallStat
                    label="Record"
                    value={`${bucket.wins}W / ${bucket.losses}L / ${bucket.breakevens}BE`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Best Quality Bucket
          </p>
          <p
            className={`mt-2 text-2xl font-black ${
              stats.bestQualityBucket
                ? getPnlClass(stats.bestQualityBucket.averagePnl)
                : "text-slate-300"
            }`}
          >
            {stats.bestQualityBucket?.quality || "N/A"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Avg P/L:{" "}
            {stats.bestQualityBucket
              ? formatMoney(stats.bestQualityBucket.averagePnl)
              : "$0.00"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Worst Quality Bucket
          </p>
          <p
            className={`mt-2 text-2xl font-black ${
              stats.worstQualityBucket
                ? getPnlClass(stats.worstQualityBucket.averagePnl)
                : "text-slate-300"
            }`}
          >
            {stats.worstQualityBucket?.quality || "N/A"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Avg P/L:{" "}
            {stats.worstQualityBucket
              ? formatMoney(stats.worstQualityBucket.averagePnl)
              : "$0.00"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Risk Guard Breakdown
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskGuardClass(
              "APPROVED"
            )}`}
          >
            APPROVED {stats.approvedTrades}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskGuardClass(
              "CAUTION"
            )}`}
          >
            CAUTION {stats.cautionTrades}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskGuardClass(
              "BLOCKED"
            )}`}
          >
            BLOCKED {stats.blockedTrades}
          </span>
        </div>
      </div>
    </section>
  );
}