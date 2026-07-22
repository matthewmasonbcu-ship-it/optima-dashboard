// Pure-TypeScript contract grading and auto-selection for server-side use.
// Single source of truth for all grading/scoring logic.
// OptionContractSelector.tsx imports from here — do not add local copies there.

import type { SpreadType, OptionLeg } from "./dashboardTypes";

// --- Shared types ------------------------------------------------------------

export type TradierContract = {
  option_symbol?: string;
  optionSymbol?: string;
  symbol?: string;
  stock_symbol?: string;
  stockSymbol?: string;
  trade_direction?: string;
  tradeDirection?: string;
  option_type?: string;
  optionType?: string;
  expiration_date?: string | null;
  expirationDate?: string | null;
  strike_price?: number;
  strikePrice?: number;
  bid_price?: number;
  bidPrice?: number;
  bid?: number;
  ask_price?: number;
  askPrice?: number;
  ask?: number;
  mid_price?: number;
  midPrice?: number;
  mid?: number;
  contracts?: number;
  estimated_cost?: number;
  estimatedCost?: number;
  max_risk?: number;
  maxRisk?: number;
  spreadPercent?: number;
  spread_percent?: number;
  bidAskSpreadPercent?: number;
  volume?: number;
  openInterest?: number;
  open_interest?: number;
  liquidityScore?: number;
  liquidity_score?: number;
  recommendationScore?: number;
  recommendation_score?: number;
  qualityGrade?: string;
  contractQualityGrade?: string;
  grade?: string;
  contract_quality?: string;
  quality_grade?: string;
  contract_quality_grade?: string;
  recommendationReason?: string;
  whyThisContract?: string[];
  riskStatus?: string;
  source?: string;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  implied_volatility?: number | null;
  impliedVolatility?: number | null;
  spread_type?: SpreadType;
  short_leg?: OptionLeg;
  long_leg?: OptionLeg;
  net_credit?: number;
  spread_width?: number;
  max_loss?: number;
  max_profit?: number;
};

export type GradeParams = {
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
};

// --- Value extraction helpers ------------------------------------------------

export function getNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getContractValue(
  contract: TradierContract | null | undefined,
  keys: string[],
  fallback: unknown = null
): unknown {
  if (!contract) return fallback;
  for (const key of keys) {
    const value = (contract as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export function getBid(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["bid_price", "bidPrice", "bid"]), 0);
}

export function getAsk(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["ask_price", "askPrice", "ask"]), 0);
}

export function getMid(contract: TradierContract): number {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  return getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
}

export function getStrike(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["strike_price", "strikePrice"]), 0);
}

export function getExpiration(contract: TradierContract): string {
  return String(getContractValue(contract, ["expiration_date", "expirationDate"], ""));
}

export function getContracts(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["contracts"]), 1);
}

export function getEstimatedCost(contract: TradierContract): number {
  const mid = getMid(contract);
  const contracts = getContracts(contract);
  return getNumber(
    getContractValue(contract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );
}

export function getMaxRisk(contract: TradierContract): number {
  return getNumber(
    getContractValue(contract, ["max_risk", "maxRisk"]),
    getEstimatedCost(contract)
  );
}

export function getSpreadPercent(contract: TradierContract): number {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  return getNumber(
    getContractValue(contract, ["spreadPercent", "spread_percent", "bidAskSpreadPercent"]),
    bid > 0 && ask > 0 && mid > 0 ? ((ask - bid) / mid) * 100 : 999
  );
}

export function getLiquidityScore(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["liquidityScore", "liquidity_score"]), 0);
}

export function getRecommendationScore(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["recommendationScore", "recommendation_score"]), 0);
}

export function getVolume(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["volume"]), 0);
}

export function getOpenInterest(contract: TradierContract): number {
  return getNumber(getContractValue(contract, ["openInterest", "open_interest"]), 0);
}

export function getDelta(contract: TradierContract): number | null {
  const value = getContractValue(contract, ["delta"], null);
  if (value === null || value === undefined || value === "") return null;
  const delta = Number(value);
  if (!Number.isFinite(delta)) return null;
  return delta;
}

export function getDeltaAbs(contract: TradierContract): number | null {
  const delta = getDelta(contract);
  if (delta === null) return null;
  return Math.abs(delta);
}

