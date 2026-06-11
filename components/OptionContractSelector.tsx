"use client";

// --- UI ONLY - all chain logic, filtering, sorting, and selection untouched --

import { useMemo, useState } from "react";

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

// --- All helper functions untouched ------------------------------------------
function getNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getContractValue(contract: OptionContract | null | undefined, keys: string[], fallback: any = null) {
  if (!contract) return fallback;
  for (const key of keys) {
    const value = (contract as any)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function normalizeDirection(direction?: string): TradeDirection {
  if (direction === "CALL") return "CALL";
  if (direction === "PUT") return "PUT";
  return "NO TRADE";
}

function getOptionSymbol(contract: OptionContract | null | undefined) {
  return String(getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], ""));
}

function normalizeGradeValue(value: unknown) {
  const grade = String(value || "").trim().toUpperCase();

  if (!grade || grade === "UNKNOWN" || grade === "N/A" || grade === "NULL") {
    return "";
  }

  if (grade === "IDEAL") return "A+";
  if (grade === "GOOD") return "A";
  if (grade === "ACCEPTABLE") return "B";
  if (grade === "AVOID") return "BLOCKED";

  if (
    grade === "A+" ||
    grade === "A" ||
    grade === "B" ||
    grade === "C" ||
    grade === "BLOCKED"
  ) {
    return grade;
  }

  return "";
}

function getGrade(contract: OptionContract | null | undefined) {
  if (!contract) return "UNKNOWN";

  const gradeCandidates = [
    contract.contract_quality,
    contract.qualityGrade,
    contract.contractQualityGrade,
    contract.grade,
    contract.quality_grade,
    contract.contract_quality_grade,
  ];

  for (const candidate of gradeCandidates) {
    const normalized = normalizeGradeValue(candidate);

    if (normalized) return normalized;
  }

  return "UNKNOWN";
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

function getBid(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["bid_price", "bidPrice", "bid"]), 0);
}

function getAsk(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["ask_price", "askPrice", "ask"]), 0);
}

function getMid(contract: OptionContract) {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  return getNumber(getContractValue(contract, ["mid_price", "midPrice", "mid"]), bid > 0 && ask > 0 ? (bid + ask) / 2 : 0);
}

function getStrike(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["strike_price", "strikePrice"]), 0);
}

function getExpiration(contract: OptionContract) {
  return String(getContractValue(contract, ["expiration_date", "expirationDate"], ""));
}

function getContracts(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["contracts"]), 1);
}

function getEstimatedCost(contract: OptionContract) {
  const mid = getMid(contract);
  const contracts = getContracts(contract);
  return getNumber(getContractValue(contract, ["estimated_cost", "estimatedCost"]), mid * contracts * 100);
}

function getMaxRisk(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["max_risk", "maxRisk"]), getEstimatedCost(contract));
}

function getSpreadPercent(contract: OptionContract) {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  return getNumber(getContractValue(contract, ["spreadPercent", "spread_percent", "bidAskSpreadPercent"]), bid > 0 && ask > 0 && mid > 0 ? ((ask - bid) / mid) * 100 : 999);
}

function getLiquidityScore(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["liquidityScore", "liquidity_score"]), 0);
}

function getRecommendationScore(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["recommendationScore", "recommendation_score"]), 0);
}

function getOpenInterest(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["openInterest", "open_interest"]), 0);
}

function getVolume(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["volume"]), 0);
}

function getDelta(contract: OptionContract) {
  const value = getContractValue(contract, ["delta"], null);

  if (value === null || value === undefined || value === "") return null;

  const delta = Number(value);

  if (!Number.isFinite(delta)) return null;

  return delta;
}

function getDeltaAbs(contract: OptionContract) {
  const delta = getDelta(contract);

  if (delta === null) return null;

  return Math.abs(delta);
}

function getDeltaFitScore(contract: OptionContract) {
  const deltaAbs = getDeltaAbs(contract);

  // If Greeks are missing, do not block the contract, but do not reward it either.
  if (deltaAbs === null) return 50;

  if (deltaAbs >= 0.30 && deltaAbs <= 0.55) return 100;
  if (deltaAbs >= 0.25 && deltaAbs < 0.30) return 85;
  if (deltaAbs > 0.55 && deltaAbs <= 0.70) return 75;
  if (deltaAbs >= 0.18 && deltaAbs < 0.25) return 60;
  if (deltaAbs > 0.70 && deltaAbs <= 0.85) return 45;

  return 20;
}

function getTradierExpirationDays(contract: OptionContract) {
  const expiration = String(getContractValue(contract, ["expiration_date", "expirationDate"], ""));

  if (!expiration) return null;

  const expirationTime = new Date(`${expiration}T16:00:00`).getTime();

  if (!Number.isFinite(expirationTime)) return null;

  const now = Date.now();
  const days = Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24));

  return days;
}

