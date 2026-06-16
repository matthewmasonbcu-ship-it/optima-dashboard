import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendPhoneAlertSms } from "@/lib/sms/sendPhoneAlertSms";
import { sendPhoneAlertEmailSms } from "@/lib/sms/sendPhoneAlertEmailSms";

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
  symbol: string | null;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  quantity: number | null;
  estimated_order_cost: number | null;
  max_risk_dollars: number | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  risk_guard_reason: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
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

function getNewYorkUtcOffsetHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).formatToParts(date);

  const tzName = parts.find((part) => part.type === "timeZoneName")?.value;
  return tzName === "EDT" ? 4 : 5;
}

function getStartOfTodayNewYorkISO(now: Date): string {
  const nyDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);

  const offsetHours = getNewYorkUtcOffsetHours(now);
  const offsetStr = String(offsetHours).padStart(2, "0");

  return new Date(`${nyDateStr}T00:00:00.000-${offsetStr}:00`).toISOString();
}

type AutoSaveResult = {
  saved: boolean;
  reason?: string;
  paperTradeId?: string;
};

async function autoSavePaperTrade(
  preview: PaperOrderPreviewRow
): Promise<AutoSaveResult> {
  if (
    !preview.symbol ||
    !preview.contract_symbol ||
    !preview.strike ||
    !preview.expiration ||
    !preview.option_type ||
    preview.entry_price === null ||
    preview.entry_price === undefined
  ) {
    return {
      saved: false,
      reason:
        "Preview is missing contract or trade-plan data required for auto-save.",
    };
  }

  const now = new Date();
  const startOfTodayISO = getStartOfTodayNewYorkISO(now);

  const dailyCountCheck = await supabase
    .from("paper_trades")
    .select("id")
    .gte("created_at", startOfTodayISO);

  if (dailyCountCheck.error) {
    console.error("Auto-save daily trade count check failed:", dailyCountCheck.error);
    return { saved: false, reason: "Daily trade count check failed." };
  }

  if (dailyCountCheck.data && dailyCountCheck.data.length >= 3) {
    return { saved: false, reason: "Daily limit of 3 trades reached." };
  }

  const todaysClosedIds = (
    await supabase
      .from("paper_trades")
      .select("id")
      .eq("status", "closed")
      .gte("closed_at", startOfTodayISO)
  ).data?.map((r) => r.id) ?? [];

  if (todaysClosedIds.length > 0) {
    const lossCheck = await supabase
      .from("option_trade_details")
      .select("id")
      .in("paper_trade_id", todaysClosedIds)
      .lt("option_pnl", 0);

    if ((lossCheck.data?.length ?? 0) >= 2) {
      return {
        saved: false,
        reason: "Daily loss lockout: 2 losses today. Trading locked until tomorrow.",
      };
    }
  }

  const duplicateCheck = await supabase
    .from("paper_trades")
    .select("id")
    .eq("symbol", preview.symbol)
    .eq("status", "open")
    .is("exit_price", null)
    .limit(1);

  if (duplicateCheck.error) {
    console.error("Auto-save duplicate position check failed:", duplicateCheck.error);
    return { saved: false, reason: "Duplicate position check failed." };
  }

  if (duplicateCheck.data && duplicateCheck.data.length > 0) {
    return {
      saved: false,
      reason: `${preview.symbol} already has an open trade.`,
    };
  }

  const { data: paperTradeData, error: paperTradeError } = await supabase
    .from("paper_trades")
    .insert({
      symbol: preview.symbol,
      entry_price: preview.entry_price,
      stop_loss: preview.stop_loss,
      take_profit: preview.take_profit,
      status: "open",
      strategy: "phone_approved",
    })
    .select("id")
    .single();

  if (paperTradeError || !paperTradeData?.id) {
    console.error("Auto-save paper trade insert failed:", paperTradeError);
    return { saved: false, reason: "Failed to save paper trade." };
  }

  const paperTradeId = paperTradeData.id as string;

  const { error: optionDetailError } = await supabase
    .from("option_trade_details")
    .insert({
      paper_trade_id: paperTradeId,
      stock_symbol: preview.symbol,
      trade_direction: preview.option_type,
      option_symbol: preview.contract_symbol,
      expiration_date: preview.expiration,
      strike_price: preview.strike,
      bid_price: preview.bid,
      ask_price: preview.ask,
      mid_price: preview.mid,
      contracts: preview.quantity,
      estimated_cost: preview.estimated_order_cost,
      max_risk: preview.max_risk_dollars,
      risk_guard_status: preview.risk_guard_status,
      risk_guard_reason: preview.risk_guard_reason,
      override_used: false,
      override_reason: null,
      contract_quality: preview.contract_quality,
      spread_type: "single_leg",
    });

  if (optionDetailError) {
    console.error("Auto-save option trade details insert failed:", optionDetailError);
    return {
      saved: false,
      reason: "Paper trade saved, but option details failed.",
      paperTradeId,
    };
  }

  return { saved: true, paperTradeId };
}

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
          "symbol",
          "contract_symbol",
          "strike",
          "expiration",
          "option_type",
          "bid",
          "ask",
          "mid",
          "quantity",
          "estimated_order_cost",
          "max_risk_dollars",
          "contract_quality",
          "risk_guard_status",
          "risk_guard_reason",
          "entry_price",
          "stop_loss",
          "take_profit",
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

    let autoSave: AutoSaveResult | null = null;
    let message: string;

    if (decision === "PHONE_APPROVED") {
      autoSave = await autoSavePaperTrade(preview);

      if (autoSave.saved) {
        message =
          "Approved via phone. Paper trade saved automatically. Open the dashboard for details.";

        const smsBody = `OPTIMA: Trade saved — ${preview.symbol} ${preview.contract_symbol}. Risk Guard: ${preview.risk_guard_status}. Check dashboard for details.`;

        const smsResult = await sendPhoneAlertSms(smsBody);
        if (!smsResult.success) {
          await sendPhoneAlertEmailSms(smsBody);
        }
      } else {
        message = `Approved via phone. No broker order was submitted. Trade not auto-saved: ${autoSave.reason} Open the dashboard to continue.`;
      }
    } else {
      message = "Rejected via phone. No broker order was submitted.";
    }

    return NextResponse.json(
      {
        success: true,
        route: ROUTE,
        mode: "phone_review_response_audit_only",
        message,
        decision,
        reviewedAt,
        preview: updatedPreview,
        autoSave,
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
