import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendPhoneAlertSms } from "@/lib/sms/sendPhoneAlertSms";
import { sendPhoneAlertEmailSms } from "@/lib/sms/sendPhoneAlertEmailSms";

const ROUTE = "/api/cron/daily-summary";

const SUMMARY_TIME_NY = { hour: 16, minute: 0 };
const SUMMARY_TIME_TOLERANCE_MINUTES = 2;

type OptionTradeDetail = {
  option_pnl?: number | null;
  option_status?: string | null;
  contract_quality?: string | null;
  max_risk?: number | null;
  created_at?: string | null;
};

function isClosedOptionDetail(detail: OptionTradeDetail) {
  return (
    String(detail.option_status || "").toLowerCase() === "closed" ||
    detail.option_pnl != null
  );
}

function normalizeQuality(value: string | null | undefined): string {
  const q = String(value || "")
    .trim()
    .toUpperCase();

  if (!q || q === "UNKNOWN" || q === "NULL" || q === "N/A") return "N/A";

  // Backward compatibility with older saved records.
  if (q === "IDEAL") return "A+";
  if (q === "GOOD") return "A";
  if (q === "ACCEPTABLE") return "B";
  if (q === "AVOID") return "BLOCKED";

  if (q === "A+" || q === "A" || q === "B" || q === "C" || q === "BLOCKED") {
    return q;
  }

  return "N/A";
}

function formatSignedMoney(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function getNewYorkUtcOffsetHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).formatToParts(date);

  const tzName = parts.find((part) => part.type === "timeZoneName")?.value;
  return tzName === "EDT" ? 4 : 5;
}

function getStartOfTodayNewYorkISO(now: Date): string {
  const nyDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);

  const offsetHours = getNewYorkUtcOffsetHours(now);
  const offsetStr = String(offsetHours).padStart(2, "0");

  return new Date(`${nyDateStr}T00:00:00.000-${offsetStr}:00`).toISOString();
}

function getDateLabelNewYork(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}

function isSummaryTimeNowInNewYork(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const weekday = map.weekday;

  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const nowMinutes = hour * 60 + minute;
  const targetMinutes = SUMMARY_TIME_NY.hour * 60 + SUMMARY_TIME_NY.minute;

  return (
    isWeekday &&
    Math.abs(nowMinutes - targetMinutes) <= SUMMARY_TIME_TOLERANCE_MINUTES
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json(
      { success: false, route: ROUTE, message: "Unauthorized." },
      { status: 401 }
    );
  }

  const now = new Date();

  if (!isSummaryTimeNowInNewYork(now)) {
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      message: "Not the 4:00 PM Eastern summary window. Skipping.",
    });
  }

  try {
    const startOfTodayISO = getStartOfTodayNewYorkISO(now);
    const dateLabel = getDateLabelNewYork(now);

    const { data, error } = await supabase
      .from("option_trade_details")
      .select("option_pnl, option_status, contract_quality, max_risk, created_at")
      .gte("created_at", startOfTodayISO);

    if (error) {
      console.error("Daily summary query failed:", error);
      return NextResponse.json(
        { success: false, route: ROUTE, message: error.message },
        { status: 500 }
      );
    }

    const trades = (data || []) as OptionTradeDetail[];

    let message: string;

    if (trades.length === 0) {
      message = `OPTIMA DAILY SUMMARY — ${dateLabel}\nNo trades today.`;
    } else {
      const closedToday = trades.filter(isClosedOptionDetail);
      const openToday = trades.filter((t) => !isClosedOptionDetail(t));
      const wins = closedToday.filter((t) => Number(t.option_pnl || 0) > 0);
      const losses = closedToday.filter((t) => Number(t.option_pnl || 0) < 0);
      const closedPnl = closedToday.reduce(
        (sum, t) => sum + Number(t.option_pnl || 0),
        0
      );
      const winRate =
        closedToday.length > 0
          ? `${Math.round((wins.length / closedToday.length) * 100)}%`
          : "—";
      const openRisk = openToday.reduce(
        (sum, t) => sum + Number(t.max_risk || 0),
        0
      );

      const qualityCounts: Record<string, number> = {};
      for (const trade of trades) {
        const quality = normalizeQuality(trade.contract_quality);
        qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
      }
      const qualityMix = Object.entries(qualityCounts)
        .map(([quality, count]) => `${quality} x${count}`)
        .join(", ");

      const lines = [
        `OPTIMA DAILY SUMMARY — ${dateLabel}`,
        `Trades today: ${trades.length} (${closedToday.length} closed, ${openToday.length} open)`,
        `Closed P/L: ${formatSignedMoney(closedPnl)} (${wins.length}W / ${losses.length}L)`,
        `Win rate today: ${winRate}`,
        `Open risk: $${openRisk.toFixed(2)} (${openToday.length} position${openToday.length === 1 ? "" : "s"})`,
      ];

      if (qualityMix) {
        lines.push(`Quality: ${qualityMix}`);
      }

      message = lines.join("\n");
    }

    const smsResult = await sendPhoneAlertSms(message);
    const emailSmsResult = smsResult.success
      ? null
      : await sendPhoneAlertEmailSms(message);

    return NextResponse.json({
      success: true,
      route: ROUTE,
      message,
      delivery: {
        smsSent: smsResult.success,
        emailSmsSent: emailSmsResult?.success ?? false,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error during daily summary.";

    console.error("Daily summary route error:", error);

    return NextResponse.json(
      { success: false, route: ROUTE, message: errorMessage },
      { status: 500 }
    );
  }
}
