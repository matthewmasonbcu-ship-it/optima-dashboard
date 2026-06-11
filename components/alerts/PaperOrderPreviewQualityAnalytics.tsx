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

type FundedFilterKey = "PASSED" | "BLOCKED" | "UNKNOWN";

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

function getFundedFilterStatus(preview: PaperPreviewLike): FundedFilterKey {
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

  const fundedFilterCounts: Record<FundedFilterKey, number> = {
    PASSED: 0,
    BLOCKED: 0,
    UNKNOWN: 0,
  };

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
    fundedFilterCounts[getFundedFilterStatus(preview)] += 1;
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
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950/90 to-slate-950/60 p-4 shadow-[0_0_32px_-14px_rgba(8,47,73,0.6)] sm:p-5">
      {/* Ambient top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
      />

      <div className="relative mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400/80">
            <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
            Preview Quality Analytics
          </p>

          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-100">
            Paper Order Preview Stats
          </h2>
        </div>

        <p className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:self-auto">
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          Read-only — no broker order actions enabled
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-5">
        <StatCard label="Total Previews" value={totalPreviews} />

        <StatCard
          label="Funded Filter Passed"
          value={fundedFilterCounts.PASSED}
          tone="good"
        />

        <StatCard
          label="Funded Filter Blocked"
          value={fundedFilterCounts.BLOCKED}
          tone="danger"
        />

        <StatCard
          label="Funded Filter Unknown"
          value={fundedFilterCounts.UNKNOWN}
          tone="muted"
        />

        <StatCard label="Average Max Risk" value={formatMoney(averageMaxRisk)} />

        <StatCard
          label="Average Estimated Limit"
          value={formatMoney(averageEstimatedLimitPrice)}
        />

        <StatCard label="Preview Only" value={statusCounts.PREVIEW_ONLY} />

        <StatCard label="Reviewed Only" value={statusCounts.REVIEWED_ONLY} />

        <StatCard
          label="Sandbox Ready Lock"
          value={statusCounts.READY_FOR_SANDBOX_PREVIEW}
          tone="warn"
        />

        <StatCard label="Cancelled" value={statusCounts.CANCELLED} />
      </div>

      <div className="relative mt-4 rounded-xl border border-slate-800/80 bg-black/25 p-3 sm:p-4">
        <p className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          <span className="h-px w-4 bg-gradient-to-r from-cyan-500/60 to-transparent" />
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
  tone?: "neutral" | "good" | "warn" | "danger" | "muted";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-rose-300"
          : tone === "muted"
            ? "text-slate-300"
            : "text-slate-100";

  const hoverGlowClass =
    tone === "good"
      ? "hover:border-emerald-500/30 hover:shadow-[0_0_18px_-8px_rgba(52,211,153,0.35)]"
      : tone === "warn"
        ? "hover:border-amber-500/30 hover:shadow-[0_0_18px_-8px_rgba(252,211,77,0.35)]"
        : tone === "danger"
          ? "hover:border-rose-500/30 hover:shadow-[0_0_18px_-8px_rgba(251,113,133,0.35)]"
          : "hover:border-cyan-500/25 hover:shadow-[0_0_18px_-8px_rgba(34,211,238,0.25)]";

  return (
    <div
      className={`group rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 transition-all duration-300 hover:bg-slate-900/70 ${hoverGlowClass}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 transition-colors duration-300 group-hover:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-bold tabular-nums ${toneClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function GradePill({ grade, count }: { grade: GradeKey; count: number }) {
  const gradeClass =
    grade === "A+" || grade === "A"
      ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 hover:border-emerald-400/50 hover:shadow-[0_0_16px_-6px_rgba(52,211,153,0.4)]"
      : grade === "B"
        ? "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300 hover:border-cyan-400/50 hover:shadow-[0_0_16px_-6px_rgba(34,211,238,0.4)]"
        : grade === "C"
          ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-300 hover:border-amber-400/50 hover:shadow-[0_0_16px_-6px_rgba(252,211,77,0.4)]"
          : grade === "BLOCKED"
            ? "border-rose-500/25 bg-rose-500/[0.08] text-rose-300 hover:border-rose-400/50 hover:shadow-[0_0_16px_-6px_rgba(251,113,133,0.4)]"
            : "border-slate-700/70 bg-slate-800/40 text-slate-300 hover:border-slate-600";

  const dotClass =
    grade === "A+" || grade === "A"
      ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]"
      : grade === "B"
        ? "bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]"
        : grade === "C"
          ? "bg-amber-400 shadow-[0_0_5px_rgba(252,211,77,0.9)]"
          : grade === "BLOCKED"
            ? "bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,0.9)]"
            : "bg-slate-500";

  const isEmpty = count === 0;

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-all duration-300 ${gradeClass} ${
        isEmpty ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
          <span className={`h-1 w-1 rounded-full ${dotClass}`} />
          {grade}
        </span>
        <span className="font-mono text-lg font-bold tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );
}