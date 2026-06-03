"use client";

type OptionContract = {
  stock_symbol?: string;
  symbol?: string;

  trade_direction?: string;
  tradeDirection?: string;

  option_symbol?: string;
  optionSymbol?: string;

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

type OptionRiskGuardProps = {
  selectedOptionContract: OptionContract | null;
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
};

type CheckStatus = "PASS" | "CAUTION" | "FAIL" | "WAITING";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function getValue(
  contract: OptionContract | null,
  camelKey: keyof OptionContract,
  snakeKey: keyof OptionContract
) {
  if (!contract) return null;

  return contract[camelKey] ?? contract[snakeKey] ?? null;
}

function getNumber(
  contract: OptionContract | null,
  camelKey: keyof OptionContract,
  snakeKey: keyof OptionContract
) {
  const value = getValue(contract, camelKey, snakeKey);

  if (value === null || value === undefined || value === "") return 0;

  return Number(value);
}

function statusStyles(status: CheckStatus | "APPROVED" | "BLOCKED") {
  if (status === "PASS" || status === "APPROVED") {
    return {
      badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
    };
  }

  if (status === "CAUTION") {
    return {
      badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
      dot: "bg-yellow-400",
      text: "text-yellow-300",
    };
  }

  if (status === "FAIL" || status === "BLOCKED") {
    return {
      badge: "border-red-500/40 bg-red-500/10 text-red-300",
      dot: "bg-red-400",
      text: "text-red-300",
    };
  }

  return {
    badge: "border-slate-700 bg-slate-800 text-slate-300",
    dot: "bg-slate-500",
    text: "text-slate-300",
  };
}

function RiskCheckRow({
  label,
  value,
  status,
  detail,
}: {
  label: string;
  value: string;
  status: CheckStatus;
  detail: string;
}) {
  const styles = statusStyles(status);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}
        >
          {status}
        </span>
      </div>

      <p className={`text-lg font-black ${styles.text}`}>{value}</p>
    </div>
  );
}

