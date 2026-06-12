"use client";

import { useState } from "react";
import type { TradeApprovalAlert } from "@/types/alerts";
import TradeApprovalCard from "./TradeApprovalCard";
import ApprovalHistoryPanel from "./ApprovalHistoryPanel";
import PhoneAlertHistoryPanel from "./PhoneAlertHistoryPanel";
import PaperOrderPreviewHistoryPanel from "./PaperOrderPreviewHistoryPanel";
import SandboxPreviewPhoneReviewQueue from "./SandboxPreviewPhoneReviewQueue";

type AlertPanelProps = {
  alerts: TradeApprovalAlert[];
  onApproveAlert?: (alertId: string) => void | Promise<void>;
  onRejectAlert?: (alertId: string) => void | Promise<void>;
  onReviewAlert?: (alertId: string) => void | Promise<void>;
  onClearResolvedAlerts?: () => void;
  approvalActionStatus?: string | null;
  approvalActionError?: string | null;
  isSavingApprovalDecision?: boolean;
};

export default function AlertPanel({
  alerts,
  onApproveAlert,
  onRejectAlert,
  onReviewAlert,
  onClearResolvedAlerts,
  approvalActionStatus,
  approvalActionError,
  isSavingApprovalDecision,
}: AlertPanelProps) {
  const [phoneAlertRefreshKey, setPhoneAlertRefreshKey] = useState(0);

  const activeAlerts = alerts.filter((alert) => alert.decision === "PENDING");

  const historyRefreshKey = alerts
    .map((alert) => `${alert.id}-${alert.decision}-${alert.decidedAt ?? ""}`)
    .join("|");

  const combinedHistoryRefreshKey = `${historyRefreshKey}|phone-${phoneAlertRefreshKey}`;

  const hasPending = activeAlerts.length > 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900/60 p-4 shadow-[0_0_40px_-12px_rgba(8,47,73,0.5)] sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/[0.07] blur-3xl"
      />

      <div className="relative mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {hasPending && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  hasPending
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    : "bg-slate-600"
                }`}
              />
            </span>

            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/70">
              Alert Center
            </p>
          </div>

          <h2 className="mt-2 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
            Trade Approval Queue
          </h2>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            Dashboard-only approval center. Sandbox preview validation can pass,
            but human review is still required before any future broker step.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]" />
              Risk Guard Approved
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              <span className="h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.9)]" />
              Grade A+ / A / B
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
              <span className="h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.9)]" />
              Max Risk ≤ $100
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-500/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-300">
              <span className="h-1 w-1 rounded-full bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.9)]" />
              Duplicates Blocked
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/60 bg-slate-900/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              No Orders Placed
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-stretch gap-2 lg:flex-col">
          <div
            className={`group relative flex-1 overflow-hidden rounded-xl border px-4 py-3 transition-all duration-300 lg:flex-none ${
              hasPending
                ? "border-cyan-500/30 bg-cyan-500/[0.05] shadow-[0_0_24px_-8px_rgba(34,211,238,0.4)]"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Pending Alerts
            </p>
            <p
              className={`mt-0.5 font-mono text-3xl font-bold tabular-nums transition-colors duration-300 ${
                hasPending ? "text-cyan-300" : "text-slate-400"
              }`}
            >
              {activeAlerts.length}
            </p>

            {hasPending && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
              />
            )}
          </div>

          <button
            type="button"
            onClick={onClearResolvedAlerts}
            disabled={
              !onClearResolvedAlerts || alerts.length === activeAlerts.length
            }
            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all duration-300 hover:border-cyan-500/40 hover:bg-slate-800/80 hover:text-cyan-200 hover:shadow-[0_0_16px_-6px_rgba(34,211,238,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700/80 disabled:hover:bg-slate-900/80 disabled:hover:text-slate-300 disabled:hover:shadow-none"
          >
            Clear Resolved
          </button>
        </div>
      </div>

      {isSavingApprovalDecision && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/[0.08] p-3 text-sm font-semibold text-sky-300 shadow-[0_0_20px_-8px_rgba(56,189,248,0.4)]">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-300" />
          Saving approval decision...
        </div>
      )}

      {approvalActionStatus && !isSavingApprovalDecision && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3 text-sm font-semibold text-emerald-300 shadow-[0_0_20px_-8px_rgba(52,211,153,0.35)]">
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[9px] text-emerald-300">
            ✓
          </span>
          {approvalActionStatus}
        </div>
      )}

      {approvalActionError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.08] p-3 text-sm font-semibold text-red-300 shadow-[0_0_20px_-8px_rgba(248,113,113,0.4)]">
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/20 font-mono text-[9px] text-red-300">
            !
          </span>
          {approvalActionError}
        </div>
      )}

      <div className="mb-5 overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.045] shadow-[0_0_28px_-16px_rgba(34,211,238,0.5)]">
        <div className="border-b border-cyan-500/10 px-4 py-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/80">
            Sandbox Preview Human Review Gate
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-100">
            Validation Passed ≠ Order Approved
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            A passed sandbox preview validation only means the preview row was
            safely checked and saved for audit. It does not unlock sandbox
            orders, live orders, or broker submission.
          </p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
              Step 1
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-200">
              Validation Audited
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-100/60">
              Supabase stores status, message, timestamp, payload, and safety
              locks.
            </p>
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/[0.07] p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300/80">
              Step 2
            </p>
            <p className="mt-1 text-sm font-bold text-yellow-200">
              Human Review Required
            </p>
            <p className="mt-1 text-xs leading-relaxed text-yellow-100/60">
              You still review the setup before any future execution layer is
              considered.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/80">
              Locked
            </p>
            <p className="mt-1 text-sm font-bold text-red-200">
              Broker Submit Off
            </p>
            <p className="mt-1 text-xs leading-relaxed text-red-100/60">
              approved_for_sandbox_order and submitted_to_broker remain false.
            </p>
          </div>

          <div className="rounded-xl border border-slate-600/60 bg-slate-900/70 p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Protected
            </p>
            <p className="mt-1 text-sm font-bold text-slate-200">
              Live Trading Disabled
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              approved_for_live_order remains false. No real-money route is
              enabled.
            </p>
          </div>
        </div>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-700/70 bg-black/30 p-8 text-center transition-colors duration-300 hover:border-slate-600/70 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-2xl"
          />
          <div className="relative mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500" />
            </span>
          </div>
          <p className="relative font-bold text-slate-200">
            No pending trade alerts
          </p>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            When the scanner finds a high-quality setup, it will appear here for
            review before any action is taken.
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {activeAlerts.map((alert) => (
            <TradeApprovalCard
              key={alert.id || `${alert.symbol}-${alert.createdAt}`}
              alert={alert}
              onReview={() => alert.id && onReviewAlert?.(alert.id)}
              onApprove={() => alert.id && onApproveAlert?.(alert.id)}
              onReject={() => alert.id && onRejectAlert?.(alert.id)}
            />
          ))}
        </div>
      )}

      <SandboxPreviewPhoneReviewQueue
        refreshKey={combinedHistoryRefreshKey}
        onPhoneAlertLogged={() =>
          setPhoneAlertRefreshKey((value) => value + 1)
        }
      />

      <ApprovalHistoryPanel refreshKey={historyRefreshKey} />

      <PhoneAlertHistoryPanel refreshKey={combinedHistoryRefreshKey} />

      <PaperOrderPreviewHistoryPanel refreshKey={combinedHistoryRefreshKey} />
    </section>
  );
}