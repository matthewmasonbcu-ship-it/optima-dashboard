"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PaperOrderPreviewQualityAnalytics from "./PaperOrderPreviewQualityAnalytics";
import PaperOrderPreviewDetailModal, {
  type PaperOrderPreviewRow,
} from "./PaperOrderPreviewDetailModal";

type PaperOrderPreviewHistoryPanelProps = {
  refreshKey?: string;
};

type SandboxPreviewRunStatus = "PASSED" | "BLOCKED" | "ERROR";

type SandboxPreviewRunResult = {
  status: SandboxPreviewRunStatus;
  reason: string | null;
  message: string | null;
  safetyLocks: unknown;
  checkedAt: string;
};

type HumanReviewDecision = "WATCH" | "HOLD" | "REJECT";

type HumanReviewRouteResponse = {
  success?: boolean;
  message?: string;
  reason?: string;
  preview?: PaperOrderPreviewHistoryRow;
};

type PaperOrderPreviewHistoryRow = PaperOrderPreviewRow & {
  sandbox_preview_validation_status?: string | null;
  sandbox_preview_validation_message?: string | null;
  sandbox_preview_validation_reason?: string | null;
  sandbox_preview_validation_checked_at?: string | null;
  sandbox_preview_human_review_status?: string | null;
  sandbox_preview_human_review_decision?: HumanReviewDecision | string | null;
  sandbox_preview_human_review_notes?: string | null;
  sandbox_preview_human_reviewed_at?: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `$${value.toFixed(2)}`;
}

function getPreviewBadgeClass(status: string | null | undefined) {
  if (status === "PREVIEW_ONLY") {
    return "border-yellow-500/30 bg-yellow-500/[0.08] text-yellow-300";
  }

  if (status === "REVIEWED_ONLY") {
    return "border-purple-500/30 bg-purple-500/[0.08] text-purple-300";
  }

  if (status === "CANCELLED") {
    return "border-red-500/30 bg-red-500/[0.08] text-red-300";
  }

  return "border-slate-600/60 bg-slate-900/80 text-slate-300";
}

function getSandboxReadyBadgeClass(isReady: boolean | null | undefined) {
  if (isReady) {
    return "border-sky-500/30 bg-sky-500/[0.08] text-sky-300";
  }

  return "border-slate-700/70 bg-slate-900/80 text-slate-400";
}

function getValidationBadgeClass(status: string | null | undefined) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "PASSED") {
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300";
  }

  if (normalized === "BLOCKED") {
    return "border-orange-500/30 bg-orange-500/[0.08] text-orange-300";
  }

  if (normalized === "FAILED" || normalized === "ERROR") {
    return "border-red-500/30 bg-red-500/[0.08] text-red-300";
  }

  return "border-slate-700/70 bg-slate-900/80 text-slate-400";
}

function getHumanReviewBadgeClass(
  decision: string | null | undefined,
  status: string | null | undefined
) {
  const normalizedDecision = String(decision || "").trim().toUpperCase();
  const normalizedStatus = String(status || "").trim().toUpperCase();

  if (normalizedDecision === "WATCH") {
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300";
  }

  if (normalizedDecision === "HOLD") {
    return "border-yellow-500/30 bg-yellow-500/[0.08] text-yellow-300";
  }

  if (normalizedDecision === "REJECT") {
    return "border-red-500/30 bg-red-500/[0.08] text-red-300";
  }

  if (normalizedStatus === "REVIEWED") {
    return "border-sky-500/30 bg-sky-500/[0.08] text-sky-300";
  }

  return "border-slate-700/70 bg-slate-900/80 text-slate-400";
}

