export type FundedAccountSafetyInput = {
  symbol: string | null;
  setup_name: string | null;
  contract_symbol: string | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  estimated_limit_price: number | null;
  quantity: number | null;
  max_risk_dollars: number | null;
  contract_quality: string | null;
  risk_guard_status: string | null;
  order_side: string | null;
  order_type: string | null;
  time_in_force: string | null;
  setup_confidence?: string | null;
  market_regime?: string | null;
};

export type FundedAccountSafetyResult = {
  status: "PASSED" | "BLOCKED";
  score: number;
  reasons: string[];
  warnings: string[];
};

const ALLOWED_CONTRACT_QUALITIES = new Set(["A+", "A", "B"]);
const MAX_RISK_DOLLARS = 100;
const MAX_SPREAD_PERCENT = 18;

function isMissingText(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function isBadNumber(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value);
}

function calculateSpreadPercent(bid: number, ask: number, mid: number) {
  if (ask <= 0 || mid <= 0) return Infinity;
  return ((ask - bid) / mid) * 100;
}

export function evaluateFundedAccountSafety(
  input: FundedAccountSafetyInput
): FundedAccountSafetyResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (isMissingText(input.symbol)) {
    reasons.push("Missing symbol.");
    score -= 12;
  }

  if (isMissingText(input.setup_name)) {
    reasons.push("Missing setup name.");
    score -= 10;
  }

  if (isMissingText(input.contract_symbol)) {
    reasons.push("Missing contract symbol.");
    score -= 15;
  }

  if (isMissingText(input.order_side)) {
    reasons.push("Missing order side.");
    score -= 8;
  }

  if (isMissingText(input.order_type)) {
    reasons.push("Missing order type.");
    score -= 8;
  }

  if (isMissingText(input.time_in_force)) {
    reasons.push("Missing time in force.");
    score -= 8;
  }

  if (input.risk_guard_status !== "APPROVED") {
    reasons.push("Risk Guard must be APPROVED.");
    score -= 25;
  }

  if (!ALLOWED_CONTRACT_QUALITIES.has(input.contract_quality ?? "")) {
    reasons.push("Contract quality must be A+, A, or B.");
    score -= 20;
  }

  if (
    isBadNumber(input.max_risk_dollars) ||
    (input.max_risk_dollars ?? 0) <= 0
  ) {
    reasons.push("Max risk must exist and be greater than 0.");
    score -= 15;
  } else if ((input.max_risk_dollars ?? 0) > MAX_RISK_DOLLARS) {
    reasons.push(`Max risk must be <= $${MAX_RISK_DOLLARS}.`);
    score -= 25;
  }

  if (!input.quantity || input.quantity <= 0) {
    reasons.push("Quantity must be greater than 0.");
    score -= 12;
  } else if (input.quantity !== 1) {
    reasons.push("Quantity must be exactly 1 for v1.");
    score -= 18;
  }

  if (
    isBadNumber(input.estimated_limit_price) ||
    (input.estimated_limit_price ?? 0) <= 0
  ) {
    reasons.push("Estimated limit price must be greater than 0.");
    score -= 12;
  }

  if (
    isBadNumber(input.bid) ||
    isBadNumber(input.ask) ||
    isBadNumber(input.mid)
  ) {
    reasons.push("Bid, ask, and mid prices are required.");
    score -= 15;
  } else {
    const bid = input.bid ?? 0;
    const ask = input.ask ?? 0;
    const mid = input.mid ?? 0;

    if (bid <= 0 || ask <= 0 || mid <= 0) {
      reasons.push("Bid, ask, and mid must be greater than 0.");
      score -= 15;
    } else if (ask < bid) {
      reasons.push("Ask cannot be lower than bid.");
      score -= 15;
    } else {
      const spreadPercent = calculateSpreadPercent(bid, ask, mid);

      if (spreadPercent > MAX_SPREAD_PERCENT) {
        reasons.push(
          `Spread is too wide: ${spreadPercent.toFixed(
            1
          )}%. Max allowed is ${MAX_SPREAD_PERCENT}%.`
        );
        score -= 20;
      } else if (spreadPercent > 12) {
        warnings.push(
          `Spread is acceptable but elevated: ${spreadPercent.toFixed(1)}%.`
        );
        score -= 5;
      }
    }
  }

  const normalizedSetupConfidence =
    input.setup_confidence?.toLowerCase().trim() ?? "";

  if (
    normalizedSetupConfidence.includes("chop") ||
    normalizedSetupConfidence.includes("low")
  ) {
    reasons.push("Setup appears choppy or low conviction.");
    score -= 20;
  }

  const normalizedMarketRegime = input.market_regime?.toLowerCase().trim() ?? "";

  if (
    normalizedMarketRegime.includes("chop") ||
    normalizedMarketRegime.includes("sideways")
  ) {
    reasons.push("Market regime is choppy or sideways.");
    score -= 20;
  }

  const finalScore = Math.max(0, Math.min(100, score));

  return {
    status: reasons.length === 0 ? "PASSED" : "BLOCKED",
    score: finalScore,
    reasons,
    warnings,
  };
}