"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tone = "green" | "yellow" | "red" | "blue";

type LatestPhoneAlertRow = {
  id: string;
  created_at: string;
  symbol: string | null;
  delivery_status: string | null;
};

type TopReadySetupRow = {
  id: string;
  symbol: string | null;
  contract_symbol: string | null;
  contract_quality: string | null;
  max_risk_dollars: number | null;
};

function getToneClasses(tone: Tone) {
  if (tone === "green")
    return {
      border: "border-slate-700/60",
      ring: "ring-emerald-500/10",
      bar: "bg-emerald-500",
      dot: "bg-emerald-400",
      label: "text-slate-500",
      value: "text-emerald-300",
      sub: "text-slate-600",
    };

  if (tone === "yellow")
    return {
      border: "border-slate-700/60",
      ring: "ring-yellow-500/10",
      bar: "bg-yellow-400",
      dot: "bg-yellow-400",
      label: "text-slate-500",
      value: "text-yellow-300",
      sub: "text-slate-600",
    };

  if (tone === "red")
    return {
      border: "border-slate-700/60",
      ring: "ring-red-500/15",
      bar: "bg-red-500",
      dot: "bg-red-400",
      label: "text-slate-500",
      value: "text-red-400",
      sub: "text-slate-600",
    };

  return {
    border: "border-slate-700/60",
    ring: "ring-blue-500/10",
    bar: "bg-blue-500",
    dot: "bg-blue-400",
    label: "text-slate-500",
    value: "text-blue-300",
    sub: "text-slate-600",
  };
}