function getHumanReviewButtonClass(decision: HumanReviewDecision) {
  if (decision === "WATCH") {
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 hover:border-emerald-400/60 hover:text-emerald-200 hover:shadow-[0_0_14px_-6px_rgba(52,211,153,0.4)] focus-visible:outline-emerald-400 disabled:hover:border-emerald-500/30 disabled:hover:text-emerald-300";
  }

  if (decision === "HOLD") {
    return "border-yellow-500/30 bg-yellow-500/[0.08] text-yellow-300 hover:border-yellow-400/60 hover:text-yellow-200 hover:shadow-[0_0_14px_-6px_rgba(250,204,21,0.4)] focus-visible:outline-yellow-400 disabled:hover:border-yellow-500/30 disabled:hover:text-yellow-300";
  }

  return "border-red-500/30 bg-red-500/[0.08] text-red-300 hover:border-red-400/60 hover:text-red-200 hover:shadow-[0_0_14px_-6px_rgba(248,113,113,0.4)] focus-visible:outline-red-400 disabled:hover:border-red-500/30 disabled:hover:text-red-300";
}

function getFundedFilterStatus(safetyNotes: string | null | undefined) {
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
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300";
  }

  return "border-orange-500/30 bg-orange-500/[0.08] text-orange-300";
}

function getQualityBadgeClass(quality: string | null | undefined) {
  const q = String(quality || "").trim().toUpperCase();

  if (q === "A+" || q === "A") {
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 shadow-[0_0_10px_-4px_rgba(52,211,153,0.5)]";
  }

  if (q === "B") {
    return "border-sky-500/30 bg-sky-500/[0.08] text-sky-300 shadow-[0_0_10px_-4px_rgba(56,189,248,0.5)]";
  }

  if (q === "C") {
    return "border-orange-500/30 bg-orange-500/[0.08] text-orange-300 shadow-[0_0_10px_-4px_rgba(251,146,60,0.45)]";
  }

  if (q === "BLOCKED") {
    return "border-red-500/30 bg-red-500/[0.08] text-red-300 shadow-[0_0_10px_-4px_rgba(248,113,113,0.45)]";
  }

  return "border-slate-700/70 bg-slate-900/80 text-slate-400";
}

function getRiskGuardTextClass(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();

  if (s === "APPROVED") return "text-emerald-300";
  if (s === "CAUTION") return "text-yellow-300";
  if (s === "BLOCKED") return "text-red-300";

  return "text-slate-300";
}

function getFundedFilterNoteSuffix(safetyNotes: string | null | undefined) {
  const notes = String(safetyNotes || "");

  if (!notes.includes("Funded Account Safety Filter:")) {
    return "";
  }

  const fundedNote = notes.slice(notes.indexOf("Funded Account Safety Filter:"));

  return ` ${fundedNote}`;
}

function getSandboxPreviewResultClass(status: SandboxPreviewRunStatus) {
  if (status === "PASSED") {
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-200 shadow-[0_0_18px_-8px_rgba(52,211,153,0.4)]";
  }

  if (status === "BLOCKED") {
    return "border-orange-500/30 bg-orange-500/[0.08] text-orange-200 shadow-[0_0_18px_-8px_rgba(251,146,60,0.4)]";
  }

  return "border-red-500/30 bg-red-500/[0.08] text-red-200 shadow-[0_0_18px_-8px_rgba(248,113,113,0.4)]";
}

function getSandboxPreviewResultDotClass(status: SandboxPreviewRunStatus) {
  if (status === "PASSED") {
    return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]";
  }

  if (status === "BLOCKED") {
    return "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.9)]";
  }

  return "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.9)]";
}

