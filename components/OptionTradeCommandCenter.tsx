"use client";

// ─── UI ONLY — all props, logic, handlers, and child components untouched ────

import OptionContractSelector from "./OptionContractSelector";
import OptionTradeTicket from "./OptionTradeTicket";
import PreTradeChecklist from "./PreTradeChecklist";

type TradeDirection = "CALL" | "PUT" | "NO TRADE";
type RiskStatus = "APPROVED" | "CAUTION" | "BLOCKED";
type PreTradeStatus = "READY" | "CAUTION" | "BLOCKED";

type ScannerSetup = {
  symbol?: string;
  price?: number;
  changePercent?: number;
  change_percent?: number;
  direction?: TradeDirection;
  tradeDirection?: TradeDirection;
  setupScore?: number;
  setup_score?: number;
  confidenceScore?: number;
  confidence_score?: number;
  tradeSummary?: string;
  trade_summary?: string;
};

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
  qualityGrade?: string;
  contractQualityGrade?: string;
  grade?: string;
  contract_quality?: string;
  quality_grade?: string;
  contract_quality_grade?: string;
  recommendationScore?: number;
  recommendation_score?: number;
  liquidityScore?: number;
  liquidity_score?: number;
  spreadPercent?: number;
  spread_percent?: number;
  bidAskSpreadPercent?: number;
  delta?: number | null;
};

type OptionTradeCommandCenterProps = {
  selectedSetup?: ScannerSetup | null;
  selectedSymbol?: string | null;
  stockSymbol?: string | null;
  scannerDirection?: TradeDirection | string | null;
  tradeDirection?: TradeDirection | string | null;
  selectedContract?: OptionContract | null;
  onSelectContract?: (contract: OptionContract | null) => void;
  onContractSelected?: (contract: OptionContract | null) => void;
  onClearSelectedContract?: () => void;
  accountSize?: number;
  maxRiskPercent?: number;
  maxSpreadPercent?: number;
  riskGuardStatus?: RiskStatus | string;
  riskGuardReason?: string;
  preTradeStatus?: PreTradeStatus | string;
  preTradeWarnings?: string[];
  preTradeBlocks?: string[];
  onSavePaperTrade?: () => void;
  tradeReason?: string;
  onTradeReasonChange?: (value: string) => void;
  dailyTradeCount?: number;
  dailyLossCount?: number;
  openSectorCount?: number;
  openSectorName?: string;
  marketCondition?: string;
  testingOverrideEnabled?: boolean;
  setTestingOverrideEnabled?: (enabled: boolean) => void;
  onAutoSelect?: () => void;
  autoSelectLoading?: boolean;
};