export default function OptionRiskGuard({
  selectedOptionContract,
  accountSize,
  maxRiskPercent,
  maxSpreadPercent,
}: OptionRiskGuardProps) {
  const maxAllowedRisk = Number(accountSize || 0) * (Number(maxRiskPercent || 0) / 100);

  if (!selectedOptionContract) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-6 text-center">
        <p className="text-sm font-bold text-white">Risk Guard waiting</p>
        <p className="mt-2 text-sm text-slate-400">
          Select an option contract to check spread, max risk, and affordability.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Account Size</p>
            <p className="mt-1 text-xl font-black text-white">
              {formatMoney(accountSize)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Allowed Risk</p>
            <p className="mt-1 text-xl font-black text-white">
              {formatMoney(maxAllowedRisk)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bidPrice = getNumber(selectedOptionContract, "bidPrice", "bid_price");
  const askPrice = getNumber(selectedOptionContract, "askPrice", "ask_price");
  const midPrice = getNumber(selectedOptionContract, "midPrice", "mid_price");

  const contracts = Number(selectedOptionContract.contracts ?? 1);

  const estimatedCost =
    getNumber(selectedOptionContract, "estimatedCost", "estimated_cost") ||
    midPrice * 100 * contracts;

  const maxRisk =
    getNumber(selectedOptionContract, "maxRisk", "max_risk") || estimatedCost;

  const spread = askPrice && bidPrice ? askPrice - bidPrice : 0;
  const spreadPercent = midPrice ? (spread / midPrice) * 100 : 0;

  const bidAskStatus: CheckStatus =
    bidPrice > 0 && askPrice > 0 && askPrice > bidPrice ? "PASS" : "FAIL";

  const midStatus: CheckStatus = midPrice > 0 ? "PASS" : "FAIL";

  const spreadStatus: CheckStatus =
    spreadPercent <= maxSpreadPercent
      ? "PASS"
      : spreadPercent <= maxSpreadPercent * 1.5
      ? "CAUTION"
      : "FAIL";

  const riskStatus: CheckStatus =
    maxRisk <= maxAllowedRisk ? "PASS" : "FAIL";

  const affordabilityStatus: CheckStatus =
    estimatedCost <= Number(accountSize || 0) ? "PASS" : "FAIL";

  const hasFail =
    bidAskStatus === "FAIL" ||
    midStatus === "FAIL" ||
    spreadStatus === "FAIL" ||
    riskStatus === "FAIL" ||
    affordabilityStatus === "FAIL";

  const hasCaution = spreadStatus === "CAUTION";

  const finalStatus: "APPROVED" | "CAUTION" | "BLOCKED" = hasFail
    ? "BLOCKED"
    : hasCaution
    ? "CAUTION"
    : "APPROVED";

  const finalReason =
    finalStatus === "APPROVED"
      ? `Approved. Max risk ${formatMoney(maxRisk)} is within allowed risk ${formatMoney(
          maxAllowedRisk
        )}, and spread is inside your limit.`
      : finalStatus === "CAUTION"
      ? `Caution. Risk is acceptable, but spread is wider than preferred at ${formatPercent(
          spreadPercent
        )}.`
      : riskStatus === "FAIL"
      ? `Blocked. Max risk ${formatMoney(maxRisk)} is above allowed risk ${formatMoney(
          maxAllowedRisk
        )}.`
      : spreadStatus === "FAIL"
      ? `Blocked. Spread is too wide at ${formatPercent(spreadPercent)}.`
      : affordabilityStatus === "FAIL"
      ? `Blocked. Estimated cost ${formatMoney(estimatedCost)} is above account size.`
      : "Blocked. Contract pricing is invalid.";

  const finalStyles = statusStyles(finalStatus);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${finalStyles.badge}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              Final Risk Guard Status
            </p>
            <h3 className="mt-1 text-3xl font-black">{finalStatus}</h3>
          </div>

          <div className="rounded-2xl border border-current/30 bg-black/10 px-4 py-3">
            <p className="text-xs opacity-80">Risk Limit</p>
            <p className="text-lg font-black">{formatMoney(maxAllowedRisk)}</p>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold opacity-90">{finalReason}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RiskCheckRow
          label="Bid / Ask Validity"
          value={`${formatMoney(bidPrice)} / ${formatMoney(askPrice)}`}
          status={bidAskStatus}
          detail="Ask must be greater than bid, and both must be above zero."
        />

        <RiskCheckRow
          label="Mid Price"
          value={formatMoney(midPrice)}
          status={midStatus}
          detail="Mid price is used as the paper-trade option entry."
        />

        <RiskCheckRow
          label="Spread Check"
          value={`${formatMoney(spread)} / ${formatPercent(spreadPercent)}`}
          status={spreadStatus}
          detail={`Preferred max spread is ${maxSpreadPercent}%.`}
        />

        <RiskCheckRow
          label="Max Risk Check"
          value={`${formatMoney(maxRisk)} / ${formatMoney(maxAllowedRisk)}`}
          status={riskStatus}
          detail={`Max risk per trade is ${maxRiskPercent}% of account size.`}
        />

        <RiskCheckRow
          label="Affordability"
          value={`${formatMoney(estimatedCost)} / ${formatMoney(accountSize)}`}
          status={affordabilityStatus}
          detail="Estimated contract cost must fit inside account size."
        />

        <RiskCheckRow
          label="Contracts"
          value={`${contracts}`}
          status={contracts >= 1 ? "PASS" : "FAIL"}
          detail="At least one contract is required."
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Guardrail Summary
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Account Size</p>
            <p className="mt-1 text-lg font-black text-white">
              {formatMoney(accountSize)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Actual Max Risk</p>
            <p className="mt-1 text-lg font-black text-red-300">
              {formatMoney(maxRisk)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Spread %</p>
            <p
              className={`mt-1 text-lg font-black ${
                spreadStatus === "PASS"
                  ? "text-emerald-300"
                  : spreadStatus === "CAUTION"
                  ? "text-yellow-300"
                  : "text-red-300"
              }`}
            >
              {formatPercent(spreadPercent)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}