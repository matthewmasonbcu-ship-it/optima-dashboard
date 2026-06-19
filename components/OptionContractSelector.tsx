"use client";

// --- UI ONLY - all chain logic, filtering, sorting, and selection untouched --

import { useEffect, useMemo, useState } from "react";
import type { SpreadType, OptionLeg } from "../lib/dashboardTypes";
import {
  getNumber,
  getContractValue,
  getBid,
  getAsk,
  getMid,
  getStrike,
  getExpiration,
  getContracts,
  getEstimatedCost,
  getMaxRisk,
  getSpreadPercent,
  getLiquidityScore,
  getRecommendationScore,
  getOpenInterest,
  getVolume,
  getDelta,
  getDeltaAbs,
  getOptionSymbol,
  normalizeGradeValue,
  getGrade,
  getGradeRank,
  getDefaultSpreadType,
  getSpreadTypeLabel,
  getDeltaFitScore,
  getTradierExpirationDays,
  getExpirationFitScore,
  getTradierLiquidityScore,
  getTradierQualityGrade,
  getTradierRecommendationScore,
} from "../lib/contractGrading";

type TradeDirection = "CALL" | "PUT" | "NO TRADE";

type SortMode =
  | "recommendation"
  | "quality"
  | "liquidity"
  | "spread"
  | "risk"
  | "price";

type OptionContract = {
  option_symbol?: string;
  optionSymbol?: string;
  symbol?: string;
  stock_symbol?: string;
  stockSymbol?: string;
  trade_direction?: TradeDirection;
  tradeDirection?: TradeDirection;
  expiration_date?: string;
  expirationDate?: string;
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
  qualityGrade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
  contractQualityGrade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
  grade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
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

  // --- Credit spread support ---------------------------------------------
  spread_type?: SpreadType;
  short_leg?: OptionLeg;
  long_leg?: OptionLeg;
  net_credit?: number;
  spread_width?: number;
  max_loss?: number;
  max_profit?: number;
};

type OptionContractSelectorProps = {
  selectedSymbol?: string;
  stockSymbol?: string;
  scannerDirection?: TradeDirection | string;
  tradeDirection?: TradeDirection | string;
  selectedContract?: OptionContract | null;
  onSelectContract?: (contract: OptionContract | null) => void;
  onContractSelected?: (contract: OptionContract | null) => void;
  onClearSelectedContract?: () => void;
  accountSize?: number;
  maxRiskPercent?: number;
  maxSpreadPercent?: number;
};

// --- UI-specific helpers (not shared with lib/contractGrading.ts) -------------

function normalizeDirection(direction?: string): TradeDirection {
  if (direction === "CALL") return "CALL";
  if (direction === "PUT") return "PUT";
  return "NO TRADE";
}

// Bull put spread sells/buys PUTs. Bear call spread sells/buys CALLs.
function getSpreadOptionType(spreadType: SpreadType, direction: TradeDirection): TradeDirection {
  if (spreadType === "bull_put_spread") return "PUT";
  if (spreadType === "bear_call_spread") return "CALL";
  return direction;
}

function withSyncedContractQuality(contract: OptionContract | null): OptionContract | null {
  if (!contract) return null;

  const syncedGrade = getGrade(contract);

  return {
    ...contract,
    qualityGrade: syncedGrade,
    contractQualityGrade: syncedGrade,
    grade: syncedGrade,
    contract_quality: syncedGrade,
    quality_grade: syncedGrade,
    contract_quality_grade: syncedGrade,
  };
}

// --- Visual helpers -----------------------------------------------------------
function getGradeBar(grade: string) {
  if (grade === "A+" || grade === "A") return "bg-emerald-500";
  if (grade === "B") return "bg-blue-500";
  if (grade === "C") return "bg-orange-400";
  if (grade === "BLOCKED") return "bg-red-500";
  return "bg-slate-600";
}

function getGradeRing(grade: string) {
  if (grade === "A+" || grade === "A") return "ring-emerald-500/15";
  if (grade === "B") return "ring-blue-500/15";
  if (grade === "C") return "ring-orange-500/15";
  if (grade === "BLOCKED") return "ring-red-500/15";
  return "ring-slate-700/10";
}

function getGradeBadge(grade: string) {
  if (grade === "A+") return "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  if (grade === "A") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (grade === "B") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (grade === "C") return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  if (grade === "BLOCKED") return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700 bg-slate-800 text-slate-400";
}

function getRiskBadge(status: string) {
  if (status === "APPROVED") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (status === "CAUTION") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  return "border-red-500/40 bg-red-500/10 text-red-400";
}

function getDirectionColor(direction: string) {
  if (direction === "CALL") return "text-emerald-300";
  if (direction === "PUT") return "text-red-400";
  return "text-slate-400";
}

function getDirectionBar(direction: string) {
  if (direction === "CALL") return "bg-emerald-500";
  if (direction === "PUT") return "bg-red-500";
  return "bg-slate-600";
}

// --- getRiskStatus - logic untouched -----------------------------------------
function getRiskStatus(contract: OptionContract, params: { accountSize: number; maxRiskPercent: number; maxSpreadPercent: number; }) {
  const { accountSize, maxRiskPercent, maxSpreadPercent } = params;
  const maxRisk = getMaxRisk(contract);
  const allowedRisk = accountSize * (maxRiskPercent / 100);
  const spread = getSpreadPercent(contract);
  const grade = getGrade(contract);
  if (grade === "BLOCKED") return { status: "BLOCKED", reason: "Contract grade is BLOCKED." };
  if (grade === "C") return { status: "BLOCKED", reason: "Contract grade is C." };
  if (maxRisk > allowedRisk) return { status: "BLOCKED", reason: `Max risk $${maxRisk.toFixed(2)} is above allowed $${allowedRisk.toFixed(2)}.` };
  if (spread > maxSpreadPercent) return { status: "BLOCKED", reason: `${spread.toFixed(1)}% spread is above max ${maxSpreadPercent}%.` };
  if (grade === "B") return { status: "CAUTION", reason: "B-grade contract. Acceptable, but not ideal." };
  return { status: "APPROVED", reason: "Contract passes basic quality filters." };
}

