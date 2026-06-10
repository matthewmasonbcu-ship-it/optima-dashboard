import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PaperOrderPreviewRow = {
  id: string;
  created_at: string;
  symbol: string | null;
  contract_symbol: string | null;
  estimated_limit_price: number | null;
  quantity: number | null;
  estimated_order_cost: number | null;
  max_risk_dollars: number | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  preview_status: string | null;
  broker: string | null;
  order_side: string | null;
  order_type: string | null;
  time_in_force: string | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
  ready_for_sandbox_preview: boolean | null;
};

const ROUTE = "/api/tradier/orders/preview";
const MODE = "SANDBOX_PREVIEW_ONLY";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeUpper(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function isAllowedContractQuality(value: string | null | undefined) {
  const normalized = normalizeUpper(value);
  return normalized === "A+" || normalized === "A" || normalized === "B";
}

function isTradierBroker(value: string | null | undefined) {
  return normalizeUpper(value) === "TRADIER";
}

function buildSafetyLocks() {
  return {
    broker_order_endpoint_called: false,
    submitted_to_broker: false,
    approved_for_sandbox_order: false,
    approved_for_live_order: false,
    live_trading_enabled: false,
  };
}

function blockedResponse(blockedReasons: string[], status = 400) {
  return NextResponse.json(
    {
      success: false,
      route: ROUTE,
      mode: MODE,
      message: "Sandbox preview blocked by safety checks.",
      submitted_to_broker: false,
      approved_for_sandbox_order: false,
      approved_for_live_order: false,
      validation_status: "BLOCKED",
      blocked_reasons: blockedReasons,
      safety_locks: buildSafetyLocks(),
    },
    { status }
  );
}

function validatePreview(preview: PaperOrderPreviewRow) {
  const blockedReasons: string[] = [];

  if (preview.preview_status !== "REVIEWED_ONLY") {
    blockedReasons.push("Preview must be REVIEWED_ONLY.");
  }

  if (preview.ready_for_sandbox_preview !== true) {
    blockedReasons.push("Preview must be marked ready_for_sandbox_preview.");
  }

  if (preview.approved_for_sandbox_order === true) {
    blockedReasons.push("approved_for_sandbox_order must remain false.");
  }

  if (preview.approved_for_live_order === true) {
    blockedReasons.push("approved_for_live_order must remain false.");
  }

  if (preview.submitted_to_broker === true) {
    blockedReasons.push("submitted_to_broker must remain false.");
  }

  if (!isTradierBroker(preview.broker)) {
    blockedReasons.push("Broker must be Tradier.");
  }

  if (!normalizeText(preview.symbol)) {
    blockedReasons.push("Symbol is required.");
  }

  if (!normalizeText(preview.contract_symbol)) {
    blockedReasons.push("Contract symbol is required.");
  }

  if (preview.estimated_limit_price === null || preview.estimated_limit_price <= 0) {
    blockedReasons.push("Estimated limit price must be greater than 0.");
  }

  if (preview.quantity === null || preview.quantity <= 0) {
    blockedReasons.push("Quantity must be greater than 0.");
  }

  if (!normalizeText(preview.order_side)) {
    blockedReasons.push("Order side is required.");
  }

  if (!normalizeText(preview.order_type)) {
    blockedReasons.push("Order type is required.");
  }

  if (!normalizeText(preview.time_in_force)) {
    blockedReasons.push("Time in force is required.");
  }

  if (preview.risk_guard_status !== "APPROVED") {
    blockedReasons.push("Risk Guard must be APPROVED.");
  }

  if (!isAllowedContractQuality(preview.contract_quality)) {
    blockedReasons.push("Contract Quality must be A+, A, or B.");
  }

  if (preview.max_risk_dollars === null) {
    blockedReasons.push("Max risk dollars is required.");
  } else if (preview.max_risk_dollars > 100) {
    blockedReasons.push("Max risk dollars must be less than or equal to 100.");
  }

  return blockedReasons;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const paperOrderPreviewId = normalizeText(body?.paper_order_preview_id);

    if (!paperOrderPreviewId) {
      return blockedResponse(["paper_order_preview_id is required."], 400);
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("paper_order_previews")
      .select(
        "id, created_at, symbol, contract_symbol, estimated_limit_price, quantity, estimated_order_cost, max_risk_dollars, contract_quality, risk_guard_status, preview_status, broker, order_side, order_type, time_in_force, approved_for_sandbox_order, approved_for_live_order, submitted_to_broker, ready_for_sandbox_preview"
      )
      .eq("id", paperOrderPreviewId)
      .single();

    if (error || !data) {
      console.error("Failed to load paper order preview:", error);
      return blockedResponse(["Preview not found."], 404);
    }

    const preview = data as PaperOrderPreviewRow;
    const blockedReasons = validatePreview(preview);

    if (blockedReasons.length > 0) {
      return blockedResponse(blockedReasons, 400);
    }

    const symbol = normalizeUpper(preview.symbol);
    const optionSymbol = normalizeText(preview.contract_symbol);
    const side = normalizeText(preview.order_side);
    const orderType = normalizeText(preview.order_type);
    const duration = normalizeText(preview.time_in_force).toLowerCase();
    const price = Number(preview.estimated_limit_price);
    const quantity = Number(preview.quantity);

    const tradierStylePayload = {
      class: "option",
      symbol,
      option_symbol: optionSymbol,
      side,
      quantity,
      type: orderType,
      duration,
      price,
    };

    return NextResponse.json(
      {
        success: true,
        route: ROUTE,
        mode: MODE,
        message:
          "Tradier sandbox preview payload formatted. No broker order submitted.",
        submitted_to_broker: false,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        validation_status: "PASSED",
        preview: {
          paper_order_preview_id: preview.id,
          symbol,
          contract_symbol: optionSymbol,
          side,
          order_type: orderType,
          quantity,
          duration,
          price,
          estimated_order_cost: preview.estimated_order_cost,
          max_risk_dollars: preview.max_risk_dollars,
          contract_quality: preview.contract_quality,
          risk_guard_status: preview.risk_guard_status,
        },
        tradier_style_payload: tradierStylePayload,
        safety_locks: buildSafetyLocks(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Tradier sandbox preview route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: ROUTE,
        mode: MODE,
        message: "Sandbox preview route failed safely.",
        submitted_to_broker: false,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        validation_status: "BLOCKED",
        blocked_reasons: ["Unexpected route error. No broker order submitted."],
        safety_locks: buildSafetyLocks(),
      },
      { status: 500 }
    );
  }
}