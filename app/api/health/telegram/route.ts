import { NextResponse } from "next/server";

// Out-of-band liveness check for the Telegram alert channel (audit R1 / Part 2 C).
// An external monitor (UptimeRobot / cron-job.org) pings this on a schedule; a
// non-200 means the bot token/config is broken and in-app alerts are silently
// dead, so the monitor notifies via ITS OWN channel (email/SMS). Read-only:
// calls Telegram getMe, sends nothing, and never returns the token.
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { status: "error", channel: "telegram", reason: "not_configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", channel: "telegram", reason: `telegram_api_${res.status}` },
        { status: 500 }
      );
    }
    const data = await res.json();
    return NextResponse.json({
      status: "ok",
      channel: "telegram",
      bot: data?.result?.username ?? null, // public bot handle only — never the token
    });
  } catch {
    return NextResponse.json(
      { status: "error", channel: "telegram", reason: "unreachable" },
      { status: 500 }
    );
  }
}
