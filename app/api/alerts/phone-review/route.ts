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

type PhoneReviewRequestBody = {
  previewId?: string;
  id?: string;
};

type PaperOrderPreviewRow = {
  id: string;
  source_alert_id: string | null;
  symbol: string | null;
  trade_lane: string | null;
  setup_name: string | null;
  message?: string | null;

  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  max_risk_dollars: number | null;

  sandbox_preview_validation_status: string | null;
  sandbox_preview_human_review_decision: string | null;

  approved_for_order: boolean | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
};

const SAFETY_LOCKS = {
  approved_for_order: false,
  approved_for_sandbox_order: false,
  approved_for_live_order: false,
  submitted_to_broker: false,
};

function blockedResponse(reason: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      route: "/api/alerts/phone-review",
      mode: "phone_review_alert_log_only",
      message: reason,
      reason,
      safetyLocks: SAFETY_LOCKS,
      brokerCall: {
        tradierPreviewEndpointCalled: false,
        tradierOrderEndpointCalled: false,
        liveEndpointCalled: false,
      },
      delivery: {
        smsSent: false,
        pushSent: false,
        emailSent: false,
        dashboardLogOnly: true,
      },
    },
    { status }
  );
}

function buildPhoneMessage(preview: PaperOrderPreviewRow) {
  const symbol = preview.symbol ?? "UNKNOWN";
  const contract = preview.contract_symbol ?? "No contract";
  const grade = preview.contract_quality ?? "N/A";
  const riskGuard = preview.risk_guard_status ?? "N/A";
  const maxRisk =
    typeof preview.max_risk_dollars === "number"
      ? `$${preview.max_risk_dollars.toFixed(2)}`
      : "N/A";

  return `PHONE REVIEW: ${symbol} WATCH setup ready. Contract: ${contract}. Grade: ${grade}. Risk Guard: ${riskGuard}. Max Risk: ${maxRisk}. Dashboard log only — no broker order submitted.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | PhoneReviewRequestBody
      | null;

    const previewId = body?.previewId ?? body?.id;

    if (!previewId || typeof previewId !== "string") {
      return blockedResponse("Missing previewId.");
    }

    const { data: preview, error: fetchError } = await supabase
      .from("paper_order_previews")
      .select(
        [
          "id",
          "source_alert_id",
          "symbol",
          "trade_lane",
          "setup_name",
          "contract_symbol",
          "strike",
          "expiration",
          "option_type",
          "contract_quality",
          "risk_guard_status",
          "max_risk_dollars",
          "sandbox_preview_validation_status",
          "sandbox_preview_human_review_decision",
          "approved_for_order",
          "approved_for_sandbox_order",
          "approved_for_live_order",
          "submitted_to_broker",
        ].join(",")
      )
      .eq("id", previewId)
      .maybeSingle<PaperOrderPreviewRow>();

    if (fetchError) {
      console.error("Failed to fetch preview for phone review alert:", fetchError);
      return blockedResponse(fetchError.message, 500);
    }

    if (!preview) {
      return blockedResponse("Preview row not found.", 404);
    }

    if (preview.sandbox_preview_validation_status !== "PASSED") {
      return blockedResponse(
        "Sandbox preview validation must be PASSED before phone review alert."
      );
    }

    if (preview.sandbox_preview_human_review_decision !== "WATCH") {
      return blockedResponse(
        "Human review decision must be WATCH before phone review alert."
      );
    }

    if (preview.approved_for_order === true) {
      return blockedResponse("approved_for_order must remain false.");
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

    const phoneMessage = buildPhoneMessage(preview);

    const { data: phoneAlertEvent, error: insertError } = await supabase
      .from("phone_alert_events")
      .insert({
        source_alert_id: preview.source_alert_id ?? null,

        symbol: preview.symbol ?? "UNKNOWN",
        trade_lane: preview.trade_lane ?? "SANDBOX_PREVIEW",
        setup_name: preview.setup_name ?? "Sandbox Preview Phone Review",
        message: phoneMessage,

        priority: "HIGH",
        channel: "DASHBOARD_SIMULATION",
        delivery_status: "LOGGED_ONLY",

        contract_symbol: preview.contract_symbol ?? null,
        strike: preview.strike ?? null,
        expiration: preview.expiration ?? null,
        option_type: preview.option_type ?? null,
        contract_quality: preview.contract_quality ?? null,
        risk_guard_status: preview.risk_guard_status ?? null,
        max_risk_dollars: preview.max_risk_dollars ?? null,

        approved_for_order: false,
      })
      .select("id, created_at")
      .maybeSingle();

    if (insertError) {
      console.error("Failed to log phone review alert:", insertError);
      return blockedResponse(insertError.message, 500);
    }

    return NextResponse.json(
      {
        success: true,
        route: "/api/alerts/phone-review",
        mode: "phone_review_alert_log_only",
        message:
          "Phone review alert logged in dashboard history. No SMS, push, broker order, or live order was sent.",
        phoneAlertEvent,
        previewId: preview.id,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
        delivery: {
          smsSent: false,
          pushSent: false,
          emailSent: false,
          dashboardLogOnly: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error while logging phone review alert.";

    console.error("Phone review alert route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: "/api/alerts/phone-review",
        mode: "phone_review_alert_log_only",
        message,
        reason: message,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
        delivery: {
          smsSent: false,
          pushSent: false,
          emailSent: false,
          dashboardLogOnly: true,
        },
      },
      { status: 500 }
    );
  }
}