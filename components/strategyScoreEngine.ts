export type StrategyGrade = "A" | "B" | "C" | "AVOID";
export type StrategyDecision = "TAKE TRADE" | "WATCH CLOSELY" | "SKIP";

export type StrategyInput = {
  symbol: string;
  price: number;
  changePercent: number;
  volumeSignal: string;
  trend: string;
  setup: string;
};

export type StrategyScoreResult = {
  score: number;
  grade: StrategyGrade;
  decision: StrategyDecision;
  reasons: string[];
};

export function scoreSetup(input: StrategyInput): StrategyScoreResult {
  let score = 50;
  const reasons: string[] = [];

  const trend = input.trend.toLowerCase();
  const volume = input.volumeSignal.toLowerCase();
  const setup = input.setup.toLowerCase();
  const move = input.changePercent;

  // Trend score
  if (trend.includes("bullish")) {
    score += 18;
    reasons.push("Bullish trend confirmed");
  } else if (trend.includes("neutral")) {
    score += 4;
    reasons.push("Neutral trend");
  } else if (trend.includes("choppy")) {
    score -= 8;
    reasons.push("Choppy trend lowers confidence");
  } else if (trend.includes("bearish")) {
    score -= 12;
    reasons.push("Bearish trend blocks call bias");
  }

  // Volume score
  if (volume.includes("very strong")) {
    score += 16;
    reasons.push("Very strong volume");
  } else if (volume.includes("strong")) {
    score += 12;
    reasons.push("Strong volume");
  } else if (volume.includes("medium")) {
    score += 4;
    reasons.push("Medium volume");
  } else if (volume.includes("normal")) {
    score += 1;
    reasons.push("Normal volume");
  } else if (volume.includes("weak")) {
    score -= 10;
    reasons.push("Weak volume");
  }

  // Setup quality score
  if (setup.includes("momentum")) {
    score += 14;
    reasons.push("Momentum continuation setup");
  } else if (setup.includes("breakout")) {
    score += 13;
    reasons.push("Breakout setup");
  } else if (setup.includes("pullback")) {
    score += 10;
    reasons.push("Pullback bounce setup");
  } else if (setup.includes("confirmation")) {
    score -= 5;
    reasons.push("Needs confirmation");
  } else if (setup.includes("market gauge")) {
    score -= 8;
    reasons.push("Market gauge, not a direct trade setup");
  }

  // Price movement score
  if (move >= 2.5) {
    score += 10;
    reasons.push("Strong positive price movement");
  } else if (move >= 1) {
    score += 7;
    reasons.push("Positive price movement");
  } else if (move >= 0.25) {
    score += 3;
    reasons.push("Small positive price movement");
  } else if (move <= -1.5) {
    score -= 12;
    reasons.push("Large negative price movement");
  } else if (move < 0) {
    score -= 5;
    reasons.push("Negative price movement");
  }

  // Risk control adjustment
  if (score >= 85 && trend.includes("bullish") && volume.includes("strong")) {
    reasons.push("Passed high-quality trade filter");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: StrategyGrade = "AVOID";
  let decision: StrategyDecision = "SKIP";

  if (score >= 85) {
    grade = "A";
    decision = "TAKE TRADE";
  } else if (score >= 72) {
    grade = "B";
    decision = "WATCH CLOSELY";
  } else if (score >= 58) {
    grade = "C";
    decision = "SKIP";
  }

  return {
    score,
    grade,
    decision,
    reasons,
  };
}