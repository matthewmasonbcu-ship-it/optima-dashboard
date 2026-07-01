import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";
import { sendTelegramAlert } from "@/lib/notify/sendTelegramAlert";
import { sendPhoneAlertEmailSms } from "@/lib/sms/sendPhoneAlertEmailSms";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://optima-dashboard-azm9.vercel.app";

const PHONE_REVIEW_TOKEN_TTL_MINUTES = 60;

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

  spread_type: string | null;
  short_leg_option_symbol: string | null;
  short_leg_strike_price: number | null;
  long_leg_option_symbol: string | null;
  long_leg_strike_price: number | null;
  net_credit: number | null;
  spread_width: number | null;
  max_loss: number | null;
  max_profit: number | null;

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

function buildDeliveryStatus(
  telegramResult: { success: boolean },
  emailResult: { success: boolean } | null
) {
  return {
    telegramSent: telegramResult.success,
    emailSent: emailResult?.success ?? false,
    smsSent: false,
    pushSent: false,
    dashboardLogOnly: !telegramResult.success && !(emailResult?.success ?? false),
  };
}

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

function buildTelegramMessage(preview: PaperOrderPreviewRow, reviewLink: string | null) {
  const symbol = preview.symbol ?? "UNKNOWN";
  const direction = preview.option_type ?? "OPTIONS";
  const spreadSuffix =
    preview.spread_type && preview.spread_type !== "single_leg" ? " credit spread" : "";
  const grade = preview.contract_quality ?? "N/A";
  const riskGuard = preview.risk_guard_status ?? "N/A";
  const maxRisk =
    typeof preview.max_risk_dollars === "number"
      ? `$${preview.max_risk_dollars.toFixed(2)}`
      : "N/A";

  const lines = [
    `OPTIMA ALERT — ${symbol} ${direction}${spreadSuffix}`,
    "",
    `Grade: ${grade} | Risk Guard: ${riskGuard}`,
    `Max Risk: ${maxRisk}`,
  ];

  if (preview.net_credit != null) {
    lines.push(`Net Credit: $${preview.net_credit.toFixed(2)}`);
  }

  lines.push("", "No broker order submitted. Review and approve:");

  if (reviewLink) lines.push(reviewLink);

  return lines.join("\n");
}

function buildPhoneMessage(preview: PaperOrderPreviewRow, reviewLink: string | null) {
  const symbol = preview.symbol ?? "UNKNOWN";
  const contract = preview.contract_symbol ?? "No contract";
  const grade = preview.contract_quality ?? "N/A";
  const riskGuard = preview.risk_guard_status ?? "N/A";
  const maxRisk =
    typeof preview.max_risk_dollars === "number"
      ? `$${preview.max_risk_dollars.toFixed(2)}`
      : "N/A";

  const lines = [
    `PHONE REVIEW: ${symbol} WATCH setup ready.`,
    `Contract: ${contract}.`,
    `Grade: ${grade}.`,
    `Risk Guard: ${riskGuard}.`,
    `Max Risk: ${maxRisk}.`,
    "No broker order or live order submitted.",
  ];

  if (reviewLink) {
    lines.push(`Approve or reject: ${reviewLink}`);
  }

  return lines.join(" ");
}

function generatePhoneReviewToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + PHONE_REVIEW_TOKEN_TTL_MINUTES * 60 * 1000
  ).toISOString();

  return { token, tokenHash, expiresAt };
}

