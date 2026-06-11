import { NextResponse } from "next/server";
import {
  evaluateFundedAccountSafety,
  FundedAccountSafetyInput,
} from "@/lib/fundedAccountSafetyFilter";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          route: "/api/safety/funded-account-filter",
          mode: "funded_account_safety_filter_test_only",
          status: "ERROR",
          message: "Invalid JSON body.",
          brokerCall: false,
          dbWrites: false,
          orderCreated: false,
        },
        { status: 400 }
      );
    }

    const input = body as FundedAccountSafetyInput;
    const result = evaluateFundedAccountSafety(input);

    return NextResponse.json(
      {
        success: true,
        route: "/api/safety/funded-account-filter",
        mode: "funded_account_safety_filter_test_only",
        status: result.status,
        score: result.score,
        reasons: result.reasons,
        warnings: result.warnings,
        brokerCall: false,
        dbWrites: false,
        orderCreated: false,
        safetyLocks: {
          approved_for_order: false,
          approved_for_sandbox_order: false,
          approved_for_live_order: false,
          submitted_to_broker: false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Funded account safety filter test route error:", error);

    return NextResponse.json(
      {
        success: false,
        route: "/api/safety/funded-account-filter",
        mode: "funded_account_safety_filter_test_only",
        status: "ERROR",
        message: "Unexpected server error during funded account safety test.",
        brokerCall: false,
        dbWrites: false,
        orderCreated: false,
      },
      { status: 500 }
    );
  }
}