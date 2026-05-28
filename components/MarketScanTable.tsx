import { MarketScan } from "@/lib/mockScans";
import {
  getGradeStyle,
  formatGrade,
  getDecisionStyle,
  formatDecision,
} from "@/lib/dashboardFormatters";

type MarketScanTableProps = {
  scans: MarketScan[];
  isScanning: boolean;
  lastScanTime: string;
  saveStatus: string;
  onGenerateScan: () => void;
};

export default function MarketScanTable({
  scans,
  isScanning,
  lastScanTime,
  saveStatus,
  onGenerateScan,
}: MarketScanTableProps) {
  const saveStatusColor = saveStatus.startsWith("Saved")
    ? "text-green-400"
    : saveStatus.startsWith("Save failed") ||
      saveStatus.startsWith("Scan failed")
    ? "text-red-400"
    : "text-slate-300";

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Market Scan Results</h2>
          <p className="text-sm text-slate-400">
            Last scan:{" "}
            <span className="text-slate-300">{lastScanTime}</span>
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Save status:{" "}
            <span className={saveStatusColor}>{saveStatus}</span>
          </p>
        </div>

        <button
          onClick={onGenerateScan}
          disabled={isScanning}
          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isScanning ? "Scanning Market..." : "Generate Scan"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-4">Ticker</th>
              <th className="px-4 py-4">Price</th>
              <th className="px-4 py-4">Change</th>
              <th className="px-4 py-4">Trend</th>
              <th className="px-4 py-4">Volume</th>
              <th className="px-4 py-4">RSI</th>
              <th className="px-4 py-4">Grade</th>
              <th className="px-4 py-4">Decision</th>
            </tr>
          </thead>

          <tbody>
            {scans.map((scan) => (
              <tr
                key={scan.id}
                className="border-t border-slate-800 transition hover:bg-slate-900/70"
              >
                <td className="px-4 py-4">
                  <div>
                    <p className="font-bold text-white">{scan.ticker}</p>
                    <p className="text-xs text-slate-500">{scan.company}</p>
                  </div>
                </td>

                <td className="px-4 py-4 font-medium">
                  ${scan.price.toFixed(2)}
                </td>

                <td
                  className={`px-4 py-4 font-semibold ${
                    scan.changePercent >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {scan.changePercent >= 0 ? "+" : ""}
                  {scan.changePercent.toFixed(2)}%
                </td>

                <td className="px-4 py-4 text-slate-300">{scan.trend}</td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${scan.volumeScore}%` }}
                      />
                    </div>
                    <span className="text-slate-300">{scan.volumeScore}</span>
                  </div>
                </td>

                <td className="px-4 py-4 text-slate-300">{scan.rsi}</td>

                <td className="px-4 py-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getGradeStyle(
                      scan.setupGrade
                    )}`}
                  >
                    {formatGrade(scan.setupGrade)}
                  </span>
                </td>

                <td
                  className={`px-4 py-4 font-bold ${getDecisionStyle(
                    scan.decision
                  )}`}
                >
                  {formatDecision(scan.decision)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
