import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type MarketProfile = {
  ticker: string;
  basePrice: number;
  trendScore: number;
  volumeScore: number;
  momentumScore: number;
  riskScore: number;
};

const marketProfiles: MarketProfile[] = [
  {
    ticker: "SPY",
    basePrice: 529,
    trendScore: 82,
    volumeScore: 76,
    momentumScore: 84,
    riskScore: 72,
  },
  {
    ticker: "QQQ",
    basePrice: 457,
    trendScore: 79,
    volumeScore: 73,
    momentumScore: 86,
    riskScore: 68,
  },
  {
    ticker: "AAPL",
    basePrice: 195,
    trendScore: 71,
    volumeScore: 66,
    momentumScore: 69,
    riskScore: 74,
  },
  {
    ticker: "TSLA",
    basePrice: 182,
    trendScore: 74,
    volumeScore: 88,
    momentumScore: 81,
    riskScore: 52,
  },
  {
    ticker: "NVDA",
    basePrice: 125,
    trendScore: 86,
    volumeScore: 82,
    momentumScore: 89,
    riskScore: 61,
  },
  {
    ticker: "AMD",
    basePrice: 167,
    trendScore: 69,
    volumeScore: 77,
    momentumScore: 72,
    riskScore: 58,
  },
  {
    ticker: "META",
    basePrice: 485,
    trendScore: 78,
    volumeScore: 70,
    momentumScore: 76,
    riskScore: 69,
  },
  {
    ticker: "MSFT",
    basePrice: 430,
    trendScore: 75,
    volumeScore: 68,
    momentumScore: 73,
    riskScore: 78,
  },
  {
    ticker: "AMZN",
    basePrice: 185,
    trendScore: 72,
    volumeScore: 74,
    momentumScore: 75,
    riskScore: 70,
  },
];

function randomFromArray<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function addNoise(score: number) {
  const noise = Math.floor(Math.random() * 13) - 6;
  const finalScore = score + noise;

  return Math.max(0, Math.min(100, finalScore));
}

function calculateConfidence(profile: MarketProfile) {
  const trend = addNoise(profile.trendScore);
  const volume = addNoise(profile.volumeScore);
  const momentum = addNoise(profile.momentumScore);
  const risk = addNoise(profile.riskScore);

  const confidence = Math.round(
    trend * 0.35 + volume * 0.2 + momentum * 0.3 + risk * 0.15
  );

  return {
    trend,
    volume,
    momentum,
    risk,
    confidence,
  };
}

function buildSignal(confidence: number, momentum: number, risk: number) {
  if (confidence >= 82 && momentum >= 78 && risk >= 55) {
    return {
      signal: "CALL SETUP",
      optionType: "CALL",
      riskLevel: risk >= 70 ? "Medium" : "High",
    };
  }

  if (confidence >= 72) {
    return {
      signal: "WATCH",
      optionType: "CALL",
      riskLevel: risk >= 70 ? "Low" : "Medium",
    };
  }

  return {
    signal: "WAIT",
    optionType: "TBD",
    riskLevel: "High",
  };
}

function buildTradeGrade(params: {
  confidence: number;
  trend: number;
  momentum: number;
  risk: number;
}) {
  const { confidence, trend, momentum, risk } = params;

  if (confidence >= 88 && trend >= 82 && momentum >= 85 && risk >= 60) {
    return "A+ Setup";
  }

  if (confidence >= 82 && trend >= 76 && momentum >= 78 && risk >= 55) {
    return "A Setup";
  }

  if (confidence >= 72 && momentum >= 70) {
    return "B Setup";
  }

  if (confidence >= 62) {
    return "C Setup";
  }

  return "Avoid";
}

function buildTradeDecision(grade: string) {
  if (grade === "A+ Setup" || grade === "A Setup") {
    return "Take Trade";
  }

  if (grade === "B Setup") {
    return "Watch Closely";
  }

  return "Skip";
}

function buildReason(params: {
  ticker: string;
  signal: string;
  trend: number;
  volume: number;
  momentum: number;
  risk: number;
  grade: string;
  decision: string;
}) {
  const { ticker, signal, trend, volume, momentum, risk, grade, decision } =
    params;

  if (signal === "CALL SETUP") {
    return `${ticker} graded as ${grade} with a ${decision} decision. Trend score is ${trend}, momentum score is ${momentum}, volume score is ${volume}, and risk score is ${risk}. The setup has defined upside with manageable downside.`;
  }

  if (signal === "WATCH") {
    return `${ticker} graded as ${grade} with a ${decision} decision. Trend score is ${trend} and momentum score is ${momentum}, but it still needs cleaner confirmation before becoming a full setup.`;
  }

  return `${ticker} graded as ${grade} with a ${decision} decision. Trend score is ${trend}, momentum score is ${momentum}, and risk score is ${risk}, so patience is better here.`;
}

export async function POST() {
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const profile = randomFromArray(marketProfiles);
  const score = calculateConfidence(profile);
  const setup = buildSignal(score.confidence, score.momentum, score.risk);

  const grade = buildTradeGrade({
    confidence: score.confidence,
    trend: score.trend,
    momentum: score.momentum,
    risk: score.risk,
  });

  const decision = buildTradeDecision(grade);

  const price = randomNumber(
    profile.basePrice * 0.985,
    profile.basePrice * 1.015
  );

  const stopLoss =
    setup.signal === "CALL SETUP"
      ? randomNumber(price * 0.975, price * 0.988)
      : randomNumber(price * 0.965, price * 0.98);

  const takeProfit =
    setup.signal === "CALL SETUP"
      ? randomNumber(price * 1.035, price * 1.075)
      : randomNumber(price * 1.02, price * 1.045);

  const newScan = {
    ticker: profile.ticker,
    signal: setup.signal,
    confidence: score.confidence,
    price,
    reason: buildReason({
      ticker: profile.ticker,
      signal: setup.signal,
      trend: score.trend,
      volume: score.volume,
      momentum: score.momentum,
      risk: score.risk,
      grade,
      decision,
    }),
    option_type: setup.optionType,
    entry_price: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    risk_level: setup.riskLevel,
    timeframe: "1D",
    trend_score: score.trend,
    volume_score: score.volume,
    momentum_score: score.momentum,
    risk_score: score.risk,
    trade_grade: grade,
    trade_decision: decision,
  };

  const { data, error } = await supabase
    .from("scans")
    .insert(newScan)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    scan: data,
  });
}