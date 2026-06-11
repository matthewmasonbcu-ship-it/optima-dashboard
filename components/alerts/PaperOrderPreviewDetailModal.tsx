"use client";

export type PaperOrderPreviewRow = {
  id: string;
  created_at: string;
  symbol: string;
  trade_lane: string | null;
  setup_name: string | null;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  estimated_limit_price: number | null;
  quantity: number;
  estimated_order_cost: number | null;
  max_risk_dollars: number | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  preview_status: string;
  broker: string;
  order_side: string;
  order_type: string;
  time_in_force: string;
  approved_for_sandbox_order: boolean;
  approved_for_live_order: boolean;
  submitted_to_broker: boolean;
  ready_for_sandbox_preview: boolean;
  ready_for_sandbox_preview_at: string | null;
  sandbox_preview_locked_reason: string | null;
  safety_notes: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null) {
  if (value === null) return "N/A";
  return `$${value.toFixed(2)}`;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatBool(value: boolean) {
  return value ? "YES" : "NO";
}

function getPreviewBadgeClass(status: string) {
  if (status === "PREVIEW_ONLY") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "REVIEWED_ONLY") {
    return "border-purple-500/40 bg-purple-500/10 text-purple-300";
  }

  if (status === "CANCELLED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-900 text-slate-300";
}

function getSandboxReadyBadgeClass(isReady: boolean) {
  if (isReady) {
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

function getFundedFilterStatus(
  safetyNotes: string | null | undefined
): "PASSED" | "BLOCKED" | null {
  const notes = String(safetyNotes || "").toUpperCase();

  if (
    notes.includes("FUNDED ACCOUNT SAFETY FILTER: PASSED") ||
    notes.includes("FUNDED FILTER PASSED") ||
    notes.includes("FUNDED FILTER: PASSED")
  ) {
    return "PASSED";
  }

  if (
    notes.includes("FUNDED ACCOUNT SAFETY FILTER: BLOCKED") ||
    notes.includes("FUNDED FILTER BLOCKED") ||
    notes.includes("FUNDED FILTER: BLOCKED")
  ) {
    return "BLOCKED";
  }

  return null;
}

function getFundedFilterBadgeClass(status: "PASSED" | "BLOCKED") {
  if (status === "PASSED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  return "border-orange-500/40 bg-orange-500/10 text-orange-300";
}

function DetailRow({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default function PaperOrderPreviewDetailModal({
  preview,
  onClose,
}: {
  preview: PaperOrderPreviewRow;
  onClose: () => void;
}) {
  const fundedFilterStatus = getFundedFilterStatus(preview.safety_notes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Paper Preview Detail
            </p>

            <h3 className="mt-2 text-2xl font-bold text-white">
              {preview.symbol} Order Preview
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Deep inspection only. No Tradier order submitted.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${getPreviewBadgeClass(
              preview.preview_status
            )}`}
          >
            {preview.preview_status}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${getSandboxReadyBadgeClass(
              preview.ready_for_sandbox_preview
            )}`}
          >
            {preview.ready_for_sandbox_preview
              ? "READY FOR SANDBOX PREVIEW"
              : "SANDBOX PREVIEW LOCKED"}
          </span>

          {preview.contract_quality && (
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
              Grade {preview.contract_quality}
            </span>
          )}

          {fundedFilterStatus && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getFundedFilterBadgeClass(
                fundedFilterStatus
              )}`}
            >
              Funded Filter {fundedFilterStatus}
            </span>
          )}

          {preview.risk_guard_status && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              Risk Guard {preview.risk_guard_status}
            </span>
          )}

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
            {preview.broker}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Contract
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Symbol" value={preview.symbol} />
              <DetailRow
                label="Contract Symbol"
                value={formatValue(preview.contract_symbol)}
              />
              <DetailRow
                label="Option Type"
                value={formatValue(preview.option_type)}
              />
              <DetailRow label="Strike" value={formatValue(preview.strike)} />
              <DetailRow
                label="Expiration"
                value={formatValue(preview.expiration)}
              />
              <DetailRow
                label="Contract Quality"
                value={formatValue(preview.contract_quality)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Pricing
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Bid" value={formatMoney(preview.bid)} />
              <DetailRow label="Ask" value={formatMoney(preview.ask)} />
              <DetailRow label="Mid" value={formatMoney(preview.mid)} />
              <DetailRow
                label="Estimated Limit"
                value={formatMoney(preview.estimated_limit_price)}
              />
              <DetailRow
                label="Estimated Cost"
                value={formatMoney(preview.estimated_order_cost)}
              />
              <DetailRow
                label="Max Risk"
                value={formatMoney(preview.max_risk_dollars)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Order Preview
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Broker" value={preview.broker} />
              <DetailRow label="Side" value={preview.order_side} />
              <DetailRow label="Order Type" value={preview.order_type} />
              <DetailRow label="Time In Force" value={preview.time_in_force} />
              <DetailRow label="Quantity" value={preview.quantity} />
              <DetailRow
                label="Created"
                value={formatDateTime(preview.created_at)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Safety Locks
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow
                label="Sandbox Approved"
                value={formatBool(preview.approved_for_sandbox_order)}
                valueClassName={
                  preview.approved_for_sandbox_order
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Live Approved"
                value={formatBool(preview.approved_for_live_order)}
                valueClassName={
                  preview.approved_for_live_order
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Broker Submitted"
                value={formatBool(preview.submitted_to_broker)}
                valueClassName={
                  preview.submitted_to_broker
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Ready For Sandbox Preview"
                value={formatBool(preview.ready_for_sandbox_preview)}
                valueClassName={
                  preview.ready_for_sandbox_preview
                    ? "text-sky-300"
                    : "text-slate-300"
                }
              />
            </div>

            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <p className="font-bold">Current hard lock</p>
              <p className="mt-1 text-emerald-300/80">
                This preview is inspection-only. It does not submit to Tradier,
                does not approve sandbox execution, and does not approve live
                execution.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Sandbox Locked Reason
            </h4>

            <p className="mt-3 text-sm text-slate-400">
              {preview.sandbox_preview_locked_reason ||
                "No sandbox readiness reason saved yet."}
            </p>

            {preview.ready_for_sandbox_preview_at && (
              <p className="mt-3 text-xs text-sky-300">
                Marked ready:{" "}
                {formatDateTime(preview.ready_for_sandbox_preview_at)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Safety Notes
            </h4>

            <p className="mt-3 text-sm text-slate-400">
              {preview.safety_notes || "No safety notes saved yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
