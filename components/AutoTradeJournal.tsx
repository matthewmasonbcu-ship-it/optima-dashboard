"use client";

// ─── UI ONLY — all loading, filter, and journal logic untouched ───────────────
// ─── Uses shared supabase client from lib/supabaseClient ─────────────────────

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AutoTrade = {
  id: number;
  symbol: string | null;
  direction: string | null;
  entry_price: number | null; // ─── corrected: was "entry" ───────────────────
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number | null;
  status: string | null;
  grade: string | null;
  score: number | null;
  strategy: string | null;
  notes: string | null;
  created_at: string | null;
};

// ─── All helper functions — untouched ────────────────────────────────────────
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
function dirBar(direction: string | null) {
  const d = String(direction || "").toUpperCase();
  if (d === "CALL") return "bg-emerald-500";
  if (d === "PUT") return "bg-red-500";
  return "bg-slate-600";
}

function dirBadge(direction: string | null) {
  const d = String(direction || "").toUpperCase();
  if (d === "CALL") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (d === "PUT") return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
}

function statusBadge(status: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "open") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
}

function gradeBadge(grade: string | null) {
  const g = String(grade || "").toUpperCase();
  if (g === "A+" || g === "A") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (g === "B") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (g === "C") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  if (g === "BLOCKED") return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-blue-500/40 bg-blue-500/10 text-blue-300";
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-800/80 bg-black/30 px-2.5 py-2">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-[10px] font-black ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

type AutoTradeJournalProps = {
  refreshKey?: number;
};

export default function AutoTradeJournal({
  refreshKey,
}: AutoTradeJournalProps) {
  // ─── All state — untouched ────────────────────────────────────────────────
  const [trades, setTrades] = useState<AutoTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ─── Supabase load — corrected to use entry_price, shared client ──────────
  async function loadAutoTrades() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("paper_trades")
      .select(
        "id, symbol, direction, entry_price, stop_loss, take_profit, quantity, status, grade, score, strategy, notes, created_at"
      )
      .ilike("notes", "AUTO PAPER TRADE%")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setTrades(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAutoTrades();
  }, [refreshKey]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

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
              OPTIMA-SYS · Activity Feed
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Auto Trade{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Journal
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              Why the engine took each trade · logged for strategy improvement
            </p>
          </div>

          <button
            type="button"
            onClick={loadAutoTrades}
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
                Refreshing...
              </span>
            ) : (
              "⟳ Refresh Journal"
            )}
          </button>
        </div>

        {/* ── ERROR STATE ───────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-red-500/25 bg-black/30">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-red-500" />
            <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-red-400">
              Auto trade journal error: {errorMessage}
            </p>
          </div>
        )}

        {/* ── LOADING STATE ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-black/30 px-4 py-3">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
            <p className="font-mono text-[9px] text-slate-500">
              Loading auto trade journal...
            </p>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
        {!loading && trades.length === 0 && !errorMessage && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </p>
            <p className="mt-1 font-mono text-sm font-black text-slate-500">
              No auto paper trades found yet
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-600">
              Auto trades are logged with notes starting with AUTO PAPER TRADE.
            </p>
          </div>
        )}

        {/* ── TRADE CARDS ───────────────────────────────────────────────── */}
        {!loading && trades.length > 0 && (
          <div className="space-y-2.5">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10"
              >
                {/* Direction left accent bar */}
                <div
                  className={`absolute inset-y-0 left-0 w-[3px] ${dirBar(trade.direction)}`}
                />

                <div className="px-5 py-4 pl-6">

                  {/* ── Row 1: Symbol + badges + timestamp ─────────────── */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xl font-black text-white">
                        {trade.symbol || "—"}
                      </span>

                      {/* Direction */}
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${dirBadge(trade.direction)}`}
                      >
                        {trade.direction || "—"}
                      </span>

                      {/* Grade */}
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${gradeBadge(trade.grade)}`}
                      >
                        Grade: {trade.grade || "—"}
                      </span>

                      {/* Status */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${statusBadge(trade.status)}`}
                      >
                        {String(trade.status || "").toLowerCase() === "open" && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                          </span>
                        )}
                        {trade.status || "—"}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <span className="font-mono text-[9px] text-slate-600">
                      {formatDate(trade.created_at)}
                    </span>
                  </div>

                  {/* ── Row 2: Stats grid (entry_price corrected) ───────── */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 md:grid-cols-5">
                    <MiniStat
                      label="Entry"
                      value={
                        money(trade.entry_price) === "—"
                          ? "—"
                          : `$${money(trade.entry_price)}`
                      }
                    />
                    <MiniStat
                      label="Stop Loss"
                      value={
                        money(trade.stop_loss) === "—"
                          ? "—"
                          : `$${money(trade.stop_loss)}`
                      }
                      valueClass="text-red-400"
                    />
                    <MiniStat
                      label="Take Profit"
                      value={
                        money(trade.take_profit) === "—"
                          ? "—"
                          : `$${money(trade.take_profit)}`
                      }
                      valueClass="text-emerald-300"
                    />
                    <MiniStat
                      label="Score"
                      value={trade.score ?? "—"}
                      valueClass={
                        trade.score !== null && trade.score >= 70
                          ? "text-emerald-300"
                          : trade.score !== null && trade.score >= 50
                          ? "text-yellow-300"
                          : "text-slate-400"
                      }
                    />
                    <MiniStat
                      label="Strategy"
                      value={trade.strategy || "—"}
                    />
                  </div>

                  {/* ── Row 3: Notes / reason strip ─────────────────────── */}
                  {trade.notes && (
                    <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-800/60 bg-black/20">
                      <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-600" />
                      <div className="px-4 py-2 pl-5">
                        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
                          Reason ›{" "}
                        </span>
                        <span className="font-mono text-[9px] leading-5 text-slate-500">
                          {trade.notes}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
    </section>
  );
}