"use client";

// ─── UI ONLY — all Supabase, monitor, close, and event logic untouched ────────

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PaperTrade = {
  id: string;
  symbol: string;
  direction: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  status: string | null;
  strategy: string | null;
  created_at: string;
};

type MonitorEvent = {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: string;
};

// ─── All helper functions — untouched ────────────────────────────────────────
function formatDollar(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(2)}`;
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
function dirBar(direction: string | null) {
  const d = String(direction || "").toUpperCase();
  if (d === "CALL" || d === "LONG" || d === "BUY") return "bg-emerald-500";
  if (d === "PUT" || d === "SHORT" || d === "SELL") return "bg-red-500";
  return "bg-blue-500";
}

function dirColor(direction: string | null) {
  const d = String(direction || "").toUpperCase();
  if (d === "CALL" || d === "LONG" || d === "BUY") return "text-emerald-300";
  if (d === "PUT" || d === "SHORT" || d === "SELL") return "text-red-400";
  return "text-blue-300";
}

function eventBar(type: MonitorEvent["type"]) {
  if (type === "success") return "bg-emerald-500";
  if (type === "warning") return "bg-amber-400";
  if (type === "error") return "bg-red-500";
  return "bg-violet-500";
}

function eventBorder(type: MonitorEvent["type"]) {
  if (type === "success") return "border-emerald-500/20";
  if (type === "warning") return "border-amber-500/20";
  if (type === "error") return "border-red-500/20";
  return "border-violet-500/20";
}

function eventTextColor(type: MonitorEvent["type"]) {
  if (type === "success") return "text-emerald-300";
  if (type === "warning") return "text-amber-300";
  if (type === "error") return "text-red-400";
  return "text-violet-300";
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

type AutoPositionMonitorProps = {
  refreshKey?: number;
};

export default function AutoPositionMonitor({
  refreshKey,
}: AutoPositionMonitorProps) {
  // ─── All state — untouched ────────────────────────────────────────────────
  const [openTrades, setOpenTrades] = useState<PaperTrade[]>([]);
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const [loading, setLoading] = useState(false);
  // Paper-trade ids that have an open option leg — they must close via the
  // option-aware endpoint, never the stock-price path below.
  const [optionTradeIds, setOptionTradeIds] = useState<Set<string>>(new Set());
  const [closingId, setClosingId] = useState<string | null>(null);

  // ─── All logic — untouched ────────────────────────────────────────────────
  function addEvent(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) {
    const newEvent: MonitorEvent = {
      id: crypto.randomUUID(),
      message,
      type,
      time: new Date().toLocaleTimeString(),
    };
    setMonitorEvents((prev) => [newEvent, ...prev].slice(0, 8));
  }

  async function loadOpenTrades() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .is("exit_price", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Auto Position Monitor load error:", error);
        addEvent(`Load failed: ${error.message}`, "error");
        setOpenTrades([]);
        return;
      }

      const trades = (data || []) as PaperTrade[];
      setOpenTrades(trades);
      await loadOptionTradeIds();

      if (trades.length === 0) {
        addEvent("No open paper trades found.", "info");
      } else {
        addEvent(`Found ${trades.length} open paper trade(s).`, "success");
      }
    } catch (err) {
      console.error("Unexpected monitor load error:", err);
      addEvent("Unexpected error while loading open trades.", "error");
      setOpenTrades([]);
    } finally {
      setLoading(false);
    }
  }

  async function closeTradeAtPrice(trade: PaperTrade, exitPrice: number) {
    // Never stock-close an option trade — it would close paper_trades but leave
    // option_trade_details orphaned (open). Route through the option-aware close,
    // which writes BOTH tables + closed_at and respects the phantom-quote guard.
    if (optionTradeIds.has(trade.id)) {
      await closeOptionLive(trade);
      return;
    }

    if (!trade.id) {
      addEvent("Could not close trade because trade ID is missing.", "error");
      return;
    }
    if (!exitPrice || Number.isNaN(exitPrice)) {
      addEvent("Could not close trade because exit price is invalid.", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from("paper_trades")
        .update({ exit_price: exitPrice, status: "closed" })
        .eq("id", trade.id);

      if (error) {
        console.error("Auto close trade error:", error);
        addEvent(`Failed to close ${trade.symbol}: ${error.message}`, "error");
        return;
      }

      addEvent(
        `${trade.symbol} ${trade.direction || ""} closed at $${exitPrice.toFixed(2)}.`,
        "success"
      );
      window.dispatchEvent(new Event("paper-trades-updated"));
      await loadOpenTrades();
    } catch (err) {
      console.error("Unexpected close error:", err);
      addEvent(`Unexpected error closing ${trade.symbol}.`, "error");
    }
  }

  async function loadOptionTradeIds() {
    const { data } = await supabase
      .from("option_trade_details")
      .select("paper_trade_id")
      .is("option_pnl", null);
    setOptionTradeIds(new Set((data || []).map((d) => d.paper_trade_id as string)));
  }

  // Option-aware close — mirrors the auto-close cron and records real option
  // P&L in both tables. Live spread price (no manual entry here; use the Trade
  // Journal for an exact target close).
  async function closeOptionLive(trade: PaperTrade) {
    setClosingId(trade.id);
    try {
      const res = await fetch("/api/close-option-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperTradeId: trade.id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        addEvent(`Close failed for ${trade.symbol}: ${json?.error || "unknown error"}`, "error");
        return;
      }
      const sign = json.optionPnl >= 0 ? "+" : "-";
      addEvent(
        `${trade.symbol} option closed @ $${Number(json.currentSpreadPrice).toFixed(2)} — ${json.result} ${sign}$${Math.abs(Number(json.optionPnl)).toFixed(2)}.`,
        "success"
      );
      window.dispatchEvent(new Event("paper-trades-updated"));
      await loadOpenTrades();
    } catch (err) {
      console.error("closeOptionLive error:", err);
      addEvent(`Unexpected error closing ${trade.symbol}.`, "error");
    } finally {
      setClosingId(null);
    }
  }

  async function runMonitorNow() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .is("exit_price", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Run monitor error:", error);
        addEvent(`Monitor failed: ${error.message}`, "error");
        setOpenTrades([]);
        return;
      }

      const trades = (data || []) as PaperTrade[];
      setOpenTrades(trades);
      await loadOptionTradeIds();

      if (trades.length === 0) {
        addEvent("Monitor checked: no open paper trades right now.", "info");
        return;
      }

      addEvent(`Monitor checked ${trades.length} open trade(s).`, "success");
      window.dispatchEvent(new Event("paper-trades-updated"));
    } catch (err) {
      console.error("Unexpected monitor error:", err);
      addEvent("Unexpected error while running monitor.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOpenTrades();
    const handlePaperTradesUpdated = () => { loadOpenTrades(); };
    window.addEventListener("paper-trades-updated", handlePaperTradesUpdated);
    return () => {
      window.removeEventListener("paper-trades-updated", handlePaperTradesUpdated);
    };
  }, [refreshKey]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers ─────────────────────────────────────────── */}
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

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Live Monitor
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Auto Position{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Monitor
              </span>
            </h2>
            <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
              Watches open paper trades where exit price is empty
            </p>
          </div>

          <button
            onClick={runMonitorNow}
            disabled={loading}
            className="group relative shrink-0 self-start overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-violet-500/40 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
              }}
            />
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
                Checking...
              </span>
            ) : (
              "⟳ Run Monitor"
            )}
          </button>
        </div>

        {/* ── OPEN POSITIONS ────────────────────────────────────────────── */}
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Open Positions Being Watched
        </p>

        {openTrades.length === 0 ? (
          <div className="mb-5 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-8">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              No Data
            </p>
            <p className="mt-1 font-mono text-sm font-black text-slate-500">
              No open paper trades right now
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-600">
              Run the monitor or save a paper trade first.
            </p>
          </div>
        ) : (
          <div className="mb-5 space-y-2.5">
            {openTrades.map((trade) => (
              <div
                key={trade.id}
                className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/10"
              >
                {/* Direction left bar */}
                <div
                  className={`absolute inset-y-0 left-0 w-[3px] ${dirBar(trade.direction)}`}
                />

                <div className="px-5 py-4 pl-6">
                  {/* Row 1: Symbol + badges + action buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xl font-black text-white">
                        {trade.symbol}
                      </span>

                      {/* Direction badge */}
                      <span
                        className={`rounded border border-current/30 bg-current/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${dirColor(trade.direction)}`}
                      >
                        {trade.direction || "—"}
                      </span>

                      {/* Status badge */}
                      <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-blue-300">
                        {trade.status || "open"}
                      </span>
                    </div>

                    {/* Close buttons. Option trades use the option-aware
                        endpoint (real P&L, both tables); stock trades keep the
                        TP/SL/BE stock-price close. */}
                    {optionTradeIds.has(trade.id) ? (
                      <button
                        onClick={() => closeOptionLive(trade)}
                        disabled={closingId === trade.id}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {closingId === trade.id ? "Closing…" : "Close @ Live"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            closeTradeAtPrice(
                              trade,
                              Number(trade.take_profit || trade.entry_price || 0)
                            )
                          }
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          TP
                        </button>
                        <button
                          onClick={() =>
                            closeTradeAtPrice(
                              trade,
                              Number(trade.stop_loss || trade.entry_price || 0)
                            )
                          }
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-red-400 transition hover:bg-red-500/20"
                        >
                          SL
                        </button>
                        <button
                          onClick={() =>
                            closeTradeAtPrice(trade, Number(trade.entry_price || 0))
                          }
                          className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 transition hover:text-slate-200"
                        >
                          BE
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Stats grid */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 md:grid-cols-6">
                    <MiniStat label="Entry" value={formatDollar(trade.entry_price)} />
                    {/* Stock stop/target don't apply to an option credit spread
                        (auto-close exits on spread value, not stock price) — hide
                        them for option trades; genuine stock trades keep them. */}
                    {!optionTradeIds.has(trade.id) && (
                      <>
                        <MiniStat
                          label="Stop Loss"
                          value={formatDollar(trade.stop_loss)}
                          valueClass="text-red-400"
                        />
                        <MiniStat
                          label="Take Profit"
                          value={formatDollar(trade.take_profit)}
                          valueClass="text-emerald-300"
                        />
                      </>
                    )}
                    <MiniStat label="Strategy" value={trade.strategy || "—"} />
                    <MiniStat
                      label="Opened"
                      value={
                        trade.created_at
                          ? new Date(trade.created_at).toLocaleDateString()
                          : "—"
                      }
                    />
                    <MiniStat
                      label="Time"
                      value={
                        trade.created_at
                          ? new Date(trade.created_at).toLocaleTimeString()
                          : "—"
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MONITOR EVENT LOG ─────────────────────────────────────────── */}
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Latest Monitor Events
        </p>

        {monitorEvents.length === 0 ? (
          <div className="mb-5 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-6">
            <p className="font-mono text-sm font-black text-slate-500">
              No monitor events yet
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-600">
              Click Run Monitor to start.
            </p>
          </div>
        ) : (
          <div className="mb-5 space-y-1.5">
            {monitorEvents.map((event) => (
              <div
                key={event.id}
                className={`relative overflow-hidden rounded-lg border bg-black/30 ${eventBorder(event.type)}`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-[2px] ${eventBar(event.type)}`}
                />
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 pl-5">
                  <span
                    className={`font-mono text-[9px] font-bold leading-5 ${eventTextColor(event.type)}`}
                  >
                    {event.message}
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-slate-600">
                    {event.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SAFETY NOTE ───────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-lg border border-blue-500/15 bg-blue-500/5">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-blue-500" />
          <div className="px-4 py-3 pl-5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Safety Note ›{" "}
            </span>
            <span className="font-mono text-[9px] leading-5 text-slate-500">
              This monitor finds open trades using{" "}
              <code className="rounded bg-slate-800 px-1 text-violet-400">
                exit_price IS NULL
              </code>
              . It does not auto-close using stock prices yet. Real automatic
              closing should use Tradier option contract prices once API access
              is approved.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{
          background:
            "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
        }}
      />
    </div>
  );
}