"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { BackgroundPaths } from "../components/ui/BackgroundPaths";
import { FloatingShapes } from "../components/ui/FloatingShapes";

import WatchlistManager from "../components/WatchlistManager";
import PaperTradeTracker from "../components/PaperTradeTracker";
import PaperTradeAnalytics from "../components/PaperTradeAnalytics";
import OptionPerformanceScoreboard from "../components/OptionPerformanceScoreboard";
import ScannerResultsPanel from "../components/ScannerResultsPanel";
import OptionTradeCommandCenter from "../components/OptionTradeCommandCenter";
import AutoTradeJournal from "../components/AutoTradeJournal";
import AutoPositionMonitor from "../components/AutoPositionMonitor";
import BrokerStatusCard from "../components/BrokerStatusCard";
import WorkModeCommandCenter from "../components/WorkModeCommandCenter";
import SystemReadinessCard from "../components/SystemReadinessCard";
import PaperTradingControlCenter from "../components/PaperTradingControlCenter";
import TradingDashboardHeader from "../components/TradingDashboardHeader";
import AlertPanel from "@/components/alerts/AlertPanel";
import { useTradeApprovalAlerts } from "@/hooks/useTradeApprovalAlerts";
import type { SpreadType, OptionLeg } from "../lib/dashboardTypes";
import {
  type MarketCondition,
  type TradeDirection,
  type QuoteData,
  type ScanResult,
  DEFAULT_WATCHLIST,
  getNumber,
  fetchQuote,
  classifyMarketCondition,
  analyzeSetup,
  sortScanResults,
} from "../lib/scanner";

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

  // --- Credit spread support ----------------------------------------------
  spread_type?: SpreadType;
  short_leg?: OptionLeg;
  long_leg?: OptionLeg;
  net_credit?: number;
  spread_width?: number;
  max_loss?: number;
  max_profit?: number;
};

type RiskGuardCheck = {
  status: "APPROVED" | "CAUTION" | "BLOCKED";
  reason: string;
};

type PreTradeEnforcementStatus = "READY" | "CAUTION" | "BLOCKED";

const ACCOUNT_SIZE = 10000;
const MAX_RISK_PERCENT = 1;
const MAX_SPREAD_PERCENT = 20;

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

  const spreadType = getContractValue(contract, ["spread_type"], "single_leg") as SpreadType;
  const shortLeg = contract.short_leg ?? null;
  const longLeg = contract.long_leg ?? null;
  const isCreditSpread = spreadType !== "single_leg" && !!shortLeg && !!longLeg;

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

    // --- Credit spread support ----------------------------------------------
    spread_type: spreadType,
    ...(isCreditSpread
      ? {
          short_leg_option_symbol: shortLeg!.option_symbol,
          short_leg_strike_price: shortLeg!.strike_price,
          short_leg_bid_price: shortLeg!.bid_price,
          short_leg_ask_price: shortLeg!.ask_price,
          short_leg_mid_price: shortLeg!.mid_price,
          long_leg_option_symbol: longLeg!.option_symbol,
          long_leg_strike_price: longLeg!.strike_price,
          long_leg_bid_price: longLeg!.bid_price,
          long_leg_ask_price: longLeg!.ask_price,
          long_leg_mid_price: longLeg!.mid_price,
          net_credit: getNumber(getContractValue(contract, ["net_credit"]), 0),
          spread_width: getNumber(getContractValue(contract, ["spread_width"]), 0),
          max_loss: getNumber(getContractValue(contract, ["max_loss"]), maxRisk),
          max_profit: getNumber(getContractValue(contract, ["max_profit"]), 0),
        }
      : {}),
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

