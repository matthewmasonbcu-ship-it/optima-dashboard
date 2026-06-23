"use client";

type ChecklistStatus = "READY" | "CAUTION" | "BLOCKED" | string;

type TradeDirection = "CALL" | "PUT" | "NO TRADE" | string;

type OptionContract = {
  option_symbol?: string;
  optionSymbol?: string;
  symbol?: string;

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

  max_risk?: number;
  maxRisk?: number;

  estimated_cost?: number;
  estimatedCost?: number;

  spreadPercent?: number;
  spread_percent?: number;
  bidAskSpreadPercent?: number;

  qualityGrade?: string;
  contractQualityGrade?: string;
  grade?: string;
};

type PreTradeChecklistProps = {
  status?: ChecklistStatus;
  warnings?: string[];
  blocks?: string[];

  selectedSymbol?: string;
  tradeDirection?: TradeDirection;
  selectedContract?: OptionContract | null;

  riskGuardStatus?: string;
  riskGuardReason?: string;

  marketCondition?: string;

  maxSpreadPercent?: number;
  accountSize?: number;
  maxRiskPercent?: number;
};

function getNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function getContractGrade(contract: OptionContract | null | undefined) {
  return String(
    getContractValue(
      contract,
      ["qualityGrade", "contractQualityGrade", "grade"],
      ""
    )
  ).toUpperCase();
}

function getStatusClass(status: ChecklistStatus) {
  if (status === "READY") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "CAUTION") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "BLOCKED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

function getDotClass(pass: boolean, warning = false) {
  if (pass) return "text-emerald-300";
  if (warning) return "text-yellow-300";
  return "text-red-300";
}