export function getOptionSymbol(contract: TradierContract | null | undefined): string {
  return String(getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], ""));
}

// --- Grade helpers -----------------------------------------------------------

export function normalizeGradeValue(value: unknown): string {
  const grade = String(value || "").trim().toUpperCase();
  if (!grade || grade === "UNKNOWN" || grade === "N/A" || grade === "NULL") return "";
  if (grade === "IDEAL") return "A+";
  if (grade === "GOOD") return "A";
  if (grade === "ACCEPTABLE") return "B";
  if (grade === "AVOID") return "BLOCKED";
  if (
    grade === "A+" || grade === "A" || grade === "B" ||
    grade === "C" || grade === "BLOCKED"
  ) return grade;
  return "";
}

export function getGrade(contract: TradierContract | null | undefined): string {
  if (!contract) return "UNKNOWN";
  const candidates = [
    contract.contract_quality,
    contract.qualityGrade,
    contract.contractQualityGrade,
    contract.grade,
    contract.quality_grade,
    contract.contract_quality_grade,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeGradeValue(candidate);
    if (normalized) return normalized;
  }
  return "UNKNOWN";
}

export function getGradeRank(grade: string): number {
  if (grade === "A+") return 5;
  if (grade === "A") return 4;
  if (grade === "B") return 3;
  if (grade === "C") return 2;
  if (grade === "BLOCKED") return 1;
  return 0;
}

// --- Spread type helpers -----------------------------------------------------

export function getDefaultSpreadType(direction: string): SpreadType {
  if (direction === "CALL") return "bull_put_spread";
  if (direction === "PUT") return "bear_call_spread";
  return "single_leg";
}

export function getSpreadTypeLabel(spreadType: SpreadType): string {
  if (spreadType === "bull_put_spread") return "Bull Put Spread";
  if (spreadType === "bear_call_spread") return "Bear Call Spread";
  return "Single Leg";
}

// --- Scoring functions -------------------------------------------------------

export function getDeltaFitScore(contract: TradierContract): number {
  const deltaAbs = getDeltaAbs(contract);
  if (deltaAbs === null) return 50;
  if (deltaAbs >= 0.30 && deltaAbs <= 0.55) return 100;
  if (deltaAbs >= 0.25 && deltaAbs < 0.30) return 85;
  if (deltaAbs > 0.55 && deltaAbs <= 0.70) return 75;
  if (deltaAbs >= 0.18 && deltaAbs < 0.25) return 60;
  if (deltaAbs > 0.70 && deltaAbs <= 0.85) return 45;
  return 20;
}

