type SendTelegramAlertResult =
  | { success: true }
  | { success: false; error: string };

export async function sendTelegramAlert(
  text: string
): Promise<SendTelegramAlertResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Telegram is the ONLY observability channel, so a failed send must never be
  // swallowed. Every failure is logged loudly HERE (with a snippet of the alert
  // that didn't reach you) so it always leaves a Vercel log — regardless of what
  // the call site does with the returned result.
  const preview = text.slice(0, 100).replace(/\s+/g, " ").trim();

  if (!token || !chatId) {
    const error = "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.";
    console.error(`[sendTelegramAlert] NOT SENT — ${error} | alert: "${preview}"`);
    return { success: false, error };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      const error = `Telegram API ${res.status}: ${body}`;
      console.error(`[sendTelegramAlert] FAILED — ${error} | alert: "${preview}"`);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown Telegram error.";
    console.error(`[sendTelegramAlert] FAILED — ${error} | alert: "${preview}"`);
    return { success: false, error };
  }
}
