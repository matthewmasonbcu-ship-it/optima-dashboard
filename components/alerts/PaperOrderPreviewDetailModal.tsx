"use client";

import { useState } from "react";

export type PaperOrderPreviewRow = {
  id: string;
  created_at: string;
  symbol: string;
  trade_lane: string | null;
  setup_name: string | null;
  contract_symbol: string | null;
  strike: number | null;
  expiration: string | null;
  option_type: string | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  estimated_limit_price: number | null;
  quantity: number;
  estimated_order_cost: number | null;
  max_risk_dollars: number | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  preview_status: string;
  broker: string;
  order_side: string;
  order_type: string;
  time_in_force: string;
  approved_for_sandbox_order: boolean;
  approved_for_live_order: boolean;
  submitted_to_broker: boolean;
  ready_for_sandbox_preview: boolean;
  ready_for_sandbox_preview_at: string | null;
  sandbox_preview_locked_reason: string | null;
  safety_notes: string | null;
};

type SandboxPreviewValidationResult = {
  success: boolean;
  route: string;
  mode: string;
  status: "PASSED" | "BLOCKED" | "ERROR";
  message?: string;
  reason?: string;
  safetyLocks?: {
    approved_for_order: boolean;
    approved_for_sandbox_order: boolean;
    approved_for_live_order: boolean;
    submitted_to_broker: boolean;
  };
  tradierStylePreviewPayload?: {
    class: string;
    symbol: string | null;
    option_symbol: string | null;
    side: string | null;
    type: string | null;
    duration: string | null;
    quantity: number | null;
    price: number | null;
    preview_only: boolean;
  };
};

type BrokerPreviewLockTestResult = {
  success: boolean;
  route: string;
  mode: string;
  status: "BLOCKED" | "ERROR";
  message?: string;
  reason?: string;
  safetyLocks?: {
    approved_for_order: boolean;
    approved_for_sandbox_order: boolean;
    approved_for_live_order: boolean;
    submitted_to_broker: boolean;
  };
  brokerCall?: {
    tradierPreviewEndpointCalled: boolean;
    tradierOrderEndpointCalled: boolean;
    liveEndpointCalled: boolean;
  };
  dbWrites?: boolean;
  tradierSandboxPreviewPayload?: {
    class: string;
    symbol: string;
    option_symbol: string;
    side: string;
    quantity: number;
    type: string;
    duration: string;
    price: number;
  };
};

