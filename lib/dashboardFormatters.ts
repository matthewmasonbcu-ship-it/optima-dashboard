export function formatDecision(decision: string | null | undefined): string {
  if (decision === "TAKE_TRADE") return "Take Trade";
  if (decision === "WATCH_CLOSELY") return "Watch Closely";
  if (decision === "WAIT") return "Wait";
  if (decision === "SKIP") return "Skip";
  return "No Decision";
}

export function formatGrade(grade: string | null | undefined): string {
  if (grade === "AVOID") return "Avoid";
  if (grade === "A" || grade === "B" || grade === "C") return `${grade} Setup`;
  return "No Grade";
}

export function getGradeStyle(grade: string | null | undefined): string {
  if (grade === "A") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (grade === "B") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (grade === "C") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (grade === "AVOID") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

export function getDecisionStyle(decision: string | null | undefined): string {
  if (decision === "TAKE_TRADE") return "text-green-400";
  if (decision === "WATCH_CLOSELY") return "text-blue-400";
  if (decision === "WAIT") return "text-yellow-400";
  if (decision === "SKIP") return "text-red-400";
  return "text-slate-400";
}

export function getRiskStyle(riskLevel: string | null | undefined): string {
  if (riskLevel === "Low")
    return "text-green-400 border-green-500/30 bg-green-500/10";
  if (riskLevel === "Medium")
    return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (riskLevel === "High")
    return "text-red-400 border-red-500/30 bg-red-500/10";
  return "text-slate-400 border-slate-500/30 bg-slate-500/10";
}

export function getResultStyle(result: string | null | undefined): string {
  if (result === "WIN")
    return "text-green-400 border-green-500/30 bg-green-500/10";
  if (result === "LOSS")
    return "text-red-400 border-red-500/30 bg-red-500/10";
  if (result === "BREAKEVEN")
    return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  return "text-slate-400 border-slate-500/30 bg-slate-500/10";
}