import { ScoreBar } from "@/components/ScoreBar";
import type { Scan } from "@/lib/types";

type BestSetupCardProps = {
  scan: Scan | null;
};

function getDecisionStyle(decision: string | null | undefined) {
  const cleanDecision = decision?.toUpperCase() || "";

  if (cleanDecision.includes("TAKE")) {
    return "border-green-500 bg-green-950 text-green-300";
  }

  if (cleanDecision.includes("WATCH")) {
    return "border-yellow-600 bg-yellow-950 text-yellow-300";
  }

  if (cleanDecision.includes("SKIP")) {
    return "border-red-700 bg-red-950 text-red-300";
  }

  return "border-gray-700 bg-gray-900 text-gray-300";
}

export function BestSetupCard({ scan }: BestSetupCardProps) {
  if (!scan) return null;

  return (
    <section className="mb-8 rounded-2xl border border-green-900 bg-gradient-to-br from-green-950 to-gray-950 p-6 shadow-lg">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-green-300">
            Highest Confidence Setup
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {scan.ticker} — {scan.signal}
          </h2>

          <div className="mt-3 flex flex-wrap gap-3">
            <span className="inline-flex rounded-full border border-green-700 bg-green-950 px-4 py-2 text-sm font-bold text-green-300">
              {scan.trade_grade || "Ungraded"}
            </span>

            <span
              className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getDecisionStyle(
                scan.trade_decision
              )}`}
            >
              {scan.trade_decision || "No Decision"}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-gray-300">
            {scan.reason || "No reason provided yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-green-800 bg-black/40 p-5 text-center">
          <p className="text-sm text-gray-400">Confidence</p>
          <p className="mt-2 text-5xl font-bold text-green-400">
            {scan.confidence}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBar label="Trend" value={scan.trend_score} />
        <ScoreBar label="Volume" value={scan.volume_score} />
        <ScoreBar label="Momentum" value={scan.momentum_score} />
        <ScoreBar label="Risk" value={scan.risk_score} />
      </div>
    </section>
  );
}