"use client";

type PaperPreviewLike = {
  id?: string | number | null;

  preview_status?: string | null;
  status?: string | null;

  contract_quality?: string | null;
  contractQuality?: string | null;

  funded_filter_status?: string | null;
  fundedFilterStatus?: string | null;
  funded_filter_result?: string | null;
  fundedFilterResult?: string | null;

  max_risk_dollars?: number | string | null;
  max_risk?: number | string | null;
  maxRisk?: number | string | null;
  estimated_max_risk?: number | string | null;
  estimatedMaxRisk?: number | string | null;

  estimated_limit_price?: number | string | null;
  estimatedLimitPrice?: number | string | null;
  limit_price?: number | string | null;
  limitPrice?: number | string | null;

  ready_for_sandbox_preview?: boolean | null;
  readyForSandboxPreview?: boolean | null;

  safety_notes?: string | null;
  safetyNotes?: string | null;
};

type Props = {
  previews?: PaperPreviewLike[];
};

type GradeKey = "A+" | "A" | "B" | "C" | "BLOCKED" | "UNKNOWN";

type PreviewStatusKey =
  | "PREVIEW_ONLY"
  | "REVIEWED_ONLY"
  | "READY_FOR_SANDBOX_PREVIEW"
  | "CANCELLED";

function normalizeUpper(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[$,]/g, "").trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getSafetyNotes(preview: PaperPreviewLike): string {
  return String(preview.safety_notes ?? preview.safetyNotes ?? "");
}

function getFundedFilterStatus(
  preview: PaperPreviewLike
): "PASSED" | "BLOCKED" | "UNKNOWN" {
  const direct = normalizeUpper(
    preview.funded_filter_status ??
      preview.fundedFilterStatus ??
      preview.funded_filter_result ??
      preview.fundedFilterResult
  );

  if (direct.includes("PASSED")) return "PASSED";
  if (direct.includes("BLOCKED")) return "BLOCKED";

  const notes = normalizeUpper(getSafetyNotes(preview));

  if (
    notes.includes("FUNDED ACCOUNT SAFETY FILTER: PASSED") ||
    notes.includes("FUNDED FILTER PASSED") ||
    notes.includes("FUNDED FILTER: PASSED")
  ) {
    return "PASSED";
  }

  if (
    notes.includes("FUNDED ACCOUNT SAFETY FILTER: BLOCKED") ||
    notes.includes("FUNDED FILTER BLOCKED") ||
    notes.includes("FUNDED FILTER: BLOCKED")
  ) {
    return "BLOCKED";
  }

  return "UNKNOWN";
}

function getGrade(preview: PaperPreviewLike): GradeKey {
  const direct = normalizeUpper(
    preview.contract_quality ?? preview.contractQuality
  );

  if (direct === "A+") return "A+";
  if (direct === "A") return "A";
  if (direct === "B") return "B";
  if (direct === "C") return "C";
  if (direct === "BLOCKED") return "BLOCKED";

  const notes = normalizeUpper(getSafetyNotes(preview));

  if (notes.includes("GRADE: A+")) return "A+";
  if (notes.includes("GRADE: A")) return "A";
  if (notes.includes("GRADE: B")) return "B";
  if (notes.includes("GRADE: C")) return "C";
  if (notes.includes("GRADE: BLOCKED")) return "BLOCKED";

  return "UNKNOWN";
}

function getPreviewStatus(preview: PaperPreviewLike): PreviewStatusKey | "OTHER" {
  const status = normalizeUpper(preview.preview_status ?? preview.status);

  if (status === "PREVIEW_ONLY") return "PREVIEW_ONLY";
  if (status === "REVIEWED_ONLY") return "REVIEWED_ONLY";
  if (status === "READY_FOR_SANDBOX_PREVIEW") {
    return "READY_FOR_SANDBOX_PREVIEW";
  }
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";

  return "OTHER";
}

function isReadyForSandboxPreview(preview: PaperPreviewLike): boolean {
  return Boolean(
    preview.ready_for_sandbox_preview ?? preview.readyForSandboxPreview
  );
}

function getMaxRisk(preview: PaperPreviewLike): number | null {
  return parseNumber(
    preview.max_risk_dollars ??
      preview.max_risk ??
      preview.maxRisk ??
      preview.estimated_max_risk ??
      preview.estimatedMaxRisk
  );
}

