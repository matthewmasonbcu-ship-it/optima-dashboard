import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendPhoneAlertSms } from "@/lib/sms/sendPhoneAlertSms";
import { sendPhoneAlertEmailSms } from "@/lib/sms/sendPhoneAlertEmailSms";

const ROUTE = "/api/alerts/scanner-notify";
const MIN_SETUP_SCORE = 75;

type ScannerNotifyRequestBody = {
  symbol?: string;
  direction?: string;
  setupScore?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | ScannerNotifyRequestBody
      | null;

    const symbol = body?.symbol;
    const direction = body?.direction;
    const setupScore = body?.setupScore;

    if (!symbol || !direction || typeof setupScore !== "number") {
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          message: "Missing symbol, direction, or setupScore.",
        },
        { status: 400 }
      );
    }

    if (setupScore < MIN_SETUP_SCORE) {
      return NextResponse.json({
        success: true,
        route: ROUTE,
        skipped: true,
        message: `Setup score ${setupScore} is below the ${MIN_SETUP_SCORE} alert threshold.`,
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: existingAlert, error: existingAlertError } = await supabase
      .from("scanner_auto_alerts")
      .select("id")
      .eq("symbol", symbol)
      .eq("direction", direction)
      .gte("alerted_at", startOfDay.toISOString())
      .limit(1)
      .maybeSingle();

    if (existingAlertError) {
      console.error("Scanner auto alert dedup check failed:", existingAlertError);
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          message: existingAlertError.message,
        },
        { status: 500 }
      );
    }

    if (existingAlert) {
      return NextResponse.json({
        success: true,
        route: ROUTE,
        duplicatePrevented: true,
        message: `Scanner alert already sent for ${symbol} ${direction} today.`,
      });
    }

    const message = `OPTIMA ALERT: ${symbol} ${direction} setup — Score ${Math.round(
      setupScore
    )}/100. Open dashboard to review. No order action taken.`;

    const smsResult = await sendPhoneAlertSms(message);
    const emailSmsResult = smsResult.success
      ? null
      : await sendPhoneAlertEmailSms(message);

    const { error: insertError } = await supabase
      .from("scanner_auto_alerts")
      .insert({
        symbol,
        direction,
        setup_score: setupScore,
      });

    if (insertError) {
      console.error("Failed to log scanner auto alert:", insertError);
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          message: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      duplicatePrevented: false,
      message: "Scanner FYI alert logged. No order action taken.",
      delivery: {
        smsSent: smsResult.success,
        emailSmsSent: emailSmsResult?.success ?? false,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error while sending scanner alert.";

    console.error("Scanner notify route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: ROUTE,
        message,
      },
      { status: 500 }
    );
  }
}
