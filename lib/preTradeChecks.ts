// Single source of truth for pre-trade enforcement logic.
// Used by BOTH the dashboard (app/page.tsx) and the auto-pipeline cron.
//
// PARITY NOTE: Any change to the 8 enforcement blocks in
// getPreTradeEnforcementStatus must be reflected in BOTH callers.
// This lib is the authoritative gate — the cron and dashboard are
// identical because they import from here, not from each other.

import type { MarketCondition, TradeDirection } from "./scanner";
import type { ContractQuality } from "../types/trades";
import {
  getNumber,
  getContractValue,
  getGrade,
  normalizeGradeValue,
  type TradierContract,
} from "./contractGrading";
import { DELTA_BAND, MIN_DTE, MAX_DTE } from "./scanConfig";

// --- Shared types ------------------------------------------------------------

export type RiskGuardCheck = {
  status: "APPROVED" | "CAUTION" | "BLOCKED";
  reason: string;
};

export type PreTradeEnforcementStatus = "READY" | "CAUTION" | "BLOCKED";

// --- Shared constants --------------------------------------------------------
// Centralised here so the dashboard and cron use identical limits.

// The paper account simulates the $50,000 Black Eagle evaluation account, so all
// risk math is sized against $50k (see AGENTS.md — options are deliberately
// governed by the eval limits). 1% per-trade = $500 max loss to start; step to 2%
// once a win rate is established over 20–30 trades.
export const ACCOUNT_SIZE = 50000;
export const MAX_RISK_PERCENT = 1;
// Canonical per-trade max-loss cap the live pipeline enforces (spread selection in
// contractGrading.ts + runServerSideEnforcementChecks below). Dashboard displays and
// advisory filters must read THIS — never a separate hard-coded literal — so the
// number can't drift out of sync again. Equals $500.
export const MAX_RISK_PER_TRADE_DOLLARS = ACCOUNT_SIZE * (MAX_RISK_PERCENT / 100);
export const MAX_SPREAD_PERCENT = 20;
export const PERSONAL_DAILY_LOSS_STOP = 2000; // 80% of Black Eagle's $2,500 (5%) daily limit

// --- Grade helpers -----------------------------------------------------------
// getContractGrade wraps getGrade from contractGrading.ts with an explicit
// ContractQuality return type — required by createTradeAlert and related call sites.
// normalizeContractGradeValue re-exports normalizeGradeValue under the name used in page.tsx.

export function getContractGrade(contract: TradierContract | null | undefined): ContractQuality {
  return getGrade(contract) as ContractQuality;
}
export { normalizeGradeValue as normalizeContractGradeValue } from "./contractGrading";

export function isCleanContractGrade(grade: string): boolean {
  return grade === "A+" || grade === "A" || grade === "B";
}

export function gradeRequiresTestingOverride(grade: string): boolean {
  return !isCleanContractGrade(grade);
}

// --- calculateRiskGuard ------------------------------------------------------
// Evaluates position risk against account limits.
// TradierContract is structurally compatible with OptionContract (page.tsx) —
// all fields are optional and the shared keys have identical types.

