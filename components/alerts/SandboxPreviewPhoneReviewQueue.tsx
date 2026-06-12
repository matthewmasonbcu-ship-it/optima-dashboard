"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PaperOrderPreviewRow } from "./PaperOrderPreviewDetailModal";

type SandboxPreviewPhoneReviewQueueProps = {
  refreshKey?: string | number | boolean | null;
};

type HumanDecision = "WATCH" | "HOLD" | "REJECT";

type HumanReviewResponse = {
  success?: boolean;
  message?: string;
  reason?: string;
};

type PhoneReviewAlertResponse = {
  success?: boolean;
  message?: string;
  reason?: string;
};

function readValue(row: PaperOrderPreviewRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }

  return null;
}

function readString(
  row: PaperOrderPreviewRow,
  keys: string[],
  fallback = "—"
): string {
  const value = readValue(row, keys);

  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  return fallback;
}

function readBoolean(row: PaperOrderPreviewRow, keys: string[]): boolean | null {
  const value = readValue(row, keys);

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return null;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getTimeForSort(row: PaperOrderPreviewRow): number {
  const reviewedAt = readValue(row, ["sandbox_preview_human_reviewed_at"]);
  const checkedAt = readValue(row, ["sandbox_preview_validation_checked_at"]);
  const createdAt = readValue(row, ["created_at"]);

  for (const value of [reviewedAt, checkedAt, createdAt]) {
    if (typeof value === "string") {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) return time;
    }
  }

  return 0;
}

function isPhoneReadyWatchRow(row: PaperOrderPreviewRow): boolean {
  const validationStatus = readString(row, [
    "sandbox_preview_validation_status",
  ]);
  const decision = readString(row, ["sandbox_preview_human_review_decision"]);
  const approvedForSandboxOrder = readBoolean(row, [
    "approved_for_sandbox_order",
  ]);
  const approvedForLiveOrder = readBoolean(row, ["approved_for_live_order"]);
  const submittedToBroker = readBoolean(row, ["submitted_to_broker"]);

  return (
    validationStatus === "PASSED" &&
    decision === "WATCH" &&
    approvedForSandboxOrder === false &&
    approvedForLiveOrder === false &&
    submittedToBroker === false
  );
}

