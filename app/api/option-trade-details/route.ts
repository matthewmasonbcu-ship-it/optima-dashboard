import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function normalizeContractQuality(value: unknown): string {
  const quality = String(value || "UNKNOWN").toUpperCase();

  if (quality === "IDEAL") return "A+";
  if (quality === "GOOD") return "A";
  if (quality === "ACCEPTABLE") return "B";
  if (quality === "AVOID") return "BLOCKED";

  if (
    quality === "A+" ||
    quality === "A" ||
    quality === "B" ||
    quality === "C" ||
    quality === "BLOCKED"
  ) {
    return quality;
  }

  return "UNKNOWN";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      paper_trade_id,
      stock_symbol,
      trade_direction,
      option_symbol,
      expiration_date,
      strike_price,
      bid_price,
      ask_price,
      mid_price,
      contracts,
      estimated_cost,
      max_risk,
      risk_guard_status,
      risk_guard_reason,
      override_used,
      override_reason,

      // Contract quality grade support
      contract_quality,
      qualityGrade,
      contractQualityGrade,
      grade,
      quality_grade,
      contract_quality_grade,

      // Credit spread support
      spread_type,
      short_leg_option_symbol,
      short_leg_strike_price,
      short_leg_bid_price,
      short_leg_ask_price,
      short_leg_mid_price,
      long_leg_option_symbol,
      long_leg_strike_price,
      long_leg_bid_price,
      long_leg_ask_price,
      long_leg_mid_price,
      net_credit,
      spread_width,
      max_loss,
      max_profit,
    } = body;

    if (!paper_trade_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing paper_trade_id.",
        },
        { status: 400 }
      );
    }

    if (!stock_symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing stock_symbol.",
        },
        { status: 400 }
      );
    }

    if (!trade_direction) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing trade_direction.",
        },
        { status: 400 }
      );
    }

    if (!option_symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing option_symbol.",
        },
        { status: 400 }
      );
    }

    const savedContractQuality = normalizeContractQuality(
      contract_quality ||
        qualityGrade ||
        contractQualityGrade ||
        grade ||
        quality_grade ||
        contract_quality_grade
    );

    const insertPayload = {
      paper_trade_id,
      stock_symbol,
      trade_direction,
      option_symbol,
      expiration_date: expiration_date || null,
      strike_price: toNumberOrNull(strike_price),
      bid_price: toNumberOrNull(bid_price),
      ask_price: toNumberOrNull(ask_price),
      mid_price: toNumberOrNull(mid_price),
      contracts: toNumberOrNull(contracts),
      estimated_cost: toNumberOrNull(estimated_cost),
      max_risk: toNumberOrNull(max_risk),
      risk_guard_status: risk_guard_status || null,
      risk_guard_reason: risk_guard_reason || null,
      override_used: toBoolean(override_used),
      override_reason: override_reason || null,
      contract_quality: savedContractQuality,

      // Credit spread support
      spread_type: spread_type || "single_leg",
      short_leg_option_symbol: short_leg_option_symbol || null,
      short_leg_strike_price: toNumberOrNull(short_leg_strike_price),
      short_leg_bid_price: toNumberOrNull(short_leg_bid_price),
      short_leg_ask_price: toNumberOrNull(short_leg_ask_price),
      short_leg_mid_price: toNumberOrNull(short_leg_mid_price),
      long_leg_option_symbol: long_leg_option_symbol || null,
      long_leg_strike_price: toNumberOrNull(long_leg_strike_price),
      long_leg_bid_price: toNumberOrNull(long_leg_bid_price),
      long_leg_ask_price: toNumberOrNull(long_leg_ask_price),
      long_leg_mid_price: toNumberOrNull(long_leg_mid_price),
      net_credit: toNumberOrNull(net_credit),
      spread_width: toNumberOrNull(spread_width),
      max_loss: toNumberOrNull(max_loss),
      max_profit: toNumberOrNull(max_profit),
    };

    const { data, error } = await supabase
      .from("option_trade_details")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Option trade details insert error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Option trade details route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown option trade details error.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Option trade details API is running.",
  });
}