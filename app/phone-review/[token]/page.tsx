import { createHash } from "crypto";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import PhoneReviewActions from "./PhoneReviewActions";

export const dynamic = "force-dynamic";

type PhoneReviewTokenRow = {
  id: string;
  paper_order_preview_id: string;
  expires_at: string;
  used_at: string | null;
};

type PaperOrderPreviewRow = {
  id: string;
  symbol: string | null;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  max_risk_dollars: number | null;
  sandbox_preview_human_review_decision: string | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
  safety_notes: string | null;
};

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 font-mono text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700/70 bg-slate-900/80 p-5">
        <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">
          OPTIMA-SYS · Phone Review
        </p>
        {children}
      </div>
    </main>
  );
}

export default async function PhoneReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: tokenRow } = await supabase
    .from("phone_review_tokens")
    .select("id, paper_order_preview_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<PhoneReviewTokenRow>();

  if (!tokenRow) {
    return (
      <PageShell>
        <p className="text-red-400">This review link is invalid.</p>
      </PageShell>
    );
  }

  if (tokenRow.used_at) {
    return (
      <PageShell>
        <p className="text-yellow-400">This review link has already been used.</p>
      </PageShell>
    );
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return (
      <PageShell>
        <p className="text-yellow-400">This review link has expired.</p>
      </PageShell>
    );
  }

  const { data: preview } = await supabase
    .from("paper_order_previews")
    .select(
      [
        "id",
        "symbol",
        "contract_symbol",
        "strike",
        "expiration",
        "option_type",
        "contract_quality",
        "risk_guard_status",
        "max_risk_dollars",
        "sandbox_preview_human_review_decision",
        "approved_for_sandbox_order",
        "approved_for_live_order",
        "submitted_to_broker",
        "safety_notes",
      ].join(",")
    )
    .eq("id", tokenRow.paper_order_preview_id)
    .maybeSingle<PaperOrderPreviewRow>();

  if (!preview) {
    return (
      <PageShell>
        <p className="text-red-400">Preview not found.</p>
      </PageShell>
    );
  }

  if (
    preview.approved_for_sandbox_order ||
    preview.approved_for_live_order ||
    preview.submitted_to_broker
  ) {
    return (
      <PageShell>
        <p className="text-red-400">
          This preview is no longer eligible for phone review.
        </p>
      </PageShell>
    );
  }

  if (
    preview.sandbox_preview_human_review_decision === "PHONE_APPROVED" ||
    preview.sandbox_preview_human_review_decision === "REJECT"
  ) {
    return (
      <PageShell>
        <p className="text-slate-300">
          A decision has already been recorded for this setup:{" "}
          <span className="font-bold">
            {preview.sandbox_preview_human_review_decision}
          </span>
        </p>
      </PageShell>
    );
  }

  const maxRisk =
    typeof preview.max_risk_dollars === "number"
      ? `$${preview.max_risk_dollars.toFixed(2)}`
      : "N/A";

  return (
    <PageShell>
      <h1 className="text-lg font-bold text-cyan-300 mb-1">
        {preview.symbol ?? "UNKNOWN"}
      </h1>
      <p className="text-sm text-slate-400 mb-4">
        {preview.contract_symbol ?? "No contract"}
      </p>

      {preview.safety_notes?.includes("AUTO_SCAN_CRON") && (
        <p className="inline-block mb-3 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
          AUTO SCAN · MACHINE QUEUED
        </p>
      )}

      <dl className="space-y-1 text-sm mb-5">
        <div className="flex justify-between">
          <dt className="text-slate-500">Strike</dt>
          <dd>{preview.strike ?? "N/A"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Expiration</dt>
          <dd>{preview.expiration ?? "N/A"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Type</dt>
          <dd>{preview.option_type ?? "N/A"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Grade</dt>
          <dd>{preview.contract_quality ?? "N/A"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Risk Guard</dt>
          <dd>{preview.risk_guard_status ?? "N/A"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Max Risk</dt>
          <dd>{maxRisk}</dd>
        </div>
      </dl>

      <PhoneReviewActions token={token} />

      <p className="mt-4 text-[11px] text-slate-500">
        This decision does not submit any order. Sandbox/live submission stays
        locked.
      </p>
    </PageShell>
  );
}