type SandboxEnvReadinessResult = {
  success: boolean;
  route: string;
  mode: string;
  status: "PASSED" | "BLOCKED" | "ERROR";
  message?: string;
  checks?: {
    tradierEnvPresent: boolean;
    tradierEnvIsSandbox: boolean;
    tradierAccessTokenPresent: boolean;
    tradierAccountIdPresent: boolean;
    sandboxBaseUrlPresent: boolean;
    sandboxBaseUrlIsSandboxOnly: boolean;
    ordersEnabledIsFalse: boolean;
    liveTradingEnabledIsFalse: boolean;
    tradierLiveTradingEnabledIsFalse: boolean;
    ordersEnabledRawValueSafe: boolean;
    liveTradingEnabledRawValueSafe: boolean;
    tradierLiveTradingEnabledRawValueSafe: boolean;
  };
  safeEnvSummary?: {
    tradierEnv?: string;
    accessTokenPresent: boolean;
    accountIdPresent: boolean;
    sandboxBaseUrl: string;
    ordersEnabled: boolean;
    liveTradingEnabled: boolean;
    tradierLiveTradingEnabled: boolean;
  };
  safetyLocks?: {
    approved_for_order: boolean;
    approved_for_sandbox_order: boolean;
    approved_for_live_order: boolean;
    submitted_to_broker: boolean;
  };
  brokerCall?: {
    tradierPreviewEndpointCalled: boolean;
    tradierOrderEndpointCalled: boolean;
    liveEndpointCalled: boolean;
  };
  dbWrites?: boolean;
  requiredTradierEnv?: string;
  requiredSandboxBaseUrl?: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null) {
  if (value === null) return "N/A";
  return `$${value.toFixed(2)}`;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatBool(value: boolean) {
  return value ? "YES" : "NO";
}

function buildDisplayBrokerPreviewPayload(preview: PaperOrderPreviewRow) {
  if (
    !preview.symbol ||
    !preview.contract_symbol ||
    !preview.order_side ||
    !preview.order_type ||
    !preview.time_in_force ||
    !preview.quantity ||
    !preview.estimated_limit_price
  ) {
    return null;
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

function getPreviewBadgeClass(status: string) {
  if (status === "PREVIEW_ONLY") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "REVIEWED_ONLY") {
    return "border-purple-500/40 bg-purple-500/10 text-purple-300";
  }

  if (status === "CANCELLED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-600 bg-slate-900 text-slate-300";
}

function getSandboxReadyBadgeClass(isReady: boolean) {
  if (isReady) {
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

function getValidationBadgeClass(status: string) {
  if (status === "PASSED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "BLOCKED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
}

function DetailRow({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default function PaperOrderPreviewDetailModal({
  preview,
  onClose,
}: {
  preview: PaperOrderPreviewRow;
  onClose: () => void;
}) {
  const [validatingSandboxPreview, setValidatingSandboxPreview] =
    useState(false);
  const [validationResult, setValidationResult] =
    useState<SandboxPreviewValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testingBrokerPreviewLock, setTestingBrokerPreviewLock] =
    useState(false);
  const [brokerPreviewLockResult, setBrokerPreviewLockResult] =
    useState<BrokerPreviewLockTestResult | null>(null);
  const [brokerPreviewLockError, setBrokerPreviewLockError] =
    useState<string | null>(null);
  const [checkingSandboxEnv, setCheckingSandboxEnv] = useState(false);
  const [sandboxEnvResult, setSandboxEnvResult] =
    useState<SandboxEnvReadinessResult | null>(null);
  const [sandboxEnvError, setSandboxEnvError] = useState<string | null>(null);

  const displayBrokerPreviewPayload = buildDisplayBrokerPreviewPayload(preview);

  const canValidateSandboxPreview =
    preview.preview_status === "REVIEWED_ONLY" &&
    preview.ready_for_sandbox_preview === true &&
    preview.approved_for_sandbox_order === false &&
    preview.approved_for_live_order === false &&
    preview.submitted_to_broker === false;


  async function checkSandboxEnvReadiness() {
    setCheckingSandboxEnv(true);
    setSandboxEnvResult(null);
    setSandboxEnvError(null);

    try {
      const response = await fetch("/api/tradier/orders/sandbox-env-check", {
        method: "GET",
      });

      const result = (await response.json()) as SandboxEnvReadinessResult;

      if (!response.ok) {
        setSandboxEnvError(
          result.message || "Sandbox env readiness check failed."
        );
        return;
      }

      setSandboxEnvResult(result);
    } catch (error) {
      console.error("Sandbox env readiness UI error:", error);
      setSandboxEnvError(
        "Unexpected UI error while checking sandbox environment readiness."
      );
    } finally {
      setCheckingSandboxEnv(false);
    }
  }

  async function validateSandboxPreview() {
    setValidatingSandboxPreview(true);
    setValidationResult(null);
    setValidationError(null);

    try {
      const response = await fetch("/api/tradier/orders/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper_order_preview_id: preview.id,
        }),
      });

      const result = (await response.json()) as SandboxPreviewValidationResult;

      if (!response.ok) {
        setValidationError(
          result.message || "Sandbox preview validation failed."
        );
        return;
      }

      setValidationResult(result);
    } catch (error) {
      console.error("Sandbox preview validation UI error:", error);
      setValidationError("Unexpected UI error while validating preview.");
    } finally {
      setValidatingSandboxPreview(false);
    }
  }

  async function testBrokerPreviewLock() {
    setTestingBrokerPreviewLock(true);
    setBrokerPreviewLockResult(null);
    setBrokerPreviewLockError(null);

    try {
      const response = await fetch("/api/tradier/orders/sandbox-broker-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper_order_preview_id: preview.id,
        }),
      });

      const result = (await response.json()) as BrokerPreviewLockTestResult;

      if (!response.ok) {
        setBrokerPreviewLockError(
          result.message || "Broker preview lock test failed."
        );
        return;
      }

      setBrokerPreviewLockResult(result);
    } catch (error) {
      console.error("Broker preview lock test UI error:", error);
      setBrokerPreviewLockError(
        "Unexpected UI error while testing broker preview lock."
      );
    } finally {
      setTestingBrokerPreviewLock(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Paper Preview Detail
            </p>

            <h3 className="mt-2 text-2xl font-bold text-white">
              {preview.symbol} Order Preview
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Deep inspection only. No Tradier order submitted.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${getPreviewBadgeClass(
              preview.preview_status
            )}`}
          >
            {preview.preview_status}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${getSandboxReadyBadgeClass(
              preview.ready_for_sandbox_preview
            )}`}
          >
            {preview.ready_for_sandbox_preview
              ? "READY FOR SANDBOX PREVIEW"
              : "SANDBOX PREVIEW LOCKED"}
          </span>

          {preview.contract_quality && (
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
              Grade {preview.contract_quality}
            </span>
          )}

          {preview.risk_guard_status && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              Risk Guard {preview.risk_guard_status}
            </span>
          )}

          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
            {preview.broker}
          </span>
        </div>

        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">
                Tradier Sandbox Env Readiness
              </h4>

              <p className="mt-2 text-sm text-emerald-100/80">
                Read-only environment check. This verifies sandbox settings and
                safety flags only. It does not call Tradier, does not submit
                orders, and does not write to Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={checkSandboxEnvReadiness}
              disabled={checkingSandboxEnv}
              className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              {checkingSandboxEnv ? "Checking..." : "Check Sandbox Env"}
            </button>
          </div>

          {sandboxEnvError && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {sandboxEnvError}
            </div>
          )}

          {sandboxEnvResult && (
            <div
              className={`mt-4 rounded-xl border p-4 ${getValidationBadgeClass(
                sandboxEnvResult.status
              )}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-current px-3 py-1 text-xs font-bold">
                  {sandboxEnvResult.status}
                </span>

                <span className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                  {sandboxEnvResult.mode}
                </span>
              </div>

              <p className="mt-3 text-sm">
                {sandboxEnvResult.message || "Sandbox env check completed."}
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <DetailRow
                  label="Tradier Env"
                  value={formatValue(sandboxEnvResult.safeEnvSummary?.tradierEnv)}
                  valueClassName={
                    sandboxEnvResult.checks?.tradierEnvIsSandbox
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Token Present"
                  value={formatBool(
                    sandboxEnvResult.safeEnvSummary?.accessTokenPresent ?? false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.tradierAccessTokenPresent
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Account ID Present"
                  value={formatBool(
                    sandboxEnvResult.safeEnvSummary?.accountIdPresent ?? false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.tradierAccountIdPresent
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Sandbox URL Safe"
                  value={formatBool(
                    sandboxEnvResult.checks?.sandboxBaseUrlIsSandboxOnly ??
                      false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.sandboxBaseUrlIsSandboxOnly
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Orders Enabled"
                  value={formatBool(
                    sandboxEnvResult.safeEnvSummary?.ordersEnabled ?? false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.ordersEnabledIsFalse
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Live Trading Enabled"
                  value={formatBool(
                    sandboxEnvResult.safeEnvSummary?.liveTradingEnabled ?? false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.liveTradingEnabledIsFalse
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="Tradier Live Enabled"
                  value={formatBool(
                    sandboxEnvResult.safeEnvSummary
                      ?.tradierLiveTradingEnabled ?? false
                  )}
                  valueClassName={
                    sandboxEnvResult.checks?.tradierLiveTradingEnabledIsFalse
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                />

                <DetailRow
                  label="DB Writes"
                  value={formatBool(sandboxEnvResult.dbWrites ?? false)}
                  valueClassName={
                    sandboxEnvResult.dbWrites ? "text-red-300" : "text-emerald-300"
                  }
                />

                <DetailRow
                  label="Tradier Preview Called"
                  value={formatBool(
                    sandboxEnvResult.brokerCall?.tradierPreviewEndpointCalled ??
                      false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="Tradier Order Called"
                  value={formatBool(
                    sandboxEnvResult.brokerCall?.tradierOrderEndpointCalled ??
                      false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="Live Endpoint Called"
                  value={formatBool(
                    sandboxEnvResult.brokerCall?.liveEndpointCalled ?? false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="Required Env"
                  value={formatValue(sandboxEnvResult.requiredTradierEnv)}
                  valueClassName="text-emerald-300"
                />
              </div>

              {sandboxEnvResult.safeEnvSummary?.sandboxBaseUrl && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-black/20 p-3 text-sm text-emerald-200">
                  Sandbox base URL:{" "}
                  {sandboxEnvResult.safeEnvSummary.sandboxBaseUrl}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">
                Sandbox Preview Validation
              </h4>
              <p className="mt-2 text-sm text-sky-100/80">
                Validates the locked preview payload only. This does not submit
                to Tradier, does not approve sandbox execution, and does not
                write to Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={validateSandboxPreview}
              disabled={validatingSandboxPreview || !canValidateSandboxPreview}
              className="rounded-xl border border-sky-400/50 bg-sky-500/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              {validatingSandboxPreview
                ? "Validating..."
                : "Validate Sandbox Preview"}
            </button>
          </div>

          {!canValidateSandboxPreview && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
              Locked until preview is REVIEWED_ONLY, ready for sandbox preview,
              and all broker approval/submission locks are false.
            </p>
          )}

          {validationError && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {validationError}
            </div>
          )}

          {validationResult && (
            <div
              className={`mt-4 rounded-xl border p-4 ${getValidationBadgeClass(
                validationResult.status
              )}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-current px-3 py-1 text-xs font-bold">
                  {validationResult.status}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                  {validationResult.mode}
                </span>
              </div>

              <p className="mt-3 text-sm">
                {validationResult.message ||
                  validationResult.reason ||
                  "Validation completed."}
              </p>

              {validationResult.tradierStylePreviewPayload && (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <DetailRow
                    label="Payload Class"
                    value={validationResult.tradierStylePreviewPayload.class}
                  />
                  <DetailRow
                    label="Payload Symbol"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.symbol
                    )}
                  />
                  <DetailRow
                    label="Option Symbol"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.option_symbol
                    )}
                  />
                  <DetailRow
                    label="Side"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.side
                    )}
                  />
                  <DetailRow
                    label="Type"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.type
                    )}
                  />
                  <DetailRow
                    label="Duration"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.duration
                    )}
                  />
                  <DetailRow
                    label="Quantity"
                    value={formatValue(
                      validationResult.tradierStylePreviewPayload.quantity
                    )}
                  />
                  <DetailRow
                    label="Limit Price"
                    value={formatMoney(
                      validationResult.tradierStylePreviewPayload.price
                    )}
                  />
                </div>
              )}

              {validationResult.safetyLocks && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-black/20 p-3 text-sm text-emerald-200">
                  Safety locks confirmed false: sandbox approval, live
                  approval, and broker submitted all remain locked.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-orange-300">
                Tradier Broker Preview Route
              </h4>

              <p className="mt-2 text-sm text-orange-100/80">
                LOCKED. The future Tradier sandbox broker-preview route exists,
                but external Tradier preview calls are blocked in this version.
                The dashboard currently supports internal validation only.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                BLOCKED ONLY
              </span>

              <button
                type="button"
                onClick={testBrokerPreviewLock}
                disabled={testingBrokerPreviewLock}
                className="rounded-xl border border-orange-400/50 bg-orange-500/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
              >
                {testingBrokerPreviewLock
                  ? "Testing Lock..."
                  : "Test Broker Preview Lock"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailRow
              label="Route"
              value="/api/tradier/orders/sandbox-broker-preview"
              valueClassName="text-orange-200"
            />

            <DetailRow
              label="Mode"
              value="sandbox_broker_preview_blocked_only"
              valueClassName="text-orange-200"
            />

            <DetailRow
              label="Tradier Preview Call"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />

            <DetailRow
              label="Tradier Order Call"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />

            <DetailRow
              label="Live Endpoint"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />

            <DetailRow
              label="DB Writes"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />
          </div>

          {displayBrokerPreviewPayload && (
            <div className="mt-4 rounded-xl border border-orange-500/30 bg-black/20 p-4">
              <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                Locked Payload Preview
              </h5>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <DetailRow
                  label="Class"
                  value={displayBrokerPreviewPayload.class}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Symbol"
                  value={displayBrokerPreviewPayload.symbol}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Option Symbol"
                  value={displayBrokerPreviewPayload.option_symbol}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Side"
                  value={displayBrokerPreviewPayload.side}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Quantity"
                  value={displayBrokerPreviewPayload.quantity}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Type"
                  value={displayBrokerPreviewPayload.type}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Duration"
                  value={displayBrokerPreviewPayload.duration}
                  valueClassName="text-orange-200"
                />

                <DetailRow
                  label="Price"
                  value={formatMoney(displayBrokerPreviewPayload.price)}
                  valueClassName="text-orange-200"
                />
              </div>
            </div>
          )}

          {brokerPreviewLockError && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {brokerPreviewLockError}
            </div>
          )}

          {brokerPreviewLockResult && (
            <div className="mt-4 rounded-xl border border-orange-500/30 bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                  {brokerPreviewLockResult.status}
                </span>

                <span className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200/80">
                  {brokerPreviewLockResult.mode}
                </span>
              </div>

              <p className="mt-3 text-sm text-orange-100/80">
                {brokerPreviewLockResult.reason ||
                  brokerPreviewLockResult.message ||
                  "Broker preview lock test completed."}
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <DetailRow
                  label="Tradier Preview Called"
                  value={formatBool(
                    brokerPreviewLockResult.brokerCall
                      ?.tradierPreviewEndpointCalled ?? false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="Tradier Order Called"
                  value={formatBool(
                    brokerPreviewLockResult.brokerCall
                      ?.tradierOrderEndpointCalled ?? false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="Live Endpoint Called"
                  value={formatBool(
                    brokerPreviewLockResult.brokerCall?.liveEndpointCalled ??
                      false
                  )}
                  valueClassName="text-emerald-300"
                />

                <DetailRow
                  label="DB Writes"
                  value={formatBool(brokerPreviewLockResult.dbWrites ?? false)}
                  valueClassName="text-emerald-300"
                />
              </div>

              {brokerPreviewLockResult.tradierSandboxPreviewPayload && (
                <div className="mt-4 rounded-xl border border-orange-500/30 bg-black/20 p-4">
                  <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                    Returned Locked Payload
                  </h5>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <DetailRow
                      label="Class"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .class
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Symbol"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .symbol
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Option Symbol"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .option_symbol
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Side"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .side
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Quantity"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .quantity
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Type"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .type
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Duration"
                      value={
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .duration
                      }
                      valueClassName="text-orange-200"
                    />

                    <DetailRow
                      label="Price"
                      value={formatMoney(
                        brokerPreviewLockResult.tradierSandboxPreviewPayload
                          .price
                      )}
                      valueClassName="text-orange-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-orange-500/30 bg-black/20 p-3 text-sm text-orange-100/80">
            Future broker-preview calls will require a separate safety sprint.
            This section is informational only and cannot contact Tradier.
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-red-300">
                Sandbox Submit Route
              </h4>

              <p className="mt-2 text-sm text-red-100/80">
                LOCKED. The sandbox submit route exists, but it is blocked-only
                in this version. No Tradier sandbox order submission is enabled
                from the dashboard yet.
              </p>
            </div>

            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
              BLOCKED ONLY
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailRow
              label="Route"
              value="/api/tradier/orders/sandbox-submit"
              valueClassName="text-red-200"
            />

            <DetailRow
              label="Mode"
              value="sandbox_submit_blocked_only"
              valueClassName="text-red-200"
            />

            <DetailRow
              label="Broker Call"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />

            <DetailRow
              label="DB Writes"
              value="DISABLED"
              valueClassName="text-emerald-300"
            />
          </div>

          <div className="mt-4 rounded-xl border border-red-500/30 bg-black/20 p-3 text-sm text-red-100/80">
            Future sandbox order submission will require a separate reviewed
            safety sprint. This modal currently supports validation only.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Contract
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Symbol" value={preview.symbol} />
              <DetailRow
                label="Contract Symbol"
                value={formatValue(preview.contract_symbol)}
              />
              <DetailRow
                label="Option Type"
                value={formatValue(preview.option_type)}
              />
              <DetailRow label="Strike" value={formatValue(preview.strike)} />
              <DetailRow
                label="Expiration"
                value={formatValue(preview.expiration)}
              />
              <DetailRow
                label="Contract Quality"
                value={formatValue(preview.contract_quality)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Pricing
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Bid" value={formatMoney(preview.bid)} />
              <DetailRow label="Ask" value={formatMoney(preview.ask)} />
              <DetailRow label="Mid" value={formatMoney(preview.mid)} />
              <DetailRow
                label="Estimated Limit"
                value={formatMoney(preview.estimated_limit_price)}
              />
              <DetailRow
                label="Estimated Cost"
                value={formatMoney(preview.estimated_order_cost)}
              />
              <DetailRow
                label="Max Risk"
                value={formatMoney(preview.max_risk_dollars)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Order Preview
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Broker" value={preview.broker} />
              <DetailRow label="Side" value={preview.order_side} />
              <DetailRow label="Order Type" value={preview.order_type} />
              <DetailRow label="Time In Force" value={preview.time_in_force} />
              <DetailRow label="Quantity" value={preview.quantity} />
              <DetailRow
                label="Created"
                value={formatDateTime(preview.created_at)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Safety Locks
            </h4>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow
                label="Sandbox Approved"
                value={formatBool(preview.approved_for_sandbox_order)}
                valueClassName={
                  preview.approved_for_sandbox_order
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Live Approved"
                value={formatBool(preview.approved_for_live_order)}
                valueClassName={
                  preview.approved_for_live_order
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Broker Submitted"
                value={formatBool(preview.submitted_to_broker)}
                valueClassName={
                  preview.submitted_to_broker
                    ? "text-red-300"
                    : "text-emerald-300"
                }
              />
              <DetailRow
                label="Ready For Sandbox Preview"
                value={formatBool(preview.ready_for_sandbox_preview)}
                valueClassName={
                  preview.ready_for_sandbox_preview
                    ? "text-sky-300"
                    : "text-slate-300"
                }
              />
            </div>

            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <p className="font-bold">Current hard lock</p>
              <p className="mt-1 text-emerald-300/80">
                This preview is inspection-only. It does not submit to Tradier,
                does not approve sandbox execution, and does not approve live
                execution.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Sandbox Locked Reason
            </h4>

            <p className="mt-3 text-sm text-slate-400">
              {preview.sandbox_preview_locked_reason ||
                "No sandbox readiness reason saved yet."}
            </p>

            {preview.ready_for_sandbox_preview_at && (
              <p className="mt-3 text-xs text-sky-300">
                Marked ready:{" "}
                {formatDateTime(preview.ready_for_sandbox_preview_at)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
              Safety Notes
            </h4>

            <p className="mt-3 text-sm text-slate-400">
              {preview.safety_notes || "No safety notes saved yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}