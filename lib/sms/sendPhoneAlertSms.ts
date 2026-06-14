import twilio from "twilio";

type SendPhoneAlertSmsResult =
  | { success: true; sid: string }
  | { success: false; error: string };

export async function sendPhoneAlertSms(
  body: string
): Promise<SendPhoneAlertSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.TWILIO_ALERT_TO_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return {
      success: false,
      error: "Twilio environment variables are not configured.",
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Twilio error.";

    return { success: false, error: errorMessage };
  }
}