function StatusPill({
  label,
  value,
  tone,
  subtext,
}: {
  label: string;
  value: string;
  tone: Tone;
  subtext?: string;
}) {
  const t = getToneClasses(tone);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${t.border} bg-slate-900/70 p-4 ring-1 ${t.ring}`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${t.bar}`} />

      <div className="pl-1">
        <div className="mb-2 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
          <p
            className={`font-mono text-[9px] font-bold uppercase tracking-[0.22em] ${t.label}`}
          >
            {label}
          </p>
        </div>

        <p className={`font-mono text-sm font-black tracking-tight ${t.value}`}>
          {value}
        </p>

        {subtext && (
          <p className={`mt-1 text-[10px] leading-4 ${t.sub}`}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMaxRisk(value: number | null) {
  if (value === null) return "—";
  return `$${value.toFixed(2)}`;
}

export default function WorkModeCommandCenter() {
  const [loading, setLoading] = useState(false);
  const [phoneQueueCount, setPhoneQueueCount] = useState<number | null>(null);
  const [latestPhoneAlert, setLatestPhoneAlert] =
    useState<LatestPhoneAlertRow | null>(null);
  const [sandboxOrderUnlocked, setSandboxOrderUnlocked] = useState<
    boolean | null
  >(null);
  const [liveOrderEnabled, setLiveOrderEnabled] = useState<boolean | null>(
    null
  );
  const [topReadySetups, setTopReadySetups] = useState<TopReadySetupRow[]>([]);

  const loadWorkModeStatus = useCallback(async () => {
    setLoading(true);

    try {
      const [
        phoneQueueResult,
        latestPhoneAlertResult,
        sandboxApprovedResult,
        submittedToBrokerResult,
        liveApprovedResult,
        topReadySetupsResult,
      ] = await Promise.all([
        supabase
          .from("paper_order_previews")
          .select("id", { count: "exact", head: true })
          .eq("sandbox_preview_validation_status", "PASSED")
          .eq("sandbox_preview_human_review_decision", "WATCH")
          .eq("approved_for_sandbox_order", false)
          .eq("approved_for_live_order", false)
          .eq("submitted_to_broker", false),
        supabase
          .from("phone_alert_events")
          .select("id, created_at, symbol, delivery_status")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<LatestPhoneAlertRow>(),
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("approved_for_sandbox_order", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("submitted_to_broker", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id")
          .eq("approved_for_live_order", true)
          .limit(1),
        supabase
          .from("paper_order_previews")
          .select("id, symbol, contract_symbol, contract_quality, max_risk_dollars")
          .eq("sandbox_preview_validation_status", "PASSED")
          .eq("sandbox_preview_human_review_decision", "WATCH")
          .eq("approved_for_sandbox_order", false)
          .eq("approved_for_live_order", false)
          .eq("submitted_to_broker", false)
          .order("sandbox_preview_human_reviewed_at", {
            ascending: false,
            nullsFirst: false,
          })
          .limit(3),
      ]);

      setPhoneQueueCount(phoneQueueResult.count ?? 0);
      setLatestPhoneAlert(latestPhoneAlertResult.data ?? null);
      setTopReadySetups(
        (topReadySetupsResult.data ?? []) as TopReadySetupRow[]
      );

      const anySandboxApproved = (sandboxApprovedResult.data ?? []).length > 0;
      const anySubmittedToBroker =
        (submittedToBrokerResult.data ?? []).length > 0;

      setSandboxOrderUnlocked(anySandboxApproved || anySubmittedToBroker);
      setLiveOrderEnabled((liveApprovedResult.data ?? []).length > 0);
    } catch (error) {
      console.error("Failed to load Work Mode status:", error);
      setPhoneQueueCount(null);
      setLatestPhoneAlert(null);
      setSandboxOrderUnlocked(null);
      setLiveOrderEnabled(null);
      setTopReadySetups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkModeStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWorkModeStatus]);

  const phoneQueueValue =
    phoneQueueCount === null ? "—" : `${phoneQueueCount} Ready`;
  const phoneQueueSubtext =
    phoneQueueCount === null
      ? "Could not load phone queue."
      : "Validation PASSED + WATCH + locks false";

  const latestPhoneAlertValue = latestPhoneAlert
    ? `${latestPhoneAlert.symbol ?? "UNKNOWN"} — ${
        latestPhoneAlert.delivery_status ?? "UNKNOWN"
      }`
    : "No phone alerts yet.";
  const latestPhoneAlertSubtext = latestPhoneAlert
    ? formatDateTime(latestPhoneAlert.created_at)
    : "Phone alert log is empty";

  const brokerOrdersLockedValue =
    sandboxOrderUnlocked === null
      ? "—"
      : sandboxOrderUnlocked
        ? "UNLOCKED — CHECK"
        : "LOCKED";
  const brokerOrdersLockedTone: Tone =
    sandboxOrderUnlocked === null
      ? "yellow"
      : sandboxOrderUnlocked
        ? "red"
        : "green";
  const brokerOrdersLockedSubtext =
    sandboxOrderUnlocked === null
      ? "Could not verify broker lock status."
      : "approved_for_sandbox_order / submitted_to_broker";

  const liveTradingValue =
    liveOrderEnabled === null
      ? "—"
      : liveOrderEnabled
        ? "LIVE ENABLED — CHECK"
        : "DISABLED";
  const liveTradingTone: Tone =
    liveOrderEnabled === null
      ? "yellow"
      : liveOrderEnabled
        ? "red"
        : "green";
  const liveTradingSubtext =
    liveOrderEnabled === null
      ? "Could not verify live trading status."
      : "approved_for_live_order";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-black/60">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 5% 50%, rgba(6,182,212,0.04) 0%, transparent 55%), radial-gradient(ellipse 45% 55% at 95% 50%, rgba(37,99,235,0.04) 0%, transparent 55%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 70%, transparent 100%)",
        }}
      />

      <div className="relative px-6 py-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-600">
              OPTIMA-SYS · Work Mode
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Work Mode{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #06b6d4 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Command Center
              </span>
            </h2>
            <p className="mt-1.5 max-w-lg font-mono text-[10px] leading-5 text-slate-500">
              Read-only summary of phone alert queue and broker safety locks.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {loading && (
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                Checking...
              </span>
            )}

            <button
              type="button"
              onClick={() => void loadWorkModeStatus()}
              disabled={loading}
              className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⟳ Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatusPill
            label="Phone Queue Status"
            value={phoneQueueValue}
            tone="blue"
            subtext={phoneQueueSubtext}
          />
          <StatusPill
            label="Latest Phone Alert"
            value={latestPhoneAlertValue}
            tone="blue"
            subtext={latestPhoneAlertSubtext}
          />
          <StatusPill
            label="Broker Orders"
            value={brokerOrdersLockedValue}
            tone={brokerOrdersLockedTone}
            subtext={brokerOrdersLockedSubtext}
          />
          <StatusPill
            label="Live Trading"
            value={liveTradingValue}
            tone={liveTradingTone}
            subtext={liveTradingSubtext}
          />
          <StatusPill
            label="Safety Mode"
            value="PAPER / SANDBOX ONLY"
            tone="green"
            subtext="Dashboard simulation only"
          />
        </div>

        {topReadySetups.length > 0 && (
          <div className="relative mb-5 overflow-hidden rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03]">
            <div className="absolute inset-y-0 left-0 w-[3px] bg-cyan-500" />
            <div className="flex flex-col gap-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                  Top Ready Setups
                </p>
                <a
                  href="#phone-review-queue"
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200 transition-all hover:border-cyan-400 hover:bg-cyan-500/20"
                >
                  Jump to Phone Review Queue
                </a>
              </div>

              <div className="space-y-2">
                {topReadySetups.map((setup) => (
                  <div
                    key={setup.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-black/20 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-white">
                        {setup.symbol ?? "—"}
                      </span>
                      {setup.contract_symbol && (
                        <span className="font-mono text-[10px] text-slate-500">
                          {setup.contract_symbol}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-sky-300">
                        Grade {setup.contract_quality ?? "—"}
                      </span>
                      <span className="rounded border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300">
                        Max Risk {formatMaxRisk(setup.max_risk_dollars)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-lg border border-emerald-500/15 bg-emerald-500/5">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />
          <div className="px-5 py-3">
            <p className="font-mono text-[10px] leading-5 text-slate-400">
              Read-only status. No orders submitted.
            </p>
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
    </div>
  );
}