function getEstimatedLimitPrice(preview: PaperPreviewLike): number | null {
  return parseNumber(
    preview.estimated_limit_price ??
      preview.estimatedLimitPrice ??
      preview.limit_price ??
      preview.limitPrice
  );
}

function average(values: Array<number | null>): number | null {
  const cleanValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );

  if (cleanValues.length === 0) return null;

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

export default function PaperOrderPreviewQualityAnalytics({
  previews = [],
}: Props) {
  const totalPreviews = previews.length;

  const fundedPassed = previews.filter(
    (preview) => getFundedFilterStatus(preview) === "PASSED"
  ).length;

  const fundedBlocked = previews.filter(
    (preview) => getFundedFilterStatus(preview) === "BLOCKED"
  ).length;

  const gradeCounts: Record<GradeKey, number> = {
    "A+": 0,
    A: 0,
    B: 0,
    C: 0,
    BLOCKED: 0,
    UNKNOWN: 0,
  };

  const statusCounts: Record<PreviewStatusKey, number> = {
    PREVIEW_ONLY: 0,
    REVIEWED_ONLY: 0,
    READY_FOR_SANDBOX_PREVIEW: 0,
    CANCELLED: 0,
  };

  for (const preview of previews) {
    gradeCounts[getGrade(preview)] += 1;

    const status = getPreviewStatus(preview);

    if (status === "PREVIEW_ONLY") {
      statusCounts.PREVIEW_ONLY += 1;
    }

    if (status === "REVIEWED_ONLY") {
      statusCounts.REVIEWED_ONLY += 1;
    }

    if (status === "CANCELLED") {
      statusCounts.CANCELLED += 1;
    }

    if (
      status === "READY_FOR_SANDBOX_PREVIEW" ||
      isReadyForSandboxPreview(preview)
    ) {
      statusCounts.READY_FOR_SANDBOX_PREVIEW += 1;
    }
  }

  const averageMaxRisk = average(previews.map(getMaxRisk));
  const averageEstimatedLimitPrice = average(
    previews.map(getEstimatedLimitPrice)
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Preview Quality Analytics
          </p>

          <h2 className="text-lg font-semibold text-slate-100">
            Paper Order Preview Stats
          </h2>
        </div>

        <p className="text-xs text-slate-400">
          Read-only analytics. No broker order actions enabled.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Previews" value={totalPreviews} />
        <StatCard label="Funded Filter Passed" value={fundedPassed} tone="good" />
        <StatCard
          label="Funded Filter Blocked"
          value={fundedBlocked}
          tone="danger"
        />
        <StatCard label="Average Max Risk" value={formatMoney(averageMaxRisk)} />
        <StatCard
          label="Average Estimated Limit"
          value={formatMoney(averageEstimatedLimitPrice)}
        />
        <StatCard label="Preview Only" value={statusCounts.PREVIEW_ONLY} />
        <StatCard label="Reviewed Only" value={statusCounts.REVIEWED_ONLY} />
        <StatCard
          label="Ready for Sandbox Preview"
          value={statusCounts.READY_FOR_SANDBOX_PREVIEW}
          tone="warn"
        />
        <StatCard label="Cancelled" value={statusCounts.CANCELLED} />
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Contract Grade Distribution
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <GradePill grade="A+" count={gradeCounts["A+"]} />
          <GradePill grade="A" count={gradeCounts.A} />
          <GradePill grade="B" count={gradeCounts.B} />
          <GradePill grade="C" count={gradeCounts.C} />
          <GradePill grade="BLOCKED" count={gradeCounts.BLOCKED} />
          <GradePill grade="UNKNOWN" count={gradeCounts.UNKNOWN} />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-rose-300"
          : "text-slate-100";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function GradePill({ grade, count }: { grade: GradeKey; count: number }) {
  const gradeClass =
    grade === "A+" || grade === "A"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : grade === "B"
        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
        : grade === "C"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : grade === "BLOCKED"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-slate-700 bg-slate-800/60 text-slate-300";

  return (
    <div className={`rounded-lg border px-3 py-2 ${gradeClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{grade}</span>
        <span className="text-lg font-bold">{count}</span>
      </div>
    </div>
  );
}