function renderSafetyLocks(safetyLocks: unknown) {
  if (safetyLocks === null || safetyLocks === undefined) return null;

  if (Array.isArray(safetyLocks)) {
    if (safetyLocks.length === 0) return null;

    return (
      <ul className="mt-1 space-y-0.5">
        {safetyLocks.map((lock, index) => (
          <li key={index} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>
              {typeof lock === "string" ? lock : JSON.stringify(lock)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof safetyLocks === "object") {
    const entries = Object.entries(safetyLocks as Record<string, unknown>);

    if (entries.length === 0) return null;

    return (
      <ul className="mt-1 space-y-0.5">
        {entries.map(([key, value]) => (
          <li key={key} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>
              {key}:{" "}
              {typeof value === "string" ? value : JSON.stringify(value)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="mt-1">{String(safetyLocks)}</p>;
}

export default function PaperOrderPreviewHistoryPanel({
  refreshKey,
}: PaperOrderPreviewHistoryPanelProps) {
  const [paperOrderPreviewHistory, setPaperOrderPreviewHistory] =
    useState<PaperOrderPreviewHistoryRow[]>([]);

  const [selectedPreview, setSelectedPreview] =
    useState<PaperOrderPreviewHistoryRow | null>(null);

  const [isLoadingPaperPreviewHistory, setIsLoadingPaperPreviewHistory] =
    useState(false);

  const [paperPreviewHistoryError, setPaperPreviewHistoryError] =
    useState<string | null>(null);

  const [reviewingPreviewId, setReviewingPreviewId] = useState<string | null>(
    null
  );

  const [cancellingPreviewId, setCancellingPreviewId] = useState<string | null>(
    null
  );

  const [markingSandboxReadyId, setMarkingSandboxReadyId] =
    useState<string | null>(null);

  const [runningSandboxPreviewId, setRunningSandboxPreviewId] =
    useState<string | null>(null);

  const [sandboxPreviewResults, setSandboxPreviewResults] =
    useState<Record<string, SandboxPreviewRunResult>>({});

  const [humanReviewingPreviewId, setHumanReviewingPreviewId] =
    useState<string | null>(null);

  const [humanReviewNotesByPreviewId, setHumanReviewNotesByPreviewId] =
    useState<Record<string, string>>({});

  const loadPaperOrderPreviewHistory = useCallback(async () => {
    setIsLoadingPaperPreviewHistory(true);
    setPaperPreviewHistoryError(null);

    const { data, error } = await supabase
      .from("paper_order_previews")
      .select(
        "id, created_at, symbol, trade_lane, setup_name, contract_symbol, strike, expiration, option_type, bid, ask, mid, estimated_limit_price, quantity, estimated_order_cost, max_risk_dollars, contract_quality, risk_guard_status, preview_status, broker, order_side, order_type, time_in_force, approved_for_sandbox_order, approved_for_live_order, submitted_to_broker, ready_for_sandbox_preview, ready_for_sandbox_preview_at, sandbox_preview_locked_reason, safety_notes, sandbox_preview_validation_status, sandbox_preview_validation_message, sandbox_preview_validation_reason, sandbox_preview_validation_checked_at, sandbox_preview_human_review_status, sandbox_preview_human_review_decision, sandbox_preview_human_review_notes, sandbox_preview_human_reviewed_at"
      )
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to load paper order preview history:", error);
      const detail = [error.code && `[${error.code}]`, error.message].filter(Boolean).join(" ");
      setPaperPreviewHistoryError(`Could not load paper order preview history. ${detail}`);
      setPaperOrderPreviewHistory([]);
    } else {
      setPaperOrderPreviewHistory(
        (data ?? []) as PaperOrderPreviewHistoryRow[]
      );
    }

    setIsLoadingPaperPreviewHistory(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPaperOrderPreviewHistory();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPaperOrderPreviewHistory, refreshKey]);

  async function runSandboxPreview(previewId: string) {
    setRunningSandboxPreviewId(previewId);

    const checkedAt = new Date().toISOString();

    try {
      const response = await fetch("/api/tradier/orders/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_order_preview_id: previewId }),
      });

      const data: unknown = await response.json();

      const parsed =
        data && typeof data === "object"
          ? (data as {
              status?: unknown;
              reason?: unknown;
              message?: unknown;
              safetyLocks?: unknown;
            })
          : {};

      const rawStatus = String(parsed.status ?? "").trim().toUpperCase();

      const status: SandboxPreviewRunStatus =
        rawStatus === "PASSED"
          ? "PASSED"
          : rawStatus === "BLOCKED"
            ? "BLOCKED"
            : "ERROR";

      setSandboxPreviewResults((currentResults) => ({
        ...currentResults,
        [previewId]: {
          status,
          reason:
            typeof parsed.reason === "string" && parsed.reason.length > 0
              ? parsed.reason
              : null,
          message:
            typeof parsed.message === "string" && parsed.message.length > 0
              ? parsed.message
              : null,
          safetyLocks: parsed.safetyLocks ?? null,
          checkedAt,
        },
      }));
    } catch (error) {
      console.error("Failed to run sandbox preview validation:", error);

      setSandboxPreviewResults((currentResults) => ({
        ...currentResults,
        [previewId]: {
          status: "ERROR",
          reason: null,
          message:
            "Could not reach the sandbox preview validation route. No order was submitted.",
          safetyLocks: null,
          checkedAt,
        },
      }));
    }

    await loadPaperOrderPreviewHistory();
    setRunningSandboxPreviewId(null);
  }

  async function saveHumanReviewDecision(
    previewId: string,
    decision: HumanReviewDecision
  ) {
    const targetPreview = paperOrderPreviewHistory.find(
      (row) => row.id === previewId
    );

    if (!targetPreview) {
      setPaperPreviewHistoryError("Could not find this preview.");
      return;
    }

    if (targetPreview.sandbox_preview_validation_status !== "PASSED") {
      setPaperPreviewHistoryError(
        "Sandbox preview validation must be PASSED before saving a human review decision."
      );
      return;
    }

    if (
      targetPreview.submitted_to_broker ||
      targetPreview.approved_for_sandbox_order ||
      targetPreview.approved_for_live_order
    ) {
      setPaperPreviewHistoryError(
        "Safety lock blocked human review because this preview is not fully locked."
      );
      return;
    }

    setHumanReviewingPreviewId(previewId);
    setPaperPreviewHistoryError(null);

    try {
      const response = await fetch(
        "/api/tradier/orders/preview/human-review",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewId,
            decision,
            notes:
              humanReviewNotesByPreviewId[previewId] ??
              targetPreview.sandbox_preview_human_review_notes ??
              "",
          }),
        }
      );

      const data: HumanReviewRouteResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.reason || "Could not save human review decision."
        );
      }

      const fallbackReviewedAt = new Date().toISOString();
      const updatedPreview: PaperOrderPreviewHistoryRow = {
        ...targetPreview,
        ...(data.preview ?? {}),
        sandbox_preview_human_review_status:
          data.preview?.sandbox_preview_human_review_status ?? "REVIEWED",
        sandbox_preview_human_review_decision:
          data.preview?.sandbox_preview_human_review_decision ?? decision,
        sandbox_preview_human_review_notes:
          data.preview?.sandbox_preview_human_review_notes ??
          humanReviewNotesByPreviewId[previewId] ??
          targetPreview.sandbox_preview_human_review_notes ??
          null,
        sandbox_preview_human_reviewed_at:
          data.preview?.sandbox_preview_human_reviewed_at ?? fallbackReviewedAt,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
      };

      setPaperOrderPreviewHistory((currentRows) =>
        currentRows.map((row) => (row.id === previewId ? updatedPreview : row))
      );

      setSelectedPreview((currentPreview) =>
        currentPreview?.id === previewId ? updatedPreview : currentPreview
      );

      setHumanReviewNotesByPreviewId((currentNotes) => {
        const nextNotes = { ...currentNotes };
        delete nextNotes[previewId];
        return nextNotes;
      });

      await loadPaperOrderPreviewHistory();
    } catch (error) {
      console.error("Failed to save human review decision:", error);
      setPaperPreviewHistoryError(
        error instanceof Error
          ? error.message
          : "Could not save human review decision."
      );
    }

    setHumanReviewingPreviewId(null);
  }

  async function markPaperPreviewReviewed(previewId: string) {
    setReviewingPreviewId(previewId);
    setPaperPreviewHistoryError(null);

    const targetPreview = paperOrderPreviewHistory.find(
      (row) => row.id === previewId
    );

    const safetyNotes = `Preview reviewed by user. No Tradier sandbox order submitted. No live order submitted.${getFundedFilterNoteSuffix(
      targetPreview?.safety_notes
    )}`;

    const { error } = await supabase
      .from("paper_order_previews")
      .update({
        preview_status: "REVIEWED_ONLY",
        updated_at: new Date().toISOString(),
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        safety_notes: safetyNotes,
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
              safety_notes: safetyNotes,
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
            safety_notes: safetyNotes,
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
    const safetyNotes = `Ready for future Tradier sandbox preview route only. No broker order submitted. No live order submitted.${getFundedFilterNoteSuffix(
      targetPreview.safety_notes
    )}`;

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

    const targetPreview = paperOrderPreviewHistory.find(
      (row) => row.id === previewId
    );

    const safetyNotes = `Preview cancelled by user. No Tradier sandbox order submitted. No live order submitted.${getFundedFilterNoteSuffix(
      targetPreview?.safety_notes
    )}`;
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
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-black/40 to-slate-950/60 p-4 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"
        />

        <div className="relative mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-yellow-400/70">
              Paper Order Layer
            </p>

            <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
              Recent Paper Order Previews
            </h3>
          </div>

          <p className="inline-flex items-center gap-1.5 self-start rounded-full border border-yellow-500/20 bg-yellow-500/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-yellow-300/90 md:self-auto">
            <span className="h-1 w-1 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.9)]" />
            Preview only — no Tradier order submitted
          </p>
        </div>

        <div className="relative mb-4">
          <PaperOrderPreviewQualityAnalytics
            previews={paperOrderPreviewHistory}
          />
        </div>

        {isLoadingPaperPreviewHistory ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
            Loading paper order previews...
          </div>
        ) : paperPreviewHistoryError ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.08] p-4 text-sm text-red-300 shadow-[0_0_20px_-8px_rgba(248,113,113,0.35)]">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/20 font-mono text-[9px]">
              !
            </span>
            {paperPreviewHistoryError}
          </div>
        ) : paperOrderPreviewHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/50 p-6 text-center text-sm text-slate-500 transition-colors duration-300 hover:border-slate-600/70">
            No paper order previews created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {paperOrderPreviewHistory.map((row) => {
              const fundedFilterStatus = getFundedFilterStatus(
                row.safety_notes
              );

              const canMarkReadyForSandboxPreview =
                row.preview_status === "REVIEWED_ONLY" &&
                !row.ready_for_sandbox_preview &&
                !row.submitted_to_broker &&
                !row.approved_for_sandbox_order &&
                !row.approved_for_live_order;

              const canRunSandboxPreview =
                row.preview_status === "REVIEWED_ONLY" &&
                row.ready_for_sandbox_preview === true &&
                !row.approved_for_sandbox_order &&
                !row.approved_for_live_order &&
                !row.submitted_to_broker;

              const sandboxPreviewResult = sandboxPreviewResults[row.id];
              const savedValidationStatus =
                row.sandbox_preview_validation_status ??
                sandboxPreviewResult?.status ??
                null;
              const humanReviewDecision =
                row.sandbox_preview_human_review_decision ?? null;
              const humanReviewStatus =
                row.sandbox_preview_human_review_status ??
                "PENDING_REVIEW";
              const humanReviewNotesValue =
                humanReviewNotesByPreviewId[row.id] ??
                row.sandbox_preview_human_review_notes ??
                "";
              const isHumanReviewing = humanReviewingPreviewId === row.id;
              const canSaveHumanReviewDecision =
                savedValidationStatus === "PASSED" &&
                row.preview_status !== "CANCELLED" &&
                !row.approved_for_sandbox_order &&
                !row.approved_for_live_order &&
                !row.submitted_to_broker &&
                !isHumanReviewing;

              return (
                <div
                  key={row.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 transition-all duration-300 hover:border-slate-700 hover:bg-slate-950/90 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.15)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-mono text-base font-bold tracking-tight text-white">
                          {row.symbol}
                        </p>

                        {row.option_type && (
                          <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            {row.option_type}
                          </span>
                        )}

                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getPreviewBadgeClass(
                            row.preview_status
                          )}`}
                        >
                          {row.preview_status}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getSandboxReadyBadgeClass(
                            row.ready_for_sandbox_preview
                          )}`}
                        >
                          {row.ready_for_sandbox_preview
                            ? "READY FOR SANDBOX PREVIEW"
                            : "SANDBOX PREVIEW LOCKED"}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getValidationBadgeClass(
                            savedValidationStatus
                          )}`}
                        >
                          Validation {savedValidationStatus || "NOT RUN"}
                        </span>

                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getHumanReviewBadgeClass(
                            humanReviewDecision,
                            humanReviewStatus
                          )}`}
                        >
                          Review {humanReviewDecision || humanReviewStatus}
                        </span>

                        {row.contract_quality && (
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getQualityBadgeClass(
                              row.contract_quality
                            )}`}
                          >
                            Grade {row.contract_quality}
                          </span>
                        )}

                        {fundedFilterStatus && (
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getFundedFilterBadgeClass(
                              fundedFilterStatus
                            )}`}
                          >
                            Funded Filter {fundedFilterStatus}
                          </span>
                        )}

                        <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          {row.broker}
                        </span>
                      </div>

                      <p className="mt-2 break-all font-mono text-sm text-slate-400">
                        {row.contract_symbol || "No contract symbol saved"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-slate-500">
                        {row.strike !== null && row.strike !== undefined && (
                          <span>
                            Strike:{" "}
                            <span className="text-slate-300">{row.strike}</span>
                          </span>
                        )}

                        {row.expiration && (
                          <span>
                            Exp:{" "}
                            <span className="text-slate-300">
                              {row.expiration}
                            </span>
                          </span>
                        )}

                        {row.risk_guard_status && (
                          <span>
                            Risk Guard:{" "}
                            <span
                              className={getRiskGuardTextClass(
                                row.risk_guard_status
                              )}
                            >
                              {row.risk_guard_status}
                            </span>
                          </span>
                        )}

                        <span>
                          Side:{" "}
                          <span className="text-slate-300">
                            {row.order_side}
                          </span>
                        </span>

                        <span>
                          Type:{" "}
                          <span className="text-slate-300">
                            {row.order_type}
                          </span>
                        </span>

                        <span>
                          TIF:{" "}
                          <span className="text-slate-300">
                            {row.time_in_force}
                          </span>
                        </span>

                        <span>
                          Qty:{" "}
                          <span className="text-slate-300">{row.quantity}</span>
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-800 bg-black/30 p-2 transition-colors duration-300 group-hover:border-slate-700/80">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                            Limit Price
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
                            {formatMoney(row.estimated_limit_price)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-black/30 p-2 transition-colors duration-300 group-hover:border-slate-700/80">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                            Est. Cost
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
                            {formatMoney(row.estimated_order_cost)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-black/30 p-2 transition-colors duration-300 group-hover:border-slate-700/80">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                            Max Risk
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-yellow-300">
                            {formatMoney(row.max_risk_dollars)}
                          </p>
                        </div>
                      </div>

                      {row.sandbox_preview_validation_status && (
                        <div
                          className={`mt-3 rounded-xl border p-3 text-xs ${getValidationBadgeClass(
                            row.sandbox_preview_validation_status
                          )}`}
                        >
                          <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                            Saved Sandbox Preview Validation: {" "}
                            {row.sandbox_preview_validation_status}
                          </p>

                          {row.sandbox_preview_validation_message && (
                            <p className="mt-1 leading-relaxed opacity-90">
                              {row.sandbox_preview_validation_message}
                            </p>
                          )}

                          {row.sandbox_preview_validation_reason && (
                            <p className="mt-1 leading-relaxed opacity-90">
                              Reason: {row.sandbox_preview_validation_reason}
                            </p>
                          )}

                          {row.sandbox_preview_validation_checked_at && (
                            <p className="mt-2 font-mono text-[10px] opacity-70">
                              Saved at {" "}
                              {formatDateTime(
                                row.sandbox_preview_validation_checked_at
                              )} {" "}
                              — no broker order submitted.
                            </p>
                          )}
                        </div>
                      )}

                      {row.ready_for_sandbox_preview && (
                        <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] p-3 text-xs text-sky-200 shadow-[0_0_18px_-8px_rgba(56,189,248,0.35)]">
                          <p className="flex items-center gap-1.5 font-bold">
                            <span className="h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.9)]" />
                            Sandbox preview ready lock
                          </p>
                          <p className="mt-1 leading-relaxed text-sky-300/80">
                            {row.sandbox_preview_locked_reason ||
                              "Ready for future sandbox preview. No broker order submitted."}
                          </p>
                          {row.ready_for_sandbox_preview_at && (
                            <p className="mt-1 font-mono text-sky-300/70">
                              Marked ready:{" "}
                              {formatDateTime(
                                row.ready_for_sandbox_preview_at
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {sandboxPreviewResult && (
                        <div
                          className={`mt-3 rounded-xl border p-3 text-xs ${getSandboxPreviewResultClass(
                            sandboxPreviewResult.status
                          )}`}
                        >
                          <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${getSandboxPreviewResultDotClass(
                                sandboxPreviewResult.status
                              )}`}
                            />
                            Sandbox Preview Validation:{" "}
                            {sandboxPreviewResult.status}
                          </p>

                          {sandboxPreviewResult.reason && (
                            <p className="mt-1 leading-relaxed opacity-90">
                              Reason: {sandboxPreviewResult.reason}
                            </p>
                          )}

                          {sandboxPreviewResult.message && (
                            <p className="mt-1 leading-relaxed opacity-90">
                              {sandboxPreviewResult.message}
                            </p>
                          )}

                          {renderSafetyLocks(
                            sandboxPreviewResult.safetyLocks
                          )}

                          <p className="mt-2 font-mono text-[10px] opacity-70">
                            Validation-only check at{" "}
                            {formatDateTime(sandboxPreviewResult.checkedAt)} —
                            no broker order submitted.
                          </p>
                        </div>
                      )}


                      {(row.sandbox_preview_human_review_decision ||
                        row.sandbox_preview_human_review_status) && (
                        <div
                          className={`mt-3 rounded-xl border p-3 text-xs ${getHumanReviewBadgeClass(
                            row.sandbox_preview_human_review_decision,
                            row.sandbox_preview_human_review_status
                          )}`}
                        >
                          <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                            Human Review: {" "}
                            {row.sandbox_preview_human_review_decision ||
                              row.sandbox_preview_human_review_status}
                          </p>

                          {row.sandbox_preview_human_review_notes && (
                            <p className="mt-1 leading-relaxed opacity-90">
                              Notes: {row.sandbox_preview_human_review_notes}
                            </p>
                          )}

                          {row.sandbox_preview_human_reviewed_at && (
                            <p className="mt-2 font-mono text-[10px] opacity-70">
                              Reviewed at {" "}
                              {formatDateTime(
                                row.sandbox_preview_human_reviewed_at
                              )} {" "}
                              — safety locks remained false.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 border-t border-slate-800/80 pt-3 text-left lg:w-56 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 lg:text-right">
                      <p className="font-mono text-xs text-slate-500">
                        {formatDateTime(row.created_at)}
                      </p>

                      <div className="mt-2 space-y-1 font-mono text-[11px] font-bold">
                        <p className="text-slate-500">
                          Sandbox Approved:{" "}
                          <span
                            className={
                              row.approved_for_sandbox_order
                                ? "text-yellow-300"
                                : "text-slate-300"
                            }
                          >
                            {row.approved_for_sandbox_order ? "YES" : "NO"}
                          </span>
                        </p>

                        <p className="text-slate-500">
                          Live Approved:{" "}
                          <span
                            className={
                              row.approved_for_live_order
                                ? "text-red-300"
                                : "text-slate-300"
                            }
                          >
                            {row.approved_for_live_order ? "YES" : "NO"}
                          </span>
                        </p>

                        <p className="text-slate-500">
                          Broker Submitted:{" "}
                          <span
                            className={
                              row.submitted_to_broker
                                ? "text-red-300"
                                : "text-slate-300"
                            }
                          >
                            {row.submitted_to_broker ? "YES" : "NO"}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <textarea
                          value={humanReviewNotesValue}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setHumanReviewNotesByPreviewId((currentNotes) => ({
                              ...currentNotes,
                              [row.id]: nextValue,
                            }));
                          }}
                          disabled={!canSaveHumanReviewDecision}
                          placeholder="Optional review notes..."
                          className="min-h-16 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-left font-mono text-[11px] text-slate-200 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-cyan-500/60 focus:shadow-[0_0_14px_-6px_rgba(34,211,238,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          {(["WATCH", "HOLD", "REJECT"] as HumanReviewDecision[]).map(
                            (decision) => (
                              <button
                                key={decision}
                                type="button"
                                onClick={() =>
                                  saveHumanReviewDecision(row.id, decision)
                                }
                                disabled={!canSaveHumanReviewDecision}
                                className={`rounded-xl border px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100 ${getHumanReviewButtonClass(
                                  decision
                                )}`}
                              >
                                {isHumanReviewing ? "Saving" : decision}
                              </button>
                            )
                          )}
                        </div>

                        <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                          Human review only. This saves WATCH / HOLD / REJECT
                          and keeps sandbox/live/broker submission locked.
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap justify-start gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedPreview(row)}
                          className="rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300 transition-all duration-300 hover:border-cyan-500/40 hover:text-cyan-200 hover:shadow-[0_0_14px_-6px_rgba(34,211,238,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.97]"
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
                            humanReviewingPreviewId === row.id ||
                            row.preview_status === "REVIEWED_ONLY" ||
                            row.preview_status === "CANCELLED" ||
                            row.submitted_to_broker
                          }
                          className="rounded-xl border border-purple-500/30 bg-purple-500/[0.08] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-purple-300 transition-all duration-300 hover:border-purple-400/60 hover:text-purple-200 hover:shadow-[0_0_14px_-6px_rgba(192,132,252,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-purple-500/30 disabled:hover:text-purple-300 disabled:hover:shadow-none disabled:active:scale-100"
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
                            markingSandboxReadyId === row.id ||
                            humanReviewingPreviewId === row.id
                          }
                          className="rounded-xl border border-sky-500/30 bg-sky-500/[0.08] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-sky-300 transition-all duration-300 hover:border-sky-400/60 hover:text-sky-200 hover:shadow-[0_0_14px_-6px_rgba(56,189,248,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sky-500/30 disabled:hover:text-sky-300 disabled:hover:shadow-none disabled:active:scale-100"
                        >
                          {markingSandboxReadyId === row.id
                            ? "Locking..."
                            : row.ready_for_sandbox_preview
                            ? "Sandbox Ready"
                            : "Mark Sandbox Ready"}
                        </button>

                        <button
                          type="button"
                          onClick={() => runSandboxPreview(row.id)}
                          disabled={
                            !canRunSandboxPreview ||
                            runningSandboxPreviewId === row.id ||
                            humanReviewingPreviewId === row.id
                          }
                          className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.08] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300 transition-all duration-300 hover:border-cyan-400/60 hover:text-cyan-200 hover:shadow-[0_0_14px_-6px_rgba(34,211,238,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-cyan-500/30 disabled:hover:text-cyan-300 disabled:hover:shadow-none disabled:active:scale-100"
                        >
                          {runningSandboxPreviewId === row.id
                            ? "Running..."
                            : "Run Sandbox Preview"}
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelPaperPreview(row.id)}
                          disabled={
                            reviewingPreviewId === row.id ||
                            cancellingPreviewId === row.id ||
                            markingSandboxReadyId === row.id ||
                            humanReviewingPreviewId === row.id ||
                            row.preview_status === "CANCELLED" ||
                            row.submitted_to_broker
                          }
                          className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-red-300 transition-all duration-300 hover:border-red-400/60 hover:text-red-200 hover:shadow-[0_0_14px_-6px_rgba(248,113,113,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-red-500/30 disabled:hover:text-red-300 disabled:hover:shadow-none disabled:active:scale-100"
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
        <PaperOrderPreviewDetailModal
          preview={selectedPreview}
          onClose={() => setSelectedPreview(null)}
        />
      )}
    </>
  );
}