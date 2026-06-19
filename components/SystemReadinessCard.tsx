"use client";

// ─── UI ONLY — all fetch logic, Supabase checks, and state untouched ────────

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type CheckStatus = "READY" | "WAITING" | "CAUTION" | "ERROR";

type ReadinessCheck = {
  label: string;
  status: CheckStatus;
  detail: string;
};

// ─── Status helpers — logic untouched, only visual output changed ────────────
function getStatusClass(status: CheckStatus) {
  if (status === "READY") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (status === "WAITING") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  if (status === "CAUTION") return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  return "border-red-500/40 bg-red-500/10 text-red-300";
}

function getDotClass(status: CheckStatus) {
  if (status === "READY") return "bg-emerald-400";
  if (status === "WAITING") return "bg-yellow-400";
  if (status === "CAUTION") return "bg-orange-400";
  return "bg-red-400";
}

function getAccentBar(status: CheckStatus) {
  if (status === "READY") return "bg-emerald-500";
  if (status === "WAITING") return "bg-yellow-400";
  if (status === "CAUTION") return "bg-orange-400";
  return "bg-red-500";
}

function getValueColor(status: CheckStatus) {
  if (status === "READY") return "text-emerald-300";
  if (status === "WAITING") return "text-yellow-300";
  if (status === "CAUTION") return "text-orange-300";
  return "text-red-400";
}

function getRingColor(status: CheckStatus) {
  if (status === "READY") return "ring-emerald-500/10";
  if (status === "WAITING") return "ring-yellow-500/10";
  if (status === "CAUTION") return "ring-orange-500/10";
  return "ring-red-500/15";
}

function getPulse(status: CheckStatus) {
  return status === "READY" || status === "WAITING";
}

function getOverallGlow(status: CheckStatus) {
  if (status === "READY") return "border-emerald-500/25 bg-emerald-500/5 ring-emerald-500/10";
  if (status === "WAITING") return "border-yellow-500/25 bg-yellow-500/5 ring-yellow-500/10";
  if (status === "CAUTION") return "border-orange-500/25 bg-orange-500/5 ring-orange-500/10";
  return "border-red-500/30 bg-red-500/8 ring-red-500/15";
}

function getOverallBar(status: CheckStatus) {
  if (status === "READY") return "bg-emerald-500";
  if (status === "WAITING") return "bg-yellow-400";
  if (status === "CAUTION") return "bg-orange-400";
  return "bg-red-500";
}

function getOverallValueColor(status: CheckStatus) {
  if (status === "READY") return "text-emerald-300";
  if (status === "WAITING") return "text-yellow-300";
  if (status === "CAUTION") return "text-orange-300";
  return "text-red-400";
}

