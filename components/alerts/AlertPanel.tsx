"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { TradeApprovalAlert } from "@/types/alerts";
import TradeApprovalCard from "./TradeApprovalCard";

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

type ApprovalHistoryRow = {
  id: string;
  created_at: string;
  symbol: string;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  alert_status: string;
  approved_for_order: boolean;
};

type PhoneAlertEventRow = {
  id: string;
  created_at: string;
  symbol: string;
  trade_lane: string | null;
  setup_name: string | null;
  message: string | null;
  priority: string | null;
  channel: string;
  delivery_status: string;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  max_risk_dollars: number | null;
  approved_for_order: boolean;
};

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

function getStatusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "REJECTED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
}

function getDeliveryBadgeClass(status: string) {
  if (status === "LOGGED_ONLY") {
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }

  if (status === "SENT") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "FAILED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-900 text-slate-300";
}

function getPreviewBadgeClass(status: string) {
  if (status === "PREVIEW_ONLY") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "REVIEWED_ONLY") {
    return "border-purple-500/40 bg-purple-500/10 text-purple-300";
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
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>(
    []
  );
  const [phoneAlertHistory, setPhoneAlertHistory] = useState<
    PhoneAlertEventRow[]
  >([]);
  const [paperOrderPreviewHistory, setPaperOrderPreviewHistory] = useState<
    PaperOrderPreviewRow[]
  >([]);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPhoneHistory, setIsLoadingPhoneHistory] = useState(false);
  const [isLoadingPaperPreviewHistory, setIsLoadingPaperPreviewHistory] =
    useState(false);

  const [historyError, setHistoryError] = useState<string | null>(null);
  const [phoneHistoryError, setPhoneHistoryError] = useState<string | null>(
    null
  );
  const [paperPreviewHistoryError, setPaperPreviewHistoryError] = useState<
    string | null
  >(null);
    
  const [reviewingPreviewId, setReviewingPreviewId] = useState<string | null>(
    null
  );

  const activeAlerts = alerts.filter((alert) => alert.decision === "PENDING");

  useEffect(() => {
    let isMounted = true;

    async function loadApprovalHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      const { data, error } = await supabase
        .from("trade_approval_decisions")
        .select(
          "id, created_at, symbol, contract_symbol, strike, expiration, option_type, contract_quality, risk_guard_status, alert_status, approved_for_order"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load approval history:", error);
        setHistoryError("Could not load approval history.");
        setApprovalHistory([]);
      } else {
        setApprovalHistory((data ?? []) as ApprovalHistoryRow[]);
      }

      setIsLoadingHistory(false);
    }

    async function loadPhoneAlertHistory() {
      setIsLoadingPhoneHistory(true);
      setPhoneHistoryError(null);

      const { data, error } = await supabase
        .from("phone_alert_events")
        .select(
          "id, created_at, symbol, trade_lane, setup_name, message, priority, channel, delivery_status, contract_symbol, strike, expiration, option_type, contract_quality, risk_guard_status, max_risk_dollars, approved_for_order"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load phone alert history:", error);
        setPhoneHistoryError("Could not load phone alert history.");
        setPhoneAlertHistory([]);
      } else {
        setPhoneAlertHistory((data ?? []) as PhoneAlertEventRow[]);
      }

      setIsLoadingPhoneHistory(false);
    }

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
        setPaperPreviewHistoryError("Could not load paper order preview history.");
        setPaperOrderPreviewHistory([]);
      } else {
        setPaperOrderPreviewHistory((data ?? []) as PaperOrderPreviewRow[]);
      }

      setIsLoadingPaperPreviewHistory(false);
    }

    loadApprovalHistory();
    loadPhoneAlertHistory();
    loadPaperOrderPreviewHistory();

    return () => {
      isMounted = false;
    };
  }, [alerts]);

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
            disabled={!onClearResolvedAlerts || alerts.length === activeAlerts.length}
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

      <div className="mt-6 rounded-2xl border border-slate-800 bg-black/20 p-4">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Audit Trail
            </p>

            <h3 className="mt-1 text-lg font-bold text-white">
              Recent Approval Decisions
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Saved from Supabase approval history
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Loading approval history...
          </div>
        ) : historyError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {historyError}
          </div>
        ) : approvalHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-500">
            No approval decisions saved yet.
          </div>
        ) : (
          <div className="space-y-3">
            {approvalHistory.map((row) => (
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

                      {row.contract_quality && (
                        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-300">
                          Grade {row.contract_quality}
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-bold ${getStatusBadgeClass(
                          row.alert_status
                        )}`}
                      >
                        {row.alert_status}
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
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-500">
                      {formatDateTime(row.created_at)}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Order Approved: {row.approved_for_order ? "YES" : "NO"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-black/20 p-4">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Phone Alert Layer
            </p>

            <h3 className="mt-1 text-lg font-bold text-white">
              Recent Phone Alert Events
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Logging only — no SMS, push, or orders yet
          </p>
        </div>

        {isLoadingPhoneHistory ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Loading phone alert history...
          </div>
        ) : phoneHistoryError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {phoneHistoryError}
          </div>
        ) : phoneAlertHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-500">
            No phone alert events logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {phoneAlertHistory.map((row) => (
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

                      <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                        {row.channel}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-bold ${getDeliveryBadgeClass(
                          row.delivery_status
                        )}`}
                      >
                        {row.delivery_status}
                      </span>

                      {row.contract_quality && (
                        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-300">
                          Grade {row.contract_quality}
                        </span>
                      )}
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

                      {row.max_risk_dollars !== null && (
                        <span>Max Risk: {formatMoney(row.max_risk_dollars)}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-500">
                      {formatDateTime(row.created_at)}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Order Approved: {row.approved_for_order ? "YES" : "NO"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

                    <button
                      type="button"
                      onClick={() => markPaperPreviewReviewed(row.id)}
                      disabled={
                        reviewingPreviewId === row.id ||
                        row.preview_status === "REVIEWED_ONLY" ||
                        row.submitted_to_broker
                      }
                      className="mt-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-purple-300 transition hover:border-purple-400 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {reviewingPreviewId === row.id
                        ? "Marking..."
                        : row.preview_status === "REVIEWED_ONLY"
                        ? "Reviewed"
                        : "Mark Reviewed"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}