// ─── All helper functions untouched ──────────────────────────────────────────
function getNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatMoney(value: unknown) {
  const num = getNumber(value, 0);
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPercent(value: unknown) {
  const num = getNumber(value, 0);
  return `${num.toFixed(1)}%`;
}

function getContractValue(
  contract: OptionContract | null | undefined,
  keys: string[],
  fallback: any = null
) {
  if (!contract) return fallback;
  for (const key of keys) {
    const value = (contract as any)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getContractGrade(contract?: OptionContract | null) {
  const grade = getContractValue(
    contract,
    [
      "qualityGrade",
      "contractQualityGrade",
      "grade",
      "contract_quality",
      "quality_grade",
      "contract_quality_grade",
    ],
    "UNKNOWN"
  );
  return String(grade || "UNKNOWN").toUpperCase();
}

function getContractSymbol(contract?: OptionContract | null) {
  return String(getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], ""));
}

function getContractMid(contract?: OptionContract | null) {
  const bid = getNumber(getContractValue(contract, ["bid_price", "bidPrice", "bid"]), 0);
  const ask = getNumber(getContractValue(contract, ["ask_price", "askPrice", "ask"]), 0);
  return getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
}

function getContractEstimatedCost(contract?: OptionContract | null) {
  const mid = getContractMid(contract);
  const contracts = getNumber(getContractValue(contract, ["contracts"], 1), 1);
  return getNumber(getContractValue(contract, ["estimated_cost", "estimatedCost"]), mid * contracts * 100);
}

function getContractMaxRisk(contract?: OptionContract | null) {
  return getNumber(getContractValue(contract, ["max_risk", "maxRisk"]), getContractEstimatedCost(contract));
}

function computeDTE(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${expirationDate}T00:00:00`);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Visual helpers — colors only ────────────────────────────────────────────
function getRiskBar(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500";
  if (s === "CAUTION") return "bg-yellow-400";
  return "bg-red-500";
}

function getRiskRing(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "ring-emerald-500/20 border-emerald-500/25";
  if (s === "CAUTION") return "ring-yellow-500/20 border-yellow-500/25";
  return "ring-red-500/20 border-red-500/25";
}

function getRiskValueColor(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "text-emerald-300";
  if (s === "CAUTION") return "text-yellow-300";
  return "text-red-400";
}

function getRiskBg(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500/5";
  if (s === "CAUTION") return "bg-yellow-500/5";
  return "bg-red-500/5";
}

function getChecklistBar(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "READY") return "bg-emerald-500";
  if (s === "CAUTION") return "bg-yellow-400";
  return "bg-red-500";
}

function getChecklistRing(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "READY") return "ring-emerald-500/20 border-emerald-500/25";
  if (s === "CAUTION") return "ring-yellow-500/20 border-yellow-500/25";
  return "ring-red-500/20 border-red-500/25";
}

function getChecklistValueColor(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "READY") return "text-emerald-300";
  if (s === "CAUTION") return "text-yellow-300";
  return "text-red-400";
}

function getChecklistBg(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "READY") return "bg-emerald-500/5";
  if (s === "CAUTION") return "bg-yellow-500/5";
  return "bg-red-500/5";
}

function getDirectionBar(direction?: string | null) {
  const d = String(direction || "NO TRADE").toUpperCase();
  if (d === "CALL") return "bg-emerald-500";
  if (d === "PUT") return "bg-red-500";
  return "bg-slate-600";
}

function getDirectionColor(direction?: string | null) {
  const d = String(direction || "NO TRADE").toUpperCase();
  if (d === "CALL") return "text-emerald-300";
  if (d === "PUT") return "text-red-400";
  return "text-slate-400";
}

function getMarketColor(marketCondition?: string) {
  const c = String(marketCondition || "UNKNOWN").toUpperCase();
  if (c === "BULLISH") return "text-emerald-300";
  if (c === "BEARISH") return "text-red-400";
  if (c === "CHOPPY") return "text-yellow-300";
  return "text-slate-400";
}

function getGradeBar(grade?: string) {
  const g = String(grade || "UNKNOWN").toUpperCase();
  if (g === "A+" || g === "A") return "bg-emerald-500";
  if (g === "B") return "bg-blue-500";
  if (g === "C") return "bg-yellow-400";
  if (g === "BLOCKED") return "bg-red-500";
  return "bg-slate-600";
}

function getGradeColor(grade?: string) {
  const g = String(grade || "UNKNOWN").toUpperCase();
  if (g === "A+" || g === "A") return "text-emerald-300";
  if (g === "B") return "text-blue-300";
  if (g === "C") return "text-yellow-300";
  if (g === "BLOCKED") return "text-red-400";
  return "text-slate-400";
}

function getSaveButtonStyle(riskGuardStatus?: string, testingOverrideEnabled?: boolean) {
  if (testingOverrideEnabled)
    return "border-orange-500/60 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 ring-orange-500/20 shadow-orange-950/30";
  const s = String(riskGuardStatus || "").toUpperCase();
  if (s === "APPROVED")
    return "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 ring-emerald-500/20 shadow-emerald-950/30";
  if (s === "CAUTION")
    return "border-yellow-500/60 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 ring-yellow-500/20 shadow-yellow-950/30";
  return "border-slate-700/60 bg-slate-800/60 text-slate-500 ring-slate-700/20 cursor-not-allowed";
}

function getSaveBarColor(riskGuardStatus?: string, testingOverrideEnabled?: boolean) {
  if (testingOverrideEnabled) return "bg-orange-500";
  const s = String(riskGuardStatus || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500";
  if (s === "CAUTION") return "bg-yellow-400";
  return "bg-slate-600";
}

// ─── MiniStat — matches ScannerResultsPanel ───────────────────────────────────
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-xs font-black ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── SectionCard — shared terminal section wrapper ────────────────────────────
function SectionCard({
  eyebrow,
  title,
  accentBar = "bg-violet-500",
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  accentBar?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accentBar}`} />
      <div className="px-5 py-4 pl-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
              {eyebrow}
            </p>
            <p className="mt-0.5 font-mono text-sm font-black text-white">{title}</p>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}


