export type MarketCondition = "BULLISH" | "BEARISH" | "CHOPPY";

export type ScannerDecision = "TAKE TRADE" | "WATCH CLOSELY" | "SKIP";

export type SetupQuality =
  | "Elite Setup"
  | "Strong Setup"
  | "Decent Setup"
  | "Weak Setup"
  | "Blocked Setup";

export type TradeDirection = "CALL" | "PUT" | "NO TRADE";

export type DirectionBias = "BULLISH" | "BEARISH" | "NEUTRAL";

export type PreferredExpirationWindow =
  | "7-14 DTE"
  | "14-30 DTE"
  | "NONE";

export type PreferredMoneyness =
  | "ATM / slightly OTM"
  | "ATM"
  | "NONE";

export type OptionCandidateType = "CALL" | "PUT" | "NONE";

export type ContractSelectionStatus =
  | "Pending Tradier API"
  | "Ready for option chain"
  | "Not eligible";

export type QuoteData = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
};

export type ScannerIntelligenceInput = {
  symbol: string;
  price: number;
  previousClose?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  marketCondition: MarketCondition;
};

export type ScannerIntelligenceResult = {
  symbol: string;
  price: number;

  setupScore: number;
  score: number;

  setupGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  grade: "A+" | "A" | "B" | "C" | "D" | "F";

  setupQuality: SetupQuality;

  decision: ScannerDecision;

  confidenceScore: number;
  confidence: number;

  trendStrength: number;

  momentumScore: number;
  marketScore: number;
  rangeScore: number;

  directionBias: DirectionBias;
  tradeDirection: TradeDirection;

  optionCandidateType: OptionCandidateType;
  preferredExpirationWindow: PreferredExpirationWindow;
  preferredMoneyness: PreferredMoneyness;
  liquidityWarning: string;
  contractSelectionStatus: ContractSelectionStatus;

  marketAlignment: "Aligned" | "Neutral" | "Against Market" | "Blocked";
  volumeConfirmation: "Pending";
  autoTradeReady: boolean;

  blockReasons: string[];
  blockReason: string;

  tradeSummary: string;
};

