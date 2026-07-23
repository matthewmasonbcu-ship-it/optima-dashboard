// Centralized scan + execution config — single source of truth for the
// market-open cron. Value changes here change scan/trade behavior; edit with care.
//
// FROZEN params are EV-validated — do not touch without re-validation.
// PENDING params stay null through the paper phase and must be locked before any
// live eval account (they depend on the static-vs-trailing drawdown decision).

// --- ACTIVE ------------------------------------------------------------------
export const SCAN_EVAL_BREADTH_N = 20; // contract-grade the top N ranked symbols
export const DAILY_TRADE_CAP = 1; // max trades queued per day — DO NOT raise

// Setup-score gate + DTE window. Moved verbatim from market-open-scan/route.ts;
// values unchanged — this file is now the single source for both.
export const MIN_SETUP_SCORE = 75;
export const MIN_DTE = 30;
export const MAX_DTE = 45;
export const MIDPOINT_DTE = 37;

// Minimum net-credit-to-width ratio a built spread must clear to be tradeable —
// a spread that collects too little credit for its width is degenerate risk.
// Baseline from 2026-07-21 logged data: all 8 spread-built rows landed 12.6%–
// 21.6%, so 0.10 passes every current spread (incl. NVDA at 11.4%) while blocking
// genuinely thin sub-10% ones. 0.15 would reject 2 of 8, 0.20 would reject 7 of 8.
// Retune upward as more data accumulates.
export const MIN_CREDIT_TO_WIDTH_RATIO = 0.1;

// --- PENDING (null until live eval; not needed for paper) --------------------
export const PER_TRADE_RISK_PCT: number | null = null; // static-vs-trailing DD
export const MAX_TAIL_LOSS_PCT: number | null = null;

// --- FROZEN (EV-validated — DO NOT TOUCH) ------------------------------------
export const STOP_LOSS_FACTOR = 2.0;
export const PROFIT_EXIT_PCT = 50;
export const DELTA_BAND: readonly [number, number] = [0.2, 0.25];
