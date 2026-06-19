"use client";

type TradeDirection = "CALL" | "PUT" | "NO TRADE" | string;

type OptionContract = {
  option_symbol?: string;
  optionSymbol?: string;
  symbol?: string;
  stock_symbol?: string;
  stockSymbol?: string;
  trade_direction?: TradeDirection;
  tradeDirection?: TradeDirection;
  direction?: TradeDirection;
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
};

type TradierSandboxOrderPreviewProps = {
  selectedContract?: OptionContract | null;
  selectedSymbol?: string | null;
  stockSymbol?: string | null;
  tradeDirection?: TradeDirection | null;
  scannerDirection?: TradeDirection | null;
};

const ORDERS_ENABLED = false;
const LIVE_TRADING_ENABLED = false;
const TRADIER_MODE = "sandbox";

function getNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatMoney(value: unknown) {
  const num = Number(value);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
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

function getOptionSymbol(contract?: OptionContract | null) {
  return String(
    getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], "")
  );
}

function getStockSymbol(contract?: OptionContract | null) {
  return String(
    getContractValue(contract, ["stock_symbol", "stockSymbol"], "")
  );
}

function getDirection(contract?: OptionContract | null) {
  return String(
    getContractValue(
      contract,
      ["trade_direction", "tradeDirection", "direction"],
      "NO TRADE"
    )
  );
}

function getBid(contract?: OptionContract | null) {
  return getNumber(
    getContractValue(contract, ["bid_price", "bidPrice", "bid"]),
    0
  );
}

function getAsk(contract?: OptionContract | null) {
  return getNumber(
    getContractValue(contract, ["ask_price", "askPrice", "ask"]),
    0
  );
}

function getMid(contract?: OptionContract | null) {
  const bid = getBid(contract);
  const ask = getAsk(contract);

  return getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
}

function getContracts(contract?: OptionContract | null) {
  return getNumber(getContractValue(contract, ["contracts"], 1), 1);
}

function getEstimatedDebit(contract?: OptionContract | null) {
  const mid = getMid(contract);
  const contracts = getContracts(contract);

  return getNumber(
    getContractValue(contract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );
}

function getMaxRisk(contract?: OptionContract | null) {
  return getNumber(
    getContractValue(contract, ["max_risk", "maxRisk"]),
    getEstimatedDebit(contract)
  );
}

function getDirectionColor(direction?: string) {
  const d = String(direction || "NO TRADE").toUpperCase();

  if (d.includes("CALL")) return "text-emerald-300";
  if (d.includes("PUT")) return "text-red-400";

  return "text-slate-400";
}

function getDirectionBar(direction?: string) {
  const d = String(direction || "NO TRADE").toUpperCase();

  if (d.includes("CALL")) return "bg-emerald-500";
  if (d.includes("PUT")) return "bg-red-500";

  return "bg-slate-600";
}

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
      <span className={`font-mono text-xs font-black ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function TradierSandboxOrderPreview({
  selectedContract = null,
  selectedSymbol,
  stockSymbol,
  tradeDirection,
  scannerDirection,
}: TradierSandboxOrderPreviewProps) {
  const hasContract = Boolean(selectedContract);

  const optionSymbol = getOptionSymbol(selectedContract);
  const symbol =
    getStockSymbol(selectedContract) || selectedSymbol || stockSymbol || "—";

  const contractDirection = getDirection(selectedContract);
  const direction =
    contractDirection !== "NO TRADE"
      ? contractDirection
      : tradeDirection || scannerDirection || "NO TRADE";

  const bid = getBid(selectedContract);
  const ask = getAsk(selectedContract);
  const mid = getMid(selectedContract);
  const contracts = getContracts(selectedContract);
  const limitPrice = mid;
  const estimatedDebit = getEstimatedDebit(selectedContract);
  const maxRisk = getMaxRisk(selectedContract);

  if (!hasContract) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 ring-1 ring-slate-700/20">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-slate-700" />
        <div className="px-5 py-4 pl-6">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">
            TRADIER SANDBOX · Order Preview
          </p>
          <p className="mt-0.5 font-mono text-sm font-black text-white">
            No contract selected
          </p>
          <p className="mt-1 font-mono text-[9px] leading-5 text-slate-500">
            Select a Tradier option contract to preview the non-executing sandbox order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-violet-500/5 ring-1 ring-violet-500/15">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${getDirectionBar(direction)}`} />

      <div
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{
          background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
        }}
      />

      <div className="px-5 py-4 pl-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-violet-500">
              TRADIER SANDBOX · Order Preview
            </p>

            <p className="mt-0.5 font-mono text-sm font-black text-white">
              Non-executing preview only
            </p>

            <p className="mt-1 font-mono text-[9px] leading-5 text-slate-500">
              This card does not send orders. No buy button. No sell button. No POST order route.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-emerald-500">
              Safe Paper Mode
            </p>
            <p className="font-mono text-[10px] font-black text-emerald-300">
              Locked
            </p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Mode
            </p>
            <p className="font-mono text-xs font-black text-violet-300">
              {TRADIER_MODE}
            </p>
          </div>

          <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-red-600">
              Orders Enabled
            </p>
            <p className="font-mono text-xs font-black text-red-400">
              {String(ORDERS_ENABLED)}
            </p>
          </div>

          <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-red-600">
              Live Trading Enabled
            </p>
            <p className="font-mono text-xs font-black text-red-400">
              {String(LIVE_TRADING_ENABLED)}
            </p>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-slate-800 bg-black/30 px-3 py-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Selected Option
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-white">
              {symbol}
            </span>

            <span className={`font-mono text-xs font-black ${getDirectionColor(direction)}`}>
              {String(direction).toUpperCase()}
            </span>

            <span className="font-mono text-[10px] text-slate-500">
              {optionSymbol || "No option symbol"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          <MiniStat label="Bid" value={formatMoney(bid)} />
          <MiniStat label="Ask" value={formatMoney(ask)} />
          <MiniStat label="Mid" value={formatMoney(mid)} valueClass="text-emerald-300" />
          <MiniStat label="Limit Preview" value={formatMoney(limitPrice)} valueClass="text-violet-300" />
          <MiniStat label="Contracts" value={contracts} />
          <MiniStat label="Est. Debit" value={formatMoney(estimatedDebit)} valueClass="text-white" />
          <MiniStat label="Max Risk" value={formatMoney(maxRisk)} valueClass="text-red-400" />
          <MiniStat label="Execution" value="Disabled" valueClass="text-slate-500" />
        </div>

        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="font-mono text-[9px] leading-5 text-yellow-300">
            Preview only. This is the order shape we would review later, but no route, no broker POST,
            and no real/sandbox order submission exists in this step.
          </p>
        </div>
      </div>
    </div>
  );
}