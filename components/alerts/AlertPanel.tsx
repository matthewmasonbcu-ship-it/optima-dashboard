"use client";

import type { TradeApprovalAlert } from "@/types/alerts";
import TradeApprovalCard from "./TradeApprovalCard";
import ApprovalHistoryPanel from "./ApprovalHistoryPanel";
import PhoneAlertHistoryPanel from "./PhoneAlertHistoryPanel";
import PaperOrderPreviewHistoryPanel from "./PaperOrderPreviewHistoryPanel";

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
  const activeAlerts = alerts.filter((alert) => alert.decision === "PENDING");

  const historyRefreshKey = alerts
    .map((alert) => `${alert.id}-${alert.decision}-${alert.decidedAt ?? ""}`)
    .join("|");

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Alert Center
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            Trade Approval Queue
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Dashboard-only approval center. Phone alerts and broker actions will
            connect later after paper testing.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
              Risk Guard APPROVED
            </span>

            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 font-semibold text-sky-300">
              Grade A+ / A / B
            </span>

            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 font-semibold text-yellow-300">
              Max Risk ≤ $100
            </span>

            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 font-semibold text-purple-300">
              Duplicates Blocked
            </span>

            <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 font-semibold text-slate-300">
              No Orders Placed
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-slate-700 px-4 py-3 text-sm">
            <p className="text-xs text-slate-500">Pending Alerts</p>
            <p className="text-2xl font-bold text-white">
              {activeAlerts.length}
            </p>
          </div>

          <button
            type="button"
            onClick={onClearResolvedAlerts}
            disabled={
              !onClearResolvedAlerts || alerts.length === activeAlerts.length
            }
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear Resolved
          </button>
        </div>
      </div>

      {isSavingApprovalDecision && (
        <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm font-semibold text-sky-300">
          Saving approval decision...
        </div>
      )}

      {approvalActionStatus && !isSavingApprovalDecision && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
          {approvalActionStatus}
        </div>
      )}

      {approvalActionError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {approvalActionError}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-black/20 p-6 text-center">
          <p className="font-bold text-slate-200">No active trade alerts</p>
          <p className="mt-2 text-sm text-slate-500">
            When the scanner finds a high-quality setup, it will appear here for
            review before any action is taken.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
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

      <ApprovalHistoryPanel refreshKey={historyRefreshKey} />

      <PhoneAlertHistoryPanel refreshKey={historyRefreshKey} />

      <PaperOrderPreviewHistoryPanel refreshKey={historyRefreshKey} />
    </section>
  );
}