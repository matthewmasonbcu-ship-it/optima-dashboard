"use client";

import { useEffect, useState } from "react";

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
};

function money(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function num(value: number | null | undefined, fallback = "—") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toFixed(2);
}

function getContractSymbol(contract: OptionContractLike | null) {
  return contract?.stock_symbol || contract?.stockSymbol || contract?.symbol || "";
}

function getContractDirection(contract: OptionContractLike | null) {
  return (
    contract?.trade_direction ||
    contract?.tradeDirection ||
    contract?.direction ||
    "NO TRADE"
  );
}

function getOptionSymbol(contract: OptionContractLike | null) {
  return contract?.option_symbol || contract?.optionSymbol || "";
}

function getExpiration(contract: OptionContractLike | null) {
  return contract?.expiration_date || contract?.expirationDate || "";
}

function getStrike(contract: OptionContractLike | null) {
  return contract?.strike_price ?? contract?.strikePrice ?? null;
}

function getBid(contract: OptionContractLike | null) {
  return contract?.bid_price ?? contract?.bidPrice ?? null;
}

function getAsk(contract: OptionContractLike | null) {
  return contract?.ask_price ?? contract?.askPrice ?? null;
}

function getMid(contract: OptionContractLike | null) {
  return contract?.mid_price ?? contract?.midPrice ?? null;
}

function getEstimatedCost(contract: OptionContractLike | null) {
  return contract?.estimated_cost ?? contract?.estimatedCost ?? null;
}

function getMaxRisk(contract: OptionContractLike | null) {
  return contract?.max_risk ?? contract?.maxRisk ?? null;
}

function getSetupSymbol(setup: ScannerSetupLike | null) {
  return setup?.symbol || setup?.stock_symbol || setup?.stockSymbol || "";
}

function getSetupDirection(setup: ScannerSetupLike | null) {
  return setup?.tradeDirection || setup?.trade_direction || setup?.direction || "";
}

function getSetupPrice(setup: ScannerSetupLike | null) {
  return setup?.price ?? setup?.currentPrice ?? setup?.current_price ?? null;
}

function getSetupEntry(setup: ScannerSetupLike | null) {
  return setup?.entry ?? setup?.entry_price ?? null;
}

function getSetupStop(setup: ScannerSetupLike | null) {
  return setup?.stopLoss ?? setup?.stop_loss ?? null;
}

function getSetupTarget(setup: ScannerSetupLike | null) {
  return setup?.target ?? setup?.target_price ?? null;
}

function getSetupScore(setup: ScannerSetupLike | null) {
  return (
    setup?.score ??
    setup?.setupScore ??
    setup?.setup_score ??
    setup?.confidenceScore ??
    setup?.confidence_score ??
    null
  );
}

function getRiskStatus(risk: RiskCheckLike | null) {
  return risk?.status || "WAITING";
}

function getRiskReason(risk: RiskCheckLike | null) {
  return risk?.reason || "Select or build an option contract to run Risk Guard.";
}

function getRiskLimit(risk: RiskCheckLike | null) {
  return (
    risk?.maxAllowedRisk ??
    risk?.max_allowed_risk ??
    risk?.riskLimit ??
    risk?.risk_limit ??
    null
  );
}

