import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type HumanReviewDecision = "WATCH" | "HOLD" | "REJECT";

type HumanReviewRequestBody = {
  previewId?: string;
  id?: string;
  decision?: string;
  notes?: string;
};

type PaperOrderPreviewRow = {
  id: string;
  broker: string | null;
  symbol: string | null;
  contract_symbol: string | null;
  preview_status: string | null;
  sandbox_preview_validation_status: string | null;
  sandbox_preview_human_review_status: string | null;
  sandbox_preview_human_review_decision: string | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
};

const VALID_DECISIONS: HumanReviewDecision[] = ["WATCH", "HOLD", "REJECT"];

const SAFETY_LOCKS = {
  approved_for_sandbox_order: false,
  approved_for_live_order: false,
  submitted_to_broker: false,
};

function normalizeDecision(value: unknown): HumanReviewDecision | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  if (VALID_DECISIONS.includes(normalized as HumanReviewDecision)) {
    return normalized as HumanReviewDecision;
  }

  return null;
}

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed.slice(0, 1000);
}

function blockedResponse(reason: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      route: "/api/tradier/orders/preview/human-review",
      mode: "sandbox_preview_human_review_audit_only",
      message: reason,
      reason,
      safetyLocks: SAFETY_LOCKS,
      brokerCall: {
        tradierPreviewEndpointCalled: false,
        tradierOrderEndpointCalled: false,
        liveEndpointCalled: false,
      },
    },
    { status }
  );
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | HumanReviewRequestBody
      | null;

    const previewId = body?.previewId ?? body?.id;
    const decision = normalizeDecision(body?.decision);
    const notes = normalizeNotes(body?.notes);

    if (!previewId || typeof previewId !== "string") {
      return blockedResponse("Missing previewId.");
    }

    if (!decision) {
      return blockedResponse("Decision must be WATCH, HOLD, or REJECT.");
    }

    const { data: preview, error: fetchError } = await supabase
      .from("paper_order_previews")
      .select(
        [
          "id",
          "broker",
          "symbol",
          "contract_symbol",
          "preview_status",
          "sandbox_preview_validation_status",
          "sandbox_preview_human_review_status",
          "sandbox_preview_human_review_decision",
          "approved_for_sandbox_order",
          "approved_for_live_order",
          "submitted_to_broker",
        ].join(",")
      )
      .eq("id", previewId)
      .maybeSingle<PaperOrderPreviewRow>();

    if (fetchError) {
      console.error("Failed to fetch preview for human review:", fetchError);
      return blockedResponse(fetchError.message, 500);
    }

    if (!preview) {
      return blockedResponse("Preview row not found.", 404);
    }

    if (preview.approved_for_sandbox_order === true) {
      return blockedResponse("approved_for_sandbox_order must remain false.");
    }

    if (preview.approved_for_live_order === true) {
      return blockedResponse("approved_for_live_order must remain false.");
    }

    if (preview.submitted_to_broker === true) {
      return blockedResponse("submitted_to_broker must remain false.");
    }

    if (preview.sandbox_preview_validation_status !== "PASSED") {
      return blockedResponse(
        "Sandbox preview validation must be PASSED before human review decision."
      );
    }

    const reviewedAt = new Date().toISOString();

    const { data: updatedPreview, error: updateError } = await supabase
      .from("paper_order_previews")
      .update({
        sandbox_preview_human_review_status: "REVIEWED",
        sandbox_preview_human_review_decision: decision,
        sandbox_preview_human_review_notes: notes,
        sandbox_preview_human_reviewed_at: reviewedAt,

        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
      })
      .eq("id", preview.id)
      .eq("approved_for_sandbox_order", false)
      .eq("approved_for_live_order", false)
      .eq("submitted_to_broker", false)
      .select(
        [
          "id",
          "broker",
          "symbol",
          "contract_symbol",
          "preview_status",
          "sandbox_preview_validation_status",
          "sandbox_preview_human_review_status",
          "sandbox_preview_human_review_decision",
          "sandbox_preview_human_review_notes",
          "sandbox_preview_human_reviewed_at",
          "approved_for_sandbox_order",
          "approved_for_live_order",
          "submitted_to_broker",
        ].join(",")
      )
      .maybeSingle();

    if (updateError) {
      console.error("Failed to save human review decision:", updateError);
      return blockedResponse(updateError.message, 500);
    }

    if (!updatedPreview) {
      return blockedResponse(
        "Human review decision was not saved because safety locks did not match."
      );
    }

    return NextResponse.json(
      {
        success: true,
        route: "/api/tradier/orders/preview/human-review",
        mode: "sandbox_preview_human_review_audit_only",
        message: `Human review decision saved: ${decision}. No broker order was submitted.`,
        decision,
        reviewedAt,
        preview: updatedPreview,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error during human review decision save.";

    console.error("Human review route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: "/api/tradier/orders/preview/human-review",
        mode: "sandbox_preview_human_review_audit_only",
        message,
        reason: message,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
      },
      { status: 500 }
    );
  }
}