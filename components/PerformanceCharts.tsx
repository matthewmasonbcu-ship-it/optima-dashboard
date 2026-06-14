"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { supabase } from "../lib/supabaseClient";

type OptionTradeDetail = {
  id?: number | string;
  stock_symbol?: string | null;
  option_pnl?: number | null;
  option_status?: string | null;
  contract_quality?: string | null;
  created_at?: string | null;
};

type QualityBucket = "A+" | "A" | "B" | "C";

const QUALITY_BUCKETS: QualityBucket[] = ["A+", "A", "B", "C"];

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

function normalizeQuality(value: string | null | undefined): QualityBucket | null {
  const q = String(value || "")
    .trim()
    .toUpperCase();

  // Backward compatibility with older saved records.
  if (q === "IDEAL") return "A+";
  if (q === "GOOD") return "A";
  if (q === "ACCEPTABLE") return "B";

  if (q === "A+" || q === "A" || q === "B" || q === "C") return q;

  return null;
}

function isClosedOptionDetail(detail: OptionTradeDetail) {
  return (
    String(detail.option_status || "").toLowerCase() === "closed" ||
    detail.option_pnl != null
  );
}

function winRateBarColor(rate: number) {
  if (rate > 60) return "#34d399";
  if (rate >= 40) return "#facc15";
  return "#f87171";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type EquityPoint = {
  index: number;
  date: string;
  cumulativePnl: number;
  symbol: string;
};

type QualityWinRate = {
  quality: QualityBucket;
  winRate: number;
  closed: number;
  wins: number;
};

type PerformanceChartsProps = {
  refreshKey?: number;
};

export default function PerformanceCharts({ refreshKey }: PerformanceChartsProps) {
  const [details, setDetails] = useState<OptionTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading performance charts...");

  useEffect(() => {
    loadDetails();
  }, [refreshKey]);

  async function loadDetails() {
    setLoading(true);
    setMessage("Loading performance charts...");

    try {
      const { data, error } = await supabase
        .from("option_trade_details")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Performance charts load failed:", error);
        setMessage(`Performance charts load failed: ${error.message}`);
        setLoading(false);
        return;
      }

      setDetails(data || []);
      setMessage(`Loaded ${(data || []).length} option trade detail records.`);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Performance charts load failed.");
    } finally {
      setLoading(false);
    }
  }

  const equityCurve = useMemo<EquityPoint[]>(() => {
    const closed = details
      .filter(isClosedOptionDetail)
      .slice()
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });

    let running = 0;

    return closed.map((d, i) => {
      running += Number(d.option_pnl || 0);
      return {
        index: i + 1,
        date: formatDate(d.created_at),
        cumulativePnl: Number(running.toFixed(2)),
        symbol: d.stock_symbol || "",
      };
    });
  }, [details]);

  const qualityWinRates = useMemo<QualityWinRate[]>(() => {
    return QUALITY_BUCKETS.map((quality) => {
      const trades = details.filter(
        (d) => normalizeQuality(d.contract_quality) === quality,
      );
      const closedTrades = trades.filter(isClosedOptionDetail);
      const wins = closedTrades.filter((d) => Number(d.option_pnl || 0) > 0);
      const winRate =
        closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

      return {
        quality,
        winRate,
        closed: closedTrades.length,
        wins: wins.length,
      };
    }).filter((bucket) => bucket.closed > 0);
  }, [details]);

  const finalPnl = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].cumulativePnl : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">
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
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-600">
              OPTIMA-SYS · Analytics
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Performance{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Charts
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              Equity curve from closed option trades · Win rate by contract
              quality bucket
            </p>
          </div>

          <button
            type="button"
            onClick={loadDetails}
            disabled={loading}
            className="group relative shrink-0 overflow-hidden self-start rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #06b6d4, transparent)",
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

        <div className="relative mb-5 overflow-hidden rounded-lg border border-slate-800 bg-black/30">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-cyan-500" />
          <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-slate-500">
            {message}
          </p>
        </div>

        <div className="mb-5 relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-cyan-500" />
          <div className="px-5 py-4 pl-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                Equity Curve · Cumulative Option P/L
              </p>
              <span
                className={`font-mono text-sm font-black ${finalPnl > 0 ? "text-emerald-300" : finalPnl < 0 ? "text-red-400" : "text-slate-400"}`}
              >
                {formatMoney(finalPnl)}
              </span>
            </div>

            {equityCurve.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                  No Data
                </p>
                <p className="mt-1 font-mono text-sm font-black text-slate-500">
                  No closed option trades yet
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                  Equity curve will populate as trades close.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(value?: ValueType) => [formatMoney(Number(value)), "Cumulative P/L"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativePnl"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: "#06b6d4" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />
          <div className="px-5 py-4 pl-6">
            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Win Rate by Contract Quality
            </p>

            {qualityWinRates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                  No Data
                </p>
                <p className="mt-1 font-mono text-sm font-black text-slate-500">
                  No closed trades with quality grades yet
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                  Win rate by quality will populate as graded trades close.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityWinRates} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="quality"
                      stroke="#475569"
                      tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #1e293b",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(value?: ValueType, _name?, item?) => [
                        `${formatPercent(Number(value))} (${item?.payload?.wins ?? 0}/${item?.payload?.closed ?? 0})`,
                        "Win Rate",
                      ]}
                    />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {qualityWinRates.map((bucket) => (
                        <Cell key={bucket.quality} fill={winRateBarColor(bucket.winRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background:
            "linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)",
        }}
      />
    </section>
  );
}
