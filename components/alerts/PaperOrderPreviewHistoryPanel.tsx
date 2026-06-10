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

  if (status === "READY_FOR_SANDBOX") {
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }

  if (status === "SUBMITTED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "FAILED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-900 text-slate-300";
}

export default function PaperOrderPreviewHistoryPanel({
  refreshKey,
}: PaperOrderPreviewHistoryPanelProps) {
  const [paperOrderPreviewHistory, setPaperOrderPreviewHistory] = useState<
    PaperOrderPreviewRow[]
  >([]);
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

  useEffect(() => {
    let isMounted = true;

    async function loadPaperOrderPreviewHistory() {
      setIsLoadingPaperPreviewHistory(true);
      setPaperPreviewHistoryError(null);

      const { data, error } = await supabase
        .from("paper_order_previews")
        .select(
          "id, created_at, symbol, trade_lane, setup_name, contract_symbol, strike, expiration, option_type, bid, ask, mid, estimated_limit_price, quantity, estimated_order_cost, max_risk_dollars, contract_quality, risk_guard_status, preview_status, broker, order_side, order_type, time_in_force, approved_for_sandbox_order, approved_for_live_order, submitted_to_broker"
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
            }
          : row
      )
    );

    setReviewingPreviewId(null);
  }

  async function cancelPaperPreview(previewId: string) {
    setCancellingPreviewId(previewId);
    setPaperPreviewHistoryError(null);

    const { error } = await supabase
      .from("paper_order_previews")
      .update({
        preview_status: "CANCELLED",
        updated_at: new Date().toISOString(),
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        safety_notes:
          "Preview cancelled by user. No Tradier sandbox order submitted. No live order submitted.",
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
            }
          : row
      )
    );

    setCancellingPreviewId(null);
  }

  return (
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
          {paperOrderPreviewHistory.map((row) => (
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
                    {row.strike !== null && <span>Strike: {row.strike}</span>}
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
                      onClick={() => markPaperPreviewReviewed(row.id)}
                      disabled={
                        reviewingPreviewId === row.id ||
                        cancellingPreviewId === row.id ||
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
                      onClick={() => cancelPaperPreview(row.id)}
                      disabled={
                        reviewingPreviewId === row.id ||
                        cancellingPreviewId === row.id ||
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
          ))}
        </div>
      )}
    </div>
  );
}