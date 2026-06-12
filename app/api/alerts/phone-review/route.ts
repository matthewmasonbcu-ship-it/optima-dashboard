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
  phone_alert_event_id: string | null;

  symbol: string | null;
  trade_lane: string | null;
  setup_name: string | null;

  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  max_risk_dollars: number | null;

  sandbox_preview_validation_status: string | null;
  sandbox_preview_human_review_decision: string | null;

  phone_review_alert_status: string | null;
  phone_review_alert_sent_at: string | null;

  approved_for_order: boolean | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
};

type PhoneAlertEventRow = {
  id: string;
  created_at: string;
};

const ROUTE = "/api/alerts/phone-review";

const SAFETY_LOCKS = {
  approved_for_order: false,
  approved_for_sandbox_order: false,
  approved_for_live_order: false,
  submitted_to_broker: false,
};

const BROKER_CALL_LOCKS = {
  tradierPreviewEndpointCalled: false,
  tradierOrderEndpointCalled: false,
  liveEndpointCalled: false,
};

const DELIVERY_LOCKS = {
  smsSent: false,
  pushSent: false,
  emailSent: false,
  dashboardLogOnly: true,
};

function blockedResponse(reason: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      route: ROUTE,
      mode: "phone_review_alert_log_only",
      message: reason,
      reason,
      safetyLocks: SAFETY_LOCKS,
      brokerCall: BROKER_CALL_LOCKS,
      delivery: DELIVERY_LOCKS,
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

  return [
    `PHONE REVIEW: ${symbol} WATCH setup ready.`,
    `Contract: ${contract}.`,
    `Grade: ${grade}.`,
    `Risk Guard: ${riskGuard}.`,
    `Max Risk: ${maxRisk}.`,
    "Dashboard simulation only — no SMS, push, broker order, or live order submitted.",
  ].join(" ");
}

async function linkExistingPhoneAlertToPreview({
  preview,
  phoneAlertEventId,
  sentAt,
}: {
  preview: PaperOrderPreviewRow;
  phoneAlertEventId: string;
  sentAt: string;
}) {
  const { data, error } = await supabase
    .from("paper_order_previews")
    .update({
      phone_alert_event_id: phoneAlertEventId,
      phone_review_alert_status: "LOGGED_ONLY",
      phone_review_alert_sent_at: sentAt,

      // Safety locks stay false. This route never unlocks execution.
      approved_for_order: false,
      approved_for_sandbox_order: false,
      approved_for_live_order: false,
      submitted_to_broker: false,
    })
    .eq("id", preview.id)
    .eq("approved_for_order", false)
    .eq("approved_for_sandbox_order", false)
    .eq("approved_for_live_order", false)
    .eq("submitted_to_broker", false)
    .select(
      [
        "id",
        "symbol",
        "phone_alert_event_id",
        "phone_review_alert_status",
        "phone_review_alert_sent_at",
        "approved_for_order",
        "approved_for_sandbox_order",
        "approved_for_live_order",
        "submitted_to_broker",
      ].join(",")
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Phone alert link was not saved because safety locks did not match."
    );
  }

  return data;
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
          "phone_alert_event_id",
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
          "phone_review_alert_status",
          "phone_review_alert_sent_at",
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

    if (preview.phone_alert_event_id) {
      return NextResponse.json(
        {
          success: true,
          duplicatePrevented: true,
          route: ROUTE,
          mode: "phone_review_alert_log_only",
          message:
            "Phone review alert was already logged for this preview. Duplicate dispatch prevented.",
          previewId: preview.id,
          phoneAlertEventId: preview.phone_alert_event_id,
          safetyLocks: SAFETY_LOCKS,
          brokerCall: BROKER_CALL_LOCKS,
          delivery: DELIVERY_LOCKS,
        },
        { status: 200 }
      );
    }

    const { data: existingEvent, error: existingEventError } = await supabase
      .from("phone_alert_events")
      .select("id, created_at")
      .eq("paper_order_preview_id", preview.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PhoneAlertEventRow>();

    if (existingEventError) {
      console.error(
        "Failed to check existing phone review alert:",
        existingEventError
      );
      return blockedResponse(existingEventError.message, 500);
    }

    if (existingEvent) {
      const updatedPreview = await linkExistingPhoneAlertToPreview({
        preview,
        phoneAlertEventId: existingEvent.id,
        sentAt: existingEvent.created_at,
      });

      return NextResponse.json(
        {
          success: true,
          duplicatePrevented: true,
          route: ROUTE,
          mode: "phone_review_alert_log_only",
          message:
            "Existing phone review alert found and linked. Duplicate dispatch prevented.",
          previewId: preview.id,
          phoneAlertEventId: existingEvent.id,
          preview: updatedPreview,
          safetyLocks: SAFETY_LOCKS,
          brokerCall: BROKER_CALL_LOCKS,
          delivery: DELIVERY_LOCKS,
        },
        { status: 200 }
      );
    }

    const phoneMessage = buildPhoneMessage(preview);

    const { data: phoneAlertEvent, error: insertError } = await supabase
      .from("phone_alert_events")
      .insert({
        source_alert_id: preview.source_alert_id ?? null,
        paper_order_preview_id: preview.id,

        symbol: preview.symbol ?? "UNKNOWN",
        trade_lane: preview.trade_lane ?? "SANDBOX_PREVIEW",
        setup_name: preview.setup_name ?? "Sandbox Preview Phone Review",
        message: phoneMessage,

        priority: "HIGH",
        channel: "DASHBOARD_SIMULATION",
        delivery_mode: "DASHBOARD_SIMULATION",
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
      .maybeSingle<PhoneAlertEventRow>();

    if (insertError) {
      console.error("Failed to log phone review alert:", insertError);
      return blockedResponse(insertError.message, 500);
    }

    if (!phoneAlertEvent) {
      return blockedResponse("Phone alert event was not created.", 500);
    }

    const updatedPreview = await linkExistingPhoneAlertToPreview({
      preview,
      phoneAlertEventId: phoneAlertEvent.id,
      sentAt: phoneAlertEvent.created_at,
    });

    return NextResponse.json(
      {
        success: true,
        duplicatePrevented: false,
        route: ROUTE,
        mode: "phone_review_alert_log_only",
        message:
          "Phone review alert logged and linked to preview. No SMS, push, broker order, or live order was sent.",
        phoneAlertEvent,
        previewId: preview.id,
        preview: updatedPreview,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: BROKER_CALL_LOCKS,
        delivery: DELIVERY_LOCKS,
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
        route: ROUTE,
        mode: "phone_review_alert_log_only",
        message,
        reason: message,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: BROKER_CALL_LOCKS,
        delivery: DELIVERY_LOCKS,
      },
      { status: 500 }
    );
  }
}