// --- buildManualContract - logic untouched ------------------------------------
function buildManualContract(params: { stockSymbol: string; direction: TradeDirection; optionSymbol: string; expirationDate: string; strikePrice: number; bid: number; ask: number; contracts: number; }) {
  const { stockSymbol, direction, optionSymbol, expirationDate, strikePrice, bid, ask, contracts } = params;
  const mid = bid > 0 && ask > 0 ? Number(((bid + ask) / 2).toFixed(2)) : 0;
  const estimatedCost = Number((mid * contracts * 100).toFixed(2));
  const manualContract: OptionContract = {
    option_symbol: optionSymbol, optionSymbol, symbol: optionSymbol,
    stock_symbol: stockSymbol, stockSymbol,
    trade_direction: direction, tradeDirection: direction,
    expiration_date: expirationDate, expirationDate,
    strike_price: strikePrice, strikePrice,
    bid_price: bid, bidPrice: bid, bid,
    ask_price: ask, askPrice: ask, ask,
    mid_price: mid, midPrice: mid, mid,
    contracts, estimated_cost: estimatedCost, estimatedCost,
    max_risk: estimatedCost, maxRisk: estimatedCost,
    spreadPercent: mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999,
    spread_percent: mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999,
    bidAskSpreadPercent: mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999,
    volume: 0, openInterest: 0, open_interest: 0,
    liquidityScore: 0, liquidity_score: 0,
    recommendationScore: 0, recommendation_score: 0,
    qualityGrade: "UNKNOWN",
    contractQualityGrade: "UNKNOWN",
    grade: "UNKNOWN",
    contract_quality: "UNKNOWN",
    quality_grade: "UNKNOWN",
    contract_quality_grade: "UNKNOWN",
    recommendationReason: "Manual contract. No automatic quality grade.",
    whyThisContract: ["Manual contract entered by user.", "No automatic grade available.", "Use Testing Override only if intentionally testing."],
  };
  return manualContract;
}

// --- buildCreditSpreadContract - combines a short + long leg into one contract --
// INTENTIONAL DUPLICATE: lib/contractGrading.ts keeps a server-side copy with
// different display text and a simpler optionType derivation. The net_credit /
// max_loss math MUST stay in parity with the lib copy. Flag for future unification.
function buildCreditSpreadContract(params: {
  shortLeg: OptionContract;
  longLeg: OptionContract;
  spreadType: SpreadType;
  stockSymbol: string;
  contracts: number;
}): OptionContract {
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
  // The combined spread is only as good as its weaker leg.
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

  const optionType = getSpreadOptionType(spreadType, normalizeDirection(String(getContractValue(shortLeg, ["trade_direction", "tradeDirection"], ""))));

  return {
    option_symbol: shortLegSummary.option_symbol,
    optionSymbol: shortLegSummary.option_symbol,
    symbol: shortLegSummary.option_symbol,
    stock_symbol: stockSymbol,
    stockSymbol: stockSymbol,
    trade_direction: optionType,
    tradeDirection: optionType,
    expiration_date: getExpiration(shortLeg),
    expirationDate: getExpiration(shortLeg),
    strike_price: shortStrike,
    strikePrice: shortStrike,
    bid_price: shortBid, bidPrice: shortBid, bid: shortBid,
    ask_price: shortAsk, askPrice: shortAsk, ask: shortAsk,
    mid_price: netCredit, midPrice: netCredit, mid: netCredit,
    contracts,
    estimated_cost: 0,
    estimatedCost: 0,
    max_risk: maxLoss,
    maxRisk: maxLoss,
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
    qualityGrade: combinedGrade,
    contractQualityGrade: combinedGrade,
    grade: combinedGrade,
    contract_quality: combinedGrade,
    quality_grade: combinedGrade,
    contract_quality_grade: combinedGrade,
    source: "tradier",

    // --- Credit spread fields ----------------------------------------------
    spread_type: spreadType,
    short_leg: shortLegSummary,
    long_leg: longLegSummary,
    net_credit: netCredit,
    spread_width: spreadWidth,
    max_loss: maxLoss,
    max_profit: maxProfit,

    recommendationReason: `${getSpreadTypeLabel(spreadType)}: sell ${shortLegSummary.option_symbol} / buy ${longLegSummary.option_symbol}. Net credit $${netCredit.toFixed(2)}, max loss $${maxLoss.toFixed(2)}.`,
    whyThisContract: [
      `Short leg ${shortLegSummary.option_symbol} (strike $${shortStrike.toFixed(2)}, grade ${shortGrade}).`,
      `Long leg ${longLegSummary.option_symbol} (strike $${longStrike.toFixed(2)}, grade ${longGrade}).`,
      `Spread width $${spreadWidth.toFixed(2)}. Net credit $${netCredit.toFixed(2)}.`,
      `Max loss $${maxLoss.toFixed(2)}. Max profit $${maxProfit.toFixed(2)}.`,
      "Read-only market data only. Paper trade save remains controlled by Risk Guard.",
    ],
  };
}


function getRawOptionType(contract: OptionContract) {
  return String(
    getContractValue(
      contract,
      ["option_type", "optionType", "trade_direction", "tradeDirection"],
      ""
    )
  ).toUpperCase();
}