function normalizeSelectedContractForPassThrough(contract: OptionContract | null): OptionContract | null {
  if (!contract) return null;

  const grade = getContractGrade(contract);

  return {
    ...contract,

    // Preserve contract quality across every naming style used by the app.
    // This prevents Tradier-selected contracts from reaching page.tsx as UNKNOWN.
    qualityGrade: grade,
    contractQualityGrade: grade,
    grade,
    contract_quality: grade,
    quality_grade: grade,
    contract_quality_grade: grade,
  };
}

export default function OptionTradeCommandCenter({
  selectedSetup = null,
  selectedSymbol,
  stockSymbol,
  scannerDirection,
  tradeDirection,
  selectedContract = null,
  onSelectContract,
  onContractSelected,
  onClearSelectedContract,
  accountSize = 50000,
  maxRiskPercent = 1,
  maxSpreadPercent = 20,
  riskGuardStatus = "BLOCKED",
  riskGuardReason = "No option contract selected.",
  preTradeStatus = "BLOCKED",
  preTradeWarnings = [],
  preTradeBlocks = [],
  onSavePaperTrade,
  tradeReason = "",
  onTradeReasonChange,
  dailyTradeCount = 0,
  dailyLossCount = 0,
  openSectorCount = 0,
  openSectorName = "",
  marketCondition = "UNKNOWN",
  testingOverrideEnabled = false,
  setTestingOverrideEnabled,
  onAutoSelect,
  autoSelectLoading = false,
}: OptionTradeCommandCenterProps) {

  // ─── All derived values — untouched ─────────────────────────────────────────
  const symbol = selectedSymbol || stockSymbol || selectedSetup?.symbol || "";
  const direction =
    tradeDirection || scannerDirection ||
    selectedSetup?.tradeDirection || selectedSetup?.direction || "NO TRADE";
  const setupScore = getNumber(selectedSetup?.setupScore ?? selectedSetup?.setup_score, 0);
  const confidenceScore = getNumber(selectedSetup?.confidenceScore ?? selectedSetup?.confidence_score, 0);
  const selectedContractSymbol = getContractSymbol(selectedContract);
  const selectedContractGrade = getContractGrade(selectedContract);
  const selectedContractMid = getContractMid(selectedContract);
  const selectedContractEstimatedCost = getContractEstimatedCost(selectedContract);
  const selectedContractMaxRisk = getContractMaxRisk(selectedContract);

  // ─── Discipline Checklist derived values ─────────────────────────────────────
  const clGradePass = ["A+", "A", "B"].includes(selectedContractGrade);
  const clGradeAvail = !!selectedContract;
  const rawDelta = getContractValue(selectedContract, ["delta"], null);
  const deltaAbs = rawDelta !== null && Number.isFinite(Number(rawDelta)) ? Math.abs(Number(rawDelta)) : null;
  const clDeltaPass = deltaAbs !== null && deltaAbs >= 0.20 && deltaAbs <= 0.25;
  const clDeltaAvail = !!selectedContract && deltaAbs !== null;
  const expDate = String(getContractValue(selectedContract, ["expiration_date", "expirationDate"], "") || "");
  const dte = expDate ? computeDTE(expDate) : null;
  const clDtePass = dte !== null && dte >= 30 && dte <= 45;
  const clDteAvail = !!selectedContract && dte !== null;
  const clRiskGuardPass = String(riskGuardStatus || "").toUpperCase() === "APPROVED";
  const clTradeCountPass = dailyTradeCount < 3;
  const clLossCountPass = dailyLossCount < 2;
  const clCorrelationAvail = !!symbol && !!openSectorName;
  const clCorrelationWarn = clCorrelationAvail && openSectorCount >= 2;
  const clCorrelationPass = clCorrelationAvail && openSectorCount < 2;
  const rawMaxLoss = getContractValue(selectedContract, ["max_risk", "maxRisk", "max_loss", "maxLoss"], null);
  const maxLossNum = rawMaxLoss !== null ? getNumber(rawMaxLoss, 0) : null;
  const clAllowedRisk = accountSize * (maxRiskPercent / 100);
  const clMaxLossPass = maxLossNum !== null && maxLossNum <= clAllowedRisk;
  const clMaxLossAvail = !!selectedContract && maxLossNum !== null;
  const clPassCount = [
    clGradeAvail && clGradePass,
    clDeltaPass,
    clDtePass,
    clRiskGuardPass,
    clTradeCountPass,
    clLossCountPass,
    clMaxLossAvail && clMaxLossPass,
    clCorrelationPass,
  ].filter(Boolean).length;
  const clAnyHardFail = [
    clGradeAvail && !clGradePass,
    clDeltaAvail && !clDeltaPass,
    clDteAvail && !clDtePass,
    !clRiskGuardPass,
    !clTradeCountPass,
    !clLossCountPass,
    clMaxLossAvail && !clMaxLossPass,
    // correlation is advisory — never triggers hard fail
  ].some(Boolean);

  // ─── All handlers — untouched ────────────────────────────────────────────────
  const handleContractSelected = (contract: OptionContract | null) => {
    const normalizedContract = normalizeSelectedContractForPassThrough(contract);

    if (onSelectContract) {
      onSelectContract(normalizedContract);
      return;
    }

    if (onContractSelected) {
      onContractSelected(normalizedContract);
    }
  };

  const handleClearContract = () => {
    if (onClearSelectedContract) { onClearSelectedContract(); return; }
    handleContractSelected(null);
  };

  const handleToggleTestingOverride = () => {
    if (!setTestingOverrideEnabled) {
      console.error("setTestingOverrideEnabled prop is missing.");
      return;
    }
    setTestingOverrideEnabled(!testingOverrideEnabled);
  };

  const canAttemptSave = Boolean(selectedSetup);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 text-white shadow-2xl shadow-black/60">

      {/* ── Background layers — matches suite ───────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 5% 0%, rgba(251,146,60,0.04) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(37,99,235,0.04) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #f97316 20%, #8b5cf6 60%, transparent 100%)",
        }}
      />

      <div className="relative p-5">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="mb-5">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-orange-600">
            OPTIMA-SYS · Trade Command
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Option Trade{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Center
            </span>
          </h2>
          <p className="mt-1 font-mono text-[10px] leading-5 text-slate-500">
            Select contract → verify Risk Guard → pass checklist → save paper trade.
          </p>
        </div>

        {/* ── CONTEXT STRIP — 4 mono stat cells ───────────────────────── */}
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2.5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-600" />
            <p className="pl-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">Market</p>
            <p className={`pl-1 font-mono text-xs font-black ${getMarketColor(marketCondition)}`}>
              {String(marketCondition || "UNKNOWN").toUpperCase()}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2.5">
            <div className={`absolute inset-y-0 left-0 w-[2px] ${getDirectionBar(direction)}`} />
            <p className="pl-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">Direction</p>
            <p className={`pl-1 font-mono text-xs font-black ${getDirectionColor(direction)}`}>
              {String(direction || "NO TRADE")}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2.5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-blue-500" />
            <p className="pl-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">Setup Score</p>
            <p className="pl-1 font-mono text-xs font-black text-blue-300">
              {selectedSetup ? `${setupScore} · ${confidenceScore}%` : "—"}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2.5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-slate-500" />
            <p className="pl-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">Risk / Trade</p>
            <p className="pl-1 font-mono text-xs font-black text-slate-300">
              {formatPercent(maxRiskPercent)} · {formatMoney(accountSize * (maxRiskPercent / 100))}
            </p>
          </div>
        </div>

        {/* ── NO SETUP WARNING — slim strip ───────────────────────────── */}
        {!selectedSetup && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <div className="absolute inset-y-0 left-0 w-[3px] bg-yellow-400" />
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400">
                Waiting
              </span>
              <span className="text-slate-700">›</span>
              <span className="font-mono text-[10px] text-slate-400">
                Click a scanner setup first. The option selector and ticket will activate.
              </span>
            </div>
          </div>
        )}

        {/* ── DISCIPLINE RULES CHECKLIST ──────────────────────────────── */}
        <div className="mb-5 relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/40">
          <div className={`absolute inset-y-0 left-0 w-[3px] ${clAnyHardFail ? "bg-red-500" : clPassCount === 8 ? "bg-emerald-500" : "bg-amber-400"}`} />
          <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-2.5 pl-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Discipline Rules</p>
            <span className={`font-mono text-[9px] font-bold ${clAnyHardFail ? "text-red-400" : clPassCount === 8 ? "text-emerald-400" : "text-amber-300"}`}>
              {clPassCount} / 8 PASS
            </span>
          </div>
          <div className="space-y-1.5 px-5 py-3 pl-6">
            {([
              {
                label: "Contract Grade A/B",
                pass: clGradeAvail && clGradePass,
                unavail: !clGradeAvail,
                detail: clGradeAvail
                  ? clGradePass ? `Grade ${selectedContractGrade} — acceptable` : `Grade ${selectedContractGrade} — must be A+ / A / B`
                  : "No contract selected",
              },
              {
                label: "Short Leg Delta 0.20–0.25",
                pass: clDeltaPass,
                unavail: !clDeltaAvail,
                detail: !clDeltaAvail
                  ? "Delta unavailable — spread or no contract"
                  : clDeltaPass ? `Δ ${(deltaAbs ?? 0).toFixed(2)} — within target` : `Δ ${(deltaAbs ?? 0).toFixed(2)} — outside 0.20–0.25`,
              },
              {
                label: "DTE 30–45 Days",
                pass: clDtePass,
                unavail: !clDteAvail,
                detail: !clDteAvail
                  ? "No expiration selected"
                  : clDtePass ? `${dte} DTE — within window` : `${dte} DTE — target is 30–45 days`,
              },
              {
                label: "Risk Guard APPROVED",
                pass: clRiskGuardPass,
                unavail: false,
                detail: clRiskGuardPass ? "Risk Guard cleared" : `Risk Guard is ${String(riskGuardStatus || "BLOCKED").toUpperCase()}`,
              },
              {
                label: "< 3 Trades Today",
                pass: clTradeCountPass,
                unavail: false,
                detail: clTradeCountPass ? `${dailyTradeCount} / 3 trade slots used` : `${dailyTradeCount} / 3 — daily limit reached`,
              },
              {
                label: "< 2 Losses Today",
                pass: clLossCountPass,
                unavail: false,
                detail: clLossCountPass
                  ? `${dailyLossCount} loss${dailyLossCount === 1 ? "" : "es"} today — protected`
                  : `${dailyLossCount} losses — lockout active`,
              },
              {
                label: "Max Loss Within Limit",
                pass: clMaxLossAvail && clMaxLossPass,
                unavail: !clMaxLossAvail,
                detail: !clMaxLossAvail
                  ? "No max loss data"
                  : clMaxLossPass
                    ? `$${(maxLossNum ?? 0).toFixed(0)} max loss ≤ $${clAllowedRisk.toFixed(0)} limit`
                    : `$${(maxLossNum ?? 0).toFixed(0)} exceeds $${clAllowedRisk.toFixed(0)} limit`,
              },
              {
                label: "No Sector Correlation",
                pass: clCorrelationPass,
                warn: clCorrelationWarn,
                unavail: !clCorrelationAvail,
                detail: !clCorrelationAvail
                  ? "Symbol not in a tracked sector"
                  : clCorrelationWarn
                    ? `${openSectorCount} open positions in ${openSectorName} — correlated risk`
                    : openSectorCount === 1
                      ? `1 open position in ${openSectorName}`
                      : "No correlated open positions",
              },
            ] as { label: string; pass: boolean; warn?: boolean; unavail: boolean; detail: string }[]).map((row, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className={`w-3 shrink-0 text-center font-mono text-[10px] font-black leading-none ${row.unavail ? "text-slate-600" : row.warn ? "text-amber-400" : row.pass ? "text-emerald-400" : "text-red-400"}`}>
                  {row.unavail ? "—" : row.warn ? "⚠" : row.pass ? "✓" : "✗"}
                </span>
                <span className="shrink-0 font-mono text-[9px] font-bold text-slate-300">
                  {row.label}
                </span>
                <span className={`font-mono text-[9px] ${row.unavail ? "text-slate-700" : row.warn ? "text-amber-500/80" : row.pass ? "text-slate-500" : "text-red-500/80"}`}>
                  · {row.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SAVE ACTION BANNER ────────────────────────────────────────── */}
        <div
          className={`relative mb-5 overflow-hidden rounded-xl border ring-1 shadow-lg transition-all ${getSaveButtonStyle(riskGuardStatus, testingOverrideEnabled)}`}
        >
          <div className={`absolute inset-y-0 left-0 w-[3px] ${getSaveBarColor(riskGuardStatus, testingOverrideEnabled)}`} />
          {/* Top shimmer on approved */}
          {String(riskGuardStatus || "").toUpperCase() === "APPROVED" && !testingOverrideEnabled && (
            <div
              className="absolute inset-x-0 top-0 h-px opacity-60"
              style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }}
            />
          )}
          <div className="flex flex-col gap-3 px-5 py-4 pl-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                  Paper Trade Action
                </p>
                <p className="mt-0.5 font-mono text-sm font-black text-white">
                  {selectedContract
                    ? `Contract selected · ${selectedContractSymbol || "ready"}`
                    : "No contract selected"}
                </p>
                <p className="mt-1 font-mono text-[9px] text-slate-600">
                  {testingOverrideEnabled
                    ? "Override armed — blocked trades can be saved as test entries."
                    : "Save only when Risk Guard and Pre-Trade Checklist are approved."}
                </p>
              </div>
              <button
                type="button"
                onClick={onSavePaperTrade}
                disabled={!canAttemptSave}
                className={`shrink-0 rounded-lg border px-5 py-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-40
                  ${testingOverrideEnabled
                    ? "border-orange-500/60 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25"
                    : String(riskGuardStatus || "").toUpperCase() === "APPROVED"
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : String(riskGuardStatus || "").toUpperCase() === "CAUTION"
                    ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25"
                    : "border-slate-700/60 bg-slate-800/60 text-slate-500"
                  }`}
              >
                {testingOverrideEnabled ? "Save Override Trade ›" : "Save Paper Trade ›"}
              </button>
            </div>
            <div>
              <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                Why this trade? (optional)
              </p>
              <input
                type="text"
                value={tradeReason}
                onChange={(e) => onTradeReasonChange?.(e.target.value)}
                placeholder="One sentence — the edge you saw."
                maxLength={280}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 font-mono text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-slate-500/80 focus:ring-1 focus:ring-slate-500/40"
              />
            </div>
          </div>
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4">

          {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Auto-Select Banner — only when setup is ready and no contract selected yet */}
            {symbol && direction !== "NO TRADE" && !selectedContract && (
              <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-violet-500/5 ring-1 ring-violet-500/10">
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-60"
                  style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
                />
                <div className="absolute inset-y-0 left-0 w-[3px] bg-violet-500" />
                <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-600">
                      OPTIMA-SYS · Pipeline 2
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-black text-slate-300">
                      Auto-Select Best Credit Spread
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] leading-4 text-slate-600">
                      Fetches the Tradier chain, finds the best short leg near Δ 0.225 in the 30–45 DTE window, adds a long leg 5 strikes OTM. Respects all hard blocks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onAutoSelect}
                    disabled={autoSelectLoading || !symbol || direction === "NO TRADE"}
                    className="group relative shrink-0 overflow-hidden rounded-lg border border-violet-500/40 bg-violet-500/10 px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-violet-300 transition-all hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
                    />
                    {autoSelectLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
                        Selecting…
                      </span>
                    ) : (
                      "Auto-Select ›"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Contract Selector */}
            <SectionCard
              eyebrow="OPTIMA-SYS · Mock Option Chain"
              title="Contract Selector"
              accentBar="bg-violet-500"
              action={
                selectedContract ? (
                  <button
                    type="button"
                    onClick={handleClearContract}
                    className="rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
                  >
                    Clear ×
                  </button>
                ) : undefined
              }
            >
              <OptionContractSelector
                selectedSymbol={symbol}
                stockSymbol={symbol}
                scannerDirection={direction}
                tradeDirection={direction}
                selectedContract={selectedContract}
                onSelectContract={handleContractSelected}
                onContractSelected={handleContractSelected}
                onClearSelectedContract={handleClearContract}
                accountSize={accountSize}
                maxRiskPercent={maxRiskPercent}
                maxSpreadPercent={maxSpreadPercent}
              />
            </SectionCard>

            {/* Trade Ticket */}
            <SectionCard
              eyebrow="OPTIMA-SYS · Trade Ticket"
              title="Selected Contract"
              accentBar="bg-blue-500"
            >
              <OptionTradeTicket
                selectedSymbol={symbol}
                stockSymbol={symbol}
                tradeDirection={direction}
                scannerDirection={direction}
                selectedContract={selectedContract}
                accountSize={accountSize}
                maxRiskPercent={maxRiskPercent}
                maxSpreadPercent={maxSpreadPercent}
              />
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Risk Guard */}
            <div
              className={`relative overflow-hidden rounded-xl border ring-1 ${getRiskRing(riskGuardStatus)} ${getRiskBg(riskGuardStatus)}`}
            >
              <div className={`absolute inset-y-0 left-0 w-[3px] ${getRiskBar(riskGuardStatus)}`} />
              <div className="px-5 py-4 pl-6">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                  OPTIMA-SYS · Final Risk Guard
                </p>
                <p className={`mt-1 font-mono text-3xl font-black tracking-tight ${getRiskValueColor(riskGuardStatus)}`}>
                  {String(riskGuardStatus || "BLOCKED").toUpperCase()}
                </p>
                <p className="mt-2 font-mono text-[10px] leading-5 text-slate-500">
                  {riskGuardReason || "No Risk Guard reason available."}
                </p>
              </div>
            </div>

            {/* Pre-Trade Checklist */}
            <div
              className={`relative overflow-hidden rounded-xl border ring-1 ${getChecklistRing(preTradeStatus)} ${getChecklistBg(preTradeStatus)}`}
            >
              <div className={`absolute inset-y-0 left-0 w-[3px] ${getChecklistBar(preTradeStatus)}`} />
              <div className="px-5 py-4 pl-6">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                  OPTIMA-SYS · Pre-Trade Checklist
                </p>
                <p className={`mt-1 font-mono text-3xl font-black tracking-tight ${getChecklistValueColor(preTradeStatus)}`}>
                  {String(preTradeStatus || "BLOCKED").toUpperCase()}
                </p>

                {/* Blocks — slim red strips */}
                {preTradeBlocks.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-red-600">
                      Blocks
                    </p>
                    {preTradeBlocks.map((block, i) => (
                      <div
                        key={`block-${i}`}
                        className="relative overflow-hidden rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5"
                      >
                        <div className="absolute inset-y-0 left-0 w-[2px] bg-red-500" />
                        <span className="pl-1 font-mono text-[9px] text-red-400">› {block}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings — slim amber strips */}
                {preTradeWarnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-yellow-600">
                      Warnings
                    </p>
                    {preTradeWarnings.map((warning, i) => (
                      <div
                        key={`warning-${i}`}
                        className="relative overflow-hidden rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5"
                      >
                        <div className="absolute inset-y-0 left-0 w-[2px] bg-yellow-400" />
                        <span className="pl-1 font-mono text-[9px] text-yellow-400">› {warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Testing Override — danger zone */}
            <div
              className={`relative overflow-hidden rounded-xl border ring-1 transition-all ${
                testingOverrideEnabled
                  ? "border-orange-500/40 bg-orange-500/5 ring-orange-500/20"
                  : "border-slate-700/60 bg-slate-900/60 ring-slate-700/10"
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 w-[3px] transition-all ${
                  testingOverrideEnabled ? "bg-orange-500" : "bg-slate-700"
                }`}
              />
              {/* Armed top glow */}
              {testingOverrideEnabled && (
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-60"
                  style={{ background: "linear-gradient(90deg, transparent, #f97316, transparent)" }}
                />
              )}
              <div className="px-5 py-4 pl-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                      OPTIMA-SYS · Safety Override
                    </p>
                    <p className={`mt-0.5 font-mono text-sm font-black ${testingOverrideEnabled ? "text-orange-300" : "text-slate-300"}`}>
                      Testing Override
                    </p>
                    <p className="mt-1 font-mono text-[9px] leading-4 text-slate-600">
                      Only for blocked trade audit and test data. All override trades are tracked separately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleTestingOverride}
                    className={`shrink-0 rounded-lg border px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-all ${
                      testingOverrideEnabled
                        ? "border-orange-500/60 bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
                        : "border-slate-700/80 bg-slate-900/80 text-slate-500 hover:border-orange-500/30 hover:text-orange-400"
                    }`}
                  >
                    {testingOverrideEnabled ? "Armed · ON" : "Off · Arm"}
                  </button>
                </div>

                {/* Override state strip */}
                <div
                  className={`rounded-lg border px-3 py-2 ${
                    testingOverrideEnabled
                      ? "border-orange-500/25 bg-orange-500/8"
                      : "border-slate-800 bg-black/20"
                  }`}
                >
                  <p className={`font-mono text-[9px] leading-5 ${testingOverrideEnabled ? "text-orange-400" : "text-slate-600"}`}>
                    {testingOverrideEnabled
                      ? "Override armed. Blocked trades save as manual_override_test and are fully audited."
                      : "Override off. Blocked contracts remain blocked by the pre-trade checklist."}
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Summary */}
            <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
              <div className={`absolute inset-y-0 left-0 w-[3px] ${selectedContract ? getGradeBar(selectedContractGrade) : "bg-slate-700"}`} />
              <div className="px-5 py-4 pl-6">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
                  OPTIMA-SYS · Contract Summary
                </p>
                <p className="mt-0.5 font-mono text-sm font-black text-white">
                  {selectedContractSymbol || "No contract selected"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <MiniStat
                    label="Grade"
                    value={selectedContract ? selectedContractGrade : "—"}
                    valueClass={selectedContract ? getGradeColor(selectedContractGrade) : "text-slate-600"}
                  />
                  <MiniStat
                    label="Mid"
                    value={selectedContract ? formatMoney(selectedContractMid) : "—"}
                  />
                  <MiniStat
                    label="Est. Cost"
                    value={selectedContract ? formatMoney(selectedContractEstimatedCost) : "—"}
                  />
                  <MiniStat
                    label="Max Risk"
                    value={selectedContract ? formatMoney(selectedContractMaxRisk) : "—"}
                    valueClass={selectedContract ? "text-red-400" : "text-slate-600"}
                  />
                </div>

                {/* Grade badge — only when contract selected */}
                {selectedContract && (
                  <div
                    className={`relative mt-3 overflow-hidden rounded-lg border px-3 py-2 ${
                      getContractGrade(selectedContract) === "A+" || getContractGrade(selectedContract) === "A"
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : getContractGrade(selectedContract) === "B"
                        ? "border-blue-500/25 bg-blue-500/5"
                        : getContractGrade(selectedContract) === "C"
                        ? "border-yellow-500/25 bg-yellow-500/5"
                        : "border-red-500/25 bg-red-500/5"
                    }`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-[2px] ${getGradeBar(selectedContractGrade)}`} />
                    <span className={`pl-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${getGradeColor(selectedContractGrade)}`}>
                      Contract Grade · {selectedContractGrade}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── PRE-TRADE CHECKLIST COMPONENT ────────────────────────────── */}
        <div className="mt-4">
          <SectionCard
            eyebrow="OPTIMA-SYS · Pre-Trade Enforcement"
            title="Pre-Trade Checklist"
            accentBar={
              String(preTradeStatus || "").toUpperCase() === "READY"
                ? "bg-emerald-500"
                : String(preTradeStatus || "").toUpperCase() === "CAUTION"
                ? "bg-yellow-400"
                : "bg-red-500"
            }
          >
            <PreTradeChecklist
              selectedSymbol={symbol}
              tradeDirection={direction}
              selectedContract={selectedContract}
              riskGuardStatus={riskGuardStatus}
              riskGuardReason={riskGuardReason}
              status={preTradeStatus}
              warnings={preTradeWarnings}
              blocks={preTradeBlocks}
              marketCondition={marketCondition}
            />
          </SectionCard>
        </div>
      </div>

      {/* Bottom neon edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-px opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, #f97316, #8b5cf6, transparent)" }}
      />
    </div>
  );
}