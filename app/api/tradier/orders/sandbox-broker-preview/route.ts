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

type PaperOrderPreviewRow = {
  id: string;
  preview_status: string | null;
  ready_for_sandbox_preview: boolean | null;
  approved_for_order: boolean | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
  broker: string | null;
  symbol: string | null;
  contract_symbol: string | null;
  order_side: string | null;
  order_type: string | null;
  time_in_force: string | null;
  quantity: number | null;
  estimated_limit_price: number | null;
  max_risk_dollars: number | null;
  risk_guard_status: string | null;
  contract_quality: string | null;
};

type TradierSandboxPreviewPayload = {
  class: "option";
  symbol: string;
  option_symbol: string;
  side: string;
  quantity: number;
  type: string;
  duration: string;
  price: number;
};

const ALLOWED_CONTRACT_QUALITIES = new Set(["A+", "A", "B"]);

function buildTradierSandboxPreviewPayload(
  preview: PaperOrderPreviewRow
): TradierSandboxPreviewPayload {
  if (!preview.symbol) {
    throw new Error("Missing symbol.");
  }

  if (!preview.contract_symbol) {
    throw new Error("Missing contract_symbol.");
  }

  if (!preview.order_side) {
    throw new Error("Missing order_side.");
  }

  if (!preview.order_type) {
    throw new Error("Missing order_type.");
  }

  if (!preview.time_in_force) {
    throw new Error("Missing time_in_force.");
  }

  if (!preview.quantity || preview.quantity <= 0) {
    throw new Error("Quantity must be greater than 0.");
  }

  if (!preview.estimated_limit_price || preview.estimated_limit_price <= 0) {
    throw new Error("estimated_limit_price must be greater than 0.");
  }

  return {
    class: "option",
    symbol: preview.symbol,
    option_symbol: preview.contract_symbol,
    side: preview.order_side.toLowerCase(),
    quantity: preview.quantity,
    type: preview.order_type.toLowerCase(),
    duration: preview.time_in_force.toLowerCase(),
    price: preview.estimated_limit_price,
  };
}

