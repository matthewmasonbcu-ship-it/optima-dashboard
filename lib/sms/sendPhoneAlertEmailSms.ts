import nodemailer from "nodemailer";

type SendPhoneAlertEmailSmsResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendPhoneAlertEmailSms(
  body: string
): Promise<SendPhoneAlertEmailSmsResult> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const gatewayEmail = process.env.SMS_GATEWAY_EMAIL;

  if (!user || !pass || !host || !port || !gatewayEmail) {
    return {
      success: false,
      error: "Email-to-SMS environment variables are not configured.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: user,
      to: gatewayEmail,
      subject: "",
      text: body,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown SMTP error.";

    return { success: false, error: errorMessage };
  }
}