function statusClass(status: string) {
  const upper = status.toUpperCase();

  if (upper === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (upper === "CAUTION") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (upper === "BLOCKED") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-800/70 text-slate-300";
}

function directionClass(direction: string) {
  const upper = direction.toUpperCase();

  if (upper.includes("CALL") || upper.includes("BULL")) {
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  }

  if (upper.includes("PUT") || upper.includes("BEAR")) {
    return "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";
  }

  return "bg-slate-700/50 text-slate-300 ring-1 ring-slate-600";
}

function calculateSpreadPercent(
  bid: number | null,
  ask: number | null,
  mid: number | null
) {
  if (typeof bid !== "number" || typeof ask !== "number" || typeof mid !== "number") {
    return null;
  }

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

  const upper = direction.toUpperCase();

  if (upper.includes("CALL")) return Number((strike + mid).toFixed(2));
  if (upper.includes("PUT")) return Number((strike - mid).toFixed(2));

  return null;
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

  onSavePaperTrade,
  onSave,
  savePaperTrade,

  onClearContract,
  setSelectedOptionContract,
  setSelectedContract,

  isSaving = false,
  loading = false,
  disabled = false,

  saveMessage,
  message,
}: OptionTradeTicketProps) {
  const propContract = selectedOptionContract || selectedContract || optionContract || null;

  const [broadcastContract, setBroadcastContract] =
    useState<OptionContractLike | null>(null);

  const [contractWasCleared, setContractWasCleared] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("selectedOptionContract");

      if (stored) {
        setBroadcastContract(JSON.parse(stored));
        setContractWasCleared(false);
      }
    } catch (error) {
      console.error("Could not load stored option contract:", error);
    }

    function handleContractSelected(event: Event) {
      const customEvent = event as CustomEvent<OptionContractLike>;
      setContractWasCleared(false);
      setBroadcastContract(customEvent.detail);
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

  const contract = contractWasCleared ? null : propContract || broadcastContract;

  const scanSetup = selectedSetup || setup || selectedScanResult || null;
  const risk = contractWasCleared ? null : optionRiskCheck || riskCheck || riskGuardResult || null;

  const contractSymbol = getContractSymbol(contract);
  const setupSymbol = getSetupSymbol(scanSetup);
  const symbol = contractSymbol || setupSymbol || "—";

  const contractDirection = getContractDirection(contract);
  const setupDirection = getSetupDirection(scanSetup);
  const direction =
    contractDirection !== "NO TRADE"
      ? contractDirection
      : setupDirection || "NO TRADE";

  const optionSymbol = getOptionSymbol(contract);
  const expiration = getExpiration(contract);
  const strike = getStrike(contract);
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);
  const contracts = contract ? contract.contracts ?? 1 : null;
  const estimatedCost = getEstimatedCost(contract);
  const maxRisk = getMaxRisk(contract);

  const spreadPercent = calculateSpreadPercent(bid, ask, mid);
  const spreadDollars =
    typeof bid === "number" && typeof ask === "number"
      ? Number((ask - bid).toFixed(2))
      : null;

  const breakeven = calculateBreakeven({
    direction,
    strike,
    mid,
  });

  const setupPrice = getSetupPrice(scanSetup);
  const setupEntry = getSetupEntry(scanSetup);
  const setupStop = getSetupStop(scanSetup);
  const setupTarget = getSetupTarget(scanSetup);
  const setupScore = getSetupScore(scanSetup);

  const riskStatus = getRiskStatus(risk);
  const riskReason = getRiskReason(risk);
  const riskLimit = getRiskLimit(risk);

  const hasContract = Boolean(contract);
  const blocked = riskStatus.toUpperCase() === "BLOCKED";
  const waiting = riskStatus.toUpperCase() === "WAITING";
  const saving = isSaving || loading;

  const canSave =
    !disabled &&
    !saving &&
    hasContract &&
    !blocked &&
    !waiting &&
    Boolean(onSavePaperTrade || onSave || savePaperTrade);

  function handleSave() {
    if (!canSave) return;

    if (onSavePaperTrade) {
      onSavePaperTrade();
      return;
    }

    if (onSave) {
      onSave();
      return;
    }

    if (savePaperTrade) {
      savePaperTrade();
    }
  }

  function handleClearContract() {
    setContractWasCleared(true);
    setBroadcastContract(null);

    try {
      window.localStorage.removeItem("selectedOptionContract");
      window.dispatchEvent(new CustomEvent("option-contract-cleared"));
    } catch (error) {
      console.error("Could not clear selected option contract:", error);
    }

    setSelectedOptionContract?.(null);
    setSelectedContract?.(null);
    onClearContract?.();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Option Trade Ticket
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${directionClass(direction)}`}>
              {direction}
            </span>

            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(riskStatus)}`}>
              {riskStatus}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Final review before saving the paper option trade.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Estimated Cost
            </p>
            <p className="text-xl font-bold text-white">{money(estimatedCost)}</p>
          </div>

          {hasContract && (
            <button
              type="button"
              onClick={handleClearContract}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            >
              Clear Selected Contract
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Selected Option
                </p>
                <p className="mt-1 text-lg font-black text-white md:text-2xl">
                  {optionSymbol || "No option contract selected"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {hasContract
                    ? `${symbol} • ${direction} • Exp ${expiration || "—"}`
                    : "Build/select an option contract first."}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  hasContract
                    ? directionClass(direction)
                    : "bg-slate-700/50 text-slate-300 ring-1 ring-slate-600"
                }`}
              >
                {hasContract ? direction : "WAITING"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Strike</p>
                <p className="mt-2 text-xl font-black text-white">{money(strike)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Bid</p>
                <p className="mt-2 text-xl font-black text-white">{money(bid)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Ask</p>
                <p className="mt-2 text-xl font-black text-white">{money(ask)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Entry Mid</p>
                <p className="mt-2 text-xl font-black text-emerald-300">{money(mid)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Contracts</p>
                <p className="mt-2 text-xl font-black text-white">
                  {contracts ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Spread</p>
                <p className="mt-2 text-xl font-black text-emerald-300">
                  {spreadDollars !== null ? money(spreadDollars) : "—"}
                  {spreadPercent !== null ? ` / ${spreadPercent}%` : ""}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Estimated Cost</p>
                <p className="mt-2 text-xl font-black text-white">{money(estimatedCost)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Max Risk</p>
                <p className="mt-2 text-xl font-black text-red-300">{money(maxRisk)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Risk / Contract</p>
                <p className="mt-2 text-xl font-black text-yellow-300">
                  {typeof maxRisk === "number" && typeof contracts === "number" && contracts > 0
                    ? money(maxRisk / contracts)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                    Breakeven Estimate
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {money(breakeven)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {direction.toUpperCase().includes("PUT")
                      ? "For a PUT, breakeven is strike price minus entry premium."
                      : direction.toUpperCase().includes("CALL")
                        ? "For a CALL, breakeven is strike price plus entry premium."
                        : "Breakeven will calculate after contract direction is selected."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-4">
                  <p className="text-xs text-slate-500">Formula</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {direction.toUpperCase().includes("PUT")
                      ? "Strike - Mid"
                      : direction.toUpperCase().includes("CALL")
                        ? "Strike + Mid"
                        : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Scanner Setup Snapshot
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-500">Stock Price</p>
                <p className="mt-1 text-sm font-bold text-white">{money(setupPrice)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-500">Entry</p>
                <p className="mt-1 text-sm font-bold text-white">{money(setupEntry)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-500">Stop</p>
                <p className="mt-1 text-sm font-bold text-white">{money(setupStop)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-500">Target</p>
                <p className="mt-1 text-sm font-bold text-white">{money(setupTarget)}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-500">Score</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {setupScore !== null ? num(setupScore) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5">
          <div className={`rounded-2xl border p-4 ${statusClass(riskStatus)}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              Final Risk Guard Status
            </p>

            <p className="mt-2 text-3xl font-black">{riskStatus}</p>

            <p className="mt-3 text-sm leading-relaxed opacity-90">
              {riskReason}
            </p>

            <div className="mt-4 rounded-xl border border-current/20 bg-black/10 p-3">
              <p className="text-xs font-bold uppercase opacity-80">Risk Limit</p>
              <p className="mt-1 text-xl font-black">{money(riskLimit)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Order Summary
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Ticker</span>
                <span className="font-bold text-white">{symbol}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Direction</span>
                <span className="font-bold text-white">{direction}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Contracts</span>
                <span className="font-bold text-white">{contracts ?? "—"}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Entry Mid</span>
                <span className="font-bold text-white">{money(mid)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Estimated Cost</span>
                <span className="font-bold text-white">{money(estimatedCost)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
                <span className="text-slate-400">Max Loss</span>
                <span className="font-black text-white">{money(maxRisk)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black transition ${
                canSave
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "cursor-not-allowed bg-slate-800 text-slate-500"
              }`}
            >
              {saving
                ? "Saving Trade..."
                : blocked
                  ? "Trade Blocked by Risk Guard"
                  : waiting
                    ? "Select Contract First"
                    : hasContract
                      ? "Save Paper Trade"
                      : "No Contract Selected"}
            </button>

            {hasContract && (
              <button
                type="button"
                onClick={handleClearContract}
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
              >
                Clear Selected Contract
              </button>
            )}

            {(saveMessage || message) && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-sm text-slate-300">{saveMessage || message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}