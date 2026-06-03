import { NextRequest, NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;

    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol")?.toUpperCase() || "NVDA";
    const expiration = searchParams.get("expiration");

    if (!token) {
      return NextResponse.json({
        success: true,
        connected: false,
        route: "/api/tradier/options/chain",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_VERIFICATION",
        symbol,
        expiration,
        message:
          "Tradier access token is not set yet. This is expected while waiting for Tradier verification.",
        chainAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    if (!expiration) {
      return NextResponse.json(
        {
          success: false,
          connected: true,
          route: "/api/tradier/options/chain",
          mode: process.env.TRADIER_ENV || "sandbox",
          status: "MISSING_EXPIRATION",
          symbol,
          message:
            "Missing expiration query parameter. Example: /api/tradier/options/chain?symbol=NVDA&expiration=2026-06-19",
          chainAvailable: false,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: 400 }
      );
    }

    const result = await tradierRequest({
      path: `/markets/options/chains?symbol=${encodeURIComponent(
        symbol
      )}&expiration=${encodeURIComponent(expiration)}&greeks=true`,
      method: "GET",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          route: "/api/tradier/options/chain",
          message: "Tradier option chain request failed.",
          status: result.status,
          symbol,
          expiration,
          data: result.data,
          chainAvailable: false,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      route: "/api/tradier/options/chain",
      mode: process.env.TRADIER_ENV || "sandbox",
      status: "CONNECTED",
      symbol,
      expiration,
      chainAvailable: true,
      ordersEnabled: false,
      liveTradingEnabled: false,
      data: result.data,
    });
  } catch (error) {
    console.error("Tradier option chain route error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        route: "/api/tradier/options/chain",
        message: "Unexpected server error while loading Tradier option chain.",
        error: error instanceof Error ? error.message : "Unknown error",
        chainAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}