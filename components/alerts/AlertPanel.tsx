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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export default function AlertPanel({
  alerts,
  onApproveAlert,
  onRejectAlert,
  onReviewAlert,
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPhoneHistory, setIsLoadingPhoneHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [phoneHistoryError, setPhoneHistoryError] = useState<string | null>(
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

    loadApprovalHistory();
    loadPhoneAlertHistory();

    return () => {
      isMounted = false;
    };
  }, [alerts]);

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

        <div className="rounded-xl border border-slate-700 px-4 py-3 text-sm">
          <p className="text-xs text-slate-500">Pending Alerts</p>
          <p className="text-2xl font-bold text-white">{activeAlerts.length}</p>
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
                        <span>
                          Max Risk: ${row.max_risk_dollars.toFixed(2)}
                        </span>
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
    </section>
  );
}