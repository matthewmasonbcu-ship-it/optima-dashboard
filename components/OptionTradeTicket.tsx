"use client";

// ─── DISPLAY ONLY — no save button, no order execution, no handleSave ────────
// ─── Save Paper Trade lives in OptionTradeCommandCenter.tsx ──────────────────

import { useEffect, useState } from "react";
import type { SpreadType, OptionLeg } from "../lib/dashboardTypes";

type RiskGuardStatus = "APPROVED" | "CAUTION" | "BLOCKED" | "WAITING" | string;

type OptionContractLike = {
  stock_symbol?: string;
  stockSymbol?: string;
  symbol?: string;
  option_symbol?: string;
  optionSymbol?: string;
  trade_direction?: string;
  tradeDirection?: string;
  direction?: string;
  expiration_date?: string;
  expirationDate?: string;
  strike_price?: number;
  strikePrice?: number;
  bid_price?: number;
  bidPrice?: number;
  ask_price?: number;
  askPrice?: number;
  mid_price?: number;
  midPrice?: number;
  contracts?: number;
  estimated_cost?: number;
  estimatedCost?: number;
  max_risk?: number;
  maxRisk?: number;

  // ─── Credit spread support ────────────────────────────────────────────
  spread_type?: SpreadType;
  short_leg?: OptionLeg;
  long_leg?: OptionLeg;
  net_credit?: number;
  spread_width?: number;
  max_loss?: number;
  max_profit?: number;
};

type RiskCheckLike = {
  status?: RiskGuardStatus;
  reason?: string;
  maxAllowedRisk?: number;
  max_allowed_risk?: number;
  riskLimit?: number;
  risk_limit?: number;
};

type ScannerSetupLike = {
  symbol?: string;
  stock_symbol?: string;
  stockSymbol?: string;
  tradeDirection?: string;
  trade_direction?: string;
  direction?: string;
  price?: number;
  currentPrice?: number;
  current_price?: number;
  entry?: number;
  entry_price?: number;
  stopLoss?: number;
  stop_loss?: number;
  target?: number;
  target_price?: number;
  score?: number;
  setupScore?: number;
  setup_score?: number;
  confidenceScore?: number;
  confidence_score?: number;
};

type OptionTradeTicketProps = {
  selectedOptionContract?: OptionContractLike | null;
  selectedContract?: OptionContractLike | null;
  optionContract?: OptionContractLike | null;
  selectedSetup?: ScannerSetupLike | null;
  setup?: ScannerSetupLike | null;
  selectedScanResult?: ScannerSetupLike | null;
  optionRiskCheck?: RiskCheckLike | null;
  riskCheck?: RiskCheckLike | null;
  riskGuardResult?: RiskCheckLike | null;
  // ─── kept in props signature so parent callers don't break ───────────────
  onSavePaperTrade?: () => void;
  onSave?: () => void;
  savePaperTrade?: () => void;
  onClearContract?: () => void;
  setSelectedOptionContract?: (contract: OptionContractLike | null) => void;
  setSelectedContract?: (contract: OptionContractLike | null) => void;
  isSaving?: boolean;
  loading?: boolean;
  disabled?: boolean;
  saveMessage?: string;
  message?: string;
  // ─── used for display fallbacks ──────────────────────────────────────────
  selectedSymbol?: string;
  stockSymbol?: string;
  tradeDirection?: string;
  scannerDirection?: string;
  accountSize?: number;
  maxRiskPercent?: number;
  maxSpreadPercent?: number;
};

// ─── All helper functions — untouched ────────────────────────────────────────
function money(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function num(value: number | null | undefined, fallback = "—") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toFixed(2);
}

