"use client";

import { useMemo, useState } from "react";

type TradeDirection = "CALL" | "PUT" | "NO TRADE";

type SortMode =
  | "recommendation"
  | "quality"
  | "liquidity"
  | "spread"
  | "risk"
  | "price";

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

  spreadPercent?: number;
  spread_percent?: number;
  bidAskSpreadPercent?: number;

  volume?: number;
  openInterest?: number;
  open_interest?: number;

  liquidityScore?: number;
  liquidity_score?: number;

  recommendationScore?: number;
  recommendation_score?: number;

  qualityGrade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
  contractQualityGrade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
  grade?: "A+" | "A" | "B" | "C" | "BLOCKED" | string;
  quality_grade?: string;
  contract_quality_grade?: string;

  recommendationReason?: string;
  whyThisContract?: string[];

  riskStatus?: string;
};

type OptionContractSelectorProps = {
  selectedSymbol?: string;
  stockSymbol?: string;

  scannerDirection?: TradeDirection | string;
  tradeDirection?: TradeDirection | string;

  selectedContract?: OptionContract | null;

  onSelectContract?: (contract: OptionContract | null) => void;
  onContractSelected?: (contract: OptionContract | null) => void;
  onClearSelectedContract?: () => void;

  accountSize?: number;
  maxRiskPercent?: number;
  maxSpreadPercent?: number;
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

function normalizeDirection(direction?: string): TradeDirection {
  if (direction === "CALL") return "CALL";
  if (direction === "PUT") return "PUT";
  return "NO TRADE";
}

function getOptionSymbol(contract: OptionContract | null | undefined) {
  return String(
    getContractValue(contract, ["option_symbol", "optionSymbol", "symbol"], "")
  );
}

function getGrade(contract: OptionContract | null | undefined) {
  return String(
    getContractValue(
      contract,
      [
        "qualityGrade",
        "contractQualityGrade",
        "grade",
        "quality_grade",
        "contract_quality_grade",
      ],
      "UNKNOWN"
    )
  ).toUpperCase();
}

function getBid(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["bid_price", "bidPrice", "bid"]), 0);
}

function getAsk(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["ask_price", "askPrice", "ask"]), 0);
}

function getMid(contract: OptionContract) {
  const bid = getBid(contract);
  const ask = getAsk(contract);

  return getNumber(
    getContractValue(contract, ["mid_price", "midPrice", "mid"]),
    bid > 0 && ask > 0 ? (bid + ask) / 2 : 0
  );
}

function getStrike(contract: OptionContract) {
  return getNumber(
    getContractValue(contract, ["strike_price", "strikePrice"]),
    0
  );
}

function getExpiration(contract: OptionContract) {
  return String(
    getContractValue(contract, ["expiration_date", "expirationDate"], "")
  );
}

function getContracts(contract: OptionContract) {
  return getNumber(getContractValue(contract, ["contracts"]), 1);
}

function getEstimatedCost(contract: OptionContract) {
  const mid = getMid(contract);
  const contracts = getContracts(contract);

  return getNumber(
    getContractValue(contract, ["estimated_cost", "estimatedCost"]),
    mid * contracts * 100
  );
}

function getMaxRisk(contract: OptionContract) {
  return getNumber(
    getContractValue(contract, ["max_risk", "maxRisk"]),
    getEstimatedCost(contract)
  );
}

function getSpreadPercent(contract: OptionContract) {
  const bid = getBid(contract);
  const ask = getAsk(contract);
  const mid = getMid(contract);

  return getNumber(
    getContractValue(contract, [
      "spreadPercent",
      "spread_percent",
      "bidAskSpreadPercent",
    ]),
    bid > 0 && ask > 0 && mid > 0 ? ((ask - bid) / mid) * 100 : 999
  );
}

function getLiquidityScore(contract: OptionContract) {
  return getNumber(
    getContractValue(contract, ["liquidityScore", "liquidity_score"]),
    0
  );
}

function getRecommendationScore(contract: OptionContract) {
  return getNumber(
    getContractValue(contract, ["recommendationScore", "recommendation_score"]),
    0
  );
}

function getOpenInterest(contract: OptionContract) {
  return getNumber(
    getContractValue(contract, ["openInterest", "open_interest"]),
    0
  );
}

function getGradeRank(grade: string) {
  if (grade === "A+") return 5;
  if (grade === "A") return 4;
  if (grade === "B") return 3;
  if (grade === "C") return 2;
  if (grade === "BLOCKED") return 1;
  return 0;
}

