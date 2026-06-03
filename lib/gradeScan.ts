import type { Decision, Grade } from "@/lib/dashboardTypes";

export function getGrade(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "AVOID";
}

export function getDecision(grade: Grade): Decision {
  if (grade === "A") return "TAKE TRADE";
  if (grade === "B") return "WATCH CLOSELY";
  return "SKIP";
}

export function getStrategy(grade: Grade) {
  if (grade === "A") return "High-conviction momentum breakout";
  if (grade === "B") return "Possible continuation setup";
  if (grade === "C") return "Weak setup, needs confirmation";
  return "Avoid - low-quality setup";
}