function getContractSymbol(c: OptionContractLike | null) {
  return c?.stock_symbol || c?.stockSymbol || c?.symbol || "";
}
function getContractDirection(c: OptionContractLike | null) {
  return c?.trade_direction || c?.tradeDirection || c?.direction || "NO TRADE";
}
function getOptionSymbol(c: OptionContractLike | null) {
  return c?.option_symbol || c?.optionSymbol || "";
}
function getExpiration(c: OptionContractLike | null) {
  return c?.expiration_date || c?.expirationDate || "";
}
function getStrike(c: OptionContractLike | null) {
  return c?.strike_price ?? c?.strikePrice ?? null;
}
function getBid(c: OptionContractLike | null) {
  return c?.bid_price ?? c?.bidPrice ?? null;
}
function getAsk(c: OptionContractLike | null) {
  return c?.ask_price ?? c?.askPrice ?? null;
}
function getMid(c: OptionContractLike | null) {
  return c?.mid_price ?? c?.midPrice ?? null;
}
function getEstimatedCost(c: OptionContractLike | null) {
  return c?.estimated_cost ?? c?.estimatedCost ?? null;
}
function getMaxRisk(c: OptionContractLike | null) {
  return c?.max_risk ?? c?.maxRisk ?? null;
}

// ─── Credit spread helpers ────────────────────────────────────────────────────
function getSpreadType(c: OptionContractLike | null): SpreadType | null {
  return c?.spread_type ?? null;
}
function getShortLeg(c: OptionContractLike | null): OptionLeg | null {
  return c?.short_leg ?? null;
}
function getLongLeg(c: OptionContractLike | null): OptionLeg | null {
  return c?.long_leg ?? null;
}
function getNetCredit(c: OptionContractLike | null) {
  return c?.net_credit ?? null;
}
function getSpreadWidth(c: OptionContractLike | null) {
  return c?.spread_width ?? null;
}
function getMaxLoss(c: OptionContractLike | null) {
  return c?.max_loss ?? null;
}
function getMaxProfit(c: OptionContractLike | null) {
  return c?.max_profit ?? null;
}
function getSpreadTypeLabel(spreadType: SpreadType | null) {
  if (spreadType === "bull_put_spread") return "Bull Put Spread";
  if (spreadType === "bear_call_spread") return "Bear Call Spread";
  return "Credit Spread";
}
function getSetupPrice(s: ScannerSetupLike | null) {
  return s?.price ?? s?.currentPrice ?? s?.current_price ?? null;
}
function getSetupEntry(s: ScannerSetupLike | null) {
  return s?.entry ?? s?.entry_price ?? null;
}
function getSetupStop(s: ScannerSetupLike | null) {
  return s?.stopLoss ?? s?.stop_loss ?? null;
}
function getSetupTarget(s: ScannerSetupLike | null) {
  return s?.target ?? s?.target_price ?? null;
}
function getSetupScore(s: ScannerSetupLike | null) {
  return s?.score ?? s?.setupScore ?? s?.setup_score ?? s?.confidenceScore ?? s?.confidence_score ?? null;
}
function getRiskStatus(r: RiskCheckLike | null) {
  return r?.status || "WAITING";
}
function getRiskReason(r: RiskCheckLike | null) {
  return r?.reason || "Select or build an option contract to run Risk Guard.";
}
function getRiskLimit(r: RiskCheckLike | null) {
  return r?.maxAllowedRisk ?? r?.max_allowed_risk ?? r?.riskLimit ?? r?.risk_limit ?? null;
}
function calculateSpreadPercent(
  bid: number | null,
  ask: number | null,
  mid: number | null
) {
  if (typeof bid !== "number" || typeof ask !== "number" || typeof mid !== "number") return null;
  if (mid <= 0) return null;
  return Number((((ask - bid) / mid) * 100).toFixed(1));
}
function calculateBreakeven({
  direction,
  strike,
  mid,
}: {
  direction: string;
  strike: number | null;
  mid: number | null;
}) {
  if (typeof strike !== "number" || typeof mid !== "number") return null;
  const u = direction.toUpperCase();
  if (u.includes("CALL")) return Number((strike + mid).toFixed(2));
  if (u.includes("PUT")) return Number((strike - mid).toFixed(2));
  return null;
}


