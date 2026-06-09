"use client";

import type { TradeApprovalAlert } from "@/types/alerts";
import TradeApprovalCard from "./TradeApprovalCard";

type AlertPanelProps = {
  alerts: TradeApprovalAlert[];
  onApproveAlert?: (alertId: string) => void;
  onRejectAlert?: (alertId: string) => void;
  onReviewAlert?: (alertId: string) => void;
};

export default function AlertPanel({
  alerts,
  onApproveAlert,
  onRejectAlert,
  onReviewAlert,
}: AlertPanelProps) {
  const activeAlerts = alerts.filter((alert) => alert.decision === "PENDING");

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
        </div>

        <div className="rounded-xl border border-slate-700 px-4 py-3 text-sm">
          <p className="text-xs text-slate-500">Pending Alerts</p>
          <p className="text-2xl font-bold text-white">{activeAlerts.length}</p>
        </div>
      </div>

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
    </section>
  );
}