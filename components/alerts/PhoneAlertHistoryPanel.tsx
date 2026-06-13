"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  paper_order_preview_id: string | null;
};

type LinkedPreviewAuditInfo = {
  id: string;
  preview_status: string | null;
  sandbox_preview_validation_status: string | null;
  sandbox_preview_human_review_decision: string | null;
  sandbox_preview_human_review_notes: string | null;
  sandbox_preview_human_reviewed_at: string | null;
  sandbox_preview_validation_checked_at: string | null;
};

type PhoneAlertHistoryPanelProps = {
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

function getReviewDecisionBadgeClass(decision: string | null | undefined) {
  const normalized = String(decision || "").trim().toUpperCase();

  if (normalized === "WATCH") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "HOLD") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (normalized === "REJECT") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-sky-500/40 bg-sky-500/10 text-sky-300";
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

export default function PhoneAlertHistoryPanel({
  refreshKey,
}: PhoneAlertHistoryPanelProps) {
  const [phoneAlertHistory, setPhoneAlertHistory] = useState<
    PhoneAlertEventRow[]
  >([]);
  const [linkedPreviewsById, setLinkedPreviewsById] = useState<
    Record<string, LinkedPreviewAuditInfo>
  >({});
  const [isLoadingPhoneHistory, setIsLoadingPhoneHistory] = useState(false);
  const [phoneHistoryError, setPhoneHistoryError] = useState<string | null>(
    null
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const loadPhoneAlertHistory = useCallback(async () => {
    setIsLoadingPhoneHistory(true);
    setPhoneHistoryError(null);

    try {
      const { data, error } = await supabase
        .from("phone_alert_events")
        .select(
          "id, created_at, symbol, trade_lane, setup_name, message, priority, channel, delivery_status, contract_symbol, strike, expiration, option_type, contract_quality, risk_guard_status, max_risk_dollars, approved_for_order, paper_order_preview_id"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Failed to load phone alert history:", error);
        setPhoneHistoryError("Could not load phone alert history.");
        setPhoneAlertHistory([]);
        setLinkedPreviewsById({});
        return;
      }

      const rows = (data ?? []) as PhoneAlertEventRow[];
      setPhoneAlertHistory(rows);

      const previewIds = Array.from(
        new Set(
          rows
            .map((row) => row.paper_order_preview_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (previewIds.length === 0) {
        setLinkedPreviewsById({});
        return;
      }

      const { data: previewData, error: previewError } = await supabase
        .from("paper_order_previews")
        .select(
          "id, preview_status, sandbox_preview_validation_status, sandbox_preview_human_review_decision, sandbox_preview_human_review_notes, sandbox_preview_human_reviewed_at, sandbox_preview_validation_checked_at"
        )
        .in("id", previewIds);

      if (previewError) {
        console.error("Failed to load linked preview audit info:", previewError);
        setLinkedPreviewsById({});
      } else {
        const previewsById: Record<string, LinkedPreviewAuditInfo> = {};
        for (const preview of (previewData ?? []) as LinkedPreviewAuditInfo[]) {
          previewsById[preview.id] = preview;
        }
        setLinkedPreviewsById(previewsById);
      }
    } finally {
      setIsLoadingPhoneHistory(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPhoneAlertHistory();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadPhoneAlertHistory();
    }, 60000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [loadPhoneAlertHistory, refreshKey]);

  return (
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

        <div className="flex flex-col items-start gap-1 md:items-end">
          <p className="text-xs text-slate-500">
            Logging only — no SMS, push, or orders yet
          </p>

          {lastChecked && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
              Last checked{" "}
              {lastChecked.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
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

                  {row.paper_order_preview_id &&
                    linkedPreviewsById[row.paper_order_preview_id] && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">
                          Linked Preview
                        </span>

                        {linkedPreviewsById[row.paper_order_preview_id]
                          .preview_status && (
                          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                            {
                              linkedPreviewsById[row.paper_order_preview_id]
                                .preview_status
                            }
                          </span>
                        )}

                        {linkedPreviewsById[row.paper_order_preview_id]
                          .sandbox_preview_validation_status && (
                          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
                            Validation{" "}
                            {
                              linkedPreviewsById[row.paper_order_preview_id]
                                .sandbox_preview_validation_status
                            }
                          </span>
                        )}

                        {linkedPreviewsById[row.paper_order_preview_id]
                          .sandbox_preview_human_review_decision && (
                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-bold ${getReviewDecisionBadgeClass(
                              linkedPreviewsById[row.paper_order_preview_id]
                                .sandbox_preview_human_review_decision
                            )}`}
                          >
                            Review{" "}
                            {
                              linkedPreviewsById[row.paper_order_preview_id]
                                .sandbox_preview_human_review_decision
                            }
                            {linkedPreviewsById[row.paper_order_preview_id]
                              .sandbox_preview_human_reviewed_at &&
                              ` · ${formatDateTime(
                                linkedPreviewsById[row.paper_order_preview_id]
                                  .sandbox_preview_human_reviewed_at as string
                              )}`}
                          </span>
                        )}
                      </div>
                    )}
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
  );
}