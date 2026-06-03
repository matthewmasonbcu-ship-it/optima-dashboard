"use client";

// ─── UI ONLY — no trading logic, no props changed ───────────────────────────

import { useEffect, useState } from "react";

function LiveClock() {
  const [time, setTime] = useState<string>("");
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
      setBlink((b) => !b);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span className="font-mono text-sm font-bold tracking-widest text-cyan-300">
      {time.slice(0, 2)}
      <span className={blink ? "opacity-100" : "opacity-20"}>:</span>
      {time.slice(3, 5)}
      <span className={blink ? "opacity-100" : "opacity-20"}>:</span>
      {time.slice(6)}
    </span>
  );
}

const STAT_CARDS = [
  {
    label: "Execution",
    value: "Disabled",
    sub: "No live orders fired",
    valueColor: "text-red-400",
    ringColor: "ring-red-500/30",
    glowColor: "shadow-red-900/40",
    dotColor: "bg-red-500",
    accentBar: "bg-red-500",
  },
  {
    label: "Quotes",
    value: "Live",
    sub: "Finnhub real-time feed",
    valueColor: "text-emerald-400",
    ringColor: "ring-emerald-500/30",
    glowColor: "shadow-emerald-900/40",
    dotColor: "bg-emerald-400",
    accentBar: "bg-emerald-500",
    pulse: true,
  },
  {
    label: "Options Chain",
    value: "Mock",
    sub: "Tradier access pending",
    valueColor: "text-amber-400",
    ringColor: "ring-amber-500/30",
    glowColor: "shadow-amber-900/40",
    dotColor: "bg-amber-400",
    accentBar: "bg-amber-500",
  },
];

const INFO_ITEMS = [
  { label: "Focus", value: "Build clean paper-trade data" },
  { label: "Risk Rule", value: "Risk Guard must approve" },
  { label: "Override", value: "Testing only · audited" },
  { label: "Next", value: "Real option-chain via Tradier" },
];

export default function TradingDashboardHeader() {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/80">

      {/* ── Background layers ─────────────────────────────────────────── */}

      {/* Deep radial gradient — gives the "command center" depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(6,182,212,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 90% 100%, rgba(37,99,235,0.07) 0%, transparent 60%)",
        }}
      />

      {/* Scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
        }}
      />

      {/* Top neon accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 60%, transparent 100%)",
        }}
      />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="relative px-6 py-6">

        {/* ── TOP ROW ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          {/* LEFT — Identity block */}
          <div className="flex flex-col gap-4">

            {/* Terminal ID bar */}
            <div className="flex items-center gap-3">
              {/* Blinking cursor dot */}
              <span className="flex h-2 w-2 items-center justify-center">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
              </span>

              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-500">
                OPTIMA-SYS · v2.1 · Paper Mode Active
              </span>

              {/* Live separator */}
              <span className="hidden h-px w-8 bg-slate-700 sm:block" />
              <LiveClock />
            </div>

            {/* Hero title */}
            <div>
              <h1 className="text-5xl font-black leading-none tracking-tight text-white md:text-6xl">
                Road to{" "}
                <span
                  className="relative inline-block"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4 0%, #60a5fa 50%, #818cf8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Funded
                </span>
              </h1>
              <h1 className="text-5xl font-black leading-none tracking-tight text-slate-300 md:text-6xl">
                Account
              </h1>
            </div>

            {/* Descriptor */}
            <p className="max-w-md font-mono text-[11px] leading-5 text-slate-500">
              Scanner · Risk Guard · Contract Selection · Paper Trades · Audit Log · Override Control
            </p>

            {/* Status badge strip */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Paper Mode — animated */}
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Paper Mode
                </span>
              </div>

              {/* Safe Locked */}
              <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                  Safe Locked
                </span>
              </div>

              {/* Tradier Pending */}
              <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  Tradier Pending
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — Stat orb cards */}
          <div className="grid grid-cols-3 gap-3 lg:min-w-[420px] xl:min-w-[480px]">
            {STAT_CARDS.map((card) => (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-lg ${card.glowColor} ring-1 ${card.ringColor}`}
              >
                {/* Left accent bar */}
                <div className={`absolute inset-y-0 left-0 w-[3px] ${card.accentBar}`} />

                <p className="mb-3 pl-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">
                  {card.label}
                </p>

                {/* Value + pulse dot */}
                <div className="flex items-center gap-2 pl-1">
                  {card.pulse ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${card.dotColor} opacity-70`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${card.dotColor}`} />
                    </span>
                  ) : (
                    <span className={`h-2 w-2 shrink-0 rounded-full ${card.dotColor}`} />
                  )}
                  <p className={`text-xl font-black tracking-tight ${card.valueColor}`}>
                    {card.value}
                  </p>
                </div>

                <p className="mt-1.5 pl-1 text-[10px] leading-4 text-slate-600">
                  {card.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM RAIL — terminal status ticker ───────────────────── */}
        <div
          className="relative mt-6 overflow-hidden rounded-lg border border-slate-800 bg-black/40"
          style={{ borderTop: "1px solid rgba(6,182,212,0.12)" }}
        >
          {/* Rail top accent */}
          <div
            className="absolute inset-x-0 top-0 h-px opacity-40"
            style={{
              background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
            }}
          />

          <div className="flex flex-wrap items-center gap-0 divide-x divide-slate-800/80 px-1 py-0">
            {INFO_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-600">
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-600">›</span>
                <span className="font-mono text-[10px] font-semibold text-slate-300">
                  {item.value}
                </span>
              </div>
            ))}

            {/* Right-aligned system tag */}
            <div className="ml-auto flex items-center gap-2 px-4 py-2.5">
              <span className="h-1 w-1 rounded-full bg-cyan-500 opacity-60" />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-600">
                OPTIMA · Paper Trading System
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom neon edge line */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-30"
        style={{
          background: "linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)",
        }}
      />
    </header>
  );
}