export default function SystemReadinessCard() {
  // ─── All state and fetch logic untouched ──────────────────────────────────
  const [quoteStatus, setQuoteStatus] = useState<CheckStatus>("WAITING");
  const [quoteDetail, setQuoteDetail] = useState("Checking Finnhub quote route...");

  const [supabaseStatus, setSupabaseStatus] = useState<CheckStatus>("WAITING");
  const [supabaseDetail, setSupabaseDetail] = useState("Checking Supabase read access...");

  const [tradierStatus, setTradierStatus] = useState<CheckStatus>("WAITING");
  const [tradierDetail, setTradierDetail] = useState("Checking safe Tradier profile route...");

  const [lastChecked, setLastChecked] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);

  async function runReadinessChecks() {
    setIsChecking(true);
    setLastChecked(new Date().toLocaleTimeString());

    try {
      setQuoteStatus("WAITING");
      setQuoteDetail("Checking Finnhub quote route...");
      const quoteResponse = await fetch("/api/quote?symbol=AAPL", { cache: "no-store" });
      const quoteData = await quoteResponse.json();
      if (quoteResponse.ok && quoteData?.success !== false && typeof quoteData?.c === "number") {
        setQuoteStatus("READY");
        setQuoteDetail(`Live quote route online. AAPL last: $${quoteData.c.toFixed(2)}.`);
      } else {
        setQuoteStatus("ERROR");
        setQuoteDetail("Quote route responded, but did not return a valid live price.");
      }
    } catch {
      setQuoteStatus("ERROR");
      setQuoteDetail("Quote route failed. Check FINNHUB_API_KEY and /api/quote.");
    }

    try {
      setSupabaseStatus("WAITING");
      setSupabaseDetail("Checking Supabase read access...");
      const { error } = await supabase.from("paper_trades").select("id").limit(1);
      if (error) {
        setSupabaseStatus("ERROR");
        setSupabaseDetail(`Supabase read failed: ${error.message}`);
      } else {
        setSupabaseStatus("READY");
        setSupabaseDetail("Supabase connected. Paper trade table is readable.");
      }
    } catch {
      setSupabaseStatus("ERROR");
      setSupabaseDetail("Supabase check failed. Check .env.local and Supabase client.");
    }

    try {
      setTradierStatus("WAITING");
      setTradierDetail("Checking safe Tradier profile route...");
      const tradierResponse = await fetch("/api/tradier/profile", { cache: "no-store" });
      const tradierData = await tradierResponse.json();
      if (tradierResponse.ok && tradierData?.success === true) {
        if (tradierData?.connected === true) {
          setTradierStatus("READY");
          setTradierDetail("Tradier profile route connected. Keep orders disabled until approved.");
        } else {
          setTradierStatus("WAITING");
          setTradierDetail(
            tradierData?.message ||
              "Tradier route online. Waiting for verification/token. Orders remain disabled."
          );
        }
      } else {
        setTradierStatus("ERROR");
        setTradierDetail("Tradier profile route failed or returned invalid data.");
      }
    } catch {
      setTradierStatus("ERROR");
      setTradierDetail("Tradier profile check failed. Verify /api/tradier/profile route.");
    }

    setIsChecking(false);
  }

  useEffect(() => {
    runReadinessChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Checks array — untouched ─────────────────────────────────────────────
  const checks: ReadinessCheck[] = useMemo(
    () => [
      {
        label: "Broker Safety",
        status: "READY",
        detail: "Safe Paper Mode active. Orders disabled. Live trading disabled.",
      },
      {
        label: "Stock Quotes",
        status: quoteStatus,
        detail: quoteDetail,
      },
      {
        label: "Supabase",
        status: supabaseStatus,
        detail: supabaseDetail,
      },
      {
        label: "Option Chain",
        status: "CAUTION",
        detail: "Using mock option data until Tradier verification and real chains are connected.",
      },
      {
        label: "Tradier",
        status: tradierStatus,
        detail: tradierDetail,
      },
      {
        label: "Testing Override",
        status: "CAUTION",
        detail: "Override is controlled inside the trade command center. Keep OFF unless testing blocked trades.",
      },
    ],
    [quoteStatus, quoteDetail, supabaseStatus, supabaseDetail, tradierStatus, tradierDetail]
  );

  // ─── Overall status logic — untouched ────────────────────────────────────
  const hasError = checks.some((c) => c.status === "ERROR");
  const hasCaution = checks.some((c) => c.status === "CAUTION");
  const hasWaiting = checks.some((c) => c.status === "WAITING");

  const overallStatus: CheckStatus = hasError
    ? "ERROR"
    : hasWaiting
    ? "WAITING"
    : hasCaution
    ? "CAUTION"
    : "READY";

  const overallLabel =
    overallStatus === "READY"
      ? "READY FOR PAPER TESTING"
      : overallStatus === "WAITING"
      ? "WAITING ON BROKER VERIFICATION"
      : overallStatus === "CAUTION"
      ? "PAPER MODE READY — CAUTION ACTIVE"
      : "SYSTEM NEEDS ATTENTION";

  // ─── Readiness counts for the summary bar ─────────────────────────────────
  const readyCount = checks.filter((c) => c.status === "READY").length;
  const totalCount = checks.length;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">

      {/* ── Background layers — matches header + control center ────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(139,92,246,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 60% at 0% 100%, rgba(37,99,235,0.04) 0%, transparent 55%)",
        }}
      />
      {/* Scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
        }}
      />
      {/* Top neon accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #8b5cf6 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative px-6 py-6">

        {/* ── HEADER ROW ──────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          {/* Left — identity */}
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
              OPTIMA-SYS · Daily System Check
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              System{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Readiness
              </span>
            </h2>
            <p className="mt-1.5 max-w-lg font-mono text-[10px] leading-5 text-slate-500">
              Safety scan before paper trading or dashboard testing. {readyCount}/{totalCount} checks passing.
            </p>
          </div>

          {/* Right — overall status + recheck */}
          <div className="flex flex-col items-start gap-3 lg:items-end">

            {/* Overall status badge */}
            <div
              className={`relative overflow-hidden rounded-xl border px-5 py-3 ring-1 ${getOverallGlow(overallStatus)}`}
            >
              <div className={`absolute inset-y-0 left-0 w-[3px] ${getOverallBar(overallStatus)}`} />
              <div className="pl-1">
                <div className="mb-1 flex items-center gap-2">
                  {getPulse(overallStatus) ? (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getDotClass(overallStatus)} opacity-60`} />
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${getDotClass(overallStatus)}`} />
                    </span>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${getDotClass(overallStatus)}`} />
                  )}
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                    Overall Status
                  </p>
                </div>
                <p className={`font-mono text-sm font-black tracking-tight ${getOverallValueColor(overallStatus)}`}>
                  {overallLabel}
                </p>
              </div>
            </div>

            {/* Recheck button + timestamp */}
            <div className="flex flex-col items-start gap-1.5 lg:items-end">
              <button
                type="button"
                onClick={runReadinessChecks}
                disabled={isChecking}
                className="group relative overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-violet-500/40 hover:bg-slate-800/80 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {/* Hover neon shimmer */}
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
                />
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
                    Scanning...
                  </span>
                ) : (
                  "⟳ Recheck System"
                )}
              </button>

              {lastChecked && (
                <p className="font-mono text-[9px] text-slate-600">
                  Last scan · {lastChecked}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── PROGRESS BAR — readiness meter ──────────────────────────── */}
        <div className="mb-5 flex items-center gap-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
            System Health
          </span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
              style={{ width: `${(readyCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[9px] font-bold text-slate-500">
            {readyCount}/{totalCount}
          </span>
        </div>

        {/* ── CHECK GRID ──────────────────────────────────────────────── */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 ring-1 ${getRingColor(check.status)}`}
            >
              {/* Left accent bar */}
              <div className={`absolute inset-y-0 left-0 w-[3px] ${getAccentBar(check.status)}`} />

              <div className="pl-1">
                {/* Label + badge row */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getPulse(check.status) ? (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getDotClass(check.status)} opacity-70`} />
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${getDotClass(check.status)}`} />
                      </span>
                    ) : (
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDotClass(check.status)}`} />
                    )}
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {check.label}
                    </p>
                  </div>

                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${getStatusClass(check.status)}`}
                  >
                    {check.status}
                  </span>
                </div>

                {/* Status value */}
                <p className={`font-mono text-lg font-black tracking-tight ${getValueColor(check.status)}`}>
                  {check.status}
                </p>

                {/* Detail text */}
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── RULE RAIL — bottom status bar ───────────────────────────── */}
        <div
          className="relative mt-4 overflow-hidden rounded-lg border border-blue-500/15 bg-blue-500/5"
          style={{ borderTop: "1px solid rgba(139,92,246,0.10)" }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px opacity-40"
            style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
          />
          {/* Left accent bar — blue for info */}
          <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500" />
          <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-600">
              Trading Rule
            </span>
            <span className="hidden text-slate-700 sm:block">›</span>
            <p className="font-mono text-[10px] leading-5 text-slate-400">
              Real orders stay disabled until Tradier is verified, real option chains are connected,
              and the system proves itself through clean paper-trade data.{" "}
              <span className="text-blue-400">Paper Mode only.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)" }}
      />
    </section>
  );
}