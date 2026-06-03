"use client";

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
  quality_grade?: string;
  contract_quality_grade?: string;

  recommendationScore?: number;
  recommendation_score?: number;

  liquidityScore?: number;
  liquidity_score?: number;

  spreadPercent?: number;
  spread_percent?: number;
  bidAskSpreadPercent?: number;
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

  marketCondition?: string;

  testingOverrideEnabled?: boolean;
  setTestingOverrideEnabled?: (enabled: boolean) => void;
};

function getNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatMoney(value: unknown) {
  const num = getNumber(value, 0);

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
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

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
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
      "quality_grade",
      "contract_quality_grade",
    ],
    "UNKNOWN"
  );

  return String(grade || "UNKNOWN").toUpperCase();
}

function getContractSymbol(contract?: OptionContract | null) {
  return String(
    getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], "")
  );
}

function getContractMid(contract?: OptionContract | null) {
  const bid = getNumber(
    getContractValue(contract, ["bid_price", "bidPrice", "bid"]),
    0
  );

  const ask = getNumber(
    getContractValue(contract, ["ask_price", "askPrice", "ask"]),
    0
  );

  return getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
}

function getContractEstimatedCost(contract?: OptionContract | null) {
  const mid = getContractMid(contract);
  const contracts = getNumber(getContractValue(contract, ["contracts"], 1), 1);

  return getNumber(
    getContractValue(contract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );
}

function getContractMaxRisk(contract?: OptionContract | null) {
  return getNumber(
    getContractValue(contract, ["max_risk", "maxRisk"]),
    getContractEstimatedCost(contract)
  );
}

function getRiskClass(status?: string) {
  const clean = String(status || "").toUpperCase();

  if (clean === "APPROVED") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (clean === "CAUTION") {
    return "border-yellow-400/50 bg-yellow-500/10 text-yellow-300";
  }

  if (clean === "BLOCKED") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function getChecklistClass(status?: string) {
  const clean = String(status || "").toUpperCase();

  if (clean === "READY") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (clean === "CAUTION") {
    return "border-yellow-400/50 bg-yellow-500/10 text-yellow-300";
  }

  if (clean === "BLOCKED") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function getDirectionClass(direction?: string | null) {
  const clean = String(direction || "NO TRADE").toUpperCase();

  if (clean === "CALL") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (clean === "PUT") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function getGradeClass(grade?: string) {
  const clean = String(grade || "UNKNOWN").toUpperCase();

  if (clean === "A+" || clean === "A") {
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-300";
  }

  if (clean === "B") {
    return "border-blue-400/50 bg-blue-500/10 text-blue-300";
  }

  if (clean === "C") {
    return "border-yellow-400/50 bg-yellow-500/10 text-yellow-300";
  }

  if (clean === "BLOCKED") {
    return "border-red-400/50 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function getMarketClass(marketCondition?: string) {
  const clean = String(marketCondition || "UNKNOWN").toUpperCase();

  if (clean === "BULLISH") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  }

  if (clean === "BEARISH") {
    return "border-red-400/40 bg-red-500/10 text-red-300";
  }

  if (clean === "CHOPPY") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function SummaryPill({
  label,
  value,
  className = "border-slate-700 bg-slate-900 text-slate-300",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${className}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-100">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
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

  accountSize = 10000,
  maxRiskPercent = 1,
  maxSpreadPercent = 20,

  riskGuardStatus = "BLOCKED",
  riskGuardReason = "No option contract selected.",

  preTradeStatus = "BLOCKED",
  preTradeWarnings = [],
  preTradeBlocks = [],

  onSavePaperTrade,

  marketCondition = "UNKNOWN",

  testingOverrideEnabled = false,
  setTestingOverrideEnabled,
}: OptionTradeCommandCenterProps) {
  const symbol = selectedSymbol || stockSymbol || selectedSetup?.symbol || "";

  const direction =
    tradeDirection ||
    scannerDirection ||
    selectedSetup?.tradeDirection ||
    selectedSetup?.direction ||
    "NO TRADE";

  const setupScore = getNumber(
    selectedSetup?.setupScore ?? selectedSetup?.setup_score,
    0
  );

  const confidenceScore = getNumber(
    selectedSetup?.confidenceScore ?? selectedSetup?.confidence_score,
    0
  );

  const selectedContractSymbol = getContractSymbol(selectedContract);
  const selectedContractGrade = getContractGrade(selectedContract);
  const selectedContractMid = getContractMid(selectedContract);
  const selectedContractEstimatedCost =
    getContractEstimatedCost(selectedContract);
  const selectedContractMaxRisk = getContractMaxRisk(selectedContract);

  const handleContractSelected = (contract: OptionContract | null) => {
    if (onSelectContract) {
      onSelectContract(contract);
      return;
    }

    if (onContractSelected) {
      onContractSelected(contract);
    }
  };

  const handleClearContract = () => {
    if (onClearSelectedContract) {
      onClearSelectedContract();
      return;
    }

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
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5 text-white shadow-xl shadow-black/30 backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
            Trade Command
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Option Trade Center
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Select the contract, verify Risk Guard, pass the checklist, then save the paper trade.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SummaryPill
            label="Market"
            value={String(marketCondition || "UNKNOWN").toUpperCase()}
            className={getMarketClass(marketCondition)}
          />

          <SummaryPill
            label="Direction"
            value={String(direction || "NO TRADE")}
            className={getDirectionClass(direction)}
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailCard
          label="Selected Symbol"
          value={symbol || "None"}
          subtext={symbol ? "Scanner setup loaded" : "Select a scanner setup"}
        />

        <DetailCard
          label="Setup Score"
          value={selectedSetup ? `${setupScore}` : "-"}
          subtext={selectedSetup ? `Confidence ${confidenceScore}%` : "Waiting"}
        />

        <DetailCard
          label="Risk / Trade"
          value={`${formatPercent(maxRiskPercent)}`}
          subtext={`${formatMoney(accountSize * (maxRiskPercent / 100))} max`}
        />

        <DetailCard
          label="Max Spread"
          value={`${formatPercent(maxSpreadPercent)}`}
          subtext="Bid/ask spread filter"
        />
      </div>

      <div className="mb-5 rounded-3xl border border-slate-800 bg-black/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Paper Trade Action
            </div>

            <div className="mt-1 text-lg font-black text-slate-100">
              {selectedContract ? "Contract selected" : "No contract selected"}
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Save button is here so it stays easy to find after selecting a contract.
            </p>
          </div>

          <button
            type="button"
            onClick={onSavePaperTrade}
            disabled={!canAttemptSave}
            className={`rounded-3xl px-6 py-4 text-base font-black shadow-xl transition ${
              testingOverrideEnabled
                ? "bg-orange-500 text-white shadow-orange-950/30 hover:bg-orange-400"
                : riskGuardStatus === "APPROVED"
                ? "bg-emerald-400 text-slate-950 shadow-emerald-950/30 hover:bg-emerald-300"
                : riskGuardStatus === "CAUTION"
                ? "bg-yellow-400 text-slate-950 shadow-yellow-950/30 hover:bg-yellow-300"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {testingOverrideEnabled
              ? "Save Testing Override Trade"
              : "Save Paper Trade"}
          </button>
        </div>
      </div>

      {!selectedSetup && (
        <div className="mb-5 rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-yellow-100">
          <div className="font-black">No scanner setup selected yet</div>
          <p className="mt-1 text-sm text-yellow-200">
            Click a scanner card first. Then the option selector and ticket will become useful.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Contract Selector
                </div>
                <div className="mt-1 text-lg font-black text-slate-100">
                  Mock Option Chain
                </div>
              </div>

              {selectedContract && (
                <button
                  type="button"
                  onClick={handleClearContract}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800"
                >
                  Clear
                </button>
              )}
            </div>

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
          </div>

          <div className="rounded-3xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Trade Ticket
              </div>
              <div className="mt-1 text-lg font-black text-slate-100">
                Selected Contract
              </div>
            </div>

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
          </div>
        </div>

        <div className="space-y-5">
          <div className={`rounded-3xl border p-4 ${getRiskClass(riskGuardStatus)}`}>
            <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
              Final Risk Guard
            </div>

            <div className="mt-2 text-3xl font-black">
              {String(riskGuardStatus || "BLOCKED").toUpperCase()}
            </div>

            <p className="mt-2 text-sm opacity-90">
              {riskGuardReason || "No Risk Guard reason available."}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 ${getChecklistClass(preTradeStatus)}`}>
            <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
              Pre-Trade Checklist
            </div>

            <div className="mt-2 text-3xl font-black">
              {String(preTradeStatus || "BLOCKED").toUpperCase()}
            </div>

            {preTradeBlocks.length > 0 && (
              <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-950/30 p-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-red-200">
                  Blocks
                </div>
                <ul className="mt-2 space-y-1 text-sm text-red-100">
                  {preTradeBlocks.map((block, index) => (
                    <li key={`block-${index}`}>• {block}</li>
                  ))}
                </ul>
              </div>
            )}

            {preTradeWarnings.length > 0 && (
              <div className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-950/30 p-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
                  Warnings
                </div>
                <ul className="mt-2 space-y-1 text-sm text-yellow-100">
                  {preTradeWarnings.map((warning, index) => (
                    <li key={`warning-${index}`}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Testing Override
                </div>

                <div className="mt-1 text-lg font-black text-slate-100">
                  Safety Override
                </div>

                <p className="mt-1 text-sm text-slate-400">
                  Only use this to save blocked contracts as manual override tests.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleTestingOverride}
                className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
                  testingOverrideEnabled
                    ? "border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-950/30"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-200"
                }`}
              >
                {testingOverrideEnabled
                  ? "Testing Override: ON"
                  : "Testing Override: OFF"}
              </button>
            </div>

            {testingOverrideEnabled ? (
              <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-3 text-sm text-orange-100">
                Override is ON. Blocked trades can be saved, but they will be marked as{" "}
                <span className="font-black">manual_override_test</span> and tracked separately.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-400">
                Override is OFF. BLOCKED contracts should stay blocked by the checklist.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Selected Contract Summary
              </div>

              <div className="mt-1 text-lg font-black text-slate-100">
                {selectedContractSymbol || "No contract selected"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <DetailCard
                label="Grade"
                value={selectedContract ? selectedContractGrade : "-"}
                subtext={selectedContract ? "Contract quality" : undefined}
              />

              <DetailCard
                label="Mid"
                value={selectedContract ? formatMoney(selectedContractMid) : "-"}
              />

              <DetailCard
                label="Est. Cost"
                value={
                  selectedContract
                    ? formatMoney(selectedContractEstimatedCost)
                    : "-"
                }
              />

              <DetailCard
                label="Max Risk"
                value={
                  selectedContract ? formatMoney(selectedContractMaxRisk) : "-"
                }
              />
            </div>

            {selectedContract && (
              <div
                className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-black ${getGradeClass(
                  selectedContractGrade
                )}`}
              >
                Contract Grade: {selectedContractGrade}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PreTradeChecklist
          selectedSetup={selectedSetup}
          selectedSymbol={symbol}
          stockSymbol={symbol}
          tradeDirection={direction}
          scannerDirection={direction}
          selectedContract={selectedContract}
          riskGuardStatus={riskGuardStatus}
          riskGuardReason={riskGuardReason}
          preTradeStatus={preTradeStatus}
          preTradeWarnings={preTradeWarnings}
          preTradeBlocks={preTradeBlocks}
          marketCondition={marketCondition}
        />
      </div>
    </div>
  );
}