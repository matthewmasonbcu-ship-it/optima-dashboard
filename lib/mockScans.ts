export type TradeDecision = "TAKE_TRADE" | "WATCH_CLOSELY" | "WAIT" | "SKIP";
export type SetupGrade = "A" | "B" | "C" | "AVOID";

export type MarketScan = {
  id: string;
  ticker: string;
  company: string;
  price: number;
  changePercent: number;
  trend: "Bullish" | "Bearish" | "Neutral";
  volumeScore: number;
  rsi: number;
  setupGrade: SetupGrade;
  decision: TradeDecision;
  reason: string;
};

export const mockScans: MarketScan[] = [
  {
    id: "1",
    ticker: "NVDA",
    company: "Nvidia",
    price: 139.42,
    changePercent: 2.18,
    trend: "Bullish",
    volumeScore: 92,
    rsi: 61,
    setupGrade: "A",
    decision: "TAKE_TRADE",
    reason: "Strong trend, strong volume, RSI still has room before overbought.",
  },
  {
    id: "2",
    ticker: "TSLA",
    company: "Tesla",
    price: 184.33,
    changePercent: 1.04,
    trend: "Bullish",
    volumeScore: 78,
    rsi: 58,
    setupGrade: "B",
    decision: "WATCH_CLOSELY",
    reason: "Momentum is improving, but volume confirmation is not elite yet.",
  },
  {
    id: "3",
    ticker: "AAPL",
    company: "Apple",
    price: 211.76,
    changePercent: -0.42,
    trend: "Neutral",
    volumeScore: 53,
    rsi: 49,
    setupGrade: "C",
    decision: "WAIT",
    reason: "No clear edge. Price action is mixed and momentum is average.",
  },
  {
    id: "4",
    ticker: "AMD",
    company: "Advanced Micro Devices",
    price: 162.21,
    changePercent: 3.34,
    trend: "Bullish",
    volumeScore: 88,
    rsi: 64,
    setupGrade: "A",
    decision: "TAKE_TRADE",
    reason: "Breakout-style move with high relative volume and strong momentum.",
  },
  {
    id: "5",
    ticker: "PLTR",
    company: "Palantir",
    price: 23.81,
    changePercent: -2.12,
    trend: "Bearish",
    volumeScore: 71,
    rsi: 38,
    setupGrade: "AVOID",
    decision: "SKIP",
    reason: "Weak trend and bearish pressure. Not enough confirmation for a long setup.",
  },
  {
    id: "6",
    ticker: "META",
    company: "Meta Platforms",
    price: 487.64,
    changePercent: 0.86,
    trend: "Bullish",
    volumeScore: 74,
    rsi: 55,
    setupGrade: "B",
    decision: "WATCH_CLOSELY",
    reason: "Clean bullish structure, but needs stronger volume before becoming an A setup.",
  },
];