async function savePhoneReviewToken({
  phoneAlertEventId,
  paperOrderPreviewId,
  tokenHash,
  expiresAt,
}: {
  phoneAlertEventId: string;
  paperOrderPreviewId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("phone_review_tokens").insert({
    phone_alert_event_id: phoneAlertEventId,
    paper_order_preview_id: paperOrderPreviewId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Failed to save phone review token:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
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
          "spread_type",
          "short_leg_option_symbol",
          "short_leg_strike_price",
          "long_leg_option_symbol",
          "long_leg_strike_price",
          "net_credit",
          "spread_width",
          "max_loss",
          "max_profit",
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

    const { token, tokenHash, expiresAt } = generatePhoneReviewToken();
    const reviewLink = `${APP_BASE_URL}/phone-review/${token}`;

    const telegramMessage = buildTelegramMessage(preview, reviewLink);
    const phoneMessage = buildPhoneMessage(preview, reviewLink);

    // Primary: Telegram. Fallback: direct email to ALERT_EMAIL / SMS_GATEWAY_EMAIL.
    const telegramResult = await sendTelegramAlert(telegramMessage);
    const emailResult = telegramResult.success
      ? null
      : await sendPhoneAlertEmailSms(phoneMessage);

    let channel: string;
    let deliveryMode: string;
    let deliveryStatus: string;
    let deliveryProvider: string | null;
    let deliveryError: string | null;

    if (telegramResult.success) {
      channel = "PUSH";
      deliveryMode = "TELEGRAM";
      deliveryStatus = "SENT";
      deliveryProvider = "TELEGRAM";
      deliveryError = null;
    } else if (emailResult?.success) {
      channel = "EMAIL";
      deliveryMode = "EMAIL_DIRECT";
      deliveryStatus = "SENT";
      deliveryProvider = "SMTP";
      deliveryError = null;
    } else {
      const telegramNotConfigured =
        !telegramResult.success &&
        telegramResult.error === "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.";
      const emailNotConfigured =
        emailResult?.error === "Email-to-SMS environment variables are not configured.";

      channel = "DASHBOARD_SIMULATION";
      deliveryMode = "DASHBOARD_SIMULATION";
      deliveryStatus =
        telegramNotConfigured && emailNotConfigured ? "LOGGED_ONLY" : "FAILED";
      deliveryProvider = null;
      deliveryError =
        [telegramResult.error, emailResult?.error].filter(Boolean).join(" | ") || null;
    }

    const deliveredAt =
      telegramResult.success || emailResult?.success
        ? new Date().toISOString()
        : null;

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
        channel,
        delivery_mode: deliveryMode,
        delivery_status: deliveryStatus,
        delivery_provider: deliveryProvider,
        delivery_error: deliveryError,
        sent_at: deliveredAt,

        contract_symbol: preview.contract_symbol ?? null,
        strike: preview.strike ?? null,
        expiration: preview.expiration ?? null,
        option_type: preview.option_type ?? null,
        contract_quality: preview.contract_quality ?? null,
        risk_guard_status: preview.risk_guard_status ?? null,
        max_risk_dollars: preview.max_risk_dollars ?? null,

        spread_type: preview.spread_type ?? "single_leg",
        short_leg_option_symbol: preview.short_leg_option_symbol ?? null,
        short_leg_strike_price: preview.short_leg_strike_price ?? null,
        long_leg_option_symbol: preview.long_leg_option_symbol ?? null,
        long_leg_strike_price: preview.long_leg_strike_price ?? null,
        net_credit: preview.net_credit ?? null,
        spread_width: preview.spread_width ?? null,
        max_loss: preview.max_loss ?? null,
        max_profit: preview.max_profit ?? null,

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

    const tokenSave = await savePhoneReviewToken({
      phoneAlertEventId: phoneAlertEvent.id,
      paperOrderPreviewId: preview.id,
      tokenHash,
      expiresAt,
    });

    // The approval LINK was already sent above. If the token didn't persist, that
    // link is DEAD (/respond can't validate it) — fire a loud alert so approvals
    // can't silently break. This is the failure that hid for weeks behind a
    // swallowed insert error (phone_review_tokens RLS).
    if (!tokenSave.ok) {
      await sendTelegramAlert(
        `\u{1F6A8}\u{1F6A8} OPTIMA APPROVAL LINK BROKEN — ${preview.symbol ?? "preview"}\n` +
          `Token save failed: ${tokenSave.error}. The review link just sent will NOT work — ` +
          `approve in the dashboard instead. (phone_review_tokens write rejected.)`
      ).catch(() => {});
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
        message: deliveredAt
          ? "Phone review alert logged and linked to preview. Alert sent. No broker order or live order was sent."
          : "Phone review alert logged and linked to preview. Alert was not sent. No broker order or live order was sent.",
        phoneAlertEvent,
        previewId: preview.id,
        preview: updatedPreview,
        tokenSaved: tokenSave.ok,
        safetyLocks: SAFETY_LOCKS,
        brokerCall: BROKER_CALL_LOCKS,
        delivery: buildDeliveryStatus(telegramResult, emailResult),
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