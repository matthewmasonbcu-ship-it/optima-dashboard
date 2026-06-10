"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PaperOrderPreviewRow = {
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

type PaperOrderPreviewHistoryPanelProps = {
  refreshKey?: string;
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

function PaperPreviewDetailModal({
  preview,
  onClose,
}: {
  preview: PaperOrderPreviewRow;
  onClose: () => void;
}) {
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
              <DetailRow label="Option Type" value={formatValue(preview.option_type)} />
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

export default function PaperOrderPreviewHistoryPanel({
  refreshKey,
}: PaperOrderPreviewHistoryPanelProps) {
  const [paperOrderPreviewHistory, setPaperOrderPreviewHistory] = useState<
    PaperOrderPreviewRow[]
  >([]);
  const [selectedPreview, setSelectedPreview] =
    useState<PaperOrderPreviewRow | null>(null);
  const [isLoadingPaperPreviewHistory, setIsLoadingPaperPreviewHistory] =
    useState(false);
  const [paperPreviewHistoryError, setPaperPreviewHistoryError] = useState<
    string | null
  >(null);

  const [reviewingPreviewId, setReviewingPreviewId] = useState<string | null>(
    null
  );
  const [cancellingPreviewId, setCancellingPreviewId] = useState<string | null>(
    null
  );
  const [markingSandboxReadyId, setMarkingSandboxReadyId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPaperOrderPreviewHistory() {
      setIsLoadingPaperPreviewHistory(true);
      setPaperPreviewHistoryError(null);

      const { data, error } = await supabase
        .from("paper_order_previews")
        .select(
          "id, created_at, symbol, trade_lane, setup_name, contract_symbol, strike, expiration, option_type, bid, ask, mid, estimated_limit_price, quantity, estimated_order_cost, max_risk_dollars, contract_quality, risk_guard_status, preview_status, broker, order_side, order_type, time_in_force, approved_for_sandbox_order, approved_for_live_order, submitted_to_broker, ready_for_sandbox_preview, ready_for_sandbox_preview_at, sandbox_preview_locked_reason, safety_notes"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load paper order preview history:", error);
        setPaperPreviewHistoryError(
          "Could not load paper order preview history."
        );
        setPaperOrderPreviewHistory([]);
      } else {
        setPaperOrderPreviewHistory((data ?? []) as PaperOrderPreviewRow[]);
      }

      setIsLoadingPaperPreviewHistory(false);
    }

    loadPaperOrderPreviewHistory();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  async function markPaperPreviewReviewed(previewId: string) {
    setReviewingPreviewId(previewId);
    setPaperPreviewHistoryError(null);

    const { error } = await supabase
      .from("paper_order_previews")
      .update({
        preview_status: "REVIEWED_ONLY",
        updated_at: new Date().toISOString(),
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        safety_notes:
          "Preview reviewed by user. No Tradier sandbox order submitted. No live order submitted.",
      })
      .eq("id", previewId);

    if (error) {
      console.error("Failed to mark paper order preview reviewed:", error);
      setPaperPreviewHistoryError("Could not mark preview as reviewed.");
      setReviewingPreviewId(null);
      return;
    }

    setPaperOrderPreviewHistory((currentRows) =>
      currentRows.map((row) =>
        row.id === previewId
          ? {
              ...row,
              preview_status: "REVIEWED_ONLY",
              approved_for_sandbox_order: false,
              approved_for_live_order: false,
              submitted_to_broker: false,
              safety_notes:
                "Preview reviewed by user. No Tradier sandbox order submitted. No live order submitted.",
            }
          : row
      )
    );

    setSelectedPreview((currentPreview) =>
      currentPreview?.id === previewId
        ? {
            ...currentPreview,
            preview_status: "REVIEWED_ONLY",
            approved_for_sandbox_order: false,
            approved_for_live_order: false,
            submitted_to_broker: false,
            safety_notes:
              "Preview reviewed by user. No Tradier sandbox order submitted. No live order submitted.",
          }
        : currentPreview
    );

    setReviewingPreviewId(null);
  }

  async function markReadyForSandboxPreview(previewId: string) {
    const targetPreview = paperOrderPreviewHistory.find(
      (row) => row.id === previewId
    );

    if (!targetPreview) {
      setPaperPreviewHistoryError("Could not find this preview.");
      return;
    }

    if (targetPreview.preview_status !== "REVIEWED_ONLY") {
      setPaperPreviewHistoryError(
        "Preview must be REVIEWED_ONLY before it can be marked ready for sandbox preview."
      );
      return;
    }

    if (
      targetPreview.submitted_to_broker ||
      targetPreview.approved_for_sandbox_order ||
      targetPreview.approved_for_live_order
    ) {
      setPaperPreviewHistoryError(
        "Safety lock blocked this action because this preview is not fully locked."
      );
      return;
    }

    setMarkingSandboxReadyId(previewId);
    setPaperPreviewHistoryError(null);

    const readyAt = new Date().toISOString();
    const lockedReason =
      "Manually marked ready for future Tradier sandbox preview. No broker order submitted.";
    const safetyNotes =
      "Ready for future Tradier sandbox preview route only. No broker order submitted. No live order submitted.";

    const { error } = await supabase
      .from("paper_order_previews")
      .update({
        ready_for_sandbox_preview: true,
        ready_for_sandbox_preview_at: readyAt,
        sandbox_preview_locked_reason: lockedReason,
        updated_at: readyAt,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        safety_notes: safetyNotes,
      })
      .eq("id", previewId)
      .eq("preview_status", "REVIEWED_ONLY")
      .eq("approved_for_sandbox_order", false)
      .eq("approved_for_live_order", false)
      .eq("submitted_to_broker", false);

    if (error) {
      console.error("Failed to mark ready for sandbox preview:", error);
      setPaperPreviewHistoryError(
        "Could not mark preview ready for sandbox preview."
      );
      setMarkingSandboxReadyId(null);
      return;
    }

    setPaperOrderPreviewHistory((currentRows) =>
      currentRows.map((row) =>
        row.id === previewId
          ? {
              ...row,
              ready_for_sandbox_preview: true,
              ready_for_sandbox_preview_at: readyAt,
              sandbox_preview_locked_reason: lockedReason,
              approved_for_sandbox_order: false,
              approved_for_live_order: false,
              submitted_to_broker: false,
              safety_notes: safetyNotes,
            }
          : row
      )
    );

    setSelectedPreview((currentPreview) =>
      currentPreview?.id === previewId
        ? {
            ...currentPreview,
            ready_for_sandbox_preview: true,
            ready_for_sandbox_preview_at: readyAt,
            sandbox_preview_locked_reason: lockedReason,
            approved_for_sandbox_order: false,
            approved_for_live_order: false,
            submitted_to_broker: false,
            safety_notes: safetyNotes,
          }
        : currentPreview
    );

    setMarkingSandboxReadyId(null);
  }

  async function cancelPaperPreview(previewId: string) {
    setCancellingPreviewId(previewId);
    setPaperPreviewHistoryError(null);

    const safetyNotes =
      "Preview cancelled by user. No Tradier sandbox order submitted. No live order submitted.";
    const lockedReason = "Preview cancelled. Sandbox preview readiness removed.";

    const { error } = await supabase
      .from("paper_order_previews")
      .update({
        preview_status: "CANCELLED",
        updated_at: new Date().toISOString(),
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        ready_for_sandbox_preview: false,
        ready_for_sandbox_preview_at: null,
        sandbox_preview_locked_reason: lockedReason,
        safety_notes: safetyNotes,
      })
      .eq("id", previewId);

    if (error) {
      console.error("Failed to cancel paper order preview:", error);
      setPaperPreviewHistoryError("Could not cancel preview.");
      setCancellingPreviewId(null);
      return;
    }

    setPaperOrderPreviewHistory((currentRows) =>
      currentRows.map((row) =>
        row.id === previewId
          ? {
              ...row,
              preview_status: "CANCELLED",
              approved_for_sandbox_order: false,
              approved_for_live_order: false,
              submitted_to_broker: false,
              ready_for_sandbox_preview: false,
              ready_for_sandbox_preview_at: null,
              sandbox_preview_locked_reason: lockedReason,
              safety_notes: safetyNotes,
            }
          : row
      )
    );

    setSelectedPreview((currentPreview) =>
      currentPreview?.id === previewId
        ? {
            ...currentPreview,
            preview_status: "CANCELLED",
            approved_for_sandbox_order: false,
            approved_for_live_order: false,
            submitted_to_broker: false,
            ready_for_sandbox_preview: false,
            ready_for_sandbox_preview_at: null,
            sandbox_preview_locked_reason: lockedReason,
            safety_notes: safetyNotes,
          }
        : currentPreview
    );

    setCancellingPreviewId(null);
  }

  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-black/20 p-4">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Paper Order Layer
            </p>

            <h3 className="mt-1 text-lg font-bold text-white">
              Recent Paper Order Previews
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Preview only — no Tradier order submitted
          </p>
        </div>

        {isLoadingPaperPreviewHistory ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Loading paper order previews...
          </div>
        ) : paperPreviewHistoryError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {paperPreviewHistoryError}
          </div>
        ) : paperOrderPreviewHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-500">
            No paper order previews created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {paperOrderPreviewHistory.map((row) => {
              const canMarkReadyForSandboxPreview =
                row.preview_status === "REVIEWED_ONLY" &&
                !row.ready_for_sandbox_preview &&
                !row.submitted_to_broker &&
                !row.approved_for_sandbox_order &&
                !row.approved_for_live_order;

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">{row.symbol}</p>

                        {row.option_type && (
                          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                            {row.option_type}
                          </span>
                        )}

                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-bold ${getPreviewBadgeClass(
                            row.preview_status
                          )}`}
                        >
                          {row.preview_status}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-bold ${getSandboxReadyBadgeClass(
                            row.ready_for_sandbox_preview
                          )}`}
                        >
                          {row.ready_for_sandbox_preview
                            ? "READY FOR SANDBOX PREVIEW"
                            : "SANDBOX PREVIEW LOCKED"}
                        </span>

                        {row.contract_quality && (
                          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-300">
                            Grade {row.contract_quality}
                          </span>
                        )}

                        <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                          {row.broker}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {row.contract_symbol || "No contract symbol saved"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {row.strike !== null && (
                          <span>Strike: {row.strike}</span>
                        )}
                        {row.expiration && <span>Exp: {row.expiration}</span>}
                        {row.risk_guard_status && (
                          <span>Risk Guard: {row.risk_guard_status}</span>
                        )}
                        <span>Side: {row.order_side}</span>
                        <span>Type: {row.order_type}</span>
                        <span>TIF: {row.time_in_force}</span>
                        <span>Qty: {row.quantity}</span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                          <p className="text-slate-500">Limit Price</p>
                          <p className="font-bold text-white">
                            {formatMoney(row.estimated_limit_price)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                          <p className="text-slate-500">Estimated Cost</p>
                          <p className="font-bold text-white">
                            {formatMoney(row.estimated_order_cost)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                          <p className="text-slate-500">Max Risk</p>
                          <p className="font-bold text-white">
                            {formatMoney(row.max_risk_dollars)}
                          </p>
                        </div>
                      </div>

                      {row.ready_for_sandbox_preview && (
                        <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
                          <p className="font-bold">
                            Sandbox preview ready lock
                          </p>
                          <p className="mt-1 text-sky-300/80">
                            {row.sandbox_preview_locked_reason ||
                              "Ready for future sandbox preview. No broker order submitted."}
                          </p>
                          {row.ready_for_sandbox_preview_at && (
                            <p className="mt-1 text-sky-300/70">
                              Marked ready:{" "}
                              {formatDateTime(
                                row.ready_for_sandbox_preview_at
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-500">
                        {formatDateTime(row.created_at)}
                      </p>

                      <div className="mt-2 space-y-1 text-xs font-bold text-slate-400">
                        <p>
                          Sandbox Approved:{" "}
                          {row.approved_for_sandbox_order ? "YES" : "NO"}
                        </p>
                        <p>
                          Live Approved:{" "}
                          {row.approved_for_live_order ? "YES" : "NO"}
                        </p>
                        <p>
                          Broker Submitted:{" "}
                          {row.submitted_to_broker ? "YES" : "NO"}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap justify-start gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedPreview(row)}
                          className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-400 hover:text-white"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => markPaperPreviewReviewed(row.id)}
                          disabled={
                            reviewingPreviewId === row.id ||
                            cancellingPreviewId === row.id ||
                            markingSandboxReadyId === row.id ||
                            row.preview_status === "REVIEWED_ONLY" ||
                            row.preview_status === "CANCELLED" ||
                            row.submitted_to_broker
                          }
                          className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-purple-300 transition hover:border-purple-400 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {reviewingPreviewId === row.id
                            ? "Marking..."
                            : row.preview_status === "REVIEWED_ONLY"
                            ? "Reviewed"
                            : "Mark Reviewed"}
                        </button>

                        <button
                          type="button"
                          onClick={() => markReadyForSandboxPreview(row.id)}
                          disabled={
                            !canMarkReadyForSandboxPreview ||
                            reviewingPreviewId === row.id ||
                            cancellingPreviewId === row.id ||
                            markingSandboxReadyId === row.id
                          }
                          className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {markingSandboxReadyId === row.id
                            ? "Locking..."
                            : row.ready_for_sandbox_preview
                            ? "Sandbox Ready"
                            : "Mark Sandbox Ready"}
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelPaperPreview(row.id)}
                          disabled={
                            reviewingPreviewId === row.id ||
                            cancellingPreviewId === row.id ||
                            markingSandboxReadyId === row.id ||
                            row.preview_status === "CANCELLED" ||
                            row.submitted_to_broker
                          }
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {cancellingPreviewId === row.id
                            ? "Cancelling..."
                            : row.preview_status === "CANCELLED"
                            ? "Cancelled"
                            : "Cancel Preview"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPreview && (
        <PaperPreviewDetailModal
          preview={selectedPreview}
          onClose={() => setSelectedPreview(null)}
        />
      )}
    </>
  );
}