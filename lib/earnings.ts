// Read-only earnings-date lookup via the internal /api/earnings Finnhub proxy.
// FAILS OPEN: any error or missing data returns null, so the scan never blocks a
// symbol on absent earnings info and never crashes the run.

export async function fetchNextEarningsDate(
  symbol: string,
  baseUrl = ""
): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl}/api/earnings?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return null;
    const date = data?.nextEarningsDate;
    return typeof date === "string" && date ? date : null;
  } catch {
    return null;
  }
}
