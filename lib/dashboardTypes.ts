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