import { MarketScan } from "@/lib/mockScans";
import { formatDecision, getDecisionStyle } from "@/lib/dashboardFormatters";

type BestSetupCardProps = {
  bestSetup: MarketScan;
};

export default function BestSetupCard({ bestSetup }: BestSetupCardProps) {
  return (
    <section className="mb-8 rounded-3xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-slate-950 p-6 shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-green-400">
            Best Setup Right Now
          </p>

          <h2 className="text-3xl font-bold">
            {bestSetup.ticker}{" "}
            <span className="text-slate-400">— {bestSetup.company}</span>
          </h2>

          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            {bestSetup.reason}
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/30 bg-black/30 px-6 py-4 text-center">
          <p className="text-sm text-slate-400">Decision</p>
          <p
            className={`mt-1 text-2xl font-bold ${getDecisionStyle(
              bestSetup.decision
            )}`}
          >
            {formatDecision(bestSetup.decision)}
          </p>
        </div>
      </div>
    </section>
  );
}
