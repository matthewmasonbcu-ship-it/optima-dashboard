// Read-only earnings-date lookup via the internal /api/earnings Finnhub proxy.
// Distinguishes two outcomes the caller must treat differently:
//   { status: "ok", nextEarningsDate: string | null }
//     — the proxy answered. A null date means genuinely no earnings in the
//       lookahead window (the normal, safe case; caller proceeds silently).
//   { status: "error", reason: string }
//     — the fetch/API failed, so earnings status is UNKNOWN. Caller must NOT
//       assume "no earnings" here (fail-closed + loud), because that would let a
//       trade be held through earnings we simply couldn't verify.
export type EarningsLookup =
  | { status: "ok"; nextEarningsDate: string | null }
  | { status: "error"; reason: string };

export async function fetchNextEarningsDate(
  symbol: string,
  baseUrl = ""
): Promise<EarningsLookup> {
  try {
    const res = await fetch(
      `${baseUrl}/api/earnings?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      const reason =
        (data && typeof data.error === "string" && data.error) ||
        `earnings proxy returned ${res.status}`;
      return { status: "error", reason };
    }
    const date = data?.nextEarningsDate;
    return {
      status: "ok",
      nextEarningsDate: typeof date === "string" && date ? date : null,
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "earnings fetch threw",
    };
  }
}