export function calculateRiskGuard(params: {
  selectedContract: TradierContract | null;
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
}): RiskGuardCheck {
  const { selectedContract, accountSize, maxRiskPercent, maxSpreadPercent } = params;

  if (!selectedContract) {
    return { status: "BLOCKED", reason: "No option contract selected." };
  }

  const bid = getNumber(
    getContractValue(selectedContract, ["bid_price", "bidPrice", "bid"]),
    0
  );
  const ask = getNumber(
    getContractValue(selectedContract, ["ask_price", "askPrice", "ask"]),
    0
  );
  const mid = getNumber(
    getContractValue(selectedContract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
  const contracts = getNumber(getContractValue(selectedContract, ["contracts"]), 1);
  const estimatedCost = getNumber(
    getContractValue(selectedContract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );
  const maxRisk = getNumber(
    getContractValue(selectedContract, ["max_risk", "maxRisk"]),
    estimatedCost
  );

  const allowedRisk = accountSize * (maxRiskPercent / 100);
  // Prefer the grade-computed spread_percent field. On a spread contract mid IS
  // net_credit (buildCreditSpreadContract sets mid_price = netCredit), so the old
  // (ask-bid)/mid recompute inflated the ratio 3-5x — the same net_credit bug the
  // cron gate had. The stored field is short-leg mid for spreads and a real mid
  // for singles (normalizeTradierOption). Fall back to the recompute (NOT 999)
  // only when the field is absent, so single legs without the field stay correct.
  // getContractValue returns null when the field is absent; guard explicitly so
  // an absent field falls through to the recompute. (getNumber(null, NaN) would
  // coerce to 0 and make the guard read a false 0% spread — fail-open.)
  const rawSpreadPercent = getContractValue(selectedContract, [
    "spreadPercent",
    "spread_percent",
    "bidAskSpreadPercent",
  ]);
  const storedSpreadPercent = rawSpreadPercent === null ? NaN : Number(rawSpreadPercent);
  const spreadPercent = Number.isFinite(storedSpreadPercent)
    ? storedSpreadPercent
    : bid > 0 && ask > 0 && mid > 0
      ? ((ask - bid) / mid) * 100
      : 999;

  if (mid <= 0) {
    return { status: "BLOCKED", reason: "Contract mid price is missing." };
  }

  if (maxRisk > allowedRisk) {
    return {
      status: "BLOCKED",
      reason: `Max risk $${maxRisk.toFixed(2)} is above allowed risk $${allowedRisk.toFixed(2)}.`,
    };
  }

  if (spreadPercent > maxSpreadPercent) {
    return {
      status: "BLOCKED",
      reason: `Bid/ask spread is too wide at ${spreadPercent.toFixed(1)}%. Max allowed is ${maxSpreadPercent}%.`,
    };
  }

  if (spreadPercent > maxSpreadPercent * 0.75) {
    return {
      status: "CAUTION",
      reason: `Spread is acceptable but not ideal at ${spreadPercent.toFixed(1)}%.`,
    };
  }

  return { status: "APPROVED", reason: "Risk Guard approved this contract." };
}

// --- getPreTradeEnforcementStatus --------------------------------------------
// Runs all 8 pre-trade enforcement blocks.
// Hard blocks → status BLOCKED. Warnings only → status CAUTION.
// All 8 checks must pass (no blocks) for status READY.

export function getPreTradeEnforcementStatus(params: {
  selectedContract: TradierContract | null;
  optionRiskCheck: RiskGuardCheck | null;
  selectedSymbol?: string | null;
  tradeDirection?: TradeDirection | string | null;
  marketCondition?: MarketCondition | string | null;
}) {
  const {
    selectedContract,
    optionRiskCheck,
    selectedSymbol,
    tradeDirection,
    marketCondition,
  } = params;

  const warnings: string[] = [];
  const blocks: string[] = [];

  if (!selectedSymbol) {
    blocks.push("No stock symbol selected.");
  }

  if (!tradeDirection || tradeDirection === "NO TRADE") {
    blocks.push("Trade direction is NO TRADE.");
  }

  if (!selectedContract) {
    blocks.push("No option contract selected.");
  }

  if (marketCondition === "CHOPPY") {
    warnings.push(
      "Market is CHOPPY. Manual testing is allowed, but this is lower quality."
    );
  }

  if (optionRiskCheck?.status === "BLOCKED") {
    blocks.push(optionRiskCheck.reason || "Risk Guard blocked this trade.");
  }

  if (selectedContract) {
    const grade = getGrade(selectedContract);

    if (!grade || grade === "UNKNOWN") {
      blocks.push(
        "No contract quality grade found. Contract must have A+, A, B, C, or BLOCKED grade before saving."
      );
    }

    if (grade === "BLOCKED") {
      blocks.push("Contract quality grade is BLOCKED.");
    }

    if (grade === "C") {
      blocks.push("Contract quality grade is C. Weak contracts are blocked for now.");
    }

    if (grade === "B") {
      warnings.push("Contract quality grade is B. This is acceptable, but not ideal.");
    }

    const spreadPercent = getContractValue(selectedContract, [
      "spreadPercent",
      "spread_percent",
      "bidAskSpreadPercent",
    ]);

    if (typeof spreadPercent === "number" && spreadPercent > MAX_SPREAD_PERCENT) {
      blocks.push(`Bid/ask spread is too wide at ${spreadPercent.toFixed(1)}%.`);
    }

    const liquidityScore = getContractValue(selectedContract, [
      "liquidityScore",
      "liquidity_score",
    ]);

    if (typeof liquidityScore === "number" && liquidityScore < 50) {
      warnings.push("Liquidity score is low.");
    }

    const recommendationScore = getContractValue(selectedContract, [
      "recommendationScore",
      "recommendation_score",
    ]);

    if (typeof recommendationScore === "number" && recommendationScore < 60) {
      warnings.push("Recommendation score is weak.");
    }

    // DTE hard block — must be 30–45 days
    const expDateRaw = String(
      getContractValue(selectedContract, ["expiration_date", "expirationDate"], "") || ""
    );
    if (!expDateRaw) {
      blocks.push("No expiration date on contract. Cannot verify DTE.");
    } else {
      const expMs = new Date(expDateRaw).getTime();
      const todayMs = (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })();
      const dte = Math.ceil((expMs - todayMs) / 86_400_000);
      if (dte < MIN_DTE || dte > MAX_DTE) {
        blocks.push(
          `DTE is ${dte} day${dte === 1 ? "" : "s"} — must be ${MIN_DTE}–${MAX_DTE}. Select a contract within the target expiration window.`
        );
      }
    }

    // Delta hard block — short leg must be 0.20–0.25 absolute (skip when null/non-finite)
    const deltaRaw = getContractValue(selectedContract, ["delta"], null);
    if (deltaRaw !== null && Number.isFinite(Number(deltaRaw))) {
      const deltaAbs = Math.abs(Number(deltaRaw));
      if (deltaAbs < DELTA_BAND[0] || deltaAbs > DELTA_BAND[1]) {
        blocks.push(
          `Short leg delta ${deltaAbs.toFixed(2)} is outside target range ${DELTA_BAND[0].toFixed(2)}–${DELTA_BAND[1].toFixed(2)}.`
        );
      }
    }

    // Spread type hard block — must be a credit spread, not single leg
    const spreadTypeVal = getContractValue(selectedContract, ["spread_type"], "single_leg");
    if (!spreadTypeVal || spreadTypeVal === "single_leg") {
      blocks.push(
        "Single-leg contracts are not allowed. Must use a credit spread (bull put or bear call)."
      );
    }
  }

  let status: PreTradeEnforcementStatus = "READY";
  if (blocks.length > 0) {
    status = "BLOCKED";
  } else if (warnings.length > 0) {
    status = "CAUTION";
  }

  return {
    status,
    warnings,
    blocks,
    message:
      status === "READY"
        ? "Pre-trade checklist approved."
        : status === "CAUTION"
        ? warnings.join(" ")
        : blocks.join(" "),
  };
}

// --- runServerSideEnforcementChecks -----------------------------------------
// Runs all 7 hard blocks used by the auto-pipeline cron.
// dailyGates is pre-fetched by the caller via Supabase before calling this.
// Returns { passed: true } only if every check clears.

export type DailyGateData = {
  tradeCount: number;
  lossCount: number;
  totalDailyPnl: number;
};

export type EnforcementResult = {
  passed: boolean;
  reason?: string;
};

export function runServerSideEnforcementChecks(
  contract: TradierContract,
  dailyGates: DailyGateData
): EnforcementResult {
  // 1. Grade must be A+, A, or B
  const grade = getGrade(contract);
  if (!isCleanContractGrade(grade)) {
    return { passed: false, reason: `Contract grade ${grade} — must be A+, A, or B.` };
  }

  // 2. DTE must be 30–45
  const expDateRaw = String(
    getContractValue(contract, ["expiration_date", "expirationDate"], "") || ""
  );
  if (!expDateRaw) {
    return { passed: false, reason: "No expiration date on contract. Cannot verify DTE." };
  }
  const expMs = new Date(expDateRaw).getTime();
  const todayMs = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const dte = Math.ceil((expMs - todayMs) / 86_400_000);
  if (dte < MIN_DTE || dte > MAX_DTE) {
    return { passed: false, reason: `DTE is ${dte} — must be ${MIN_DTE}–${MAX_DTE}.` };
  }

  // 3. Delta — short leg must be 0.20–0.25 absolute (skip when null/non-finite)
  const deltaRaw = getContractValue(contract, ["delta"], null);
  if (deltaRaw !== null && Number.isFinite(Number(deltaRaw))) {
    const deltaAbs = Math.abs(Number(deltaRaw));
    if (deltaAbs < DELTA_BAND[0] || deltaAbs > DELTA_BAND[1]) {
      return {
        passed: false,
        reason: `Short leg delta ${deltaAbs.toFixed(2)} is outside target range ${DELTA_BAND[0].toFixed(2)}–${DELTA_BAND[1].toFixed(2)}.`,
      };
    }
  }

  // 4. Must be a credit spread (not single leg)
  const spreadType = getContractValue(contract, ["spread_type"], "single_leg");
  if (!spreadType || spreadType === "single_leg") {
    return { passed: false, reason: "Contract is single-leg. Must be a credit spread." };
  }

  // 4. Max loss within Risk Guard limit.
  // Fail-CLOSED null-guard (mirrors calculateRiskGuard:117): getContractValue
  // returns null when absent, and getNumber(null, 0) would coerce to 0 — passing
  // this "must be below cap" gate. Resolve absent/non-numeric to Infinity so a
  // fieldless contract blocks instead of slipping through.
  const rawMaxLoss = getContractValue(contract, ["max_loss", "max_risk", "maxRisk"]);
  const parsedMaxLoss = rawMaxLoss === null ? NaN : Number(rawMaxLoss);
  const maxLoss = Number.isFinite(parsedMaxLoss) ? parsedMaxLoss : Infinity;
  const allowedRisk = ACCOUNT_SIZE * (MAX_RISK_PERCENT / 100);
  if (maxLoss > allowedRisk) {
    return {
      passed: false,
      reason: `Max loss $${maxLoss.toFixed(2)} exceeds allowed risk $${allowedRisk.toFixed(2)}.`,
    };
  }

  // 5. Net credit > 0 and bid/ask spread ≤ MAX_SPREAD_PERCENT.
  // Read the grade-computed spread_percent field (short-leg mid denominator) —
  // the SAME value getPreTradeEnforcementStatus (line ~201) and grading already
  // use — instead of recomputing against net_credit. The old net_credit
  // denominator inflated the ratio 3–5× and blocked liquid names (GS, JPM) for a
  // false reason; short-leg liquidity is now gated at selection time instead.
  const netCredit = getNumber(
    getContractValue(contract, ["net_credit", "mid_price", "midPrice", "mid"]),
    0
  );
  if (netCredit <= 0) {
    return { passed: false, reason: "Net credit is zero or negative — not a valid credit spread." };
  }
  // Fail-CLOSED null-guard (mirrors calculateRiskGuard:117): getNumber(null, 999)
  // would coerce an absent field to 0 and pass this gate; resolve absent/non-numeric
  // to 999 so it blocks.
  const rawSpreadPct = getContractValue(contract, ["spreadPercent", "spread_percent", "bidAskSpreadPercent"]);
  const parsedSpreadPct = rawSpreadPct === null ? NaN : Number(rawSpreadPct);
  const cSpreadPct = Number.isFinite(parsedSpreadPct) ? parsedSpreadPct : 999;
  if (cSpreadPct > MAX_SPREAD_PERCENT) {
    return {
      passed: false,
      reason: `Bid/ask spread ${cSpreadPct.toFixed(1)}% exceeds ${MAX_SPREAD_PERCENT}% limit.`,
    };
  }

  // 6. Daily trade count < 3
  if (dailyGates.tradeCount >= 3) {
    return { passed: false, reason: "Daily limit of 3 trades already reached." };
  }

  // 7. Daily loss lockout < 2
  if (dailyGates.lossCount >= 2) {
    return {
      passed: false,
      reason: "Daily loss lockout: 2 losses today. Trading locked until tomorrow.",
    };
  }

  // 8. Personal daily loss stop ($2,000)
  if (dailyGates.totalDailyPnl <= -PERSONAL_DAILY_LOSS_STOP) {
    return {
      passed: false,
      reason: `Personal daily loss stop: $${PERSONAL_DAILY_LOSS_STOP.toLocaleString()} limit reached.`,
    };
  }

  return { passed: true };
}
