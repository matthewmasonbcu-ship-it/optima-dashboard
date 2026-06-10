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
  estimated_total_cost: number | null;
  max_risk_dollars: number | null;
  risk_guard_status: string | null;
  contract_quality: string | null;
};

const ALLOWED_CONTRACT_QUALITIES = new Set(["A+", "A", "B"]);

function block(reason: string, row?: PaperOrderPreviewRow | null) {
  return NextResponse.json(
    {
      success: true,
      route: "/api/tradier/orders/preview",
      mode: "sandbox_preview_validation_only",
      status: "BLOCKED",
      reason,
      safetyLocks: {
        approved_for_order: false,
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
      },
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
      return block("Missing required paper_order_preview_id.");
    }

    const { data, error } = await supabase
      .from("paper_order_previews")
      .select("*")
      .eq("id", paperOrderPreviewId)
      .single();

    if (error || !data) {
      return block("Paper order preview not found.");
    }

    const preview = data as PaperOrderPreviewRow;

    if (preview.preview_status !== "REVIEWED_ONLY") {
      return block(
        "Preview must be REVIEWED_ONLY before sandbox preview validation.",
        preview
      );
    }

    if (preview.ready_for_sandbox_preview !== true) {
      return block(
        "Preview must be marked ready_for_sandbox_preview before validation.",
        preview
      );
    }

    if (preview.approved_for_order === true) {
      return block("approved_for_order must remain false.", preview);
    }

    if (preview.approved_for_sandbox_order === true) {
      return block("approved_for_sandbox_order must remain false.", preview);
    }

    if (preview.approved_for_live_order === true) {
      return block("approved_for_live_order must remain false.", preview);
    }

    if (preview.submitted_to_broker === true) {
      return block("submitted_to_broker must remain false.", preview);
    }

    const normalizedBroker = (preview.broker ?? "").toLowerCase();

if (normalizedBroker !== "tradier" && normalizedBroker !== "tradier_sandbox") {
  return block("Broker must be Tradier sandbox.", preview);
}

    if (!preview.contract_symbol) {
      return block("Missing contract_symbol.", preview);
    }

    if (!preview.order_side) {
      return block("Missing order_side.", preview);
    }

    if (!preview.order_type) {
      return block("Missing order_type.", preview);
    }

    if (!preview.time_in_force) {
      return block("Missing time_in_force.", preview);
    }

    if (!preview.quantity || preview.quantity <= 0) {
      return block("Quantity must be greater than 0.", preview);
    }

    if (!preview.estimated_limit_price || preview.estimated_limit_price <= 0) {
      return block("estimated_limit_price must be greater than 0.", preview);
    }

    if (preview.risk_guard_status !== "APPROVED") {
      return block("Risk Guard must be APPROVED.", preview);
    }

    if (!ALLOWED_CONTRACT_QUALITIES.has(preview.contract_quality ?? "")) {
      return block("Contract quality must be A+, A, or B.", preview);
    }

    if (
      preview.max_risk_dollars === null ||
      preview.max_risk_dollars === undefined ||
      preview.max_risk_dollars > 100
    ) {
      return block("max_risk_dollars must be less than or equal to 100.", preview);
    }

    const tradierStylePreviewPayload = {
      class: "option",
      symbol: preview.symbol,
      option_symbol: preview.contract_symbol,
      side: preview.order_side,
      type: preview.order_type,
      duration: preview.time_in_force,
      quantity: preview.quantity,
      price: preview.estimated_limit_price,
      preview_only: true,
    };

    return NextResponse.json(
      {
        success: true,
        route: "/api/tradier/orders/preview",
        mode: "sandbox_preview_validation_only",
        status: "PASSED",
        message:
          "Sandbox preview validation passed. No broker order was submitted. No database writes were performed.",
        safetyLocks: {
          approved_for_order: false,
          approved_for_sandbox_order: false,
          approved_for_live_order: false,
          submitted_to_broker: false,
        },
        tradierStylePreviewPayload,
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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Tradier sandbox preview validation route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: "/api/tradier/orders/preview",
        mode: "sandbox_preview_validation_only",
        status: "ERROR",
        message: "Unexpected server error during sandbox preview validation.",
        safetyLocks: {
          approved_for_order: false,
          approved_for_sandbox_order: false,
          approved_for_live_order: false,
          submitted_to_broker: false,
        },
      },
      { status: 500 }
    );
  }
}