"use client";

import type { TradeApprovalAlert } from "@/types/alerts";

type TradeApprovalCardProps = {
  alert: TradeApprovalAlert;
  onApprove?: () => void;
  onReject?: () => void;
  onReview?: () => void;
};

export default function TradeApprovalCard({
  alert,
  onApprove,
  onReject,
  onReview,
}: TradeApprovalCardProps) {
  const isApproved = alert.decision === "APPROVED";
  const isRejected = alert.decision === "REJECTED";
  const isPending = alert.decision === "PENDING";

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Trade Approval Alert
          </p>

          <h3 className="mt-1 text-2xl font-bold text-white">
            {alert.symbol}
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            {alert.setupName || "Setup review required"}
          </p>
        </div>

        <div className="text-right">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              alert.priority === "CRITICAL"
                ? "bg-red-500/20 text-red-300"
                : alert.priority === "HIGH"
                ? "bg-orange-500/20 text-orange-300"
                : alert.priority === "MEDIUM"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            {alert.priority}
          </span>

          <p className="mt-2 text-xs text-slate-500">{alert.lane}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/30 p-4">
        <p className="text-sm text-slate-300">{alert.message}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Risk Guard</p>
          <p
            className={`mt-1 font-bold ${
              alert.riskGuardStatus === "APPROVED"
                ? "text-emerald-300"
                : alert.riskGuardStatus === "CAUTION"
                ? "text-yellow-300"
                : alert.riskGuardStatus === "BLOCKED"
                ? "text-red-300"
                : "text-slate-300"
            }`}
          >
            {alert.riskGuardStatus}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Contract Quality</p>
          <p className="mt-1 font-bold text-white">
            {alert.contractQuality || "N/A"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Max Risk</p>
          <p className="mt-1 font-bold text-white">
            {typeof alert.maxRiskDollars === "number"
              ? `$${alert.maxRiskDollars.toFixed(2)}`
              : "N/A"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-3">
          <p className="text-xs text-slate-500">Decision</p>
          <p
            className={`mt-1 font-bold ${
              isApproved
                ? "text-emerald-300"
                : isRejected
                ? "text-red-300"
                : "text-yellow-300"
            }`}
          >
            {alert.decision}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={onReview}
          className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
        >
          Review Setup
        </button>

        <button
          type="button"
          onClick={onApprove}
          disabled={!isPending || alert.riskGuardStatus === "BLOCKED"}
          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Approve
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={!isPending}
          className="rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Reject
        </button>
      </div>
    </div>
  );
}