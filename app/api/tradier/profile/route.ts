import { NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";

export async function GET() {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: true,
        connected: false,
        route: "/api/tradier/profile",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_VERIFICATION",
        message:
          "Tradier access token is not set yet. This is expected while waiting for Tradier verification.",
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    const result = await tradierRequest({
      path: "/user/profile",
      method: "GET",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          route: "/api/tradier/profile",
          message: "Tradier profile request failed.",
          status: result.status,
          data: result.data,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      route: "/api/tradier/profile",
      mode: process.env.TRADIER_ENV || "sandbox",
      status: "CONNECTED",
      ordersEnabled: false,
      liveTradingEnabled: false,
      data: result.data,
    });
  } catch (error) {
    console.error("Tradier profile route error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        route: "/api/tradier/profile",
        message: "Unexpected server error while loading Tradier profile.",
        error: error instanceof Error ? error.message : "Unknown error",
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}