function buildFallbackRiskCheck({
  contract,
  maxRisk,
  spreadPercent,
  accountSize,
  maxRiskPercent,
  maxSpreadPercent,
}: {
  contract: OptionContractLike | null;
  maxRisk: number | null;
  spreadPercent: number | null;
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
}): RiskCheckLike | null {
  if (!contract) return null;

  const maxAllowedRisk = accountSize * (maxRiskPercent / 100);

  if (typeof maxRisk !== "number" || Number.isNaN(maxRisk) || maxRisk <= 0) {
    return {
      status: "WAITING",
      reason: "Select a valid option contract to run Risk Guard.",
      maxAllowedRisk,
      max_allowed_risk: maxAllowedRisk,
      riskLimit: maxAllowedRisk,
      risk_limit: maxAllowedRisk,
    };
  }

  if (maxRisk > maxAllowedRisk) {
    return {
      status: "BLOCKED",
      reason: `Max risk ${money(maxRisk)} is above allowed risk ${money(maxAllowedRisk)}.`,
      maxAllowedRisk,
      max_allowed_risk: maxAllowedRisk,
      riskLimit: maxAllowedRisk,
      risk_limit: maxAllowedRisk,
    };
  }

  if (
    typeof spreadPercent === "number" &&
    Number.isFinite(spreadPercent) &&
    spreadPercent > maxSpreadPercent
  ) {
    return {
      status: "BLOCKED",
      reason: `Bid/ask spread ${spreadPercent.toFixed(1)}% is above max ${maxSpreadPercent}%.`,
      maxAllowedRisk,
      max_allowed_risk: maxAllowedRisk,
      riskLimit: maxAllowedRisk,
      risk_limit: maxAllowedRisk,
    };
  }

  if (
    typeof spreadPercent === "number" &&
    Number.isFinite(spreadPercent) &&
    spreadPercent > maxSpreadPercent * 0.75
  ) {
    return {
      status: "CAUTION",
      reason: "Risk Guard caution: spread is acceptable but close to the max limit.",
      maxAllowedRisk,
      max_allowed_risk: maxAllowedRisk,
      riskLimit: maxAllowedRisk,
      risk_limit: maxAllowedRisk,
    };
  }

  return {
    status: "APPROVED",
    reason: "Risk Guard approved this contract.",
    maxAllowedRisk,
    max_allowed_risk: maxAllowedRisk,
    riskLimit: maxAllowedRisk,
    risk_limit: maxAllowedRisk,
  };
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
function dirBar(d: string) {
  const u = d.toUpperCase();
  if (u.includes("CALL")) return "bg-emerald-500";
  if (u.includes("PUT")) return "bg-red-500";
  return "bg-slate-600";
}
function dirColor(d: string) {
  const u = d.toUpperCase();
  if (u.includes("CALL")) return "text-emerald-300";
  if (u.includes("PUT")) return "text-red-400";
  return "text-slate-400";
}
function dirBadge(d: string) {
  const u = d.toUpperCase();
  if (u.includes("CALL")) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (u.includes("PUT")) return "border-red-500/40 bg-red-500/10 text-red-400";
  return "border-slate-700/60 bg-slate-800/60 text-slate-400";
}
function riskBar(s: string) {
  const u = s.toUpperCase();
  if (u === "APPROVED") return "bg-emerald-500";
  if (u === "CAUTION") return "bg-yellow-400";
  if (u === "BLOCKED") return "bg-red-500";
  return "bg-slate-600";
}
function riskColor(s: string) {
  const u = s.toUpperCase();
  if (u === "APPROVED") return "text-emerald-300";
  if (u === "CAUTION") return "text-yellow-300";
  if (u === "BLOCKED") return "text-red-400";
  return "text-slate-500";
}
function riskBorder(s: string) {
  const u = s.toUpperCase();
  if (u === "APPROVED") return "border-emerald-500/25 ring-emerald-500/15";
  if (u === "CAUTION") return "border-yellow-500/25 ring-yellow-500/15";
  if (u === "BLOCKED") return "border-red-500/30 ring-red-500/20";
  return "border-slate-700/60 ring-slate-700/10";
}
function spreadColor(pct: number | null, max: number) {
  if (pct === null) return "text-slate-400";
  return pct <= max ? "text-emerald-300" : "text-red-400";
}

// ─── MiniStat ─────────────────────────────────────────────────────────────────
function MiniStat({
  label,
  value,
  valueClass = "text-slate-200",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-800/80 bg-black/30 px-2.5 py-2">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-[10px] font-black ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function OptionTradeTicket({
  selectedOptionContract,
  selectedContract,
  optionContract,
  selectedSetup,
  setup,
  selectedScanResult,
  optionRiskCheck,
  riskCheck,
  riskGuardResult,
  // ─── save-related props accepted but not used here ───────────────────────
  onSavePaperTrade: _onSavePaperTrade,
  onSave: _onSave,
  savePaperTrade: _savePaperTrade,
  onClearContract: _onClearContract,
  setSelectedOptionContract: _setSelectedOptionContract,
  setSelectedContract: _setSelectedContract,
  isSaving: _isSaving,
  loading: _loading,
  disabled: _disabled,
  saveMessage: _saveMessage,
  message: _message,
  // ─── display fallback props ───────────────────────────────────────────────
  selectedSymbol,
  stockSymbol,
  tradeDirection,
  scannerDirection,
  accountSize = 5000,
  maxRiskPercent = 2,
  maxSpreadPercent = 20,
}: OptionTradeTicketProps) {

  // ─── Broadcast contract state — untouched ────────────────────────────────
  const propContract = selectedOptionContract || selectedContract || optionContract || null;
  const [broadcastContract, setBroadcastContract] = useState<OptionContractLike | null>(null);
  const [contractWasCleared, setContractWasCleared] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("selectedOptionContract");
      if (stored) {
        setBroadcastContract(JSON.parse(stored));
        setContractWasCleared(false);
      }
    } catch (e) {
      console.error("Could not load stored option contract:", e);
    }

    function handleContractSelected(event: Event) {
      const ce = event as CustomEvent<OptionContractLike>;
      setContractWasCleared(false);
      setBroadcastContract(ce.detail);
    }
    function handleContractCleared() {
      setContractWasCleared(true);
      setBroadcastContract(null);
    }

    window.addEventListener("option-contract-selected", handleContractSelected);
    window.addEventListener("option-contract-cleared", handleContractCleared);
    return () => {
      window.removeEventListener("option-contract-selected", handleContractSelected);
      window.removeEventListener("option-contract-cleared", handleContractCleared);
    };
  }, []);

  // ─── All derived display values — untouched ───────────────────────────────
  const contract = contractWasCleared ? null : propContract || broadcastContract;
  const scanSetup = selectedSetup || setup || selectedScanResult || null;
  const passedRisk = contractWasCleared ? null : optionRiskCheck || riskCheck || riskGuardResult || null;

  const contractSymbol = getContractSymbol(contract);
  // Use selectedSymbol / stockSymbol prop fallbacks for display
  const symbol =
    contractSymbol ||
    selectedSymbol ||
    stockSymbol ||
    "";

  const contractDirection = getContractDirection(contract);
  // Use tradeDirection / scannerDirection prop fallbacks for display
  const direction =
    contractDirection !== "NO TRADE"
      ? contractDirection
      : tradeDirection || scannerDirection || "NO TRADE";

  const optionSymbol = getOptionSymbol(contract);
  const expiration = getExpiration(contract);
  const strike = getStrike(contract);
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  const contractCount = contract ? (contract.contracts ?? 1) : null;
  const estimatedCost = getEstimatedCost(contract);
  const maxRisk = getMaxRisk(contract);

  const spreadType = getSpreadType(contract);
  const isCreditSpread = spreadType !== null && spreadType !== "single_leg";
  const shortLeg = getShortLeg(contract);
  const longLeg = getLongLeg(contract);
  const netCredit = getNetCredit(contract);
  const spreadWidth = getSpreadWidth(contract);
  const maxLoss = getMaxLoss(contract);
  const maxProfit = getMaxProfit(contract);

  const spreadPercent = calculateSpreadPercent(bid, ask, mid);
  const spreadDollars =
    typeof bid === "number" && typeof ask === "number"
      ? Number((ask - bid).toFixed(2))
      : null;
  const breakeven = calculateBreakeven({ direction, strike, mid });

  const riskPerContract =
    typeof maxRisk === "number" &&
    typeof contractCount === "number" &&
    contractCount > 0
      ? maxRisk / contractCount
      : null;

  const setupPrice = getSetupPrice(scanSetup);
  const setupEntry = getSetupEntry(scanSetup);
  const setupStop = getSetupStop(scanSetup);
  const setupTarget = getSetupTarget(scanSetup);
  const setupScore = getSetupScore(scanSetup);

  const fallbackRisk = buildFallbackRiskCheck({
    contract,
    maxRisk,
    spreadPercent,
    accountSize,
    maxRiskPercent,
    maxSpreadPercent,
  });

  const displayRisk = passedRisk || fallbackRisk;
  const riskStatus = getRiskStatus(displayRisk);
  const riskReason = getRiskReason(displayRisk);
  const riskLimit = getRiskLimit(displayRisk);

  const hasContract = Boolean(contract);

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!hasContract) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/60 bg-black/20 py-8">
        <span className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-700">
          No Contract
        </span>
        <p className="font-mono text-sm font-black text-slate-500">
          No option contract selected
        </p>
        <p className="mt-1 font-mono text-[9px] text-slate-600">
          Load the mock or Tradier chain and pick a contract above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── TICKET HEADER ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
        <div className={`absolute inset-y-0 left-0 w-[3px] ${dirBar(direction)}`} />
        <div className="flex flex-col gap-2 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              OPTIMA-SYS · Selected Contract
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xl font-black text-white">
                {symbol || "—"}
              </span>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ${dirBadge(direction)}`}
              >
                {direction}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[9px] leading-5 text-slate-600">
              {optionSymbol || "No option symbol"} · Exp {expiration || "—"}
            </p>
          </div>

          {/* Estimated cost display */}
          <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-black/40 px-4 py-3 ring-1 ring-slate-700/10">
            <div className="absolute inset-y-0 right-0 w-[3px] bg-blue-500" />
            <p className="pr-2 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Est. Cost
            </p>
            <p className="pr-2 font-mono text-lg font-black text-white">
              {money(estimatedCost)}
            </p>
          </div>
        </div>
      </div>

      {/* ── CREDIT SPREAD TICKET ──────────────────────────────────────────── */}
      {isCreditSpread && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/25 bg-purple-500/5 ring-1 ring-purple-500/10">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-purple-500" />
          <div className="px-5 py-4 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-purple-500">
              {getSpreadTypeLabel(spreadType)} · Two-Leg Ticket
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-red-400">
                  Short Leg (Sell)
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] font-black text-white">
                  {shortLeg?.option_symbol || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                  Strike {money(shortLeg?.strike_price ?? null)} · Bid {money(shortLeg?.bid_price ?? null)} / Ask {money(shortLeg?.ask_price ?? null)} / Mid {money(shortLeg?.mid_price ?? null)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                  Long Leg (Buy)
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] font-black text-white">
                  {longLeg?.option_symbol || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                  Strike {money(longLeg?.strike_price ?? null)} · Bid {money(longLeg?.bid_price ?? null)} / Ask {money(longLeg?.ask_price ?? null)} / Mid {money(longLeg?.mid_price ?? null)}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <MiniStat label="Net Credit" value={money(netCredit)} valueClass="text-emerald-300" />
              <MiniStat label="Spread Width" value={money(spreadWidth)} />
              <MiniStat label="Max Loss" value={money(maxLoss)} valueClass="text-red-400" />
              <MiniStat label="Max Profit" value={money(maxProfit)} valueClass="text-emerald-300" />
            </div>
          </div>
        </div>
      )}

      {/* ── CONTRACT STATS GRID ───────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-10">
        <MiniStat label="Strike" value={money(strike)} />
        <MiniStat label="Bid" value={money(bid)} />
        <MiniStat label="Ask" value={money(ask)} />
        <MiniStat
          label="Mid"
          value={money(mid)}
          valueClass="text-emerald-300"
        />
        <MiniStat label="Qty" value={contractCount ?? "—"} />
        <MiniStat
          label="Spread %"
          value={spreadPercent !== null ? `${spreadPercent}%` : "—"}
          valueClass={spreadColor(spreadPercent, maxSpreadPercent)}
        />
        <MiniStat
          label="Spread $"
          value={spreadDollars !== null ? money(spreadDollars) : "—"}
        />
        <MiniStat label="Cost" value={money(estimatedCost)} />
        <MiniStat
          label="Max Risk"
          value={money(maxRisk)}
          valueClass="text-red-400"
        />
        <MiniStat
          label="Risk / Ct"
          value={riskPerContract !== null ? money(riskPerContract) : "—"}
          valueClass="text-yellow-300"
        />
      </div>

      {/* ── BREAKEVEN + SCANNER SNAPSHOT ─────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2">

        {/* Breakeven */}
        <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-violet-500" />
          <div className="px-5 py-4 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Breakeven Estimate
            </p>
            <p className="mt-1 font-mono text-xl font-black text-white">
              {money(breakeven)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[9px] text-slate-600">
                Formula ›
              </span>
              <span className="font-mono text-[9px] font-bold text-violet-500">
                {isCreditSpread
                  ? spreadType === "bull_put_spread"
                    ? "Short Strike − Net Credit"
                    : "Short Strike + Net Credit"
                  : direction.toUpperCase().includes("PUT")
                  ? "Strike − Mid"
                  : direction.toUpperCase().includes("CALL")
                  ? "Strike + Mid"
                  : "—"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] leading-4 text-slate-600">
              {isCreditSpread
                ? spreadType === "bull_put_spread"
                  ? "For a bull put spread, breakeven is the short put strike minus the net credit received."
                  : "For a bear call spread, breakeven is the short call strike plus the net credit received."
                : direction.toUpperCase().includes("PUT")
                ? "For a PUT, breakeven is strike minus entry premium."
                : direction.toUpperCase().includes("CALL")
                ? "For a CALL, breakeven is strike plus entry premium."
                : "Breakeven calculates after direction is set."}
            </p>
          </div>
        </div>

        {/* Scanner setup snapshot */}
        <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-slate-600" />
          <div className="px-5 py-4 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Scanner Setup Snapshot
            </p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              <MiniStat label="Stock" value={money(setupPrice)} />
              <MiniStat label="Entry" value={money(setupEntry)} />
              <MiniStat label="Stop" value={money(setupStop)} />
              <MiniStat label="Target" value={money(setupTarget)} />
              <MiniStat
                label="Score"
                value={setupScore !== null ? num(setupScore) : "—"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── RISK GUARD DISPLAY ────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-xl border ring-1 ${riskBorder(riskStatus)} bg-black/30`}
      >
        <div className={`absolute inset-y-0 left-0 w-[3px] ${riskBar(riskStatus)}`} />
        <div className="px-5 py-4 pl-6">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
            Risk Guard Status
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-black tracking-tight ${riskColor(riskStatus)}`}
          >
            {riskStatus}
          </p>
          <p className="mt-1.5 font-mono text-[9px] leading-5 text-slate-500">
            {riskReason}
          </p>
          {riskLimit !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[9px] text-slate-600">
                Risk Limit ›
              </span>
              <span className="font-mono text-[9px] font-black text-slate-300">
                {money(riskLimit)}
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}