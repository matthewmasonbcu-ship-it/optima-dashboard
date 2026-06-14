export type Grade = "A" | "B" | "C" | "AVOID";

export type Decision = "TAKE TRADE" | "WATCH CLOSELY" | "SKIP";

export type TradeStatus = "OPEN" | "WIN" | "LOSS" | "BE";

export type Scan = {
  id: string;
  ticker: string;
  price: number;
  momentum: number;
  volume: number;
  trend: number;
  volatility: number;
  score: number;
  grade: Grade;
  decision: Decision;
  strategy: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  createdAt: string;
};

export type PaperTrade = Scan & {
  tradeId: string;
  status: TradeStatus;
  openedAt: string;
  closedAt?: string;
};

// --- Credit spread support -------------------------------------------------

export type SpreadType = "single_leg" | "bull_put_spread" | "bear_call_spread";

export type OptionLeg = {
  option_symbol: string;
  strike_price: number;
  bid_price: number;
  ask_price: number;
  mid_price: number;
};