export type IntelligentScanResult = ScannerIntelligenceResult;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSetupGrade(score: number): ScannerIntelligenceResult["setupGrade"] {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function getSetupQuality(score: number, blockReasons: string[]): SetupQuality {
  if (blockReasons.length > 0) return "Blocked Setup";
  if (score >= 90) return "Elite Setup";
  if (score >= 80) return "Strong Setup";
  if (score >= 70) return "Decent Setup";
  return "Weak Setup";
}

function getDecision(score: number, blockReasons: string[]): ScannerDecision {
  if (blockReasons.length > 0) return "SKIP";
  if (score >= 80) return "TAKE TRADE";
  if (score >= 68) return "WATCH CLOSELY";
  return "SKIP";
}

function getDirectionBias(
  dayChangePercent: number,
  moveFromOpenPercent: number
): DirectionBias {
  const combinedMove = dayChangePercent + moveFromOpenPercent;

  if (combinedMove >= 0.5) return "BULLISH";
  if (combinedMove <= -0.5) return "BEARISH";
  return "NEUTRAL";
}

function getTradeDirection(
  directionBias: DirectionBias,
  marketCondition: MarketCondition,
  blockReasons: string[]
): TradeDirection {
  if (marketCondition === "CHOPPY") return "NO TRADE";
  if (blockReasons.length > 0) return "NO TRADE";

  if (directionBias === "BULLISH" && marketCondition === "BULLISH") {
    return "CALL";
  }

  if (directionBias === "BEARISH" && marketCondition === "BEARISH") {
    return "PUT";
  }

  return "NO TRADE";
}

function getMarketAlignment(
  marketCondition: MarketCondition,
  directionBias: DirectionBias
): ScannerIntelligenceResult["marketAlignment"] {
  if (marketCondition === "CHOPPY") return "Blocked";

  if (directionBias === "NEUTRAL") return "Neutral";

  if (marketCondition === "BULLISH" && directionBias === "BULLISH") {
    return "Aligned";
  }

  if (marketCondition === "BEARISH" && directionBias === "BEARISH") {
    return "Aligned";
  }

  return "Against Market";
}

function getOptionReadiness(
  tradeDirection: TradeDirection,
  setupScore: number,
  confidenceScore: number,
  trendStrength: number,
  blockReasons: string[]
) {
  const optionCandidateType: OptionCandidateType =
    tradeDirection === "CALL"
      ? "CALL"
      : tradeDirection === "PUT"
      ? "PUT"
      : "NONE";

  if (
    optionCandidateType === "NONE" ||
    setupScore < 70 ||
    confidenceScore < 70 ||
    trendStrength < 45 ||
    blockReasons.length > 0
  ) {
    return {
      optionCandidateType,
      preferredExpirationWindow: "NONE" as PreferredExpirationWindow,
      preferredMoneyness: "NONE" as PreferredMoneyness,
      liquidityWarning: "No option candidate until scanner setup improves.",
      contractSelectionStatus: "Not eligible" as ContractSelectionStatus,
    };
  }

  if (setupScore >= 85 && confidenceScore >= 80 && trendStrength >= 65) {
    return {
      optionCandidateType,
      preferredExpirationWindow: "7-14 DTE" as PreferredExpirationWindow,
      preferredMoneyness: "ATM / slightly OTM" as PreferredMoneyness,
      liquidityWarning: "Waiting for real option chain liquidity data.",
      contractSelectionStatus:
        "Ready for option chain" as ContractSelectionStatus,
    };
  }

  return {
    optionCandidateType,
    preferredExpirationWindow: "14-30 DTE" as PreferredExpirationWindow,
    preferredMoneyness: "ATM" as PreferredMoneyness,
    liquidityWarning: "Waiting for real option chain liquidity data.",
    contractSelectionStatus:
      "Ready for option chain" as ContractSelectionStatus,
  };
}

export function analyzeScannerSetup(
  input: ScannerIntelligenceInput
): ScannerIntelligenceResult {
  const {
    symbol,
    price,
    previousClose,
    open,
    high,
    low,
    marketCondition,
  } = input;

  const safePreviousClose =
    previousClose && previousClose > 0 ? previousClose : price;

  const dayChange = price - safePreviousClose;
  const dayChangePercent =
    safePreviousClose > 0 ? (dayChange / safePreviousClose) * 100 : 0;

  const safeOpen = open && open > 0 ? open : safePreviousClose;
  const safeHigh = high && high > 0 ? high : price;
  const safeLow = low && low > 0 ? low : price;

  const intradayRange = Math.max(safeHigh - safeLow, 0);
  const rangePercent = price > 0 ? (intradayRange / price) * 100 : 0;

  const moveFromOpenPercent =
    safeOpen > 0 ? ((price - safeOpen) / safeOpen) * 100 : 0;

  const directionBias = getDirectionBias(dayChangePercent, moveFromOpenPercent);
  const marketAlignment = getMarketAlignment(marketCondition, directionBias);

  const blockReasons: string[] = [];

  let marketScore = 0;
  let momentumScore = 0;
  let rangeScore = 0;

  if (marketCondition === "CHOPPY") {
    blockReasons.push("Market is CHOPPY");
    marketScore = 0;
  } else if (marketAlignment === "Aligned") {
    marketScore = 100;
  } else if (marketAlignment === "Neutral") {
    marketScore = 55;
  } else {
    marketScore = 25;
    blockReasons.push("Setup is trading against market direction");
  }

  const absoluteDayMove = Math.abs(dayChangePercent);
  const absoluteOpenMove = Math.abs(moveFromOpenPercent);

  if (absoluteDayMove >= 2 || absoluteOpenMove >= 1.5) {
    momentumScore = 100;
  } else if (absoluteDayMove >= 1.25 || absoluteOpenMove >= 1) {
    momentumScore = 85;
  } else if (absoluteDayMove >= 0.75 || absoluteOpenMove >= 0.5) {
    momentumScore = 70;
  } else if (absoluteDayMove >= 0.35 || absoluteOpenMove >= 0.25) {
    momentumScore = 55;
  } else {
    momentumScore = 35;
  }

  if (rangePercent >= 2) {
    rangeScore = 100;
  } else if (rangePercent >= 1.5) {
    rangeScore = 85;
  } else if (rangePercent >= 0.9) {
    rangeScore = 70;
  } else if (rangePercent >= 0.5) {
    rangeScore = 55;
  } else {
    rangeScore = 35;
  }

  let setupScore = Math.round(
    marketScore * 0.4 + momentumScore * 0.4 + rangeScore * 0.2
  );

  setupScore = clamp(setupScore, 0, 100);

  const trendStrength = clamp(
    Math.round(momentumScore * 0.65 + rangeScore * 0.35),
    0,
    100
  );

  const confidenceScore = clamp(
    Math.round(setupScore * 0.75 + trendStrength * 0.25),
    0,
    100
  );

  if (directionBias === "NEUTRAL") {
    blockReasons.push("Direction bias is neutral");
  }

  if (setupScore < 70) {
    blockReasons.push("Setup score too low");
  }

  if (trendStrength < 45) {
    blockReasons.push("Trend strength too weak");
  }

  if (confidenceScore < 70) {
    blockReasons.push("Confidence score too low");
  }

  const setupGrade = getSetupGrade(setupScore);
  const setupQuality = getSetupQuality(setupScore, blockReasons);
  const decision = getDecision(setupScore, blockReasons);

  const tradeDirection = getTradeDirection(
    directionBias,
    marketCondition,
    blockReasons
  );

  const optionReadiness = getOptionReadiness(
    tradeDirection,
    setupScore,
    confidenceScore,
    trendStrength,
    blockReasons
  );

  const autoTradeReady =
    decision === "TAKE TRADE" &&
    setupScore >= 80 &&
    confidenceScore >= 70 &&
    trendStrength >= 45 &&
    marketCondition !== "CHOPPY" &&
    marketAlignment === "Aligned" &&
    tradeDirection !== "NO TRADE" &&
    blockReasons.length === 0;

  const tradeSummary =
    tradeDirection === "CALL"
      ? `${symbol} is showing bullish momentum aligned with the market. Future option chain logic should search for CALL contracts.`
      : tradeDirection === "PUT"
      ? `${symbol} is showing bearish momentum aligned with the market. Future option chain logic should search for PUT contracts.`
      : `${symbol} is not a clean option setup yet. ${
          blockReasons.length > 0
            ? `Main issue: ${blockReasons[0]}.`
            : "Setup needs more confirmation."
        }`;

  return {
    symbol,
    price,

    setupScore,
    score: setupScore,

    setupGrade,
    grade: setupGrade,

    setupQuality,

    decision,

    confidenceScore,
    confidence: confidenceScore,

    trendStrength,

    momentumScore,
    marketScore,
    rangeScore,

    directionBias,
    tradeDirection,

    optionCandidateType: optionReadiness.optionCandidateType,
    preferredExpirationWindow: optionReadiness.preferredExpirationWindow,
    preferredMoneyness: optionReadiness.preferredMoneyness,
    liquidityWarning: optionReadiness.liquidityWarning,
    contractSelectionStatus: optionReadiness.contractSelectionStatus,

    marketAlignment,
    volumeConfirmation: "Pending",
    autoTradeReady,

    blockReasons,
    blockReason: blockReasons.length > 0 ? blockReasons.join(", ") : "None",

    tradeSummary,
  };
}

export function analyzeSetup(
  symbol: string,
  quote: QuoteData,
  marketCondition: MarketCondition
): ScannerIntelligenceResult {
  return analyzeScannerSetup({
    symbol,
    price: quote.c ?? 0,
    previousClose: quote.pc ?? null,
    open: quote.o ?? null,
    high: quote.h ?? null,
    low: quote.l ?? null,
    marketCondition,
  });
}

export function sortScanResults(
  results: ScannerIntelligenceResult[]
): ScannerIntelligenceResult[] {
  return [...results].sort((a, b) => {
    if (a.autoTradeReady !== b.autoTradeReady) {
      return a.autoTradeReady ? -1 : 1;
    }

    if (a.contractSelectionStatus !== b.contractSelectionStatus) {
      if (a.contractSelectionStatus === "Ready for option chain") return -1;
      if (b.contractSelectionStatus === "Ready for option chain") return 1;
    }

    if (b.setupScore !== a.setupScore) {
      return b.setupScore - a.setupScore;
    }

    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }

    return b.trendStrength - a.trendStrength;
  });
}