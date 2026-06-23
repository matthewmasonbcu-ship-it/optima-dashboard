"use client";

type RiskEngineProps = {
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  accountSize?: number;
  maxRiskPercent?: number;
};

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function RiskEngine({
  entry = 1.0,
  stopLoss = 0.75,
  takeProfit = 1.5,
  quantity = 1,
  accountSize = 50000,
  maxRiskPercent = 1,
}: RiskEngineProps) {
  const contractMultiplier = 100;

  const riskPerContract = Math.max(0, (entry - stopLoss) * contractMultiplier);
  const rewardPerContract = Math.max(
    0,
    (takeProfit - entry) * contractMultiplier
  );

  const totalRisk = riskPerContract * quantity;
  const totalReward = rewardPerContract * quantity;

  const maxAllowedRisk = accountSize * (maxRiskPercent / 100);

  const riskRewardRatio =
    totalRisk > 0 ? Number((totalReward / totalRisk).toFixed(2)) : 0;

  const suggestedQuantity =
    riskPerContract > 0
      ? Math.max(1, Math.floor(maxAllowedRisk / riskPerContract))
      : 1;

  const riskPercentOfAccount =
    accountSize > 0 ? (totalRisk / accountSize) * 100 : 0;

  const isRiskAcceptable = totalRisk <= maxAllowedRisk;
  const isRewardAcceptable = riskRewardRatio >= 2;

  const riskStatus =
    isRiskAcceptable && isRewardAcceptable
      ? "APPROVED"
      : !isRiskAcceptable
        ? "TOO MUCH RISK"
        : "WEAK REWARD";

  const statusClass =
    riskStatus === "APPROVED"
      ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
      : riskStatus === "TOO MUCH RISK"
        ? "border-red-800 bg-red-950/30 text-red-200"
        : "border-yellow-800 bg-yellow-950/30 text-yellow-200";

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-400">
            Risk Engine
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">
            Position Risk Breakdown
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This checks whether the paper trade has clean risk before the
            system becomes more automated.
          </p>
        </div>

        <div className={`rounded-2xl border p-4 text-center ${statusClass}`}>
          <p className="text-xs font-black uppercase tracking-wide opacity-80">
            Risk Status
          </p>
          <p className="mt-1 text-xl font-black">{riskStatus}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <RiskCard label="Entry" value={entry.toFixed(2)} />
        <RiskCard label="Stop Loss" value={stopLoss.toFixed(2)} />
        <RiskCard label="Take Profit" value={takeProfit.toFixed(2)} />

        <RiskCard label="Contracts" value={quantity.toString()} />
        <RiskCard label="Account Size" value={formatMoney(accountSize)} />
        <RiskCard label="Max Risk Rule" value={formatPercent(maxRiskPercent)} />

        <RiskCard label="Risk / Contract" value={formatMoney(riskPerContract)} />
        <RiskCard
          label="Reward / Contract"
          value={formatMoney(rewardPerContract)}
        />
        <RiskCard label="Risk/Reward" value={`1:${riskRewardRatio}`} />

        <RiskCard label="Total Risk" value={formatMoney(totalRisk)} />
        <RiskCard label="Total Reward" value={formatMoney(totalReward)} />
        <RiskCard
          label="Risk % of Account"
          value={formatPercent(riskPercentOfAccount)}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Position Size Suggestion
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          Based on a {formatMoney(accountSize)} practice account and a{" "}
          {formatPercent(maxRiskPercent)} max-risk rule, the suggested max
          position size is{" "}
          <span className="font-black text-white">
            {suggestedQuantity} contract{suggestedQuantity === 1 ? "" : "s"}
          </span>
          .
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Current setup: risking {formatMoney(totalRisk)} to potentially make{" "}
          {formatMoney(totalReward)}. Funded-account discipline means risk stays
          controlled before the trade is ever taken.
        </p>
      </div>
    </section>
  );
}

function RiskCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}