function getExpirationFitScore(contract: OptionContract) {
  const days = getTradierExpirationDays(contract);

  if (days === null) return 50;
  if (days >= 7 && days <= 45) return 100;
  if (days >= 3 && days < 7) return 75;
  if (days > 45 && days <= 90) return 65;
  if (days > 90) return 45;

  return 20;
}

function getGradeRank(grade: string) {
  if (grade === "A+") return 5;
  if (grade === "A") return 4;
  if (grade === "B") return 3;
  if (grade === "C") return 2;
  if (grade === "BLOCKED") return 1;
  return 0;
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


function getRawOptionType(contract: OptionContract) {
  return String(
    getContractValue(
      contract,
      ["option_type", "optionType", "trade_direction", "tradeDirection"],
      ""
    )
  ).toUpperCase();
}

function getTradierLiquidityScore(contract: OptionContract) {
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

function getTradierQualityGrade(
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

// A+ should still require real liquidity confirmation.
if (
  hasLiquidityData &&
  spread <= 8 &&
  liquidityScore >= 80 &&
  deltaFitScore >= 85 &&
  expirationFitScore >= 65 &&
  maxRisk <= allowedRisk * 0.75
) {
  return "A+";
}

// A should still require decent liquidity confirmation.
if (
  hasLiquidityData &&
  spread <= 12 &&
  liquidityScore >= 55 &&
  deltaFitScore >= 60 &&
  expirationFitScore >= 50 &&
  maxRisk <= allowedRisk
) {
  return "A";
}

// B is acceptable for paper/funded-filter testing when pricing is clean,
// risk is within limits, and spread is acceptable, even if sandbox liquidity
// data is missing or stale.
if (
  spread <= params.maxSpreadPercent &&
  deltaFitScore >= 35 &&
  expirationFitScore >= 35 &&
  maxRisk <= allowedRisk
) {
  return "B";
}

return "C";
}

function getTradierRecommendationScore(
  contract: OptionContract,
  params: {
    accountSize: number;
    maxRiskPercent: number;
    maxSpreadPercent: number;
  }
) {
  const grade = getTradierQualityGrade(contract, params);
  const spread = getSpreadPercent(contract);
  const liquidityScore = getTradierLiquidityScore(contract);
  const deltaFitScore = getDeltaFitScore(contract);
  const expirationFitScore = getExpirationFitScore(contract);
  const maxRisk = getMaxRisk(contract);
  const allowedRisk = params.accountSize * (params.maxRiskPercent / 100);
  const mid = getMid(contract);

  const riskFitScore =
    allowedRisk > 0 ? Math.max(0, 100 - (maxRisk / allowedRisk) * 100) : 0;

  const spreadScore = Math.max(
    0,
    100 - (spread / Math.max(params.maxSpreadPercent, 1)) * 100
  );

  const priceScore =
    mid >= 0.5 && mid <= 5
      ? 100
      : mid >= 0.25 && mid < 0.5
      ? 75
      : mid > 5 && mid <= 10
      ? 60
      : mid > 10
      ? 35
      : 25;

  const gradeScore =
    grade === "A+"
      ? 100
      : grade === "A"
      ? 85
      : grade === "B"
      ? 65
      : grade === "C"
      ? 30
      : 0;

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

function enrichTradierContract(
  contract: OptionContract,
  params: {
    stockSymbol: string;
    direction: TradeDirection;
    accountSize: number;
    maxRiskPercent: number;
    maxSpreadPercent: number;
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
      "Loaded from Tradier sandbox option chain.",
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
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">{label}</span>
      <span className={`block truncate font-mono text-[10px] font-black ${valueClass}`}>
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

  // --- All handlers - untouched ---------------------------------------------
  function selectContract(contract: OptionContract | null) {
    const syncedContract = withSyncedContractQuality(contract);


    if (typeof onSelectContract === "function") onSelectContract(syncedContract);
    if (typeof onContractSelected === "function") onContractSelected(syncedContract);
  }

  async function loadMockChain() {
    if (!finalSymbol) { setStatusMessage("Select a scanner setup before loading the option chain."); return; }
    if (finalDirection === "NO TRADE") { setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first."); return; }
    setLoadingChain(true);
    setStatusMessage("Loading mock option chain...");
    try {
      const res = await fetch(`/api/options/chain?symbol=${encodeURIComponent(finalSymbol)}&direction=${encodeURIComponent(finalDirection)}`, { cache: "no-store" });
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
        return optionType === finalDirection || String(contract.trade_direction || contract.tradeDirection || "").toUpperCase() === finalDirection;
      });

      const enrichedContracts = directionFiltered.map((contract: OptionContract) =>
        enrichTradierContract(contract, {
          stockSymbol: finalSymbol,
          direction: finalDirection,
          accountSize,
          maxRiskPercent,
          maxSpreadPercent,
        })
      );

      setContracts(enrichedContracts);
      setChainSource("tradier");
      setStatusMessage(
        `Loaded ${enrichedContracts.length} Tradier ${finalDirection} contracts for ${finalSymbol} ${expiration}. Read-only sandbox data. Quality ranking is tuned for spread, liquidity, delta, risk, and expiration.`
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
    const approvedOrCaution = visibleContracts.filter((contract) => {
      const risk = getRiskStatus(contract, { accountSize, maxRiskPercent, maxSpreadPercent });
      return risk.status === "APPROVED" || risk.status === "CAUTION";
    });
    if (approvedOrCaution.length > 0) {
      return [...approvedOrCaution].sort((a, b) => {
        const riskA = getRiskStatus(a, { accountSize, maxRiskPercent, maxSpreadPercent });
        const riskB = getRiskStatus(b, { accountSize, maxRiskPercent, maxSpreadPercent });
        const riskRankA = riskA.status === "APPROVED" ? 2 : 1;
        const riskRankB = riskB.status === "APPROVED" ? 2 : 1;
        if (riskRankB !== riskRankA) return riskRankB - riskRankA;

        const scoreDiff = getRecommendationScore(b) - getRecommendationScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const gradeDiff = getGradeRank(getGrade(b)) - getGradeRank(getGrade(a));
        if (gradeDiff !== 0) return gradeDiff;

        const liquidityDiff = getLiquidityScore(b) - getLiquidityScore(a);
        if (liquidityDiff !== 0) return liquidityDiff;

        return getSpreadPercent(a) - getSpreadPercent(b);
      })[0];
    }
    return visibleContracts[0] || null;
  }, [visibleContracts, accountSize, maxRiskPercent, maxSpreadPercent]);

  const selectedOptionSymbol = getOptionSymbol(selectedContract);

  return (
    <div className="space-y-4">

      {/* -- HEADER + LOAD BUTTON ------------------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-cyan-600">
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
            className="rounded-lg border border-slate-700/60 bg-slate-950/80 px-3 py-2 font-mono text-[10px] text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={loadMockChain}
              disabled={loadingChain || !finalSymbol || finalDirection === "NO TRADE"}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-slate-800/80 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "linear-gradient(90deg, transparent, #06b6d4, transparent)" }}
              />
              {loadingChain ? (
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
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

      {/* -- STATUS MESSAGE ------------------------------------------------ */}
      {statusMessage && (
        <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black/30">
          <div className="absolute inset-y-0 left-0 w-[2px] bg-cyan-500" />
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
          <div className={`absolute inset-y-0 left-0 w-[2px] ${chainSource === "tradier" ? "bg-emerald-500" : chainSource === "mock" ? "bg-cyan-500" : "bg-slate-600"}`} />
          <p className="pl-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">Source</p>
          <p className={`pl-0.5 font-mono text-[10px] font-black ${chainSource === "tradier" ? "text-emerald-300" : chainSource === "mock" ? "text-cyan-300" : "text-slate-400"}`}>
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
              className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-500 hover:text-slate-200"
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
                className="rounded-lg border border-slate-700/60 bg-slate-950/80 px-3 py-2 font-mono text-[10px] text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20"
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
          className={`rounded-lg border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
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
            className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
          >
            Clear Selected x
          </button>
        )}

        <div className="ml-auto">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300 outline-none focus:border-cyan-500/40"
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
                Best Contract Recommendation
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
                {recommendedContract.recommendationReason || "Recommended based on grade, spread, liquidity, risk, and score."}
              </p>
            </div>
            <button
              onClick={() => selectContract(recommendedContract)}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300 transition hover:bg-emerald-500/20"
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
                    ? "border-cyan-500/40 bg-slate-900/90 ring-cyan-500/20"
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
                {/* Left grade accent bar */}
                <div className={`absolute inset-y-0 left-0 w-[3px] ${isSelected ? "bg-cyan-500" : getGradeBar(grade)}`} />

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
                      <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-300">
                        Selected
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
                      onClick={() => selectContract(contract)}
                      className={`rounded-lg border px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                        isWeak
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                          : isSelected
                          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                          : "border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300"
                      }`}
                    >
                      {isWeak ? "Select for Override Test &gt;" : isSelected ? "Selected" : "Select Contract &gt;"}
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
