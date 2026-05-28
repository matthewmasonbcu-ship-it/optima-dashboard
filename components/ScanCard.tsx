import { ScoreBar } from "@/components/ScoreBar";
import type { Scan } from "@/lib/types";

type ScanCardProps = {
  scan: Scan;
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getSignalStyle(signal: string) {
  const cleanSignal = signal.toUpperCase();

  if (cleanSignal.includes("CALL")) {
    return "border-green-700 bg-green-950 text-green-300";
  }

  if (cleanSignal.includes("PUT")) {
    return "border-red-700 bg-red-950 text-red-300";
  }

  if (cleanSignal.includes("WAIT")) {
    return "border-yellow-700 bg-yellow-950 text-yellow-300";
  }

  return "border-blue-700 bg-blue-950 text-blue-300";
}

function getRiskStyle(risk: string | null | undefined) {
  const cleanRisk = risk?.toLowerCase();

  if (cleanRisk === "low") return "text-green-400";
  if (cleanRisk === "medium") return "text-yellow-400";
  if (cleanRisk === "high") return "text-red-400";

  return "text-gray-400";
}

function getGradeStyle(grade: string | null | undefined) {
  const cleanGrade = grade?.toUpperCase() || "";

  if (cleanGrade.includes("A+")) {
    return "border-green-500 bg-green-950 text-green-300";
  }

  if (cleanGrade.includes("A SETUP")) {
    return "border-green-700 bg-green-950 text-green-300";
  }

  if (cleanGrade.includes("B")) {
    return "border-blue-700 bg-blue-950 text-blue-300";
  }

  if (cleanGrade.includes("C")) {
    return "border-yellow-700 bg-yellow-950 text-yellow-300";
  }

  if (cleanGrade.includes("AVOID")) {
    return "border-red-700 bg-red-950 text-red-300";
  }

  return "border-gray-700 bg-gray-900 text-gray-300";
}

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

export function ScanCard({ scan }: ScanCardProps) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-black p-5 transition hover:border-gray-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-3xl font-bold">{scan.ticker}</h3>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${getSignalStyle(
                scan.signal
              )}`}
            >
              {scan.signal}
            </span>

            <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-300">
              {scan.option_type || "Option TBD"}
            </span>

            <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-sm text-gray-300">
              {scan.timeframe || "No timeframe"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${getGradeStyle(
                scan.trade_grade
              )}`}
            >
              {scan.trade_grade || "Ungraded"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-bold ${getDecisionStyle(
                scan.trade_decision
              )}`}
            >
              {scan.trade_decision || "No Decision"}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            {scan.reason || "No reason provided yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 lg:w-48">
          <p className="text-sm text-gray-400">Confidence</p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 flex-1 rounded-full bg-gray-800">
              <div
                className="h-3 rounded-full bg-green-400"
                style={{ width: `${scan.confidence}%` }}
              />
            </div>

            <span className="font-bold">{scan.confidence}%</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBar label="Trend" value={scan.trend_score} />
        <ScoreBar label="Volume" value={scan.volume_score} />
        <ScoreBar label="Momentum" value={scan.momentum_score} />
        <ScoreBar label="Risk" value={scan.risk_score} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Current Price
          </p>
          <p className="mt-2 text-base font-bold">{formatMoney(scan.price)}</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Entry
          </p>
          <p className="mt-2 text-base font-bold">
            {formatMoney(scan.entry_price)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Stop Loss
          </p>
          <p className="mt-2 text-base font-bold text-red-400">
            {formatMoney(scan.stop_loss)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Take Profit
          </p>
          <p className="mt-2 text-base font-bold text-green-400">
            {formatMoney(scan.take_profit)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Risk
          </p>
          <p
            className={`mt-2 text-base font-bold ${getRiskStyle(
              scan.risk_level
            )}`}
          >
            {scan.risk_level || "--"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Timeframe
          </p>
          <p className="mt-2 text-base font-bold">{scan.timeframe || "--"}</p>
        </div>
      </div>
    </article>
  );
}