function getRiskPulse(status: RiskGuardCheck["status"]) {
  if (status === "APPROVED") {
    return "animate-pulse shadow-lg shadow-emerald-500/50";
  }

  if (status === "BLOCKED") {
    return "animate-pulse shadow-lg shadow-red-500/50";
  }

  return "animate-pulse shadow-lg shadow-amber-500/50";
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

type TabId = "trade" | "positions" | "alerts" | "analytics" | "system";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "trade",
    label: "Trade",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="3" x2="5" y2="21" />
        <rect x="3" y="9" width="4" height="6" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <rect x="10" y="5" width="4" height="9" />
        <line x1="19" y1="3" x2="19" y2="21" />
        <rect x="17" y="12" width="4" height="5" />
      </svg>
    ),
  },
  {
    id: "positions",
    label: "Positions",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="4" rx="1" />
        <rect x="4" y="10" width="16" height="4" rx="1" />
        <rect x="4" y="16" width="16" height="4" rx="1" />
      </svg>
    ),
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="4" y2="12" />
        <line x1="10" y1="20" x2="10" y2="6" />
        <line x1="16" y1="20" x2="16" y2="10" />
        <line x1="21" y1="20" x2="21" y2="4" />
      </svg>
    ),
  },
  {
    id: "system",
    label: "System",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005.6 15a1.65 1.65 0 00-1.51-1H4a2 2 0 110-4h.09A1.65 1.65 0 005.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

const tradeColumnContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const tradeColumnItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

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
  const [activeTab, setActiveTab] = useState<TabId>("trade");
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const [tickerQuotes, setTickerQuotes] = useState<Record<string, QuoteData | null>>({});

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

  useEffect(() => {
    async function loadOpenTradesCount() {
      const { count, error } = await supabase
        .from("paper_trades")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      if (error) {
        console.error("Failed to load open trades count:", error);
        return;
      }

      if (typeof count === "number") {
        setOpenTradesCount(count);
      }
    }

    loadOpenTradesCount();
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadTickerQuotes() {
      const symbols = Array.from(new Set(["SPY", ...watchlist]));
      const quotes: Record<string, QuoteData | null> = {};

      for (const symbol of symbols) {
        const quote = await fetchQuote(symbol);
        quotes[symbol] = quote;
      }

      if (!cancelled) {
        setTickerQuotes(quotes);
      }
    }

    loadTickerQuotes();
    const interval = setInterval(loadTickerQuotes, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchlist]);

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

      const sorted = sortScanResults(results);

      setScannerResults(sorted);

      const topResult = sorted[0];

      if (
        topResult &&
        (topResult.setupScore ?? 0) >= 75 &&
        topResult.direction !== "NO TRADE"
      ) {
        fetch("/api/alerts/scanner-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: topResult.symbol,
            direction: topResult.direction,
            setupScore: topResult.setupScore,
          }),
        }).catch((error) => console.error("scanner-notify error:", error));
      }

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

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dailyCountCheck = await supabase
        .from("paper_trades")
        .select("id")
        .gte("created_at", startOfDay.toISOString());

      if (dailyCountCheck.error) {
        console.error("Daily trade count check failed:", dailyCountCheck.error);
      }

      if (dailyCountCheck.data && dailyCountCheck.data.length >= 3) {
        setStatusMessage("Paper trade blocked: daily limit of 3 trades reached.");
        return;
      }

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

  const {
  alerts: tradeApprovalAlerts,
  createTradeAlert,
  approveAlert,
  rejectAlert,
  reviewAlert,
  clearResolvedAlerts,
  approvalActionStatus,
  approvalActionError,
  isSavingApprovalDecision,
} = useTradeApprovalAlerts();

