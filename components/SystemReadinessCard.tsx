"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type CheckStatus = "READY" | "WAITING" | "CAUTION" | "ERROR";

type ReadinessCheck = {
  label: string;
  status: CheckStatus;
  detail: string;
};

function getStatusClass(status: CheckStatus) {
  if (status === "READY") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "WAITING") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "CAUTION") {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  return "border-red-500/40 bg-red-500/10 text-red-300";
}

function getDotClass(status: CheckStatus) {
  if (status === "READY") return "bg-emerald-400";
  if (status === "WAITING") return "bg-yellow-400";
  if (status === "CAUTION") return "bg-orange-400";
  return "bg-red-400";
}

export default function SystemReadinessCard() {
  const [quoteStatus, setQuoteStatus] = useState<CheckStatus>("WAITING");
  const [quoteDetail, setQuoteDetail] = useState("Checking Finnhub quote route...");

  const [supabaseStatus, setSupabaseStatus] = useState<CheckStatus>("WAITING");
  const [supabaseDetail, setSupabaseDetail] = useState("Checking Supabase read access...");

  const [tradierStatus, setTradierStatus] = useState<CheckStatus>("WAITING");
  const [tradierDetail, setTradierDetail] = useState("Checking safe Tradier profile route...");

  const [lastChecked, setLastChecked] = useState<string>("");

  async function runReadinessChecks() {
    setLastChecked(new Date().toLocaleTimeString());

    try {
      setQuoteStatus("WAITING");
      setQuoteDetail("Checking Finnhub quote route...");

      const quoteResponse = await fetch("/api/quote?symbol=AAPL", {
        cache: "no-store",
      });

      const quoteData = await quoteResponse.json();

      if (quoteResponse.ok && quoteData?.success !== false && typeof quoteData?.c === "number") {
        setQuoteStatus("READY");
        setQuoteDetail(`Live quote route online. AAPL last: $${quoteData.c.toFixed(2)}.`);
      } else {
        setQuoteStatus("ERROR");
        setQuoteDetail("Quote route responded, but did not return a valid live price.");
      }
    } catch (error) {
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
    } catch (error) {
      setSupabaseStatus("ERROR");
      setSupabaseDetail("Supabase check failed. Check .env.local and Supabase client.");
    }

    try {
      setTradierStatus("WAITING");
      setTradierDetail("Checking safe Tradier profile route...");

      const tradierResponse = await fetch("/api/tradier/profile", {
        cache: "no-store",
      });

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
    } catch (error) {
      setTradierStatus("ERROR");
      setTradierDetail("Tradier profile check failed. Verify /api/tradier/profile route.");
    }
  }

  useEffect(() => {
    runReadinessChecks();
  }, []);

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

  const hasError = checks.some((check) => check.status === "ERROR");
  const hasCaution = checks.some((check) => check.status === "CAUTION");
  const hasWaiting = checks.some((check) => check.status === "WAITING");

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

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Daily System Check
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-100">System Readiness</h2>
          <p className="mt-1 text-sm text-slate-400">
            Quick safety scan before paper trading or testing the dashboard.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className={`rounded-full border px-4 py-2 text-xs font-bold ${getStatusClass(overallStatus)}`}>
            {overallLabel}
          </div>

          <button
            type="button"
            onClick={runReadinessChecks}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Recheck System
          </button>

          {lastChecked && (
            <p className="text-xs text-slate-500">Last checked: {lastChecked}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${getDotClass(check.status)}`} />
                <h3 className="font-semibold text-slate-100">{check.label}</h3>
              </div>

              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClass(check.status)}`}>
                {check.status}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-400">{check.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm font-semibold text-blue-200">Current Trading Rule</p>
        <p className="mt-1 text-sm leading-6 text-blue-100/80">
          This dashboard is still in paper-testing mode. Real orders stay disabled until
          Tradier verification is complete, real option chains are connected, and the system
          proves itself through clean paper-trade data.
        </p>
      </div>
    </section>
  );
}