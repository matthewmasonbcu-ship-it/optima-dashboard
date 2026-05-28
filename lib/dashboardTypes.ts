export type SavedScan = {
  id: string;
  ticker: string;
  company: string | null;
  price: number | null;
  change_percent: number | null;
  trend: string | null;
  volume_score: number | null;
  rsi: number | null;
  setup_grade: string | null;
  decision: string | null;
  reason: string | null;
  created_at: string;
};

export type PaperTrade = {
  id: string;
  ticker: string | null;
  company: string | null;
  entry_price: number | null;
  setup_grade: string | null;
  decision: string | null;
  trade_plan_action: string | null;
  bias: string | null;
  risk_level: string | null;
  notes: string | null;
  status: string | null;
  result?: string | null;
  exit_price?: number | null;
  closed_at?: string | null;
  created_at: string;
};

export type HistoryFilter = "ALL" | "A" | "WATCH" | "SKIP";

export type TradeResult = "WIN" | "LOSS" | "BREAKEVEN";