export function getTradierExpirationDays(contract: TradierContract): number | null {
  const expiration = String(getContractValue(contract, ["expiration_date", "expirationDate"], ""));
  if (!expiration) return null;
  const expirationTime = new Date(`${expiration}T16:00:00`).getTime();
  if (!Number.isFinite(expirationTime)) return null;
  return Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getExpirationFitScore(contract: TradierContract): number {
  const days = getTradierExpirationDays(contract);
  if (days === null) return 50;
  if (days >= 7 && days <= 45) return 100;
  if (days >= 3 && days < 7) return 75;
  if (days > 45 && days <= 90) return 65;
  if (days > 90) return 45;
  return 20;
}

export function getTradierLiquidityScore(contract: TradierContract): number {
  const volume = getVolume(contract);
  const openInterest = getOpenInterest(contract);
  if (volume >= 500 && openInterest >= 1000) return 100;
  if (volume >= 250 || openInterest >= 1000) return 90;
  if (volume >= 100 || openInterest >= 500) return 80;
  if (volume >= 50 || openInterest >= 250) return 70;
  if (volume >= 20 || openInterest >= 100) return 55;
  if (volume >= 5 || openInterest >= 25) return 35;
  if (volume > 0 || openInterest > 0) return 20;
  return 0;
}

export function getTradierQualityGrade(
  contract: TradierContract,
  params: GradeParams
): "A+" | "A" | "B" | "C" | "BLOCKED" {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  const spread = getSpreadPercent(contract);
  const maxRisk = getMaxRisk(contract);
  const allowedRisk = params.accountSize * (params.maxRiskPercent / 100);
  const liquidityScore = getTradierLiquidityScore(contract);
  const deltaFitScore = getDeltaFitScore(contract);
  const expirationFitScore = getExpirationFitScore(contract);
  const volume = getVolume(contract);
  const openInterest = getOpenInterest(contract);

  if (bid <= 0 || ask <= 0 || mid <= 0) return "BLOCKED";
  if (ask < bid) return "BLOCKED";
  if (maxRisk > allowedRisk) return "BLOCKED";
  if (spread > params.maxSpreadPercent * 1.5) return "BLOCKED";

  const hasLiquidityData = volume > 0 || openInterest > 0;

  if (
    hasLiquidityData &&
    spread <= 8 &&
    liquidityScore >= 80 &&
    deltaFitScore >= 85 &&
    expirationFitScore >= 65 &&
    maxRisk <= allowedRisk * 0.75
  ) return "A+";

  if (
    hasLiquidityData &&
    spread <= 12 &&
    liquidityScore >= 55 &&
    deltaFitScore >= 60 &&
    expirationFitScore >= 50 &&
    maxRisk <= allowedRisk
  ) return "A";

  if (
    spread <= params.maxSpreadPercent &&
    deltaFitScore >= 35 &&
    expirationFitScore >= 35 &&
    maxRisk <= allowedRisk
  ) return "B";

  return "C";
}

export function getTradierRecommendationScore(
  contract: TradierContract,
  params: GradeParams
): number {
  const grade = getTradierQualityGrade(contract, params);
  const spread = getSpreadPercent(contract);
  const liquidityScore = getTradierLiquidityScore(contract);
  const deltaFitScore = getDeltaFitScore(contract);
  const expirationFitScore = getExpirationFitScore(contract);
  const maxRisk = getMaxRisk(contract);
  const allowedRisk = params.accountSize * (params.maxRiskPercent / 100);
  const mid = getMid(contract);

  const riskFitScore = allowedRisk > 0 ? Math.max(0, 100 - (maxRisk / allowedRisk) * 100) : 0;
  const spreadScore = Math.max(0, 100 - (spread / Math.max(params.maxSpreadPercent, 1)) * 100);
  const priceScore =
    mid >= 0.5 && mid <= 5 ? 100 :
    mid >= 0.25 && mid < 0.5 ? 75 :
    mid > 5 && mid <= 10 ? 60 :
    mid > 10 ? 35 : 25;
  const gradeScore =
    grade === "A+" ? 100 : grade === "A" ? 85 : grade === "B" ? 65 : grade === "C" ? 30 : 0;

  return Math.round(
    gradeScore * 0.28 +
    liquidityScore * 0.22 +
    spreadScore * 0.18 +
    deltaFitScore * 0.14 +
    expirationFitScore * 0.08 +
    riskFitScore * 0.06 +
    priceScore * 0.04
  );
}

// --- Enrichment --------------------------------------------------------------

export function enrichTradierContract(
  contract: TradierContract,
  params: GradeParams & { stockSymbol: string; direction: string }
): TradierContract {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  const contracts = getContracts(contract);
  const estimatedCost = getEstimatedCost(contract);
  const maxRisk = getMaxRisk(contract);
  const spread = getSpreadPercent(contract);
  const liquidityScore = getTradierLiquidityScore(contract);
  const recommendationScore = getTradierRecommendationScore(contract, params);
  const qualityGrade = getTradierQualityGrade(contract, params);
  const deltaAbs = getDeltaAbs(contract);
  const expirationDays = getTradierExpirationDays(contract);

  return {
    ...contract,
    source: "tradier",
    stock_symbol: String(getContractValue(contract, ["stock_symbol", "stockSymbol"], params.stockSymbol)),
    stockSymbol: String(getContractValue(contract, ["stock_symbol", "stockSymbol"], params.stockSymbol)),
    trade_direction: params.direction,
    tradeDirection: params.direction,
    bid_price: bid, bidPrice: bid, bid,
    ask_price: ask, askPrice: ask, ask,
    mid_price: mid, midPrice: mid, mid,
    contracts,
    estimated_cost: estimatedCost, estimatedCost,
    max_risk: maxRisk, maxRisk,
    spreadPercent: spread, spread_percent: spread, bidAskSpreadPercent: spread,
    liquidityScore, liquidity_score: liquidityScore,
    recommendationScore, recommendation_score: recommendationScore,
    qualityGrade, contractQualityGrade: qualityGrade, grade: qualityGrade,
    contract_quality: qualityGrade, quality_grade: qualityGrade, contract_quality_grade: qualityGrade,
    recommendationReason:
      qualityGrade === "BLOCKED" ? "Contract blocked by safety filters." :
      qualityGrade === "C" ? "Contract is weak quality. Testing Override required before saving." :
      qualityGrade === "B" ? "Contract is acceptable, but not ideal. Confirm Risk Guard before saving." :
      "Contract passes current read-only quality filters.",
    whyThisContract: [
      `Loaded from Tradier ${process.env.TRADIER_ENV || "sandbox"} option chain.`,
      `Spread ${spread.toFixed(1)}%.`,
      `Liquidity score ${liquidityScore}.`,
      deltaAbs === null ? "Delta unavailable." : `Delta ${deltaAbs.toFixed(2)} absolute.`,
      expirationDays === null ? "Expiration distance unavailable." : `${expirationDays} days to expiration.`,
      "Read-only market data only. Paper trade save remains controlled by Risk Guard.",
    ],
  };
}

// --- Credit spread builder ---------------------------------------------------
// INTENTIONAL DUPLICATE: OptionContractSelector.tsx keeps a local copy with
// divergent display text (recommendationReason/whyThisContract) and a
// UI-specific optionType derivation. The net_credit / max_loss math MUST stay
// in parity with the client copy. Flag for future unification.

export function buildCreditSpreadContract(params: {
  shortLeg: TradierContract;
  longLeg: TradierContract;
  spreadType: SpreadType;
  stockSymbol: string;
  contracts: number;
}): TradierContract {
  const { shortLeg, longLeg, spreadType, stockSymbol, contracts } = params;

  const shortMid = getMid(shortLeg);
  const longMid = getMid(longLeg);
  const shortStrike = getStrike(shortLeg);
  const longStrike = getStrike(longLeg);
  const shortBid = getBid(shortLeg);
  const shortAsk = getAsk(shortLeg);

  const netCredit = Number((shortMid - longMid).toFixed(2));
  const spreadWidth = Number(Math.abs(shortStrike - longStrike).toFixed(2));
  const maxLoss = Number(((spreadWidth - netCredit) * 100 * contracts).toFixed(2));
  const maxProfit = Number((netCredit * 100 * contracts).toFixed(2));

  const shortGrade = getGrade(shortLeg);
  const longGrade = getGrade(longLeg);
  const combinedGrade = getGradeRank(shortGrade) <= getGradeRank(longGrade) ? shortGrade : longGrade;

  const shortLegSummary: OptionLeg = {
    option_symbol: getOptionSymbol(shortLeg),
    strike_price: shortStrike,
    bid_price: shortBid,
    ask_price: shortAsk,
    mid_price: shortMid,
  };

  const longLegSummary: OptionLeg = {
    option_symbol: getOptionSymbol(longLeg),
    strike_price: longStrike,
    bid_price: getBid(longLeg),
    ask_price: getAsk(longLeg),
    mid_price: longMid,
  };

  const optionTypeFromSpread: "CALL" | "PUT" =
    spreadType === "bull_put_spread" ? "PUT" : "CALL";

  return {
    option_symbol: shortLegSummary.option_symbol,
    optionSymbol: shortLegSummary.option_symbol,
    symbol: shortLegSummary.option_symbol,
    stock_symbol: stockSymbol, stockSymbol,
    trade_direction: optionTypeFromSpread, tradeDirection: optionTypeFromSpread,
    expiration_date: getExpiration(shortLeg), expirationDate: getExpiration(shortLeg),
    strike_price: shortStrike, strikePrice: shortStrike,
    bid_price: shortBid, bidPrice: shortBid, bid: shortBid,
    ask_price: shortAsk, askPrice: shortAsk, ask: shortAsk,
    mid_price: netCredit, midPrice: netCredit, mid: netCredit,
    contracts,
    estimated_cost: 0, estimatedCost: 0,
    max_risk: maxLoss, maxRisk: maxLoss,
    spreadPercent: getSpreadPercent(shortLeg),
    spread_percent: getSpreadPercent(shortLeg),
    bidAskSpreadPercent: getSpreadPercent(shortLeg),
    volume: getVolume(shortLeg),
    openInterest: getOpenInterest(shortLeg),
    open_interest: getOpenInterest(shortLeg),
    liquidityScore: getLiquidityScore(shortLeg),
    liquidity_score: getLiquidityScore(shortLeg),
    recommendationScore: getRecommendationScore(shortLeg),
    recommendation_score: getRecommendationScore(shortLeg),
    qualityGrade: combinedGrade, contractQualityGrade: combinedGrade, grade: combinedGrade,
    contract_quality: combinedGrade, quality_grade: combinedGrade, contract_quality_grade: combinedGrade,
    source: "tradier",
    spread_type: spreadType,
    short_leg: shortLegSummary,
    long_leg: longLegSummary,
    net_credit: netCredit,
    spread_width: spreadWidth,
    max_loss: maxLoss,
    max_profit: maxProfit,
    recommendationReason: `Auto-selected ${getSpreadTypeLabel(spreadType)}: sell ${shortLegSummary.option_symbol} / buy ${longLegSummary.option_symbol}. Net credit $${netCredit.toFixed(2)}, max loss $${maxLoss.toFixed(2)}.`,
    whyThisContract: [
      `Short leg ${shortLegSummary.option_symbol} (strike $${shortStrike.toFixed(2)}, grade ${shortGrade}).`,
      `Long leg ${longLegSummary.option_symbol} (strike $${longStrike.toFixed(2)}, grade ${longGrade}).`,
      `Spread width $${spreadWidth.toFixed(2)}. Net credit $${netCredit.toFixed(2)}.`,
      `Max loss $${maxLoss.toFixed(2)}. Max profit $${maxProfit.toFixed(2)}.`,
      "Auto-selected. Paper trade save remains controlled by Risk Guard and pre-trade checklist.",
    ],
  };
}

// --- Raw Tradier option normalization ----------------------------------------
// Converts a raw Tradier API option object to a TradierContract.
// Shared with auto-select route so the chain route does not need to be called
// internally (avoiding route-to-route fetches in Next.js App Router).

type TradierRawOption = {
  symbol?: string;
  description?: string;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  volume?: number | null;
  open_interest?: number | null;
  strike?: number | null;
  expiration_date?: string | null;
  option_type?: string | null;
  root_symbol?: string | null;
  underlying?: string | null;
  greeks?: {
    delta?: number | null;
    gamma?: number | null;
    theta?: number | null;
    vega?: number | null;
    rho?: number | null;
    mid_iv?: number | null;
    bid_iv?: number | null;
    ask_iv?: number | null;
    smv_vol?: number | null;
  } | null;
};

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function normalizeTradierOption(option: TradierRawOption): TradierContract {
  const bid = toNum(option.bid, 0);
  const ask = toNum(option.ask, 0);
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : toNum(option.last, 0);
  const spread = ask > 0 && bid > 0 ? ask - bid : 0;
  const spreadPercent = mid > 0 ? (spread / mid) * 100 : 0;
  const optionType = String(option.option_type || "").toUpperCase();

  return {
    source: "tradier",
    option_symbol: option.symbol || "",
    optionSymbol: option.symbol || "",
    symbol: option.symbol || "",
    stock_symbol: option.underlying || option.root_symbol || "",
    stockSymbol: option.underlying || option.root_symbol || "",
    trade_direction: optionType === "PUT" ? "PUT" : "CALL",
    tradeDirection: optionType === "PUT" ? "PUT" : "CALL",
    option_type: optionType,
    optionType,
    expiration_date: option.expiration_date || null,
    expirationDate: option.expiration_date || null,
    strike_price: toNum(option.strike, 0),
    strikePrice: toNum(option.strike, 0),
    bid_price: bid, bidPrice: bid, bid,
    ask_price: ask, askPrice: ask, ask,
    mid_price: mid, midPrice: mid, mid,
    spread_percent: spreadPercent, spreadPercent, bidAskSpreadPercent: spreadPercent,
    volume: toNum(option.volume, 0),
    open_interest: toNum(option.open_interest, 0),
    openInterest: toNum(option.open_interest, 0),
    delta: option.greeks?.delta ?? null,
    gamma: option.greeks?.gamma ?? null,
    theta: option.greeks?.theta ?? null,
    vega: option.greeks?.vega ?? null,
    implied_volatility: option.greeks?.mid_iv ?? option.greeks?.smv_vol ?? null,
    impliedVolatility: option.greeks?.mid_iv ?? option.greeks?.smv_vol ?? null,
    contracts: 1,
    estimated_cost: mid * 100, estimatedCost: mid * 100,
    max_risk: mid * 100, maxRisk: mid * 100,
    qualityGrade: "UNKNOWN", contractQualityGrade: "UNKNOWN", grade: "UNKNOWN",
  };
}

export function getTradierOptionArray(data: unknown): TradierRawOption[] {
  const d = data as Record<string, unknown> | null | undefined;
  const rawOptions = (d?.options as Record<string, unknown>)?.option;
  if (!rawOptions) return [];
  if (Array.isArray(rawOptions)) return rawOptions as TradierRawOption[];
  return [rawOptions as TradierRawOption];
}

// --- Auto-selection algorithm ------------------------------------------------

export type SelectBestCreditSpreadResult =
  | { success: true; spread: TradierContract; usedFallback: boolean; fallbackReason?: string }
  // attemptedSpread: the last candidate spread that was actually BUILT before the
  // grade/risk-cap gate rejected it (null when we never got far enough to build one
  // — e.g. no valid short leg). Observability only: it does NOT change the block
  // decision; it lets the caller log the rejected spread's economics.
  | { success: false; reason: string; attemptedSpread?: TradierContract | null };

export function selectBestCreditSpread(
  rawContracts: TradierContract[],
  direction: "CALL" | "PUT",
  stockSymbol: string,
  params: GradeParams & { stockPrice?: number }
): SelectBestCreditSpreadResult {
  const spreadType: SpreadType =
    direction === "CALL" ? "bull_put_spread" : "bear_call_spread";
  // bull_put uses PUTs; bear_call uses CALLs
  const optionType: "CALL" | "PUT" =
    spreadType === "bull_put_spread" ? "PUT" : "CALL";

  // Use 5× risk headroom when grading individual legs — single-leg premiums are
  // not the risk metric for a spread. The real max-loss check runs after building.
  const legParams: GradeParams & { stockSymbol: string; direction: string } = {
    stockSymbol,
    direction: optionType,
    accountSize: params.accountSize,
    maxRiskPercent: Math.max(params.maxRiskPercent * 5, 5),
    maxSpreadPercent: params.maxSpreadPercent,
  };

  // Filter to correct option type and enrich
  const enriched = rawContracts
    .filter((c) => {
      const rawType = String(
        c.option_type || c.optionType || c.trade_direction || c.tradeDirection || ""
      ).toUpperCase();
      return rawType === optionType;
    })
    .map((c) => enrichTradierContract(c, legParams));

  const valid = enriched.filter((c) => getBid(c) > 0 && getAsk(c) > 0 && getMid(c) > 0);

  if (valid.length === 0) {
    return {
      success: false,
      reason: `No valid ${optionType} contracts with pricing found in the chain.`,
    };
  }

  // --- Short leg -----------------------------------------------------------
  const hasGreeks = valid.some((c) => getDelta(c) !== null);
  let shortLeg: TradierContract | null = null;
  let usedFallback = false;
  let fallbackReason: string | undefined;

  if (hasGreeks) {
    const targetDelta = 0.225;
    const withDelta = valid.filter((c) => getDelta(c) !== null);
    shortLeg = withDelta.reduce<TradierContract | null>((best, c) => {
      if (!best) return c;
      const dBest = Math.abs((getDeltaAbs(best) ?? 999) - targetDelta);
      const dCurr = Math.abs((getDeltaAbs(c) ?? 999) - targetDelta);
      return dCurr < dBest ? c : best;
    }, null);
  } else {
    if (!params.stockPrice || params.stockPrice <= 0) {
      return {
        success: false,
        reason: "No Greek data available and no stock price provided. Cannot select short leg without delta or ATM reference.",
      };
    }
    // 90% of stock price for PUTs, 110% for CALLs — approximates 0.20–0.25 delta OTM
    const targetStrike =
      optionType === "PUT" ? params.stockPrice * 0.90 : params.stockPrice * 1.10;

    shortLeg = valid.reduce<TradierContract | null>((best, c) => {
      if (!best) return c;
      const dBest = Math.abs(getStrike(best) - targetStrike);
      const dCurr = Math.abs(getStrike(c) - targetStrike);
      return dCurr < dBest ? c : best;
    }, null);

    usedFallback = true;
    fallbackReason = `No Greek data — used ATM fallback. Target strike ~$${targetStrike.toFixed(2)} (${optionType === "PUT" ? "90%" : "110%"} of stock price $${params.stockPrice.toFixed(2)}).`;
  }

  if (!shortLeg) {
    return { success: false, reason: "Could not identify a short leg candidate." };
  }

  const shortGrade = getGrade(shortLeg);
  if (shortGrade === "BLOCKED" || shortGrade === "C" || shortGrade === "UNKNOWN") {
    return {
      success: false,
      reason: `Best short leg ${getOptionSymbol(shortLeg)} has grade ${shortGrade}. No tradeable candidate near 0.20–0.25 delta target.`,
    };
  }

  // --- Long leg — ADAPTIVE width ------------------------------------------
  // Build the TIGHTEST spread (smallest width) whose max loss fits the account
  // risk cap, instead of a hardcoded 5-strike width. Candidate long legs are
  // walked from nearest (narrowest, lowest max loss) outward; the first that
  // clears both the grade gate and the cap wins. Wider spreads only raise max
  // loss, so once the cap is exceeded there is nothing tighter left to find.
  const shortStrike = getStrike(shortLeg);
  const shortExpiration = getExpiration(shortLeg);
  const shortSymbol = getOptionSymbol(shortLeg);

  const otmCandidates = enriched
    .filter((c) => {
      if (getOptionSymbol(c) === shortSymbol) return false;
      if (getExpiration(c) !== shortExpiration) return false;
      const s = getStrike(c);
      return spreadType === "bull_put_spread" ? s < shortStrike : s > shortStrike;
    })
    .sort((a, b) => Math.abs(getStrike(a) - shortStrike) - Math.abs(getStrike(b) - shortStrike));

  // Unique strikes in ascending distance order (nearest first = tightest spread)
  const seen = new Set<number>();
  const byDistance: TradierContract[] = [];
  for (const c of otmCandidates) {
    const s = getStrike(c);
    if (!seen.has(s)) { seen.add(s); byDistance.push(c); }
  }

  if (byDistance.length === 0) {
    return {
      success: false,
      reason: "No out-of-the-money long-leg strike available in this expiration to define the spread.",
    };
  }

  const allowedRisk = params.accountSize * (params.maxRiskPercent / 100);

  let spreadContract: TradierContract | null = null;
  let lastSpreadFail = "";
  // The most recent candidate that was actually built (economics computed). Kept
  // regardless of whether the gate later accepts or rejects it, so a blocked
  // outcome can still surface real net_credit/spread_width/max_loss for logging.
  let lastBuiltCandidate: TradierContract | null = null;

  for (const longLeg of byDistance) {
    const candidate = buildCreditSpreadContract({
      shortLeg,
      longLeg,
      spreadType,
      stockSymbol,
      contracts: 1,
    });
    lastBuiltCandidate = candidate;

    const candidateGrade = getGrade(candidate);
    if (candidateGrade === "BLOCKED" || candidateGrade === "C" || candidateGrade === "UNKNOWN") {
      lastSpreadFail = `width $${(candidate.spread_width ?? 0).toFixed(2)} graded ${candidateGrade} (short ${shortGrade}, long ${getGrade(longLeg)})`;
      continue;
    }

    const candidateMaxLoss = candidate.max_loss ?? Infinity;
    if (candidateMaxLoss > allowedRisk) {
      // Tightest grade-clean spread already busts the cap; wider ones are worse.
      lastSpreadFail = `tightest grade-clean spread max loss $${candidateMaxLoss.toFixed(2)} exceeds allowed risk $${allowedRisk.toFixed(2)} (${params.maxRiskPercent}% of $${params.accountSize.toFixed(0)})`;
      break;
    }

    spreadContract = candidate;
    break;
  }

  if (!spreadContract) {
    return {
      success: false,
      reason: lastSpreadFail
        ? `No spread within risk cap — ${lastSpreadFail}. Try a different expiration or symbol.`
        : "Could not construct a spread within the risk cap for this expiration.",
      attemptedSpread: lastBuiltCandidate,
    };
  }

  return { success: true, spread: spreadContract, usedFallback, fallbackReason };
}
