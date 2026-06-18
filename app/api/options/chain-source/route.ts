import { NextRequest, NextResponse } from "next/server";

type ChainSource = "mock" | "tradier" | "auto";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const requestedSource = (
      searchParams.get("source") || "auto"
    ).toLowerCase() as ChainSource;

    const symbol = searchParams.get("symbol")?.toUpperCase() || "NVDA";

    const tradierEnv = (process.env.TRADIER_ENV || "sandbox").toLowerCase();
    const tradierToken =
      tradierEnv === "production"
        ? process.env.TRADIER_PRODUCTION_TOKEN
        : process.env.TRADIER_ACCESS_TOKEN;
    const tradierBaseUrl =
      tradierEnv === "production"
        ? "https://api.tradier.com/v1"
        : "https://sandbox.tradier.com/v1";

    const tradierVerified = Boolean(tradierToken);

    let effectiveSource: "mock" | "tradier" = "mock";
    let status = "MOCK_ACTIVE";
    let message =
      "Mock option chain is active. Tradier option chain is prepared but not connected yet.";

    if (requestedSource === "mock") {
      effectiveSource = "mock";
      status = "MOCK_ACTIVE";
      message = "Mock option chain was requested directly.";
    }

    if (requestedSource === "tradier") {
      if (!tradierVerified) {
        effectiveSource = "mock";
        status = "TRADIER_WAITING_VERIFICATION";
        message =
          "Tradier option chain was requested, but Tradier access token is not set yet. Falling back to mock option chain.";
      } else {
        effectiveSource = "tradier";
        status = "TRADIER_READY";
        message =
          "Tradier access token exists. Tradier option chain can be used when connected to the selector.";
      }
    }

    if (requestedSource === "auto") {
      if (tradierVerified) {
        effectiveSource = "tradier";
        status = "TRADIER_READY";
        message =
          "Auto mode selected Tradier because a Tradier access token exists.";
      } else {
        effectiveSource = "mock";
        status = "MOCK_ACTIVE_WAITING_TRADIER";
        message =
          "Auto mode selected mock option chain because Tradier verification/token is still pending.";
      }
    }

    return NextResponse.json({
      success: true,
      route: "/api/options/chain-source",
      symbol,
      requestedSource,
      effectiveSource,
      status,
      message,

      sources: {
        mock: {
          available: true,
          active: effectiveSource === "mock",
        },
        tradier: {
          available: tradierVerified,
          active: effectiveSource === "tradier",
          mode: tradierEnv,
          baseUrl: tradierBaseUrl,
          status: tradierVerified ? "READY" : "WAITING_VERIFICATION",
        },
      },

      safety: {
        ordersEnabled: false,
        liveTradingEnabled: false,
        brokerOrdersBlocked: true,
      },
    });
  } catch (error) {
    console.error("Option chain source route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: "/api/options/chain-source",
        status: "ERROR",
        message: "Unexpected server error while checking option chain source.",
        error: error instanceof Error ? error.message : "Unknown error",
        safety: {
          ordersEnabled: false,
          liveTradingEnabled: false,
          brokerOrdersBlocked: true,
        },
      },
      { status: 500 }
    );
  }
}