"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import WatchlistManager from "../components/WatchlistManager";
import PaperTradeTracker from "../components/PaperTradeTracker";
import PaperTradeAnalytics from "../components/PaperTradeAnalytics";
import OptionPerformanceScoreboard from "../components/OptionPerformanceScoreboard";
import ScannerResultsPanel from "../components/ScannerResultsPanel";
import OptionTradeCommandCenter from "../components/OptionTradeCommandCenter";
import AutoTradeJournal from "../components/AutoTradeJournal";
import AutoPositionMonitor from "../components/AutoPositionMonitor";
import BrokerStatusCard from "../components/BrokerStatusCard";
import SystemReadinessCard from "../components/SystemReadinessCard";
import PaperTradingControlCenter from "../components/PaperTradingControlCenter";
import TradingDashboardHeader from "../components/TradingDashboardHeader";

type MarketCondition = "BULLISH" | "BEARISH" | "CHOPPY" | "UNKNOWN";
type TradeDirection = "CALL" | "PUT" | "NO TRADE";

type QuoteData = {
  c: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
};

type ScanResult = {
  symbol: string;
  price: number;
  changePercent: number;
  direction: TradeDirection;
  tradeDirection?: TradeDirection;
  directionBias?: "BULLISH" | "BEARISH" | "NEUTRAL";
  setupScore: number;
  confidenceScore?: number;
  confidence_score?: number;
  trendStrength?: number;
  trend_strength?: number;
  volumeConfirmation?: boolean;
  volume_confirmation?: boolean;
  marketAlignment?: boolean;
  market_alignment?: boolean;
  riskReward?: number;
  risk_reward?: number;
  stopLoss?: number;
  stop_loss?: number;
  takeProfit?: number;
  take_profit?: number;
  entryPrice?: number;
  entry_price?: number;
  blockReasons?: string[];
  block_reasons?: string[];
  tradeSummary?: string;
  trade_summary?: string;
  optionCandidateType?: string;
  preferredExpirationWindow?: string;
  preferredMoneyness?: string;
  liquidityWarning?: string;
  contractSelectionStatus?: string;
};

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

  liquidityScore?: number;
  liquidity_score?: number;

  recommendationScore?: number;
  recommendation_score?: number;

  qualityGrade?: string;
  contractQualityGrade?: string;
  grade?: string;
  quality_grade?: string;
  contract_quality_grade?: string;
  contract_quality?: string;

  riskStatus?: string;
};

type RiskGuardCheck = {
  status: "APPROVED" | "CAUTION" | "BLOCKED";
  reason: string;
};

type PreTradeEnforcementStatus = "READY" | "CAUTION" | "BLOCKED";

const ACCOUNT_SIZE = 10000;
const MAX_RISK_PERCENT = 1;
const MAX_SPREAD_PERCENT = 20;

const DEFAULT_WATCHLIST = ["SPY", "AAPL", "MSFT", "NVDA", "TSLA"];

function getNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getContractValue(
  contract: OptionContract | null,
  keys: string[],
  fallback: any = null
) {
  if (!contract) return fallback;

  for (const key of keys) {
    const value = (contract as any)[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function normalizeContractGradeValue(value: any) {
  const cleanGrade = String(value || "").trim().toUpperCase();

  if (!cleanGrade || cleanGrade === "UNKNOWN" || cleanGrade === "N/A" || cleanGrade === "NULL") {
    return "";
  }

  if (cleanGrade === "IDEAL") return "A+";
  if (cleanGrade === "GOOD") return "A";
  if (cleanGrade === "ACCEPTABLE") return "B";
  if (cleanGrade === "AVOID") return "BLOCKED";

  if (
    cleanGrade === "A+" ||
    cleanGrade === "A" ||
    cleanGrade === "B" ||
    cleanGrade === "C" ||
    cleanGrade === "BLOCKED"
  ) {
    return cleanGrade;
  }

  return "";
}

function getContractGrade(contract: OptionContract | null) {
  if (!contract) return "UNKNOWN";

  const gradeKeys = [
    "contract_quality",
    "qualityGrade",
    "contractQualityGrade",
    "grade",
    "quality_grade",
    "contract_quality_grade",
  ];

  for (const key of gradeKeys) {
    const normalizedGrade = normalizeContractGradeValue((contract as any)[key]);

    if (normalizedGrade) {
      return normalizedGrade;
    }
  }

  return "UNKNOWN";
}

function isCleanContractGrade(grade: string) {
  return grade === "A+" || grade === "A" || grade === "B";
}

function gradeRequiresTestingOverride(grade: string) {
  return !isCleanContractGrade(grade);
}

function calculateRiskGuard(params: {
  selectedContract: OptionContract | null;
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
}): RiskGuardCheck {
  const { selectedContract, accountSize, maxRiskPercent, maxSpreadPercent } =
    params;

  if (!selectedContract) {
    return {
      status: "BLOCKED",
      reason: "No option contract selected.",
    };
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

  const contracts = getNumber(
    getContractValue(selectedContract, ["contracts"]),
    1
  );

  const estimatedCost = getNumber(
    getContractValue(selectedContract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );

  const maxRisk = getNumber(
    getContractValue(selectedContract, ["max_risk", "maxRisk"]),
    estimatedCost
  );

  const allowedRisk = accountSize * (maxRiskPercent / 100);

  const spreadPercent =
    bid > 0 && ask > 0 && mid > 0 ? ((ask - bid) / mid) * 100 : 999;

  if (mid <= 0) {
    return {
      status: "BLOCKED",
      reason: "Contract mid price is missing.",
    };
  }

  if (maxRisk > allowedRisk) {
    return {
      status: "BLOCKED",
      reason: `Max risk $${maxRisk.toFixed(
        2
      )} is above allowed risk $${allowedRisk.toFixed(2)}.`,
    };
  }

  if (spreadPercent > maxSpreadPercent) {
    return {
      status: "BLOCKED",
      reason: `Bid/ask spread is too wide at ${spreadPercent.toFixed(
        1
      )}%. Max allowed is ${maxSpreadPercent}%.`,
    };
  }

  if (spreadPercent > maxSpreadPercent * 0.75) {
    return {
      status: "CAUTION",
      reason: `Spread is acceptable but not ideal at ${spreadPercent.toFixed(
        1
      )}%.`,
    };
  }

  return {
    status: "APPROVED",
    reason: "Risk Guard approved this contract.",
  };
}

function getPreTradeEnforcementStatus(params: {
  selectedContract: OptionContract | null;
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
    const grade = getContractGrade(selectedContract);

    if (!grade || grade === "N/A" || grade === "UNKNOWN") {
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

    if (
      typeof spreadPercent === "number" &&
      spreadPercent > MAX_SPREAD_PERCENT
    ) {
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

async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || !data?.success || !data?.quote) {
      console.error("QUOTE FAILED:", symbol, data);
      return null;
    }

    const quote = data.quote;

    if (!quote || typeof quote.c !== "number" || quote.c <= 0) {
      console.error("INVALID QUOTE:", symbol, quote);
      return null;
    }

    return quote;
  } catch (error) {
    console.error("fetchQuote error:", symbol, error);
    return null;
  }
}

function classifyMarketCondition(spyQuote: QuoteData | null): MarketCondition {
  if (!spyQuote || typeof spyQuote.dp !== "number") return "UNKNOWN";

  const percentChange = spyQuote.dp;

  if (percentChange >= 0.35) return "BULLISH";
  if (percentChange <= -0.35) return "BEARISH";
  return "CHOPPY";
}

function analyzeSetup(
  symbol: string,
  quote: QuoteData,
  marketCondition: MarketCondition
): ScanResult {
  const price = quote.c;
  const changePercent = getNumber(quote.dp, 0);

  let direction: TradeDirection = "NO TRADE";
  let directionBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

  if (changePercent >= 0.35) {
    direction = "CALL";
    directionBias = "BULLISH";
  } else if (changePercent <= -0.35) {
    direction = "PUT";
    directionBias = "BEARISH";
  }

  const momentumScore = Math.min(40, Math.abs(changePercent) * 10);

  const marketScore =
    marketCondition === "BULLISH" && direction === "CALL"
      ? 25
      : marketCondition === "BEARISH" && direction === "PUT"
      ? 25
      : marketCondition === "CHOPPY"
      ? -10
      : 5;

  const rangeScore =
    quote.h && quote.l && quote.h > quote.l
      ? Math.min(20, ((price - quote.l) / (quote.h - quote.l)) * 20)
      : 10;

  const setupScore = Math.max(
    0,
    Math.min(100, Math.round(momentumScore + marketScore + rangeScore + 25))
  );

  const confidenceScore = Math.max(
    0,
    Math.min(100, Math.round(setupScore + (direction === "NO TRADE" ? -20 : 5)))
  );

  const marketAlignment =
    (marketCondition === "BULLISH" && direction === "CALL") ||
    (marketCondition === "BEARISH" && direction === "PUT");

  const blockReasons: string[] = [];

  if (direction === "NO TRADE") {
    blockReasons.push("No clear bullish or bearish direction.");
  }

  if (marketCondition === "CHOPPY") {
    blockReasons.push("Market is CHOPPY.");
  }

  if (
    !marketAlignment &&
    marketCondition !== "UNKNOWN" &&
    marketCondition !== "CHOPPY"
  ) {
    blockReasons.push("Setup does not align with market condition.");
  }

  const stopLoss =
    direction === "CALL"
      ? price * 0.985
      : direction === "PUT"
      ? price * 1.015
      : price * 0.99;

  const takeProfit =
    direction === "CALL"
      ? price * 1.03
      : direction === "PUT"
      ? price * 0.97
      : price * 1.01;

  return {
    symbol,
    price,
    changePercent,
    direction,
    tradeDirection: direction,
    directionBias,
    setupScore,
    confidenceScore,
    confidence_score: confidenceScore,
    trendStrength: Math.round(momentumScore),
    trend_strength: Math.round(momentumScore),
    volumeConfirmation: true,
    volume_confirmation: true,
    marketAlignment,
    market_alignment: marketAlignment,
    riskReward: 2,
    risk_reward: 2,
    stopLoss,
    stop_loss: stopLoss,
    takeProfit,
    take_profit: takeProfit,
    entryPrice: price,
    entry_price: price,
    blockReasons,
    block_reasons: blockReasons,
    tradeSummary:
      direction === "NO TRADE"
        ? `${symbol} has no clean setup right now.`
        : `${symbol} has a ${direction} setup with ${confidenceScore}% confidence.`,
    trade_summary:
      direction === "NO TRADE"
        ? `${symbol} has no clean setup right now.`
        : `${symbol} has a ${direction} setup with ${confidenceScore}% confidence.`,
    optionCandidateType:
      direction === "CALL" ? "CALL" : direction === "PUT" ? "PUT" : "NONE",
    preferredExpirationWindow: "7-21 DTE",
    preferredMoneyness: "Near the money",
    liquidityWarning: "Use contract filters before saving.",
    contractSelectionStatus:
      direction === "NO TRADE" ? "WAIT" : "READY_FOR_CONTRACT",
  };
}

function normalizeContractForSave(
  contract: OptionContract | null,
  fallback: {
    selectedSymbol: string;
    tradeDirection: TradeDirection;
  }
) {
  if (!contract) return null;

  const bid = getNumber(
    getContractValue(contract, ["bid_price", "bidPrice", "bid"]),
    0
  );

  const ask = getNumber(
    getContractValue(contract, ["ask_price", "askPrice", "ask"]),
    0
  );

  const mid = getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );

  const contracts = getNumber(getContractValue(contract, ["contracts"]), 1);

  const estimatedCost = getNumber(
    getContractValue(contract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );

  const maxRisk = getNumber(
    getContractValue(contract, ["max_risk", "maxRisk"]),
    estimatedCost
  );

  const contractQuality = getContractGrade(contract);

  return {
    stock_symbol: String(
      getContractValue(
        contract,
        ["stock_symbol", "stockSymbol"],
        fallback.selectedSymbol
      )
    ),
    trade_direction: String(
      getContractValue(
        contract,
        ["trade_direction", "tradeDirection"],
        fallback.tradeDirection
      )
    ),
    option_symbol: String(
      getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], "")
    ),
    expiration_date: getContractValue(
      contract,
      ["expiration_date", "expirationDate"],
      null
    ),
    strike_price: getNumber(
      getContractValue(contract, ["strike_price", "strikePrice"]),
      0
    ),
    bid_price: bid,
    ask_price: ask,
    mid_price: mid,
    contracts,
    estimated_cost: estimatedCost,
    max_risk: maxRisk,

    // Contract-quality compatibility for Supabase and tracker analytics.
    contract_quality: contractQuality,
    qualityGrade: contractQuality,
    contractQualityGrade: contractQuality,
    grade: contractQuality,
    quality_grade: contractQuality,
    contract_quality_grade: contractQuality,
  };
}

function getMarketTone(condition: MarketCondition) {
  if (condition === "BULLISH") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (condition === "BEARISH") {
    return "border-red-400/40 bg-red-500/10 text-red-300";
  }

  if (condition === "CHOPPY") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function getRiskTone(status: RiskGuardCheck["status"]) {
  if (status === "APPROVED") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "CAUTION") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-red-400/40 bg-red-500/10 text-red-300";
}

function StatusCard({
  label,
  value,
  subtext,
  className = "border-slate-800 bg-slate-900/80 text-white",
}: {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
      {subtext && <p className="mt-1 text-xs opacity-70">{subtext}</p>}
    </div>
  );
}

export default function Home() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [scannerResults, setScannerResults] = useState<ScanResult[]>([]);
  const [selectedSetup, setSelectedSetup] = useState<ScanResult | null>(null);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(
    null
  );

  const [marketCondition, setMarketCondition] =
    useState<MarketCondition>("UNKNOWN");

  const [spyPrice, setSpyPrice] = useState<number | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [testingOverrideEnabled, setTestingOverrideEnabled] = useState(false);

  const selectedSymbol = selectedSetup?.symbol || "";

  const tradeDirection: TradeDirection =
    selectedSetup?.tradeDirection || selectedSetup?.direction || "NO TRADE";

  const optionRiskCheck = useMemo(() => {
    return calculateRiskGuard({
      selectedContract,
      accountSize: ACCOUNT_SIZE,
      maxRiskPercent: MAX_RISK_PERCENT,
      maxSpreadPercent: MAX_SPREAD_PERCENT,
    });
  }, [selectedContract]);

  const preTradeCheck = useMemo(() => {
    return getPreTradeEnforcementStatus({
      selectedContract,
      optionRiskCheck,
      selectedSymbol,
      tradeDirection,
      marketCondition,
    });
  }, [
    selectedContract,
    optionRiskCheck,
    selectedSymbol,
    tradeDirection,
    marketCondition,
  ]);

  useEffect(() => {
    runScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScanner() {
    setIsScanning(true);
    setStatusMessage("Running scanner...");

    try {
      const spyQuote = await fetchQuote("SPY");

      if (!spyQuote) {
        setMarketCondition("UNKNOWN");
        setStatusMessage("Scanner failed: could not load valid SPY market quote.");
        setIsScanning(false);
        return;
      }

      const newMarketCondition = classifyMarketCondition(spyQuote);
      setMarketCondition(newMarketCondition);
      setSpyPrice(spyQuote.c);

      const symbolsToScan = watchlist.filter((s) => s !== "SPY");
      const results: ScanResult[] = [];

      for (const symbol of symbolsToScan) {
        const quote = await fetchQuote(symbol);

        if (!quote) {
          console.warn("Skipping invalid quote:", symbol);
          continue;
        }

        const result = analyzeSetup(symbol, quote, newMarketCondition);
        results.push(result);
      }

      const sorted = results.sort((a, b) => b.setupScore - a.setupScore);

      setScannerResults(sorted);

      if (sorted.length > 0) {
        setSelectedSetup(sorted[0]);
        setSelectedContract(null);
      }

      setStatusMessage(
        sorted.length > 0
          ? `Scanner finished. Found ${sorted.length} setups.`
          : "Scanner finished, but every symbol failed or returned invalid quote data."
      );
    } catch (error) {
      console.error("runScanner error:", error);
      setStatusMessage("Scanner failed. Check browser console.");
    } finally {
      setIsScanning(false);
    }
  }

  function handleSelectSetup(setup: ScanResult) {
    setSelectedSetup(setup);
    setSelectedContract(null);
    setStatusMessage(`Selected setup: ${setup.symbol} ${setup.direction}`);
  }

  function handleSelectContract(contract: OptionContract | null) {
    setSelectedContract(contract);

    if (!contract) {
      setStatusMessage("Selected contract cleared.");
      return;
    }

    const optionSymbol = getContractValue(
      contract,
      ["option_symbol", "optionSymbol", "symbol"],
      ""
    );

    setStatusMessage(
      optionSymbol
        ? `Selected option contract: ${optionSymbol}`
        : "Selected option contract."
    );
  }

  function clearSelectedContract() {
    setSelectedContract(null);
    setStatusMessage("Selected contract cleared.");
  }

  async function savePaperTrade() {
    try {
      if (!selectedSetup) {
        setStatusMessage("Paper trade blocked: No scanner setup selected.");
        return;
      }

      const latestRiskCheck = calculateRiskGuard({
        selectedContract,
        accountSize: ACCOUNT_SIZE,
        maxRiskPercent: MAX_RISK_PERCENT,
        maxSpreadPercent: MAX_SPREAD_PERCENT,
      });

      const latestPreTradeCheck = getPreTradeEnforcementStatus({
        selectedContract,
        optionRiskCheck: latestRiskCheck,
        selectedSymbol,
        tradeDirection,
        marketCondition,
      });

      const selectedContractGrade = getContractGrade(selectedContract);

      if (gradeRequiresTestingOverride(selectedContractGrade) && !testingOverrideEnabled) {
        setStatusMessage(
          `Paper trade blocked: Contract quality grade is ${selectedContractGrade}. Only A+, A, or B contracts can save clean. Turn Testing Override ON only for intentional testing.`
        );
        return;
      }

      if (latestPreTradeCheck.status === "BLOCKED" && !testingOverrideEnabled) {
        setStatusMessage(`Paper trade blocked: ${latestPreTradeCheck.message}`);
        return;
      }

      if (gradeRequiresTestingOverride(selectedContractGrade) && testingOverrideEnabled) {
        console.warn("TESTING OVERRIDE USED FOR WEAK CONTRACT GRADE:", {
          selectedContractGrade,
          blocks: latestPreTradeCheck.blocks,
        });
      }

      if (latestPreTradeCheck.status === "BLOCKED" && testingOverrideEnabled) {
        console.warn("TESTING OVERRIDE USED:", latestPreTradeCheck.blocks);
      }

      if (latestPreTradeCheck.status === "CAUTION") {
        console.warn("Pre-trade checklist caution:", latestPreTradeCheck.warnings);
      }

      const entryPrice = getNumber(
        selectedSetup.entryPrice ?? selectedSetup.entry_price ?? selectedSetup.price,
        0
      );

      const stopLoss = getNumber(
        selectedSetup.stopLoss ?? selectedSetup.stop_loss,
        tradeDirection === "CALL" ? entryPrice * 0.985 : entryPrice * 1.015
      );

      const takeProfit = getNumber(
        selectedSetup.takeProfit ?? selectedSetup.take_profit,
        tradeDirection === "CALL" ? entryPrice * 1.03 : entryPrice * 0.97
      );

      const duplicateCheck = await supabase
        .from("paper_trades")
        .select("id")
        .eq("symbol", selectedSymbol)
        .eq("status", "open")
        .is("exit_price", null)
        .limit(1);

      if (duplicateCheck.error) {
        console.error("Duplicate check failed:", duplicateCheck.error);
      }

      if (duplicateCheck.data && duplicateCheck.data.length > 0) {
        setStatusMessage(
          `Paper trade blocked: ${selectedSymbol} already has an open trade.`
        );
        return;
      }

      const paperTradePayload = {
        symbol: selectedSymbol,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: "open",
        strategy: testingOverrideEnabled ? "manual_override_test" : "manual",
      };

      const { data: paperTradeData, error: paperTradeError } = await supabase
        .from("paper_trades")
        .insert(paperTradePayload)
        .select()
        .single();

      if (paperTradeError) {
        console.error("Paper trade save failed:", paperTradeError);
        setStatusMessage(`Paper trade failed: ${paperTradeError.message}`);
        return;
      }

      const paperTradeId = paperTradeData?.id;

      if (!paperTradeId) {
        setStatusMessage("Paper trade saved, but no paper trade ID returned.");
        return;
      }

      const normalizedContract = normalizeContractForSave(selectedContract, {
        selectedSymbol,
        tradeDirection,
      });

      if (normalizedContract) {
        const optionDetailPayload = {
          ...normalizedContract,
          paper_trade_id: paperTradeId,
          risk_guard_status: latestRiskCheck.status,
          risk_guard_reason: latestRiskCheck.reason,

          override_used: testingOverrideEnabled,
          override_reason: testingOverrideEnabled
            ? `Testing Override used. Contract Quality: ${selectedContractGrade}. Pre-Trade Status: ${
                latestPreTradeCheck.status
              }. Risk Guard: ${latestRiskCheck.status}. Reason: ${
                latestPreTradeCheck.message ||
                latestRiskCheck.reason ||
                "No reason provided."
              }`
            : null,
        };

        const optionRes = await fetch("/api/option-trade-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(optionDetailPayload),
        });

        const optionJson = await optionRes.json();

        if (!optionRes.ok || !optionJson?.success) {
          console.error("Option detail save failed:", optionJson);
          setStatusMessage(
            `Paper trade saved, but option details failed: ${
              optionJson?.error || "Unknown option detail error"
            }`
          );
          return;
        }
      }

      setStatusMessage(
        `Paper trade and option details saved successfully: ${selectedSymbol}. Risk Guard: ${latestRiskCheck.status}. Contract Quality: ${selectedContractGrade}.`
      );

      setRefreshKey((prev) => prev + 1);

      window.dispatchEvent(new Event("paper-trade-saved"));
      window.dispatchEvent(new Event("option-trade-saved"));
    } catch (error) {
      console.error("savePaperTrade error:", error);
      setStatusMessage("Paper trade failed. Check browser console.");
    }
  }

  const selectedSetupText =
    selectedSymbol && tradeDirection !== "NO TRADE"
      ? `${selectedSymbol} ${tradeDirection}`
      : selectedSymbol
      ? `${selectedSymbol} NO TRADE`
      : "None selected";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#172554_0,_#020617_35%,_#000_100%)] text-white">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-5 md:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/85 p-5 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                 <TradingDashboardHeader />
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Trading Command Center
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Scanner, SPY market filter, contract selection, Risk Guard,
                checklist discipline, testing override, paper trades, option
                P/L, and clean performance tracking.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              <span className="text-slate-500">Mode:</span>{" "}
              <span className="font-black text-white">Paper Trading</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatusCard
              label="Market Condition"
              value={marketCondition}
              subtext={spyPrice ? `SPY ${formatMoney(spyPrice)}` : "SPY waiting"}
              className={getMarketTone(marketCondition)}
            />

            <StatusCard
              label="Selected Setup"
              value={selectedSetupText}
              subtext={
                selectedSetup
                  ? `Score ${selectedSetup.setupScore} / Confidence ${
                      selectedSetup.confidenceScore ??
                      selectedSetup.confidence_score ??
                      "-"
                    }`
                  : "Pick a scanner setup"
              }
              className={
                selectedSymbol
                  ? "border-orange-400/40 bg-orange-500/10 text-orange-300"
                  : "border-slate-800 bg-slate-900/80 text-slate-300"
              }
            />

            <StatusCard
              label="Risk Guard"
              value={optionRiskCheck.status}
              subtext={optionRiskCheck.reason}
              className={getRiskTone(optionRiskCheck.status)}
            />

            <StatusCard
              label="Risk / Trade"
              value={`${MAX_RISK_PERCENT}%`}
              subtext={`${formatMoney(
                ACCOUNT_SIZE * (MAX_RISK_PERCENT / 100)
              )} max risk`}
            />

            <StatusCard
              label="Testing Override"
              value={testingOverrideEnabled ? "ON" : "OFF"}
              subtext={
                testingOverrideEnabled
                  ? "Blocked tests can be saved"
                  : "Blocked tests stay blocked"
              }
              className={
                testingOverrideEnabled
                  ? "border-orange-400/40 bg-orange-500/10 text-orange-300"
                  : "border-slate-800 bg-slate-900/80 text-slate-300"
              }
            />
          </div>
        </header>

        <TradingDashboardHeader />

<BrokerStatusCard />

<SystemReadinessCard />

<PaperTradingControlCenter />
      
        

    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <aside className="flex flex-col gap-6">
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 shadow-xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Scanner Control
                  </p>
                  <h2 className="mt-1 text-xl font-black">Market Scanner</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Real stock quotes through your quote API.
                  </p>
                </div>

                <button
                  onClick={runScanner}
                  disabled={isScanning}
                  className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? "Scanning..." : "Run"}
                </button>
              </div>

              {statusMessage && (
                <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-300">
                  {statusMessage}
                </div>
              )}

              <WatchlistManager
                watchlist={watchlist}
                setWatchlist={setWatchlist}
                protectedSymbols={["SPY"]}
              />
            </div>

            <OptionPerformanceScoreboard refreshKey={refreshKey} />

            <PaperTradeAnalytics refreshKey={refreshKey} />
          </aside>

          <section className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_480px]">
              <ScannerResultsPanel
                scannerResults={scannerResults}
                selectedSymbol={selectedSymbol}
                onSelectSetup={handleSelectSetup}
                marketCondition={marketCondition}
              />

              <OptionTradeCommandCenter
                selectedSetup={selectedSetup}
                selectedSymbol={selectedSymbol}
                stockSymbol={selectedSymbol}
                scannerDirection={tradeDirection}
                tradeDirection={tradeDirection}
                selectedContract={selectedContract}
                onSelectContract={handleSelectContract}
                onContractSelected={handleSelectContract}
                onClearSelectedContract={clearSelectedContract}
                accountSize={ACCOUNT_SIZE}
                maxRiskPercent={MAX_RISK_PERCENT}
                maxSpreadPercent={MAX_SPREAD_PERCENT}
                riskGuardStatus={optionRiskCheck.status}
                riskGuardReason={optionRiskCheck.reason}
                preTradeStatus={preTradeCheck.status}
                preTradeWarnings={preTradeCheck.warnings}
                preTradeBlocks={preTradeCheck.blocks}
                onSavePaperTrade={savePaperTrade}
                marketCondition={marketCondition}
                testingOverrideEnabled={testingOverrideEnabled}
                setTestingOverrideEnabled={setTestingOverrideEnabled}
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
  <PaperTradeTracker key={`tracker-${refreshKey}`} />

  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <AutoPositionMonitor refreshKey={refreshKey} />
    <AutoTradeJournal refreshKey={refreshKey} />
  </div>
</div>
          </section>
        </section>
      </div>
    </main>
  );
}