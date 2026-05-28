import type { Scan } from "@/lib/types";

type StatsCardsProps = {
  scans: Scan[];
};

export function StatsCards({ scans }: StatsCardsProps) {
  const bestScan =
    scans.length > 0
      ? scans.reduce((best, scan) =>
          scan.confidence > best.confidence ? scan : best
        )
      : null;

  const averageConfidence =
    scans.length > 0
      ? Math.round(
          scans.reduce((total, scan) => total + scan.confidence, 0) /
            scans.length
        )
      : 0;

  const averageMomentum =
    scans.length > 0
      ? Math.round(
          scans.reduce((total, scan) => total + (scan.momentum_score ?? 0), 0) /
            scans.length
        )
      : 0;

  return (
    <section className="mb-8 grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
        <p className="text-sm text-gray-400">Total Scans</p>
        <p className="mt-2 text-4xl font-bold">{scans.length}</p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
        <p className="text-sm text-gray-400">Best Setup</p>
        <p className="mt-2 text-4xl font-bold">
          {bestScan ? bestScan.ticker : "--"}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
        <p className="text-sm text-gray-400">Avg Confidence</p>
        <p className="mt-2 text-4xl font-bold">{averageConfidence}%</p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-lg">
        <p className="text-sm text-gray-400">Avg Momentum</p>
        <p className="mt-2 text-4xl font-bold text-green-400">
          {averageMomentum}%
        </p>
      </div>
    </section>
  );
}