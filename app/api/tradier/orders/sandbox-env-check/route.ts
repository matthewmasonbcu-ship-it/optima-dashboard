import { NextResponse } from "next/server";

const REQUIRED_TRADIER_ENV = "sandbox";
const REQUIRED_SANDBOX_BASE_URL = "https://sandbox.tradier.com/v1";

function isTrue(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

function isFalseOrMissing(value: string | undefined) {
  return value === undefined || value.toLowerCase() === "false";
}

export async function GET() {
  const tradierEnv = process.env.TRADIER_ENV;
  const tradierAccessToken = process.env.TRADIER_ACCESS_TOKEN;
  const tradierAccountId = process.env.TRADIER_ACCOUNT_ID;
  const tradierSandboxBaseUrl =
    process.env.TRADIER_SANDBOX_BASE_URL || REQUIRED_SANDBOX_BASE_URL;

  const ordersEnabled = isTrue(process.env.ORDERS_ENABLED);
  const liveTradingEnabled = isTrue(process.env.LIVE_TRADING_ENABLED);
  const tradierLiveTradingEnabled = isTrue(
    process.env.TRADIER_LIVE_TRADING_ENABLED
  );

  const checks = {
    tradierEnvPresent: Boolean(tradierEnv),
    tradierEnvIsSandbox: tradierEnv === REQUIRED_TRADIER_ENV,

    tradierAccessTokenPresent: Boolean(tradierAccessToken),
    tradierAccountIdPresent: Boolean(tradierAccountId),

    sandboxBaseUrlPresent: Boolean(tradierSandboxBaseUrl),
    sandboxBaseUrlIsSandboxOnly:
      tradierSandboxBaseUrl === REQUIRED_SANDBOX_BASE_URL,

    ordersEnabledIsFalse: ordersEnabled === false,
    liveTradingEnabledIsFalse: liveTradingEnabled === false,
    tradierLiveTradingEnabledIsFalse: tradierLiveTradingEnabled === false,

    ordersEnabledRawValueSafe: isFalseOrMissing(process.env.ORDERS_ENABLED),
    liveTradingEnabledRawValueSafe: isFalseOrMissing(
      process.env.LIVE_TRADING_ENABLED
    ),
    tradierLiveTradingEnabledRawValueSafe: isFalseOrMissing(
      process.env.TRADIER_LIVE_TRADING_ENABLED
    ),
  };

  const passed =
    checks.tradierEnvPresent &&
    checks.tradierEnvIsSandbox &&
    checks.tradierAccessTokenPresent &&
    checks.tradierAccountIdPresent &&
    checks.sandboxBaseUrlPresent &&
    checks.sandboxBaseUrlIsSandboxOnly &&
    checks.ordersEnabledIsFalse &&
    checks.liveTradingEnabledIsFalse &&
    checks.tradierLiveTradingEnabledIsFalse &&
    checks.ordersEnabledRawValueSafe &&
    checks.liveTradingEnabledRawValueSafe &&
    checks.tradierLiveTradingEnabledRawValueSafe;

  return NextResponse.json(
    {
      success: true,
      route: "/api/tradier/orders/sandbox-env-check",
      mode: "sandbox_env_readiness_check_only",
      status: passed ? "PASSED" : "BLOCKED",
      message: passed
        ? "Tradier sandbox environment readiness checks passed. No broker endpoint was called."
        : "Tradier sandbox environment readiness checks failed. External broker calls must remain disabled.",
      checks,
      safeEnvSummary: {
        tradierEnv,
        accessTokenPresent: Boolean(tradierAccessToken),
        accountIdPresent: Boolean(tradierAccountId),
        sandboxBaseUrl: tradierSandboxBaseUrl,
        ordersEnabled,
        liveTradingEnabled,
        tradierLiveTradingEnabled,
      },
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
      requiredTradierEnv: REQUIRED_TRADIER_ENV,
      requiredSandboxBaseUrl: REQUIRED_SANDBOX_BASE_URL,
    },
    { status: 200 }
  );
}