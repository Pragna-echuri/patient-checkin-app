import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { patientCheckInSchema } from "@/lib/validations";
import { storePatient } from "@/lib/mock-db";
import { generateTraceId, logEvent } from "@/lib/telemetry";
import { PatientData } from "@/lib/types";

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
  logEvent(traceId, "CHECKIN_REQUEST_RECEIVED", {});

  try {
    const body = await request.json();

    // ─── Zod Runtime Validation Firewall ──────────────────
    const parsed = patientCheckInSchema.safeParse(body);

    if (!parsed.success) {
      logEvent(traceId, "CHECKIN_VALIDATION_FAILED", {
        errors: parsed.error.flatten().fieldErrors,
      });

      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // ─── PHI Isolation ────────────────────────────────────
    const sessionId = uuidv4();
    const estimatedWait = Math.floor(Math.random() * 25) + 5; // 5-30 min

    const patientData: PatientData = {
      ...parsed.data,
      id: uuidv4(),
      estimatedWait,
      checkInTime: new Date().toISOString(),
    };

    await storePatient(sessionId, patientData);

    logEvent(traceId, "CHECKIN_PATIENT_STORED", {
      sessionId: sessionId.slice(0, 8) + "...", // Partial ID for audit
      appointmentType: patientData.appointmentType,
      anxietyLevel: patientData.anxietyLevel,
    });

    // ─── Secure HttpOnly Cookie ───────────────────────────
    const cookieStore = await cookies();
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    logEvent(traceId, "CHECKIN_COOKIE_SET", {
      httpOnly: true,
      sameSite: "strict",
    });

    // ─── Response: NO PHI Exposed ─────────────────────────
    return NextResponse.json(
      {
        success: true,
        estimatedWait,
        message: "Check-in complete. Redirecting to waiting room.",
      },
      { status: 200 }
    );
  } catch (error) {
    logEvent(traceId, "CHECKIN_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        errors: { _form: ["An unexpected error occurred. Please try again."] },
      },
      { status: 500 }
    );
  }
}
