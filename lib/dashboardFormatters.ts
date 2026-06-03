import type { Decision, Grade, TradeStatus } from "@/lib/dashboardTypes";

export function gradeColor(grade: Grade) {
  if (grade === "A") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }

  if (grade === "B") {
    return "border-blue-500/40 bg-blue-500/15 text-blue-300";
  }

  if (grade === "C") {
    return "border-yellow-500/40 bg-yellow-500/15 text-yellow-300";
  }

  return "border-red-500/40 bg-red-500/15 text-red-300";
}

export function decisionColor(decision: Decision) {
  if (decision === "TAKE TRADE") return "text-emerald-300";
  if (decision === "WATCH CLOSELY") return "text-yellow-300";
  return "text-red-300";
}

export function statusColor(status: TradeStatus) {
  if (status === "WIN") return "bg-emerald-500/15 text-emerald-300";
  if (status === "LOSS") return "bg-red-500/15 text-red-300";
  if (status === "BE") return "bg-slate-500/20 text-slate-300";
  return "bg-blue-500/15 text-blue-300";
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}