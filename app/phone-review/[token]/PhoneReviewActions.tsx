"use client";

import { useState } from "react";

type PhoneReviewActionsProps = {
  token: string;
};

type ActionResult = {
  success: boolean;
  message: string;
} | null;

export default function PhoneReviewActions({ token }: PhoneReviewActionsProps) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [result, setResult] = useState<ActionResult>(null);

  async function handleAction(action: "approve" | "reject") {
    setPending(action);
    setResult(null);

    try {
      const response = await fetch("/api/alerts/phone-review/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });

      const data = await response.json().catch(() => null);

      setResult({
        success: Boolean(data?.success),
        message: data?.message ?? "No response from server.",
      });
    } catch {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
    } finally {
      setPending(null);
    }
  }

  if (result) {
    return (
      <p className={result.success ? "text-emerald-400" : "text-red-400"}>
        {result.message}
      </p>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => handleAction("approve")}
        disabled={pending !== null}
        className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] min-h-[44px] py-3 text-sm text-emerald-300 disabled:opacity-50"
      >
        {pending === "approve" ? "..." : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => handleAction("reject")}
        disabled={pending !== null}
        className="flex-1 rounded-lg border border-red-500/40 bg-red-500/[0.08] min-h-[44px] py-3 text-sm text-red-300 disabled:opacity-50"
      >
        {pending === "reject" ? "..." : "Reject"}
      </button>
    </div>
  );
}