function getGradeClass(grade: string) {
  if (grade === "A+") {
    return "border-emerald-400/50 bg-emerald-400/10 text-emerald-300";
  }

  if (grade === "A") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (grade === "B") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  if (grade === "C") {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  if (grade === "BLOCKED") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

function getRiskStatus(contract: OptionContract, params: {
  accountSize: number;
  maxRiskPercent: number;
  maxSpreadPercent: number;
}) {
  const { accountSize, maxRiskPercent, maxSpreadPercent } = params;

  const maxRisk = getMaxRisk(contract);
  const allowedRisk = accountSize * (maxRiskPercent / 100);
  const spread = getSpreadPercent(contract);
  const grade = getGrade(contract);

  if (grade === "BLOCKED") {
    return {
      status: "BLOCKED",
      reason: "Contract grade is BLOCKED.",
    };
  }

  if (grade === "C") {
    return {
      status: "BLOCKED",
      reason: "Contract grade is C.",
    };
  }

  if (maxRisk > allowedRisk) {
    return {
      status: "BLOCKED",
      reason: `Max risk $${maxRisk.toFixed(2)} is above allowed $${allowedRisk.toFixed(2)}.`,
    };
  }

  if (spread > maxSpreadPercent) {
    return {
      status: "BLOCKED",
      reason: `${spread.toFixed(1)}% spread is above max ${maxSpreadPercent}%.`,
    };
  }

  if (grade === "B") {
    return {
      status: "CAUTION",
      reason: "B-grade contract. Acceptable, but not ideal.",
    };
  }

  return {
    status: "APPROVED",
    reason: "Contract passes basic quality filters.",
  };
}

function buildManualContract(params: {
  stockSymbol: string;
  direction: TradeDirection;
  optionSymbol: string;
  expirationDate: string;
  strikePrice: number;
  bid: number;
  ask: number;
  contracts: number;
}) {
  const {
    stockSymbol,
    direction,
    optionSymbol,
    expirationDate,
    strikePrice,
    bid,
    ask,
    contracts,
  } = params;

  const mid = bid > 0 && ask > 0 ? Number(((bid + ask) / 2).toFixed(2)) : 0;
  const estimatedCost = Number((mid * contracts * 100).toFixed(2));

  const manualContract: OptionContract = {
    option_symbol: optionSymbol,
    optionSymbol,
    symbol: optionSymbol,

    stock_symbol: stockSymbol,
    stockSymbol,

    trade_direction: direction,
    tradeDirection: direction,

    expiration_date: expirationDate,
    expirationDate,

    strike_price: strikePrice,
    strikePrice,

    bid_price: bid,
    bidPrice: bid,
    bid,

    ask_price: ask,
    askPrice: ask,
    ask,

    mid_price: mid,
    midPrice: mid,
    mid,

    contracts,

    estimated_cost: estimatedCost,
    estimatedCost,

    max_risk: estimatedCost,
    maxRisk: estimatedCost,

    spreadPercent: mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999,
    spread_percent: mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999,
    bidAskSpreadPercent: mid > 0
      ? Number((((ask - bid) / mid) * 100).toFixed(1))
      : 999,

    volume: 0,
    openInterest: 0,
    open_interest: 0,

    liquidityScore: 0,
    liquidity_score: 0,

    recommendationScore: 0,
    recommendation_score: 0,

    qualityGrade: "UNKNOWN",
    contractQualityGrade: "UNKNOWN",
    grade: "UNKNOWN",

    recommendationReason: "Manual contract. No automatic quality grade.",
    whyThisContract: [
      "Manual contract entered by user.",
      "No automatic grade available.",
      "Use Testing Override only if intentionally testing.",
    ],
  };

  return manualContract;
}

export default function OptionContractSelector({
  selectedSymbol = "",
  stockSymbol = "",
  scannerDirection = "NO TRADE",
  tradeDirection = "NO TRADE",
  selectedContract = null,
  onSelectContract,
  onContractSelected,
  onClearSelectedContract,
  accountSize = 10000,
  maxRiskPercent = 1,
  maxSpreadPercent = 20,
}: OptionContractSelectorProps) {
  const finalSymbol = selectedSymbol || stockSymbol;
  const finalDirection = normalizeDirection(
    String(tradeDirection || scannerDirection || "NO TRADE")
  );

  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [hideBlockedContracts, setHideBlockedContracts] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recommendation");

  const [manualOptionSymbol, setManualOptionSymbol] = useState("");
  const [manualExpiration, setManualExpiration] = useState("");
  const [manualStrike, setManualStrike] = useState("");
  const [manualBid, setManualBid] = useState("");
  const [manualAsk, setManualAsk] = useState("");
  const [manualContracts, setManualContracts] = useState("1");

  function selectContract(contract: OptionContract | null) {
    if (typeof onSelectContract === "function") {
      onSelectContract(contract);
    }

    if (typeof onContractSelected === "function") {
      onContractSelected(contract);
    }
  }

  async function loadMockChain() {
    if (!finalSymbol) {
      setStatusMessage("Select a scanner setup before loading the option chain.");
      return;
    }

    if (finalDirection === "NO TRADE") {
      setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first.");
      return;
    }

    setLoadingChain(true);
    setStatusMessage("Loading mock option chain...");

    try {
      const res = await fetch(
        `/api/options/chain?symbol=${encodeURIComponent(
          finalSymbol
        )}&direction=${encodeURIComponent(finalDirection)}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        console.error("Option chain failed:", data);
        setStatusMessage(data?.error || "Option chain failed.");
        setContracts([]);
        return;
      }

      const rawContracts =
        data.contracts || data.optionChain || data.chain || [];

      if (!Array.isArray(rawContracts)) {
        setStatusMessage("Option chain returned invalid contract data.");
        setContracts([]);
        return;
      }

      setContracts(rawContracts);
      setStatusMessage(
        `Loaded ${rawContracts.length} mock contracts. Turn Hide BLOCKED off to see blocked test contracts.`
      );
    } catch (error) {
      console.error("loadMockChain error:", error);
      setStatusMessage("Option chain failed. Check console.");
      setContracts([]);
    } finally {
      setLoadingChain(false);
    }
  }

  function handleManualSelect() {
    if (!finalSymbol) {
      setStatusMessage("Select a scanner setup first.");
      return;
    }

    if (finalDirection === "NO TRADE") {
      setStatusMessage("Direction is NO TRADE. Select a CALL or PUT setup first.");
      return;
    }

    const strike = Number(manualStrike);
    const bid = Number(manualBid);
    const ask = Number(manualAsk);
    const contractCount = Number(manualContracts);

    if (!manualOptionSymbol.trim()) {
      setStatusMessage("Enter an option symbol.");
      return;
    }

    if (!manualExpiration) {
      setStatusMessage("Enter an expiration date.");
      return;
    }

    if (!Number.isFinite(strike) || strike <= 0) {
      setStatusMessage("Enter a valid strike price.");
      return;
    }

    if (!Number.isFinite(bid) || bid <= 0) {
      setStatusMessage("Enter a valid bid price.");
      return;
    }

    if (!Number.isFinite(ask) || ask <= 0 || ask < bid) {
      setStatusMessage("Enter a valid ask price.");
      return;
    }

    if (!Number.isFinite(contractCount) || contractCount <= 0) {
      setStatusMessage("Enter a valid contract count.");
      return;
    }

    const manualContract = buildManualContract({
      stockSymbol: finalSymbol,
      direction: finalDirection,
      optionSymbol: manualOptionSymbol.trim().toUpperCase(),
      expirationDate: manualExpiration,
      strikePrice: strike,
      bid,
      ask,
      contracts: contractCount,
    });

    selectContract(manualContract);
    setStatusMessage(`Manual contract selected: ${manualContract.option_symbol}`);
  }

  const visibleContracts = useMemo(() => {
    const filtered = contracts.filter((contract) => {
      const grade = getGrade(contract);

      // Important:
      // Hide blocked ON hides only BLOCKED grade.
      // C contracts stay visible so we can test blocked checklist behavior.
      // Wide spread / low liquidity contracts stay visible but get marked BLOCKED.
      if (hideBlockedContracts && grade === "BLOCKED") {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "recommendation") {
        return getRecommendationScore(b) - getRecommendationScore(a);
      }

      if (sortMode === "quality") {
        return getGradeRank(getGrade(b)) - getGradeRank(getGrade(a));
      }

      if (sortMode === "liquidity") {
        return getLiquidityScore(b) - getLiquidityScore(a);
      }

      if (sortMode === "spread") {
        return getSpreadPercent(a) - getSpreadPercent(b);
      }

      if (sortMode === "risk") {
        return getMaxRisk(a) - getMaxRisk(b);
      }

      if (sortMode === "price") {
        return getMid(a) - getMid(b);
      }

      return 0;
    });

    return sorted;
  }, [contracts, hideBlockedContracts, sortMode]);

  const recommendedContract = useMemo(() => {
    const approvedOrCaution = visibleContracts.filter((contract) => {
      const risk = getRiskStatus(contract, {
        accountSize,
        maxRiskPercent,
        maxSpreadPercent,
      });

      return risk.status === "APPROVED" || risk.status === "CAUTION";
    });

    if (approvedOrCaution.length > 0) {
      return [...approvedOrCaution].sort((a, b) => {
        const riskA = getRiskStatus(a, {
          accountSize,
          maxRiskPercent,
          maxSpreadPercent,
        });

        const riskB = getRiskStatus(b, {
          accountSize,
          maxRiskPercent,
          maxSpreadPercent,
        });

        const riskRankA = riskA.status === "APPROVED" ? 2 : 1;
        const riskRankB = riskB.status === "APPROVED" ? 2 : 1;

        if (riskRankB !== riskRankA) return riskRankB - riskRankA;

        return getRecommendationScore(b) - getRecommendationScore(a);
      })[0];
    }

    return visibleContracts[0] || null;
  }, [
    visibleContracts,
    accountSize,
    maxRiskPercent,
    maxSpreadPercent,
  ]);

  const selectedOptionSymbol = getOptionSymbol(selectedContract);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
            Option Contract Selector
          </p>

          <h3 className="mt-1 text-lg font-bold text-white">
            Contract Builder + Mock Chain
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Select contracts for {finalSymbol || "no symbol"}{" "}
            {finalDirection !== "NO TRADE" ? finalDirection : ""}. C and BLOCKED
            contracts stay available for safety testing.
          </p>
        </div>

        <button
          onClick={loadMockChain}
          disabled={loadingChain || !finalSymbol || finalDirection === "NO TRADE"}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingChain ? "Loading..." : "Load Mock Chain"}
        </button>
      </div>

      {statusMessage && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
          {statusMessage}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Symbol</p>
          <p className="font-bold text-white">{finalSymbol || "None"}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Direction</p>
          <p
            className={`font-bold ${
              finalDirection === "CALL"
                ? "text-emerald-300"
                : finalDirection === "PUT"
                ? "text-red-300"
                : "text-slate-300"
            }`}
          >
            {finalDirection}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Loaded</p>
          <p className="font-bold text-white">{contracts.length}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Visible</p>
          <p className="font-bold text-white">{visibleContracts.length}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Manual Builder</p>
            <p className="text-xs text-slate-400">
              Manual contracts are saved with grade UNKNOWN, so normal save will
              block unless Testing Override is on.
            </p>
          </div>

          <button
            onClick={handleManualSelect}
            className="rounded-xl bg-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-slate-600"
          >
            Select Manual Contract
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <input
            value={manualOptionSymbol}
            onChange={(e) => setManualOptionSymbol(e.target.value)}
            placeholder="Option symbol"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <input
            value={manualExpiration}
            onChange={(e) => setManualExpiration(e.target.value)}
            placeholder="Expiration YYYY-MM-DD"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <input
            value={manualStrike}
            onChange={(e) => setManualStrike(e.target.value)}
            placeholder="Strike"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <input
            value={manualBid}
            onChange={(e) => setManualBid(e.target.value)}
            placeholder="Bid"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <input
            value={manualAsk}
            onChange={(e) => setManualAsk(e.target.value)}
            placeholder="Ask"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <input
            value={manualContracts}
            onChange={(e) => setManualContracts(e.target.value)}
            placeholder="Contracts"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHideBlockedContracts(!hideBlockedContracts)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${
              hideBlockedContracts
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "bg-orange-500 text-slate-950 hover:bg-orange-400"
            }`}
          >
            {hideBlockedContracts
              ? "Hide BLOCKED: ON"
              : "Hide BLOCKED: OFF"}
          </button>

          {selectedContract && (
            <button
              type="button"
              onClick={() => {
                if (typeof onClearSelectedContract === "function") {
                  onClearSelectedContract();
                } else {
                  selectContract(null);
                }
              }}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:border-red-500/60 hover:text-red-300"
            >
              Clear Selected
            </button>
          )}
        </div>

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
        >
          <option value="recommendation">Sort: Recommendation</option>
          <option value="quality">Sort: Quality</option>
          <option value="liquidity">Sort: Liquidity</option>
          <option value="spread">Sort: Spread</option>
          <option value="risk">Sort: Risk</option>
          <option value="price">Sort: Price</option>
        </select>
      </div>

      {recommendedContract && (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                Best Contract Recommendation
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="break-all text-sm font-bold text-white">
                  {getOptionSymbol(recommendedContract)}
                </p>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeClass(
                    getGrade(recommendedContract)
                  )}`}
                >
                  {getGrade(recommendedContract)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-300">
                {recommendedContract.recommendationReason ||
                  "Recommended based on grade, spread, liquidity, risk, and score."}
              </p>
            </div>

            <button
              onClick={() => selectContract(recommendedContract)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Select Recommended
            </button>
          </div>
        </div>
      )}

      {visibleContracts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
          <p className="text-lg font-bold text-white">No visible contracts</p>
          <p className="mt-2 text-sm text-slate-400">
            Load the mock chain or turn Hide BLOCKED off.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleContracts.map((contract) => {
            const optionSymbol = getOptionSymbol(contract);
            const grade = getGrade(contract);
            const risk = getRiskStatus(contract, {
              accountSize,
              maxRiskPercent,
              maxSpreadPercent,
            });

            const isSelected =
              selectedOptionSymbol && selectedOptionSymbol === optionSymbol;

            const bid = getBid(contract);
            const ask = getAsk(contract);
            const mid = getMid(contract);
            const strike = getStrike(contract);
            const expiration = getExpiration(contract);
            const spread = getSpreadPercent(contract);
            const maxRisk = getMaxRisk(contract);
            const liquidity = getLiquidityScore(contract);
            const recommendation = getRecommendationScore(contract);
            const volume = getNumber(contract.volume, 0);
            const openInterest = getOpenInterest(contract);

            return (
              <div
                key={optionSymbol}
                className={`rounded-2xl border p-4 ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/10"
                    : grade === "BLOCKED"
                    ? "border-red-500/40 bg-red-500/10"
                    : grade === "C"
                    ? "border-orange-500/40 bg-orange-500/10"
                    : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all text-sm font-bold text-white">
                        {optionSymbol}
                      </p>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeClass(
                          grade
                        )}`}
                      >
                        {grade}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          risk.status === "APPROVED"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : risk.status === "CAUTION"
                            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                            : "border-red-500/40 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {risk.status}
                      </span>

                      {isSelected && (
                        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                          SELECTED
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-300">
                      {contract.recommendationReason || risk.reason}
                    </p>

                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
                        Why This Contract?
                      </p>

                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
                        {(contract.whyThisContract || [
                          risk.reason,
                          `Grade: ${grade}`,
                          `Spread: ${spread.toFixed(1)}%`,
                          `Liquidity score: ${liquidity}`,
                          `Recommendation score: ${recommendation}`,
                        ]).map((reason, index) => (
                          <li key={`${optionSymbol}-why-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Expiration</p>
                      <p className="font-bold text-white">{expiration || "--"}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Strike</p>
                      <p className="font-bold text-white">${strike.toFixed(2)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Bid / Ask</p>
                      <p className="font-bold text-white">
                        ${bid.toFixed(2)} / ${ask.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Mid</p>
                      <p className="font-bold text-white">${mid.toFixed(2)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Spread</p>
                      <p
                        className={`font-bold ${
                          spread <= maxSpreadPercent
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {spread.toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Max Risk</p>
                      <p
                        className={`font-bold ${
                          maxRisk <= accountSize * (maxRiskPercent / 100)
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        ${maxRisk.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Liquidity</p>
                      <p className="font-bold text-white">{liquidity}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Score</p>
                      <p className="font-bold text-white">{recommendation}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Volume</p>
                      <p className="font-bold text-white">{volume}</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs text-slate-500">Open Interest</p>
                      <p className="font-bold text-white">{openInterest}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => selectContract(contract)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      grade === "BLOCKED" || grade === "C"
                        ? "bg-orange-500 text-slate-950 hover:bg-orange-400"
                        : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    }`}
                  >
                    {grade === "BLOCKED" || grade === "C"
                      ? "Select For Override Test"
                      : "Select Contract"}
                  </button>

                  {(grade === "C" || grade === "BLOCKED") && (
                    <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-200">
                      This contract is intentionally weak. Normal save should
                      block it unless Testing Override is ON.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}