function ChecklistLine({
  pass,
  warning = false,
  title,
  detail,
}: {
  pass: boolean;
  warning?: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-start gap-2">
        <span className={`text-sm font-bold ${getDotClass(pass, warning)}`}>
          {pass ? "✅" : warning ? "⚠️" : "⛔"}
        </span>

        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function PreTradeChecklist({
  status = "BLOCKED",
  warnings = [],
  blocks = [],

  selectedSymbol = "",
  tradeDirection = "NO TRADE",
  selectedContract = null,

  riskGuardStatus = "WAITING",
  riskGuardReason = "Select a contract to run Risk Guard.",

  marketCondition = "UNKNOWN",

  maxSpreadPercent = 20,
  accountSize = 50000,
  maxRiskPercent = 1,
}: PreTradeChecklistProps) {
  const contractSymbol = getContractValue(
    selectedContract,
    ["option_symbol", "optionSymbol", "symbol"],
    ""
  );

  const expirationDate = getContractValue(
    selectedContract,
    ["expiration_date", "expirationDate"],
    ""
  );

  const strikePrice = getNumber(
    getContractValue(selectedContract, ["strike_price", "strikePrice"]),
    0
  );

  const bid = getNumber(
    getContractValue(selectedContract, ["bid_price", "bidPrice", "bid"]),
    0
  );

  const ask = getNumber(
    getContractValue(selectedContract, ["ask_price", "askPrice", "ask"]),
    0
  );

  const mid = getNumber(
    getContractValue(selectedContract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );

  const maxRisk = getNumber(
    getContractValue(selectedContract, ["max_risk", "maxRisk"]),
    mid > 0 ? mid * 100 : 0
  );

  const allowedRisk = accountSize * (maxRiskPercent / 100);

  const spreadPercent = getNumber(
    getContractValue(
      selectedContract,
      ["spreadPercent", "spread_percent", "bidAskSpreadPercent"],
      bid > 0 && ask > 0 && mid > 0 ? ((ask - bid) / mid) * 100 : 0
    ),
    0
  );

  const grade = getContractGrade(selectedContract);

  const hasScannerSetup = Boolean(selectedSymbol);
  const hasValidDirection = tradeDirection === "CALL" || tradeDirection === "PUT";
  const hasContract = Boolean(selectedContract && contractSymbol);
  const riskApproved = riskGuardStatus === "APPROVED" || riskGuardStatus === "CAUTION";
  const hasGrade = Boolean(grade && grade !== "N/A");
  const gradeAllowed = grade === "A+" || grade === "A" || grade === "B";
  const spreadOk = spreadPercent <= maxSpreadPercent;
  const riskSizeOk = maxRisk > 0 && maxRisk <= allowedRisk;
  const detailsComplete =
    Boolean(expirationDate) &&
    strikePrice > 0 &&
    bid > 0 &&
    ask > 0 &&
    mid > 0;

  const marketOk =
    marketCondition === "BULLISH" ||
    marketCondition === "BEARISH" ||
    marketCondition === "CHOPPY";

  const displayStatus =
    status === "READY" || status === "CAUTION" || status === "BLOCKED"
      ? status
      : "BLOCKED";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-blue-400">
            Pre-Trade Checklist
          </p>

          <h3 className="mt-1 text-lg font-bold text-white">
            Discipline check before saving
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            This makes sure the selected setup, contract, Risk Guard, and trade
            details are valid before saving.
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-2 text-sm font-bold ${getStatusClass(
            displayStatus
          )}`}
        >
          {displayStatus}
        </div>
      </div>

      {(blocks.length > 0 || warnings.length > 0) && (
        <div className="mb-4 space-y-2">
          {blocks.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Blocking Reasons
              </p>

              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-100">
                {blocks.map((block, index) => (
                  <li key={`block-${index}`}>{block}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                Warnings
              </p>

              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-100">
                {warnings.map((warning, index) => (
                  <li key={`warning-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChecklistLine
          pass={hasScannerSetup}
          title="Scanner setup selected"
          detail={
            hasScannerSetup
              ? `${selectedSymbol} setup is selected.`
              : "No scanner setup selected yet."
          }
        />

        <ChecklistLine
          pass={hasValidDirection}
          title="Trade direction valid"
          detail={
            hasValidDirection
              ? `Direction is ${tradeDirection}.`
              : "Direction is NO TRADE."
          }
        />

        <ChecklistLine
          pass={hasContract}
          title="Option contract selected"
          detail={
            hasContract
              ? `${contractSymbol} selected.`
              : "No option contract selected yet."
          }
        />

        <ChecklistLine
          pass={riskApproved}
          title="Risk Guard check"
          detail={
            riskApproved
              ? riskGuardReason || `Risk Guard is ${riskGuardStatus}.`
              : riskGuardReason || "Risk Guard is not approved yet."
          }
        />

        <ChecklistLine
          pass={hasGrade && gradeAllowed}
          warning={hasGrade && grade === "C"}
          title="Contract grade"
          detail={
            hasGrade
              ? `Contract grade is ${grade}.`
              : "No contract grade found."
          }
        />

        <ChecklistLine
          pass={spreadOk}
          title="Spread check"
          detail={`${spreadPercent.toFixed(
            1
          )}% spread. Max allowed is ${maxSpreadPercent}%.`}
        />

        <ChecklistLine
          pass={riskSizeOk}
          title="Risk size check"
          detail={`$${maxRisk.toFixed(
            2
          )} max risk. Allowed risk is $${allowedRisk.toFixed(2)}.`}
        />

        <ChecklistLine
          pass={detailsComplete}
          title="Contract details complete"
          detail={
            detailsComplete
              ? `Expiration ${expirationDate}, strike $${strikePrice}, bid $${bid.toFixed(
                  2
                )}, ask $${ask.toFixed(2)}, mid $${mid.toFixed(2)}.`
              : "Missing expiration, strike, bid, ask, or mid price."
          }
        />

        <ChecklistLine
          pass={marketOk}
          warning={marketCondition === "CHOPPY" || marketCondition === "UNKNOWN"}
          title="Market condition"
          detail={`Market is ${marketCondition}.`}
        />
      </div>
    </div>
  );
}