function blocked(reason: string, row?: PaperOrderPreviewRow | null) {
  return NextResponse.json(
    {
      success: true,
      route: "/api/tradier/orders/sandbox-broker-preview",
      mode: "sandbox_broker_preview_blocked_only",
      status: "BLOCKED",
      reason,
      safetyLocks: {
        approved_for_order: false,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
      },
      brokerCall: {
        tradierPreviewEndpointCalled: false,
        tradierOrderEndpointCalled: false,
        liveEndpointCalled: false,
      },
      dbWrites: false,
      preview: row
        ? {
            id: row.id,
            preview_status: row.preview_status,
            ready_for_sandbox_preview: row.ready_for_sandbox_preview,
            broker: row.broker,
            symbol: row.symbol,
            contract_symbol: row.contract_symbol,
            risk_guard_status: row.risk_guard_status,
            contract_quality: row.contract_quality,
            max_risk_dollars: row.max_risk_dollars,
            approved_for_sandbox_order: row.approved_for_sandbox_order,
            approved_for_live_order: row.approved_for_live_order,
            submitted_to_broker: row.submitted_to_broker,
          }
        : null,
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const paperOrderPreviewId = body?.paper_order_preview_id;

    if (!paperOrderPreviewId || typeof paperOrderPreviewId !== "string") {
      return blocked("Missing required paper_order_preview_id.");
    }

    const { data, error } = await supabase
      .from("paper_order_previews")
      .select("*")
      .eq("id", paperOrderPreviewId)
      .single();

    if (error || !data) {
      return blocked("Paper order preview not found.");
    }

    const preview = data as PaperOrderPreviewRow;

    if (preview.preview_status !== "REVIEWED_ONLY") {
      return blocked(
        "Preview must be REVIEWED_ONLY before broker preview.",
        preview
      );
    }

    if (preview.ready_for_sandbox_preview !== true) {
      return blocked(
        "Preview must be marked ready_for_sandbox_preview before broker preview.",
        preview
      );
    }

    if (preview.approved_for_order === true) {
      return blocked("approved_for_order must remain false.", preview);
    }

    if (preview.approved_for_sandbox_order === true) {
      return blocked("approved_for_sandbox_order must remain false.", preview);
    }

    if (preview.approved_for_live_order === true) {
      return blocked("approved_for_live_order must remain false.", preview);
    }

    if (preview.submitted_to_broker === true) {
      return blocked("submitted_to_broker must remain false.", preview);
    }

    const normalizedBroker = (preview.broker ?? "").toLowerCase();

    if (normalizedBroker !== "tradier_sandbox") {
      return blocked("Broker must be exactly TRADIER_SANDBOX.", preview);
    }

    if (!preview.contract_symbol) {
      return blocked("Missing contract_symbol.", preview);
    }

    if (!preview.order_side) {
      return blocked("Missing order_side.", preview);
    }

    if (!preview.order_type) {
      return blocked("Missing order_type.", preview);
    }

    if (!preview.time_in_force) {
      return blocked("Missing time_in_force.", preview);
    }

    if (!preview.quantity || preview.quantity <= 0) {
      return blocked("Quantity must be greater than 0.", preview);
    }

    if (!preview.estimated_limit_price || preview.estimated_limit_price <= 0) {
      return blocked("estimated_limit_price must be greater than 0.", preview);
    }

    if (preview.risk_guard_status !== "APPROVED") {
      return blocked("Risk Guard must be APPROVED.", preview);
    }

    if (!ALLOWED_CONTRACT_QUALITIES.has(preview.contract_quality ?? "")) {
      return blocked("Contract quality must be A+, A, or B.", preview);
    }

    if (
      preview.max_risk_dollars === null ||
      preview.max_risk_dollars === undefined ||
      preview.max_risk_dollars > 100
    ) {
      return blocked(
        "max_risk_dollars must be less than or equal to 100.",
        preview
      );
    }

    const tradierSandboxPreviewPayload =
      buildTradierSandboxPreviewPayload(preview);

    return NextResponse.json(
      {
        success: true,
        route: "/api/tradier/orders/sandbox-broker-preview",
        mode: "sandbox_broker_preview_blocked_only",
        status: "BLOCKED",
        reason:
          "Tradier sandbox broker preview route is not enabled yet. Safety gates passed, payload was built, but external broker preview calls remain locked in v1.",
        safetyLocks: {
          approved_for_order: false,
          approved_for_sandbox_order: false,
          approved_for_live_order: false,
          submitted_to_broker: false,
        },
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
        dbWrites: false,
        tradierSandboxPreviewPayload,
        preview: {
          id: preview.id,
          preview_status: preview.preview_status,
          ready_for_sandbox_preview: preview.ready_for_sandbox_preview,
          broker: preview.broker,
          symbol: preview.symbol,
          contract_symbol: preview.contract_symbol,
          risk_guard_status: preview.risk_guard_status,
          contract_quality: preview.contract_quality,
          max_risk_dollars: preview.max_risk_dollars,
          approved_for_sandbox_order: preview.approved_for_sandbox_order,
          approved_for_live_order: preview.approved_for_live_order,
          submitted_to_broker: preview.submitted_to_broker,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Tradier sandbox broker preview blocked-only route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        route: "/api/tradier/orders/sandbox-broker-preview",
        mode: "sandbox_broker_preview_blocked_only",
        status: "ERROR",
        message:
          "Unexpected server error during sandbox broker preview blocked-only check.",
        safetyLocks: {
          approved_for_order: false,
          approved_for_sandbox_order: false,
          approved_for_live_order: false,
          submitted_to_broker: false,
        },
        brokerCall: {
          tradierPreviewEndpointCalled: false,
          tradierOrderEndpointCalled: false,
          liveEndpointCalled: false,
        },
        dbWrites: false,
      },
      { status: 500 }
    );
  }
}