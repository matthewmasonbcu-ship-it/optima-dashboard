export type FilterType = "ALL" | "CALL" | "WATCH" | "WAIT";

export type ConfidenceFilter = "ALL" | "70" | "80";

export type GradeFilter = "ALL" | "A" | "B" | "C" | "AVOID";

export type SortType =
  | "NEWEST"
  | "CONFIDENCE"
  | "MOMENTUM"
  | "LOWEST_RISK"
  | "BEST_GRADE";

export type Scan = {
  id: string;
  ticker: string;
  signal: string;
  confidence: number;
  price: number | null;
  reason: string | null;
  created_at: string;
  option_type?: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  risk_level?: string | null;
  timeframe?: string | null;
  trend_score?: number | null;
  volume_score?: number | null;
  momentum_score?: number | null;
  risk_score?: number | null;
  trade_grade?: string | null;
  trade_decision?: string | null;
};