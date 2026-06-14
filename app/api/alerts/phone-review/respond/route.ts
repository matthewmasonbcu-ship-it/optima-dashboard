import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ROUTE = "/api/alerts/phone-review/respond";

type RespondAction = "approve" | "reject";

type RespondRequestBody = {
  token?: string;
  action?: string;
};

type PhoneReviewTokenRow = {
  id: string;
  paper_order_preview_id: string;
  expires_at: string;
  used_at: string | null;
};

type PaperOrderPreviewRow = {
  id: string;
  sandbox_preview_validation_status: string | null;
  sandbox_preview_human_review_decision: string | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
};

const SAFETY_LOCKS = {
  approved_for_sandbox_order: false,
  approved_for_live_order: false,
  submitted_to_broker: false,
};

function blockedResponse(reason: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      route: ROUTE,
      mode: "phone_review_response_audit_only",
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

function normalizeAction(value: unknown): RespondAction | null {
  if (value === "approve" || value === "reject") {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | RespondRequestBody
      | null;

    const token = body?.token;
    const action = normalizeAction(body?.action);

    if (!token || typeof token !== "string") {
      return blockedResponse("Missing token.");
    }

    if (!action) {
      return blockedResponse("Action must be approve or reject.");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { data: tokenRow, error: tokenError } = await supabase
      .from("phone_review_tokens")
      .select("id, paper_order_preview_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle<PhoneReviewTokenRow>();

    if (tokenError) {
      console.error("Failed to fetch phone review token:", tokenError);
      return blockedResponse(tokenError.message, 500);
    }

    if (!tokenRow) {
      return blockedResponse("This review link is invalid.", 404);
    }

    if (tokenRow.used_at) {
      return blockedResponse("This review link has already been used.");
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return blockedResponse("This review link has expired.");
    }

    const { data: preview, error: previewError } = await supabase
      .from("paper_order_previews")
      .select(
        [
          "id",
          "sandbox_preview_validation_status",
          "sandbox_preview_human_review_decision",
          "approved_for_sandbox_order",
          "approved_for_live_order",
          "submitted_to_broker",
        ].join(",")
      )
      .eq("id", tokenRow.paper_order_preview_id)
      .maybeSingle<PaperOrderPreviewRow>();

    if (previewError) {
      console.error("Failed to fetch preview for phone review response:", previewError);
      return blockedResponse(previewError.message, 500);
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
        "Sandbox preview validation must be PASSED before phone review response."
      );
    }

    const decision = action === "approve" ? "PHONE_APPROVED" : "REJECT";
    const reviewedAt = new Date().toISOString();

    const { data: updatedPreview, error: updateError } = await supabase
      .from("paper_order_previews")
      .update({
        sandbox_preview_human_review_status: "REVIEWED",
        sandbox_preview_human_review_decision: decision,
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
          "symbol",
          "contract_symbol",
          "sandbox_preview_human_review_status",
          "sandbox_preview_human_review_decision",
          "sandbox_preview_human_reviewed_at",
          "approved_for_sandbox_order",
          "approved_for_live_order",
          "submitted_to_broker",
        ].join(",")
      )
      .maybeSingle();

    if (updateError) {
      console.error("Failed to save phone review response:", updateError);
      return blockedResponse(updateError.message, 500);
    }

    if (!updatedPreview) {
      return blockedResponse(
        "Phone review response was not saved because safety locks did not match."
      );
    }

    const { error: tokenUpdateError } = await supabase
      .from("phone_review_tokens")
      .update({ used_at: reviewedAt })
      .eq("id", tokenRow.id);

    if (tokenUpdateError) {
      console.error("Failed to mark phone review token used:", tokenUpdateError);
    }

    return NextResponse.json(
      {
        success: true,
        route: ROUTE,
        mode: "phone_review_response_audit_only",
        message:
          decision === "PHONE_APPROVED"
            ? "Approved via phone. No broker order was submitted. Open the dashboard to continue."
            : "Rejected via phone. No broker order was submitted.",
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
        : "Unexpected server error during phone review response.";

    console.error("Phone review respond route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: ROUTE,
        mode: "phone_review_response_audit_only",
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
