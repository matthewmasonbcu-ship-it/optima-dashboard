// SINGLE SOURCE OF TRUTH for the paper order routes' RISK / VALIDATION gates.
//
// The three paper order routes (/preview, /sandbox-broker-preview, /sandbox-submit)
// previously inlined an identical 16-check gate chain — which is how a stale $100
// max-risk literal got copy-pasted three times. This module centralizes that chain
// as a PURE, verdict-returning judge and reads the canonical pipeline cap
// (MAX_RISK_PER_TRADE_DOLLARS = $500) instead of a hard-coded literal.
//
// SAFETY CONTRACT — this module is deliberately powerless beyond judging:
//   - No I/O: it never fetches, never writes the DB, never calls Tradier, never
//     reads an env var. It receives an already-fetched row and returns a verdict.
//   - No responses: each route keeps its own block()/blocked() envelope and its own
//     terminal (PASSED + preview_only payload, or BLOCKED "not enabled in v1").
//   - No locks flipped: it only READS the four execution-lock fields and blocks if
//     any is already true. It cannot submit, write, or change any lock.
// Because it has no submit path and no side effects, wiring the routes to it cannot
// enable an order or weaken a lock — those live entirely in the routes, unchanged.

import { MAX_RISK_PER_TRADE_DOLLARS } from "./preTradeChecks";

export const ORDER_SAFETY_ALLOWED_QUALITIES = new Set(["A+", "A", "B"]);

// The one per-trade risk cap all order routes gate on — was a stale $100 literal
// copy-pasted per route; now the canonical pipeline constant ($500).
export const ORDER_SAFETY_MAX_RISK_DOLLARS = MAX_RISK_PER_TRADE_DOLLARS;

export type OrderSafetyPreview = {
  preview_status: string | null;
  ready_for_sandbox_preview: boolean | null;
  approved_for_order: boolean | null;
  approved_for_sandbox_order: boolean | null;
  approved_for_live_order: boolean | null;
  submitted_to_broker: boolean | null;
  broker: string | null;
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

export type OrderSafetyFailCode =
  | "PREVIEW_STATUS"
  | "READY"
  | "LOCK_APPROVED_FOR_ORDER"
  | "LOCK_APPROVED_FOR_SANDBOX_ORDER"
  | "LOCK_APPROVED_FOR_LIVE_ORDER"
  | "LOCK_SUBMITTED_TO_BROKER"
  | "BROKER"
  | "MISSING_CONTRACT_SYMBOL"
  | "MISSING_ORDER_SIDE"
  | "MISSING_ORDER_TYPE"
  | "MISSING_TIME_IN_FORCE"
  | "QUANTITY"
  | "ESTIMATED_LIMIT_PRICE"
  | "RISK_GUARD"
  | "CONTRACT_QUALITY"
  | "MAX_RISK";

export type OrderSafetyResult =
  | { ok: true }
  | { ok: false; code: OrderSafetyFailCode; reason: string };

// Route-specific reason strings for the three gates whose wording legitimately
// differs per route (the preview_status suffix, the ready suffix, and the broker
// rule). Injected so the shared judge returns each route's EXACT legacy reason —
// zero response drift beyond the intended $100 → $500 on the max-risk gate.
export type OrderSafetyReasons = {
  notReviewedOnly: string;
  notReady: string;
  brokerInvalid: string;
};

export type OrderSafetyOptions = {
  // Lowercased broker values this route accepts. preview allows both
  // ["tradier", "tradier_sandbox"]; broker-preview and submit require exactly
  // ["tradier_sandbox"].
  allowedBrokers: string[];
  reasons: OrderSafetyReasons;
};

// Runs the common gate chain in the EXACT order the three routes used inline.
// Returns { ok: true } if every gate passes, else { ok: false, code, reason } for
// the FIRST failing gate. The route maps this to its own block()/blocked() envelope.
export function runOrderSafetyGates(
  preview: OrderSafetyPreview,
  options: OrderSafetyOptions
): OrderSafetyResult {
  const { allowedBrokers, reasons } = options;

  if (preview.preview_status !== "REVIEWED_ONLY") {
    return { ok: false, code: "PREVIEW_STATUS", reason: reasons.notReviewedOnly };
  }

  if (preview.ready_for_sandbox_preview !== true) {
    return { ok: false, code: "READY", reason: reasons.notReady };
  }

  // Execution-lock read-guards — block if ANY lock is already true. These READ the
  // row only; they never flip a lock.
  if (preview.approved_for_order === true) {
    return { ok: false, code: "LOCK_APPROVED_FOR_ORDER", reason: "approved_for_order must remain false." };
  }
  if (preview.approved_for_sandbox_order === true) {
    return { ok: false, code: "LOCK_APPROVED_FOR_SANDBOX_ORDER", reason: "approved_for_sandbox_order must remain false." };
  }
  if (preview.approved_for_live_order === true) {
    return { ok: false, code: "LOCK_APPROVED_FOR_LIVE_ORDER", reason: "approved_for_live_order must remain false." };
  }
  if (preview.submitted_to_broker === true) {
    return { ok: false, code: "LOCK_SUBMITTED_TO_BROKER", reason: "submitted_to_broker must remain false." };
  }

  const normalizedBroker = (preview.broker ?? "").toLowerCase();
  if (!allowedBrokers.includes(normalizedBroker)) {
    return { ok: false, code: "BROKER", reason: reasons.brokerInvalid };
  }

  if (!preview.contract_symbol) {
    return { ok: false, code: "MISSING_CONTRACT_SYMBOL", reason: "Missing contract_symbol." };
  }
  if (!preview.order_side) {
    return { ok: false, code: "MISSING_ORDER_SIDE", reason: "Missing order_side." };
  }
  if (!preview.order_type) {
    return { ok: false, code: "MISSING_ORDER_TYPE", reason: "Missing order_type." };
  }
  if (!preview.time_in_force) {
    return { ok: false, code: "MISSING_TIME_IN_FORCE", reason: "Missing time_in_force." };
  }
  if (!preview.quantity || preview.quantity <= 0) {
    return { ok: false, code: "QUANTITY", reason: "Quantity must be greater than 0." };
  }
  if (!preview.estimated_limit_price || preview.estimated_limit_price <= 0) {
    return { ok: false, code: "ESTIMATED_LIMIT_PRICE", reason: "estimated_limit_price must be greater than 0." };
  }
  if (preview.risk_guard_status !== "APPROVED") {
    return { ok: false, code: "RISK_GUARD", reason: "Risk Guard must be APPROVED." };
  }
  if (!ORDER_SAFETY_ALLOWED_QUALITIES.has(preview.contract_quality ?? "")) {
    return { ok: false, code: "CONTRACT_QUALITY", reason: "Contract quality must be A+, A, or B." };
  }
  if (
    preview.max_risk_dollars === null ||
    preview.max_risk_dollars === undefined ||
    preview.max_risk_dollars > ORDER_SAFETY_MAX_RISK_DOLLARS
  ) {
    return {
      ok: false,
      code: "MAX_RISK",
      reason: `max_risk_dollars must be less than or equal to ${ORDER_SAFETY_MAX_RISK_DOLLARS}.`,
    };
  }

  return { ok: true };
}
