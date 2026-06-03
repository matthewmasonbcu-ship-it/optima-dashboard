import { NextRequest, NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol")?.toUpperCase() || "NVDA";

    if (!token) {
      return NextResponse.json({
        success: true,
        connected: false,
        route: "/api/tradier/options/expirations",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_VERIFICATION",
        symbol,
        message:
          "Tradier access token is not set yet. This is expected while waiting for Tradier verification.",
        expirationsAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    const result = await tradierRequest({
      path: `/markets/options/expirations?symbol=${encodeURIComponent(
        symbol
      )}&includeAllRoots=true&strikes=false`,
      method: "GET",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          route: "/api/tradier/options/expirations",
          message: "Tradier option expirations request failed.",
          status: result.status,
          symbol,
          data: result.data,
          expirationsAvailable: false,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      route: "/api/tradier/options/expirations",
      mode: process.env.TRADIER_ENV || "sandbox",
      status: "CONNECTED",
      symbol,
      expirationsAvailable: true,
      ordersEnabled: false,
      liveTradingEnabled: false,
      data: result.data,
    });
  } catch (error) {
    console.error("Tradier option expirations route error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        route: "/api/tradier/options/expirations",
        message: "Unexpected server error while loading Tradier option expirations.",
        error: error instanceof Error ? error.message : "Unknown error",
        expirationsAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}