export default function SandboxPreviewPhoneReviewQueue({
  refreshKey,
}: SandboxPreviewPhoneReviewQueueProps) {
  const [rows, setRows] = useState<PaperOrderPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingPreviewId, setSavingPreviewId] = useState<string | null>(null);
  const [sendingPhoneAlertPreviewId, setSendingPhoneAlertPreviewId] =
    useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const { data, error } = await supabase
        .from("paper_order_previews")
        .select("*")
        .eq("sandbox_preview_validation_status", "PASSED")
        .eq("sandbox_preview_human_review_decision", "WATCH")
        .eq("approved_for_sandbox_order", false)
        .eq("approved_for_live_order", false)
        .eq("submitted_to_broker", false)
        .order("sandbox_preview_human_reviewed_at", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(25);

      if (error) {
        throw new Error(error.message);
      }

      const safeRows = Array.isArray(data)
        ? (data as PaperOrderPreviewRow[]).filter(isPhoneReadyWatchRow)
        : [];

      setRows(safeRows);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not load phone review queue.";
      setActionError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRows, refreshKey]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => getTimeForSort(b) - getTimeForSort(a));
  }, [rows]);

  const saveDecision = useCallback(
    async (
      row: PaperOrderPreviewRow,
      decision: HumanDecision,
      notes?: string
    ) => {
      const previewId = readString(row, ["id", "preview_id"], "");

      if (!previewId) {
        setActionError("Missing preview id.");
        return;
      }

      setSavingPreviewId(previewId);
      setActionStatus(null);
      setActionError(null);

      try {
        const response = await fetch(
          "/api/tradier/orders/preview/human-review",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              previewId,
              decision,
              notes:
                notes ??
                `Phone review queue decision changed to ${decision}.`,
            }),
          }
        );

        const data = (await response.json().catch(() => null)) as
          | HumanReviewResponse
          | null;

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message ||
              data?.reason ||
              "Could not save phone review decision."
          );
        }

        setActionStatus(
          `Saved ${decision}. Safety locks remained false. No broker order submitted.`
        );

        await loadRows();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not save phone review decision.";
        setActionError(message);
      } finally {
        setSavingPreviewId(null);
      }
    },
    [loadRows]
  );

  const sendPhoneReviewAlert = useCallback(
    async (row: PaperOrderPreviewRow) => {
      const previewId = readString(row, ["id", "preview_id"], "");

      if (!previewId) {
        setActionError("Missing preview id.");
        return;
      }

      setSendingPhoneAlertPreviewId(previewId);
      setActionStatus(null);
      setActionError(null);

      try {
        const response = await fetch("/api/alerts/phone-review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            previewId,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | PhoneReviewAlertResponse
          | null;

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message ||
              data?.reason ||
              "Could not log phone review alert."
          );
        }

        setActionStatus(
          data?.message ||
            "Phone review alert logged. Dashboard simulation only — no SMS, push, broker order, or live order."
        );

        await loadRows();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not log phone review alert.";
        setActionError(message);
      } finally {
        setSendingPhoneAlertPreviewId(null);
      }
    },
    [loadRows]
  );

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-cyan-500/25 bg-cyan-500/[0.045] shadow-[0_0_34px_-18px_rgba(34,211,238,0.7)]">
      <div className="flex flex-col gap-3 border-b border-cyan-500/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            Phone Review Queue
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-100">
            Work-Ready WATCH Setups
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
            Only shows sandbox previews that passed validation, were marked
            WATCH, and still have every broker/live submission lock set to
            false.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            Phone Safe
          </span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
            Broker Submit Locked
          </span>
          <button
            type="button"
            onClick={() => void loadRows()}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {actionStatus ? (
        <div className="mx-5 mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
          {actionStatus}
        </div>
      ) : null}

      {actionError ? (
        <div className="mx-5 mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {actionError}
        </div>
      ) : null}

      <div className="p-5">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
            Loading phone review queue...
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
            <p className="font-bold text-slate-200">
              No phone-ready WATCH setups right now.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Mark a PASSED sandbox preview as WATCH, then it will appear here.
              HOLD and REJECT rows stay out of this queue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRows.map((row, index) => {
              const id = readString(row, ["id", "preview_id"], "");
              const symbol = readString(row, ["symbol", "underlying_symbol"]);
              const contractSymbol = readString(row, [
                "contract_symbol",
                "option_symbol",
                "selected_contract_symbol",
              ]);
              const validationCheckedAt = readValue(row, [
                "sandbox_preview_validation_checked_at",
              ]);
              const reviewedAt = readValue(row, [
                "sandbox_preview_human_reviewed_at",
              ]);
              const notes = readString(
                row,
                ["sandbox_preview_human_review_notes"],
                "No notes saved."
              );
              const maxRisk = readString(row, ["max_risk_dollars"], "—");
              const contractQuality = readString(
                row,
                ["contract_quality"],
                "—"
              );
              const riskGuardStatus = readString(
                row,
                ["risk_guard_status"],
                "—"
              );
              const isSaving = savingPreviewId === id;
              const isSendingPhoneAlert = sendingPhoneAlertPreviewId === id;
              const isBusy = isSaving || isSendingPhoneAlert;

              return (
                <article
                  key={id || `${symbol}-${contractSymbol}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-500/35"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-100">
                          {symbol}
                        </span>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                          VALIDATION PASSED
                        </span>
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                          WATCH
                        </span>
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
                          SUBMIT LOCKED
                        </span>
                      </div>

                      <div className="mt-2 break-words font-mono text-xs text-slate-400">
                        {contractSymbol}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Risk Guard
                          </div>
                          <div className="mt-1 font-bold text-slate-200">
                            {riskGuardStatus}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Contract Grade
                          </div>
                          <div className="mt-1 font-bold text-slate-200">
                            {contractQuality}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Max Risk
                          </div>
                          <div className="mt-1 font-bold text-slate-200">
                            {maxRisk}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                          <span className="text-slate-500">
                            Validation Checked:{" "}
                          </span>
                          <span className="text-slate-300">
                            {formatDate(validationCheckedAt)}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                          <span className="text-slate-500">
                            Human Reviewed:{" "}
                          </span>
                          <span className="text-slate-300">
                            {formatDate(reviewedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-800 bg-black/20 p-3 text-sm">
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          Review Notes
                        </div>
                        <p className="mt-1 text-slate-300">{notes}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void sendPhoneReviewAlert(row)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSendingPhoneAlert
                          ? "Logging Alert..."
                          : "Send Phone Review Alert"}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void saveDecision(
                            row,
                            "HOLD",
                            "Moved from phone WATCH queue to HOLD."
                          )
                        }
                        className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-200 transition hover:border-yellow-400 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Move to HOLD"}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void saveDecision(
                            row,
                            "REJECT",
                            "Rejected from phone WATCH queue."
                          )
                        }
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}