type SendTelegramAlertResult =
  | { success: true }
  | { success: false; error: string };

export async function sendTelegramAlert(
  text: string
): Promise<SendTelegramAlertResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.",
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Telegram API ${res.status}: ${body}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error.",
    };
  }
}