const sendSelectedContractToApprovalQueue = () => {
  if (!selectedSetup || !selectedContract) {
    setStatusMessage(
      "Approval alert blocked: Select a scanner setup and option contract first."
    );
    return;
  }

  const optionSymbol = String(
    getContractValue(
      selectedContract,
      ["option_symbol", "optionSymbol", "symbol"],
      ""
    )
  );

  const contractGrade = getContractGrade(selectedContract);

  createTradeAlert({
  symbol: selectedSymbol,
  lane: "OPTIONS_DAY_TRADE",
  setupName: `${selectedSymbol} ${tradeDirection} approval review`,
  message: `${selectedSymbol} ${tradeDirection} contract ${
    optionSymbol || "selected"
  } is ready for approval review. This does not save a trade or place an order.`,
  priority: optionRiskCheck.status === "APPROVED" ? "HIGH" : "MEDIUM",

  riskGuardStatus: optionRiskCheck.status,
  riskGuardReason: optionRiskCheck.reason ?? null,
  contractQuality: contractGrade,
  maxRiskDollars: getNumber(
    getContractValue(selectedContract, ["max_risk", "maxRisk"]),
    0
  ),

  contractSymbol:
    getContractValue(selectedContract, [
      "symbol",
      "option_symbol",
      "optionSymbol",
      "contract_symbol",
      "contractSymbol",
    ]) ?? optionSymbol ?? null,

  strike: getNumber(
    getContractValue(selectedContract, ["strike", "strike_price", "strikePrice"]),
    null
  ),

  expiration:
    getContractValue(selectedContract, [
      "expiration",
      "expiration_date",
      "expirationDate",
      "expiry",
    ]) ?? null,

  optionType:
    tradeDirection === "CALL" || tradeDirection === "PUT"
      ? tradeDirection
      : getContractValue(selectedContract, ["option_type", "optionType", "type"]) ===
          "put" ||
        getContractValue(selectedContract, ["option_type", "optionType", "type"]) ===
          "PUT"
      ? "PUT"
      : "CALL",

  bid: getNumber(getContractValue(selectedContract, ["bid"]), null),
  ask: getNumber(getContractValue(selectedContract, ["ask"]), null),
  mid: getNumber(
    getContractValue(selectedContract, ["mid", "mark", "last", "entryMid"]),
    null
  ),
  volume: getNumber(getContractValue(selectedContract, ["volume"]), null),
  openInterest: getNumber(
    getContractValue(selectedContract, [
      "open_interest",
      "openInterest",
      "oi",
    ]),
    null
  ),
  delta: getNumber(getContractValue(selectedContract, ["delta"]), null),
});

  setStatusMessage(
    `Approval alert created for ${selectedSymbol}. Review it in the Alert Center.`
  );
};

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_#172554_0,_#020617_35%,_#000_100%)] font-mono text-white">
      <BackgroundPaths />
      <FloatingShapes />

      {/* Slim top bar */}
      <header className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400">
            OPTIMA
          </span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden mx-4">
          <motion.div
            className="flex items-center gap-6 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          >
            {[...Array.from(new Set(["SPY", ...watchlist])), ...Array.from(new Set(["SPY", ...watchlist]))].map((symbol, i) => {
              const quote = tickerQuotes[symbol];
              const change = quote?.d ?? 0;
              const changePercent = quote?.dp ?? 0;
              const isPositive = change >= 0;

              return (
                <span key={`${symbol}-${i}`} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">
                  <span className="text-slate-300">{symbol}</span>
                  {quote ? (
                    <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                      {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-slate-600">--</span>
                  )}
                </span>
              );
            })}
          </motion.div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span className={`rounded-md border px-2 py-1 ${getRiskTone(optionRiskCheck.status)} ${getRiskPulse(optionRiskCheck.status)}`}>
            Risk Guard: {optionRiskCheck.status}
          </span>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
            Paper Mode
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
            Open Trades: {openTradesCount}
          </span>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Icon sidebar */}
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-800 bg-slate-950/90 py-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`relative flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-xl border border-transparent transition ${
                activeTab === tab.id
                  ? "text-cyan-300"
                  : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 rounded-xl border border-cyan-400/60 bg-cyan-500/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 text-[8px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Active tab content */}
        <div className="flex-1 overflow-hidden p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === "trade" && (
                <motion.div
                  className="grid h-full grid-cols-1 gap-4 xl:grid-cols-3"
                  initial="hidden"
                  animate="visible"
                  variants={tradeColumnContainerVariants}
                >
                  <motion.div
                    variants={tradeColumnItemVariants}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex h-full flex-col gap-4 overflow-y-auto"
                  >
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 shadow-xl shadow-black/30 backdrop-blur"
                    >
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

                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={runScanner}
                          disabled={isScanning}
                          className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isScanning ? "Scanning..." : "Run"}
                        </motion.button>
                      </div>

                      <AnimatePresence>
                        {statusMessage && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-300"
                          >
                            {statusMessage}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <WatchlistManager
                        watchlist={watchlist}
                        setWatchlist={setWatchlist}
                        protectedSymbols={["SPY"]}
                      />
                    </motion.div>
                  </motion.div>

                  <motion.div
                    variants={tradeColumnItemVariants}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full overflow-y-auto"
                  >
                    <ScannerResultsPanel
                      scannerResults={scannerResults}
                      selectedSymbol={selectedSymbol}
                      onSelectSetup={handleSelectSetup}
                      marketCondition={marketCondition}
                    />
                  </motion.div>

                  <motion.div
                    variants={tradeColumnItemVariants}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full overflow-y-auto"
                  >
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
                  </motion.div>
                </motion.div>
              )}

              {activeTab === "positions" && (
                <div className="h-full space-y-4 overflow-y-auto">
                  <PaperTradeTracker key={`tracker-${refreshKey}`} />

                  <AutoPositionMonitor refreshKey={refreshKey} />
                  <PaperTradingControlCenter />
                </div>
              )}

              {activeTab === "alerts" && (
                <div className="h-full space-y-4 overflow-y-auto">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={sendSelectedContractToApprovalQueue}
                      disabled={!selectedSetup || !selectedContract}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      Send Selected Contract to Approval Queue
                    </button>
                  </div>

                  <AlertPanel
                    alerts={tradeApprovalAlerts}
                    onReviewAlert={reviewAlert}
                    onApproveAlert={approveAlert}
                    onRejectAlert={rejectAlert}
                    onClearResolvedAlerts={clearResolvedAlerts}
                    approvalActionStatus={approvalActionStatus}
                    approvalActionError={approvalActionError}
                    isSavingApprovalDecision={isSavingApprovalDecision}
                  />

                  <WorkModeCommandCenter />
                  <BrokerStatusCard />
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="h-full space-y-4 overflow-y-auto">
                  <OptionPerformanceScoreboard refreshKey={refreshKey} />
                  <PaperTradeAnalytics refreshKey={refreshKey} />
                  <AutoTradeJournal refreshKey={refreshKey} />
                </div>
              )}

              {activeTab === "system" && (
                <div className="h-full space-y-4 overflow-y-auto">
                  <TradingDashboardHeader />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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

                  <SystemReadinessCard />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