function getTradierQualityDiagnostics(
  contract: OptionContract,
  params: {
    accountSize: number;
    maxRiskPercent: number;
    maxSpreadPercent: number;
  }
) {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  const spread = getSpreadPercent(contract);
  const maxRisk = getMaxRisk(contract);
  const allowedRisk = params.accountSize * (params.maxRiskPercent / 100);
  const volume = getVolume(contract);
  const openInterest = getOpenInterest(contract);
  const liquidityScore = getTradierLiquidityScore(contract);
  const deltaAbs = getDeltaAbs(contract);
  const deltaFitScore = getDeltaFitScore(contract);
  const expirationDays = getTradierExpirationDays(contract);
  const expirationFitScore = getExpirationFitScore(contract);
  const hasLiquidityData = volume > 0 || openInterest > 0;
  const qualityGrade = getTradierQualityGrade(contract, params);

  const failReasons: string[] = [];
  const notes: string[] = [];

  if (bid <= 0 || ask <= 0 || mid <= 0) {
    failReasons.push("Invalid bid/ask/mid pricing.");
  }

  if (ask < bid) {
    failReasons.push("Ask is below bid, so pricing is invalid.");
  }

  if (maxRisk > allowedRisk) {
    failReasons.push(
      `Max risk $${maxRisk.toFixed(2)} is above allowed $${allowedRisk.toFixed(2)}.`
    );
  }

  if (spread > params.maxSpreadPercent * 1.5) {
    failReasons.push(
      `Spread ${spread.toFixed(1)}% is severely above the hard block limit ${(
        params.maxSpreadPercent * 1.5
      ).toFixed(1)}%.`
    );
  }

  if (qualityGrade === "C") {
    if (spread > params.maxSpreadPercent) {
      failReasons.push(
        `Spread ${spread.toFixed(1)}% is above the clean B-grade max ${params.maxSpreadPercent}%.`
      );
    }

    if (deltaFitScore < 35) {
      failReasons.push(
        deltaAbs === null
          ? "Delta unavailable and did not help the quality score."
          : `Delta ${deltaAbs.toFixed(2)} is outside the preferred funded-account range.`
      );
    }

    if (expirationFitScore < 35) {
      failReasons.push(
        expirationDays === null
          ? "Expiration distance unavailable and did not help the quality score."
          : `${expirationDays} days to expiration is outside the preferred window.`
      );
    }

    if (failReasons.length === 0) {
      failReasons.push(
        "Contract missed A/B quality thresholds. It is watch-only unless Testing Override is intentionally armed."
      );
    }
  }

  notes.push(
    `Spread ${spread.toFixed(1)}% ${
      spread <= params.maxSpreadPercent ? "within" : "above"
    } max ${params.maxSpreadPercent}%.`
  );

  notes.push(
    `Max risk $${maxRisk.toFixed(2)} ${
      maxRisk <= allowedRisk ? "within" : "above"
    } allowed $${allowedRisk.toFixed(2)}.`
  );

  notes.push(
    hasLiquidityData
      ? `Liquidity score ${liquidityScore} from ${volume} volume / ${openInterest} OI.`
      : "Tradier liquidity data missing or stale; no A/A+ liquidity reward."
  );

  notes.push(
    deltaAbs === null
      ? `Delta unavailable. Delta fit score ${deltaFitScore}.`
      : `Delta ${deltaAbs.toFixed(2)}. Delta fit score ${deltaFitScore}.`
  );

  notes.push(
    expirationDays === null
      ? `Expiration distance unavailable. Expiration fit score ${expirationFitScore}.`
      : `${expirationDays} days to expiration. Expiration fit score ${expirationFitScore}.`
  );

  notes.push("Read-only market data only. Paper save remains controlled by Risk Guard.");

  const reason =
    qualityGrade === "BLOCKED"
      ? `Tradier contract blocked. ${failReasons[0] || "Hard safety filter failed."}`
      : qualityGrade === "C"
      ? `Tradier contract is C quality. ${failReasons[0]}`
      : qualityGrade === "B"
      ? "Tradier contract is B quality: acceptable for clean paper testing if Risk Guard is APPROVED."
      : qualityGrade === "A"
      ? "Tradier contract is A quality: good setup with clean pricing, risk, and minimum liquidity confirmation."
      : qualityGrade === "A+"
      ? "Tradier contract is A+ quality: elite setup with strong liquidity, spread, delta, expiration, and risk fit."
      : "Tradier contract quality is unknown.";

  return {
    reason,
    why: [...failReasons, ...notes],
  };
}


function enrichTradierContract(
  contract: OptionContract,
  params: {
    stockSymbol: string;
    direction: TradeDirection;
    accountSize: number;
    maxRiskPercent: number;
    maxSpreadPercent: number;
    tradierMode?: string;
  }
): OptionContract {
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
  const riskStatus = getRiskStatus(
    {
      ...contract,
      qualityGrade,
      contractQualityGrade: qualityGrade,
      grade: qualityGrade,
      contract_quality: qualityGrade,
      quality_grade: qualityGrade,
      contract_quality_grade: qualityGrade,
    },
    {
      accountSize: params.accountSize,
      maxRiskPercent: params.maxRiskPercent,
      maxSpreadPercent: params.maxSpreadPercent,
    }
  );

  return {
    ...contract,
    source: "tradier",
    stock_symbol: String(getContractValue(contract, ["stock_symbol", "stockSymbol"], params.stockSymbol)),
    stockSymbol: String(getContractValue(contract, ["stock_symbol", "stockSymbol"], params.stockSymbol)),
    trade_direction: params.direction,
    tradeDirection: params.direction,
    bid_price: bid,
    bidPrice: bid,
    bid,
    ask_price: ask,
    askPrice: ask,
    ask,
    mid_price: mid,
    midPrice: mid,
    mid,
    contracts,
    estimated_cost: estimatedCost,
    estimatedCost,
    max_risk: maxRisk,
    maxRisk,
    spreadPercent: spread,
    spread_percent: spread,
    bidAskSpreadPercent: spread,
    liquidityScore,
    liquidity_score: liquidityScore,
    recommendationScore,
    recommendation_score: recommendationScore,
    qualityGrade,
    contractQualityGrade: qualityGrade,
    grade: qualityGrade,

    // Save-flow compatibility: page.tsx and the option details route can read any of these.
    contract_quality: qualityGrade,
    quality_grade: qualityGrade,
    contract_quality_grade: qualityGrade,

    recommendationReason:
      qualityGrade === "BLOCKED"
        ? `Tradier contract blocked by safety filters. ${riskStatus.reason}`
        : qualityGrade === "C"
        ? "Tradier contract is weak quality. Testing Override required before saving."
        : qualityGrade === "B"
        ? "Tradier contract is acceptable, but not ideal. Confirm Risk Guard before saving."
        : "Tradier contract passes current read-only quality filters.",
    whyThisContract: [
      `Loaded from Tradier ${params.tradierMode || "sandbox"} option chain.`,
      `Spread ${spread.toFixed(1)}%.`,
      `Liquidity score ${liquidityScore}.`,
      deltaAbs === null ? "Delta unavailable." : `Delta ${deltaAbs.toFixed(2)} absolute.`,
      expirationDays === null ? "Expiration distance unavailable." : `${expirationDays} days to expiration.`,
      "Read-only market data only. Paper trade save remains controlled by Risk Guard.",
    ],
  };
}

