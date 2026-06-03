import { NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";

export async function GET() {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;
    const accountId = process.env.TRADIER_ACCOUNT_ID;

    if (!token) {
      return NextResponse.json({
        success: true,
        connected: false,
        route: "/api/tradier/positions",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_VERIFICATION",
        message:
          "Tradier access token is not set yet. This is expected while waiting for Tradier verification.",
        positionsAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    if (!accountId) {
      return NextResponse.json({
        success: true,
        connected: true,
        route: "/api/tradier/positions",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_ACCOUNT_ID",
        message:
          "Tradier token exists, but TRADIER_ACCOUNT_ID is not set yet. Get the account ID from /api/tradier/profile after verification.",
        positionsAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    const result = await tradierRequest({
      path: `/accounts/${accountId}/positions`,
      method: "GET",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          route: "/api/tradier/positions",
          message: "Tradier positions request failed.",
          status: result.status,
          data: result.data,
          positionsAvailable: false,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      route: "/api/tradier/positions",
      mode: process.env.TRADIER_ENV || "sandbox",
      status: "CONNECTED",
      positionsAvailable: true,
      ordersEnabled: false,
      liveTradingEnabled: false,
      data: result.data,
    });
  } catch (error) {
    console.error("Tradier positions route error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        route: "/api/tradier/positions",
        message: "Unexpected server error while loading Tradier positions.",
        error: error instanceof Error ? error.message : "Unknown error",
        positionsAvailable: false,
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}