function getFirstExpirationFromResponse(data: any): string {
  const dates = data?.data?.expirations?.date || data?.expirations?.date || data?.dates || [];

  if (Array.isArray(dates) && dates.length > 0) {
    return String(dates[0]);
  }

  if (typeof dates === "string") {
    return dates;
  }

  return "";
}


// --- MiniStat - matches suite -------------------------------------------------
function MiniStat({ label, value, valueClass = "text-slate-200" }: { label: string; value: string | number; valueClass?: string; }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-2.5 py-2">
      <span className="font-mono text-[10px] sm:text-[8px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.22em] text-slate-600">{label}</span>
      <span className={`block truncate font-mono text-[11px] sm:text-[10px] font-black ${valueClass}`}>
  {value}
</span>
    </div>
  );
}

export default function OptionContractSelector({
  selectedSymbol = "",
  stockSymbol = "",
  scannerDirection = "NO TRADE",
  tradeDirection = "NO TRADE",
  selectedContract = null,
  onSelectContract,
  onContractSelected,
  onClearSelectedContract,
  accountSize = 10000,
  maxRiskPercent = 1,
  maxSpreadPercent = 20,
}: OptionContractSelectorProps) {

  // --- All state - untouched ------------------------------------------------
  const finalSymbol = selectedSymbol || stockSymbol;
  const finalDirection = normalizeDirection(String(tradeDirection || scannerDirection || "NO TRADE"));

  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);
  const [chainSource, setChainSource] = useState<"mock" | "tradier" | "none">("none");
  const [tradierExpiration, setTradierExpiration] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hideBlockedContracts, setHideBlockedContracts] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recommendation");
  const [manualOptionSymbol, setManualOptionSymbol] = useState("");
  const [manualExpiration, setManualExpiration] = useState("");
  const [manualStrike, setManualStrike] = useState("");
  const [manualBid, setManualBid] = useState("");
  const [manualAsk, setManualAsk] = useState("");
  const [manualContracts, setManualContracts] = useState("1");

  // --- Credit spread state ----------------------------------------------------
  const [spreadType, setSpreadType] = useState<SpreadType>(() => getDefaultSpreadType(finalDirection));
  const [shortLegContract, setShortLegContract] = useState<OptionContract | null>(null);

  const chainOptionType = getSpreadOptionType(spreadType, finalDirection);

  // --- All handlers - untouched ---------------------------------------------
  function selectContract(contract: OptionContract | null) {
    const syncedContract = withSyncedContractQuality(contract);


    if (typeof onSelectContract === "function") onSelectContract(syncedContract);
    if (typeof onContractSelected === "function") onContractSelected(syncedContract);
  }

  function handleSpreadTypeChange(nextSpreadType: SpreadType) {
    if (nextSpreadType === spreadType) return;
    setSpreadType(nextSpreadType);
    setShortLegContract(null);
    if (typeof onClearSelectedContract === "function") onClearSelectedContract();
    else selectContract(null);
  }

  function handleSelectShortLeg(contract: OptionContract) {
    if (spreadType === "single_leg") {
      selectContract(contract);
      return;
    }

    setShortLegContract(contract);
    if (typeof onClearSelectedContract === "function") onClearSelectedContract();
    else selectContract(null);
  }

  function handleSelectLongLeg(longLeg: OptionContract) {
    if (!shortLegContract) return;

    const spreadContract = buildCreditSpreadContract({
      shortLeg: shortLegContract,
      longLeg,
      spreadType,
      stockSymbol: finalSymbol,
      contracts: getContracts(shortLegContract),
    });

    selectContract(spreadContract);
  }

  function handleClearSpreadSelection() {
    setShortLegContract(null);
    if (typeof onClearSelectedContract === "function") onClearSelectedContract();
    else selectContract(null);
  }

  async function loadMockChain() {
    if (!finalSymbol) { setStatusMessage("Select a scanner setup before loading the option chain."); return; }
    if (finalDirection === "NO TRADE") { setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first."); return; }
    setLoadingChain(true);
    setStatusMessage("Loading mock option chain...");
    try {
      const res = await fetch(`/api/options/chain?symbol=${encodeURIComponent(finalSymbol)}&direction=${encodeURIComponent(chainOptionType)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success) { setStatusMessage(data?.error || "Option chain failed."); setContracts([]); return; }
      const rawContracts = data.contracts || data.optionChain || data.chain || [];
      if (!Array.isArray(rawContracts)) { setStatusMessage("Option chain returned invalid contract data."); setContracts([]); return; }
      setContracts(rawContracts);
      setChainSource("mock");
      setStatusMessage(`Loaded ${rawContracts.length} mock contracts. Turn Hide BLOCKED off to see blocked test contracts.`);
    } catch (error) {
      console.error("loadMockChain error:", error);
      setStatusMessage("Option chain failed. Check console.");
      setContracts([]);
      setChainSource("none");
    } finally {
      setLoadingChain(false);
    }
  }

  async function loadTradierChain() {
    if (!finalSymbol) {
      setStatusMessage("Select a scanner setup before loading Tradier contracts.");
      return;
    }

    if (finalDirection === "NO TRADE") {
      setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first.");
      return;
    }

    setLoadingChain(true);
    setStatusMessage("Loading Tradier read-only option chain...");

    try {
      let expiration = tradierExpiration.trim();

      if (!expiration) {
        const expirationRes = await fetch(
          `/api/tradier/options/expirations?symbol=${encodeURIComponent(finalSymbol)}`,
          { cache: "no-store" }
        );
        const expirationData = await expirationRes.json();

        if (!expirationRes.ok || !expirationData?.success || !expirationData?.expirationsAvailable) {
          setStatusMessage(expirationData?.message || expirationData?.error || "Could not load Tradier expirations.");
          setContracts([]);
          setChainSource("none");
          return;
        }

        expiration = getFirstExpirationFromResponse(expirationData);

        if (!expiration) {
          setStatusMessage("Tradier did not return any expiration dates for this symbol.");
          setContracts([]);
          setChainSource("none");
          return;
        }

        setTradierExpiration(expiration);
      }

      const chainRes = await fetch(
        `/api/tradier/options/chain?symbol=${encodeURIComponent(finalSymbol)}&expiration=${encodeURIComponent(expiration)}`,
        { cache: "no-store" }
      );
      const chainData = await chainRes.json();

      if (!chainRes.ok || !chainData?.success || !chainData?.chainAvailable) {
        setStatusMessage(chainData?.message || chainData?.error || "Tradier option chain failed.");
        setContracts([]);
        setChainSource("none");
        return;
      }

      const rawContracts = Array.isArray(chainData.contracts) ? chainData.contracts : [];
      const directionFiltered = rawContracts.filter((contract: OptionContract) => {
        const optionType = getRawOptionType(contract);
        return optionType === chainOptionType || String(contract.trade_direction || contract.tradeDirection || "").toUpperCase() === chainOptionType;
      });

      const enrichedContracts = directionFiltered.map((contract: OptionContract) =>
        enrichTradierContract(contract, {
          stockSymbol: finalSymbol,
          direction: chainOptionType,
          accountSize,
          maxRiskPercent,
          maxSpreadPercent,
          tradierMode: chainData.mode,
        })
      );

      setContracts(enrichedContracts);
      setChainSource("tradier");
      setStatusMessage(
        `Loaded ${enrichedContracts.length} Tradier ${chainOptionType} contracts for ${finalSymbol} ${expiration}. Read-only ${chainData.mode || "sandbox"} data. Quality ranking is tuned for spread, liquidity, delta, risk, and expiration.`
      );
    } catch (error) {
      console.error("loadTradierChain error:", error);
      setStatusMessage("Tradier option chain failed. Check console.");
      setContracts([]);
      setChainSource("none");
    } finally {
      setLoadingChain(false);
    }
  }

  // --- Auto-load Tradier chain as the default source on symbol/direction/spread type change --
  useEffect(() => {
    if (!finalSymbol || finalDirection === "NO TRADE") return;
    loadTradierChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSymbol, finalDirection, spreadType]);

  // --- Reset spread type default and in-progress leg selection when the setup changes --
  useEffect(() => {
    setSpreadType(getDefaultSpreadType(finalDirection));
    setShortLegContract(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSymbol, finalDirection]);

  // --- Reset in-progress short leg whenever the spread type changes --
  useEffect(() => {
    setShortLegContract(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadType]);

  function handleManualSelect() {
    if (!finalSymbol) { setStatusMessage("Select a scanner setup first."); return; }
    if (finalDirection === "NO TRADE") { setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first."); return; }
    const strike = Number(manualStrike);
    const bid = Number(manualBid);
    const ask = Number(manualAsk);
    const contractCount = Number(manualContracts);
    if (!manualOptionSymbol.trim()) { setStatusMessage("Enter an option symbol."); return; }
    if (!manualExpiration) { setStatusMessage("Enter an expiration date."); return; }
    if (!Number.isFinite(strike) || strike <= 0) { setStatusMessage("Enter a valid strike price."); return; }
    if (!Number.isFinite(bid) || bid <= 0) { setStatusMessage("Enter a valid bid price."); return; }
    if (!Number.isFinite(ask) || ask <= 0 || ask < bid) { setStatusMessage("Enter a valid ask price."); return; }
    if (!Number.isFinite(contractCount) || contractCount <= 0) { setStatusMessage("Enter a valid contract count."); return; }
    const manualContract = buildManualContract({ stockSymbol: finalSymbol, direction: finalDirection, optionSymbol: manualOptionSymbol.trim().toUpperCase(), expirationDate: manualExpiration, strikePrice: strike, bid, ask, contracts: contractCount });
    selectContract(manualContract);
    setChainSource("none");
    setStatusMessage(`Manual contract selected: ${manualContract.option_symbol}`);
  }

  // --- Filter + sort logic - untouched -------------------------------------
  const visibleContracts = useMemo(() => {
    const filtered = contracts.filter((contract) => {
      const grade = getGrade(contract);
      if (hideBlockedContracts && grade === "BLOCKED") return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "recommendation") {
        const scoreDiff = getRecommendationScore(b) - getRecommendationScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const gradeDiff = getGradeRank(getGrade(b)) - getGradeRank(getGrade(a));
        if (gradeDiff !== 0) return gradeDiff;

        const liquidityDiff = getLiquidityScore(b) - getLiquidityScore(a);
        if (liquidityDiff !== 0) return liquidityDiff;

        return getSpreadPercent(a) - getSpreadPercent(b);
      }

      if (sortMode === "quality") return getGradeRank(getGrade(b)) - getGradeRank(getGrade(a));
      if (sortMode === "liquidity") return getLiquidityScore(b) - getLiquidityScore(a);
      if (sortMode === "spread") return getSpreadPercent(a) - getSpreadPercent(b);
      if (sortMode === "risk") return getMaxRisk(a) - getMaxRisk(b);
      if (sortMode === "price") return getMid(a) - getMid(b);
      return 0;
    });
    return sorted;
  }, [contracts, hideBlockedContracts, sortMode]);

  const recommendedContract = useMemo(() => {
    const cleanApproved = visibleContracts.filter((contract) => {
      const grade = getGrade(contract);
      const risk = getRiskStatus(contract, {
        accountSize,
        maxRiskPercent,
        maxSpreadPercent,
      });

      return (
        (grade === "A+" || grade === "A" || grade === "B") &&
        risk.status === "APPROVED"
      );
    });

    if (cleanApproved.length === 0) return null;

    return [...cleanApproved].sort((a, b) => {
      const gradeDiff = getGradeRank(getGrade(b)) - getGradeRank(getGrade(a));
      if (gradeDiff !== 0) return gradeDiff;

      const scoreDiff = getRecommendationScore(b) - getRecommendationScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      const liquidityDiff = getLiquidityScore(b) - getLiquidityScore(a);
      if (liquidityDiff !== 0) return liquidityDiff;

      const riskDiff = getMaxRisk(a) - getMaxRisk(b);
      if (riskDiff !== 0) return riskDiff;

      return getSpreadPercent(a) - getSpreadPercent(b);
    })[0];
  }, [visibleContracts, accountSize, maxRiskPercent, maxSpreadPercent]);

  const noCleanRecommendation = visibleContracts.length > 0 && !recommendedContract;

  // --- Long leg (protection) candidates for the in-progress short leg ----------
  const longLegCandidates = useMemo(() => {
    if (spreadType === "single_leg" || !shortLegContract) return [];

    const shortStrike = getStrike(shortLegContract);
    const shortExpiration = getExpiration(shortLegContract);
    const shortSymbol = getOptionSymbol(shortLegContract);

    return contracts
      .filter((contract) => {
        if (getOptionSymbol(contract) === shortSymbol) return false;
        if (getExpiration(contract) !== shortExpiration) return false;
        const strike = getStrike(contract);
        if (spreadType === "bull_put_spread") return strike < shortStrike;
        if (spreadType === "bear_call_spread") return strike > shortStrike;
        return false;
      })
      .sort((a, b) => Math.abs(getStrike(a) - shortStrike) - Math.abs(getStrike(b) - shortStrike));
  }, [contracts, spreadType, shortLegContract]);

  const selectedOptionSymbol = getOptionSymbol(selectedContract);

  return (
    <div className="space-y-4">

      {/* -- HEADER + LOAD BUTTON ------------------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-600">
            OPTIMA-SYS - Option Chain Selector
          </p>
          <p className="mt-0.5 font-mono text-xs font-black text-slate-300">
            Contract Builder - {finalSymbol || "No symbol"}{" "}
            <span className={`${getDirectionColor(finalDirection)}`}>{finalDirection}</span>
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-slate-600">
            Use mock contracts for testing or Tradier sandbox contracts for read-only market data.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <input
            value={tradierExpiration}
            onChange={(e) => setTradierExpiration(e.target.value)}
            placeholder="Tradier expiration YYYY-MM-DD"
            className="rounded-lg border border-slate-700/60 bg-slate-950/80 px-3 py-2 font-mono text-[10px] text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={loadMockChain}
              disabled={loadingChain || !finalSymbol || finalDirection === "NO TRADE"}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-violet-500/40 hover:bg-slate-800/80 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg, transparent, #06b6d4, transparent)" }}
              />
              {loadingChain ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
                  Loading...
                </span>
              ) : (
                "Load Mock Chain"
              )}
            </button>

            <button
              type="button"
              onClick={loadTradierChain}
              disabled={loadingChain || !finalSymbol || finalDirection === "NO TRADE"}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }}
              />
              {loadingChain ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                  Loading...
                </span>
              ) : (
                "Load Tradier Chain"
              )}
            </button>
          </div>

          <p className="font-mono text-[8px] leading-4 text-slate-600">
            Leave expiration blank to auto-pick the first Tradier expiration. Read-only sandbox data only.
          </p>
        </div>
      </div>

      {/* -- SPREAD TYPE SELECTOR ------------------------------------------- */}
      <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-black/40 ring-1 ring-slate-700/10">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-purple-500" />
        <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-purple-500">
              OPTIMA-SYS - Spread Type
            </p>
            <p className="mt-0.5 font-mono text-[9px] leading-4 text-slate-600">
              {spreadType === "single_leg"
                ? "Single leg mode. Selecting a contract saves it directly."
                : shortLegContract
                ? `Short leg selected. Pick a long leg below to complete the ${getSpreadTypeLabel(spreadType)}.`
                : `Pick the short leg (sell side) to begin the ${getSpreadTypeLabel(spreadType)}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["bull_put_spread", "bear_call_spread", "single_leg"] as SpreadType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSpreadTypeChange(type)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                  spreadType === type
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                    : "border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-600"
                }`}
              >
                {getSpreadTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -- SPREAD SUMMARY -------------------------------------------------- */}
      {selectedContract && selectedContract.spread_type && selectedContract.spread_type !== "single_leg" && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/25 bg-purple-500/5 ring-1 ring-purple-500/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-purple-500" />
          <div className="px-5 py-4 pl-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-purple-500">
                  {getSpreadTypeLabel(selectedContract.spread_type)} - Spread Summary
                </p>
                <p className="mt-1 font-mono text-[9px] leading-4 text-slate-400">
                  Short: {selectedContract.short_leg?.option_symbol || "-"} (sell) - Long: {selectedContract.long_leg?.option_symbol || "-"} (buy)
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSpreadSelection}
                className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
              >
                Clear Spread x
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <MiniStat label="Net Credit" value={`$${(selectedContract.net_credit ?? 0).toFixed(2)}`} valueClass="text-emerald-300" />
              <MiniStat label="Spread Width" value={`$${(selectedContract.spread_width ?? 0).toFixed(2)}`} />
              <MiniStat label="Max Loss" value={`$${(selectedContract.max_loss ?? 0).toFixed(2)}`} valueClass="text-red-400" />
              <MiniStat label="Max Profit" value={`$${(selectedContract.max_profit ?? 0).toFixed(2)}`} valueClass="text-emerald-300" />
            </div>
          </div>
        </div>
      )}

      {/* -- STATUS MESSAGE ------------------------------------------------ */}
      {statusMessage && (
        <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black/30">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-violet-500" />
          <p className="px-4 py-2.5 pl-5 font-mono text-[9px] leading-5 text-slate-400">
            {statusMessage}
          </p>
        </div>
      )}

      {/* -- CONTEXT STRIP ------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        <div className="relative overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-600" />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Symbol</p>
          <p className="pl-0.5 font-mono text-[10px] font-black text-white">{finalSymbol || "-"}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
          <div className={`absolute inset-y-0 left-0 w-[2px] ${getDirectionBar(finalDirection)}`} />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Direction</p>
          <p className={`pl-0.5 font-mono text-[10px] font-black ${getDirectionColor(finalDirection)}`}>{finalDirection}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-blue-500" />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Loaded</p>
          <p className="pl-0.5 font-mono text-[10px] font-black text-blue-300">{contracts.length}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-500" />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Visible</p>
          <p className="pl-0.5 font-mono text-[10px] font-black text-slate-300">{visibleContracts.length}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
          <div className={`absolute inset-y-0 left-0 w-[2px] ${chainSource === "tradier" ? "bg-emerald-500" : chainSource === "mock" ? "bg-violet-500" : "bg-slate-600"}`} />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Source</p>
          <p className={`pl-0.5 font-mono text-[10px] font-black ${chainSource === "tradier" ? "text-emerald-300" : chainSource === "mock" ? "text-violet-300" : "text-slate-400"}`}>
            {chainSource === "tradier" ? "Tradier" : chainSource === "mock" ? "Mock" : "-"}
          </p>
        </div>
      </div>

      {/* -- MANUAL BUILDER ------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-black/40 ring-1 ring-slate-700/10">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-slate-600" />
        <div className="px-5 py-4 pl-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                Manual Builder
              </p>
              <p className="mt-0.5 font-mono text-[9px] leading-4 text-slate-600">
                Manual contracts save as grade UNKNOWN. Normal save blocks unless Testing Override is armed.
              </p>
            </div>
            <button
              onClick={handleManualSelect}
              className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-2.5 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-slate-200"
            >
              Select Manual &gt;
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {[
              { value: manualOptionSymbol, setter: setManualOptionSymbol, placeholder: "Option symbol" },
              { value: manualExpiration, setter: setManualExpiration, placeholder: "Expiration YYYY-MM-DD" },
              { value: manualStrike, setter: setManualStrike, placeholder: "Strike price" },
              { value: manualBid, setter: setManualBid, placeholder: "Bid" },
              { value: manualAsk, setter: setManualAsk, placeholder: "Ask" },
              { value: manualContracts, setter: setManualContracts, placeholder: "Contracts" },
            ].map(({ value, setter, placeholder }) => (
              <input
                key={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="rounded-lg border border-slate-700/60 bg-slate-950/80 px-3 py-2 font-mono text-[10px] text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
              />
            ))}
          </div>
        </div>
      </div>

      {/* -- FILTER BAR ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHideBlockedContracts(!hideBlockedContracts)}
          className={`rounded-lg border px-3 py-2 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
            hideBlockedContracts
              ? "border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-600"
              : "border-orange-500/40 bg-orange-500/10 text-orange-300"
          }`}
        >
          {hideBlockedContracts ? "Hide BLOCKED: On" : "Hide BLOCKED: Off"}
        </button>

        {selectedContract && (
          <button
            type="button"
            onClick={() => {
              if (typeof onClearSelectedContract === "function") onClearSelectedContract();
              else selectContract(null);
            }}
            className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
          >
            Clear Selected x
          </button>
        )}

        <div className="ml-auto">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-2 h-11 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300 outline-none focus:border-violet-500/40"
          >
            <option value="recommendation">Sort - Recommendation</option>
            <option value="quality">Sort - Quality</option>
            <option value="liquidity">Sort - Liquidity</option>
            <option value="spread">Sort - Spread</option>
            <option value="risk">Sort - Risk</option>
            <option value="price">Sort - Price</option>
          </select>
        </div>
      </div>

      {/* -- RECOMMENDED CONTRACT BANNER ----------------------------------- */}
      {recommendedContract && (
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 ring-1 ring-emerald-500/10">
          <div
            className="absolute inset-x-0 top-0 h-px opacity-60"
            style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }}
          />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />
          <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-600">
                Best Clean Contract Recommendation
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="break-all font-mono text-xs font-black text-white">
                  {getOptionSymbol(recommendedContract)}
                </p>
                <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getGradeBadge(getGrade(recommendedContract))}`}>
                  {getGrade(recommendedContract)}
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] leading-4 text-slate-500">
                {recommendedContract.recommendationReason || "Recommended based on clean grade, approved risk, spread, liquidity, and score."}
              </p>
            </div>
            <button
              onClick={() => selectContract(recommendedContract)}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }}
              />
              Select Recommended &gt;
            </button>
          </div>
        </div>
      )}

      {noCleanRecommendation && (
        <div className="relative overflow-hidden rounded-xl border border-orange-500/25 bg-orange-500/5 ring-1 ring-orange-500/10">
          <div
            className="absolute inset-x-0 top-0 h-px opacity-60"
            style={{
              background:
                "linear-gradient(90deg, transparent, #f97316, transparent)",
            }}
          />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-orange-500" />
          <div className="px-5 py-4 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-orange-500">
              No Clean Recommendation
            </p>
            <p className="mt-1 font-mono text-xs font-black text-white">
              No A+, A, or B contract has Risk Guard APPROVED.
            </p>
            <p className="mt-1 font-mono text-[9px] leading-4 text-slate-500">
              C and BLOCKED contracts remain available for override testing only, but they will not be promoted as the best recommendation.
            </p>
          </div>
        </div>
      )}

      {/* -- LONG LEG (PROTECTION) PICKER ----------------------------------- */}
      {spreadType !== "single_leg" && shortLegContract && !selectedContract && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/25 bg-purple-500/5 ring-1 ring-purple-500/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-purple-500" />
          <div className="px-5 py-4 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-purple-500">
              Long Leg (Protection) - Step 2 of 2
            </p>
            <p className="mt-1 font-mono text-[9px] leading-4 text-slate-500">
              Short leg: {getOptionSymbol(shortLegContract)} (strike ${getStrike(shortLegContract).toFixed(2)}).
              {" "}Pick a {spreadType === "bull_put_spread" ? "lower" : "higher"}-strike {getSpreadOptionType(spreadType, finalDirection)} in the same expiration to define max loss.
            </p>

            {longLegCandidates.length === 0 ? (
              <p className="mt-3 font-mono text-[9px] text-slate-600">
                No eligible long leg candidates loaded for this expiration. Load more of the chain or pick a different short leg.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {longLegCandidates.map((contract) => {
                  const optionSymbol = getOptionSymbol(contract);
                  const strike = getStrike(contract);
                  const bid = getBid(contract);
                  const ask = getAsk(contract);
                  const mid = getMid(contract);
                  const grade = getGrade(contract);

                  return (
                    <div
                      key={optionSymbol}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-mono text-[10px] font-black text-white">{optionSymbol}</span>
                        <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getGradeBadge(grade)}`}>
                          {grade}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">
                          Strike ${strike.toFixed(2)} - Bid ${bid.toFixed(2)} / Ask ${ask.toFixed(2)} / Mid ${mid.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectLongLeg(contract)}
                        className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2.5 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-purple-300 transition hover:bg-purple-500/20"
                      >
                        Select Long Leg &gt;
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- EMPTY STATE --------------------------------------------------- */}
      {visibleContracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-black/30 py-10">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">No Data</p>
          <p className="mt-1 font-mono text-sm font-black text-slate-400">No visible contracts</p>
          <p className="mt-0.5 font-mono text-[9px] text-slate-600">
            Load the mock chain, load the Tradier chain, or turn Hide BLOCKED off.
          </p>
        </div>
      ) : (
        // -- CONTRACT LIST ------------------------------------------------
        <div className="space-y-2.5">
          {visibleContracts.map((contract) => {
            const optionSymbol = getOptionSymbol(contract);
            const grade = getGrade(contract);
            const risk = getRiskStatus(contract, { accountSize, maxRiskPercent, maxSpreadPercent });
            const isSelected = selectedOptionSymbol && selectedOptionSymbol === optionSymbol;
            const isShortLeg =
              spreadType !== "single_leg" &&
              !selectedContract &&
              !!shortLegContract &&
              getOptionSymbol(shortLegContract) === optionSymbol;
            const bid = getBid(contract);
            const ask = getAsk(contract);
            const mid = getMid(contract);
            const strike = getStrike(contract);
            const expiration = getExpiration(contract);
            const spread = getSpreadPercent(contract);
            const maxRisk = getMaxRisk(contract);
            const liquidity = getLiquidityScore(contract);
            const recommendation = getRecommendationScore(contract);
            const volume = getNumber(contract.volume, 0);
            const openInterest = getOpenInterest(contract);
            const isWeak = grade === "BLOCKED" || grade === "C";

            return (
              <div
                key={optionSymbol}
                className={`relative overflow-hidden rounded-xl border ring-1 transition-all ${
                  isSelected
                    ? "border-violet-500/40 bg-slate-900/90 ring-violet-500/20"
                    : isShortLeg
                    ? "border-purple-500/40 bg-slate-900/90 ring-purple-500/20"
                    : `border-slate-700/60 bg-slate-900/60 ${getGradeRing(grade)}`
                }`}
              >
                {/* Selected: top cyan line */}
                {isSelected && (
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #06b6d4 40%, #3b82f6 70%, transparent)" }}
                  />
                )}
                {/* Short leg in progress: top purple line */}
                {isShortLeg && (
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #a855f7 40%, #6366f1 70%, transparent)" }}
                  />
                )}
                {/* Left grade accent bar */}
                <div className={`absolute inset-y-0 left-0 w-[3px] ${isSelected ? "bg-violet-500" : isShortLeg ? "bg-purple-500" : getGradeBar(grade)}`} />

                <div className="px-5 py-4 pl-6">
                  {/* -- Row 1: Symbol + badges --------------------------- */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs font-black text-white">
                      {optionSymbol}
                    </span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getGradeBadge(grade)}`}>
                      {grade}
                    </span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${getRiskBadge(risk.status)}`}>
                      {risk.status}
                    </span>
                    {isSelected && (
                      <span className="rounded border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-violet-300">
                        Selected
                      </span>
                    )}
                    {isShortLeg && (
                      <span className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-purple-300">
                        Short Leg
                      </span>
                    )}
                  </div>

                  {/* -- Row 2: Reason ------------------------------------ */}
                  <p className="mt-1.5 font-mono text-[9px] leading-4 text-slate-500">
                    {contract.recommendationReason || risk.reason}
                  </p>

                  {/* -- Row 3: Stats grid -------------------------------- */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
                    <MiniStat label="Exp" value={expiration || "-"} />
                    <MiniStat label="Strike" value={`$${strike.toFixed(2)}`} />
                    <MiniStat label="Bid" value={`$${bid.toFixed(2)}`} />
                    <MiniStat label="Ask" value={`$${ask.toFixed(2)}`} />
                    <MiniStat label="Mid" value={`$${mid.toFixed(2)}`} />
                    <MiniStat
                      label="Spread"
                      value={`${spread.toFixed(1)}%`}
                      valueClass={spread <= maxSpreadPercent ? "text-emerald-300" : "text-red-400"}
                    />
                    <MiniStat
                      label="Max Risk"
                      value={`$${maxRisk.toFixed(2)}`}
                      valueClass={maxRisk <= accountSize * (maxRiskPercent / 100) ? "text-emerald-300" : "text-red-400"}
                    />
                    <MiniStat label="Delta" value={getDelta(contract) === null ? "-" : Math.abs(getDelta(contract) || 0).toFixed(2)} />
                    <MiniStat label="Liq" value={liquidity} />
                    <MiniStat label="Score" value={recommendation} />
                    <MiniStat label="Vol / OI" value={`${volume} / ${openInterest}`} />
                  </div>

                  {/* -- Row 4: Why This Contract -------------------------- */}
                  {(contract.whyThisContract && contract.whyThisContract.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-800/60 bg-black/20 px-3 py-2">
                      {contract.whyThisContract.map((reason, i) => (
                        <span key={`why-${i}`} className="font-mono text-[9px] text-slate-600">
                          &gt; {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* -- Row 5: Action buttons ----------------------------- */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSelectShortLeg(contract)}
                      className={`rounded-lg border px-4 py-2.5 min-h-[44px] font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                        isSelected
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                          : isShortLeg
                          ? "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                          : isWeak
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                          : "border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-violet-500/30 hover:text-violet-300"
                      }`}
                    >
                      {isSelected
                        ? "Selected"
                        : isShortLeg
                        ? "Short Leg Selected"
                        : isWeak
                        ? "Select for Override Test >"
                        : spreadType !== "single_leg"
                        ? "Select Short Leg >"
                        : "Select Contract >"}
                    </button>

                    {isWeak && (
                      <span className="font-mono text-[9px] text-orange-600">
                        &gt; Intentionally weak. Normal save blocks unless Override is armed.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
