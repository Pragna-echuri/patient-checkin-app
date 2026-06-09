import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createGroq } from "@ai-sdk/groq";
import Groq from "groq-sdk";
import { streamText } from "ai";
import { getPatient } from "@/lib/mock-db";
import { scanInput, filterOutput, SAFE_FALLBACK_MESSAGE } from "@/lib/safety-layers";
import { generateTraceId, logEvent } from "@/lib/telemetry";
import { ChatMessage, ClassificationLabel } from "@/lib/types";

// ─── Groq Clients ──────────────────────────────────────────
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// ─── Constants ──────────────────────────────────────────────
const EMERGENCY_PHONE = process.env.EMERGENCY_PHONE || "112";
const CRISIS_PHONE = process.env.CRISIS_PHONE || "988";
const MAX_HISTORY = 5;

function buildEmergencyPayload(flaggedKeywords?: string[]) {
  return {
    type: "emergency" as const,
    message:
      "I can see you may be going through something very serious right now. Your safety is the absolute priority. Please reach out to professional help immediately.",
    emergencyPhone: EMERGENCY_PHONE,
    crisisPhone: CRISIS_PHONE,
    flaggedKeywords,
  };
}

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();
  logEvent(traceId, "ORCHESTRATOR_REQUEST_RECEIVED", {});

  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body as {
      message: string;
      conversationHistory: ChatMessage[];
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Limit conversation history to last N exchanges
    const trimmedHistory = conversationHistory.slice(-MAX_HISTORY * 2);

    // ═══════════════════════════════════════════════════════
    // LAYER 0: Deterministic Input Scan
    // ═══════════════════════════════════════════════════════
    const inputScan = scanInput(message);
    logEvent(traceId, "LAYER_0_INPUT_SCAN", {
      flagged: inputScan.flagged,
      matchedKeywords: inputScan.matchedKeywords,
    });

    if (inputScan.flagged) {
      logEvent(traceId, "LAYER_0_EMERGENCY_TRIGGERED", {
        matchedKeywords: inputScan.matchedKeywords,
      });

      return NextResponse.json(buildEmergencyPayload(inputScan.matchedKeywords));
    }

    // ═══════════════════════════════════════════════════════
    // LAYER 1: Classification Node (llama-3.1-8b-instant)
    // ═══════════════════════════════════════════════════════
    let classificationLabel: ClassificationLabel = "SAFE";
    let confidence = 1.0;

    try {
      const classificationResponse = await groqClient.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a safety classifier for a healthcare waiting room AI assistant. Categorize the user message into exactly one category:

SAFE = Administrative questions, logistics, general conversation, comfort, scheduling, waiting room topics. This includes:
  - Wait time questions ("how long will I wait?", "how much time for my appointment?", "when will I be seen?")
  - Appointment scheduling and timing questions
  - Questions about the waiting room, check-in process, or visit logistics
  - Breathing exercises, comfort tips, casual conversation
  - Any question about estimated wait, queue position, or appointment duration
CLINICAL = Medical advice requests, symptom descriptions, medication questions, treatment inquiries, health concerns. This includes:
  - "What medication should I take?"
  - "What does my diagnosis mean?"
  - Requests for treatment recommendations
EMERGENCY = Expressions of severe pain, self-harm, suicidal ideation, life-threatening symptoms, immediate danger.

IMPORTANT: Questions about appointment TIMING or WAIT TIME are SAFE, not CLINICAL. Only classify as CLINICAL if the user is asking for medical advice, diagnoses, or treatment.

When in doubt between SAFE and CLINICAL, escalate to CLINICAL. When in doubt between CLINICAL and EMERGENCY, escalate to EMERGENCY.

Respond with ONLY a JSON object: {"label": "SAFE" | "CLINICAL" | "EMERGENCY", "confidence": 0.0-1.0}`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 50,
      });

      const classificationText =
        classificationResponse.choices[0]?.message?.content || "";
      const parsed = JSON.parse(classificationText);
      classificationLabel = parsed.label || "CLINICAL";
      confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    } catch (classError) {
      logEvent(traceId, "LAYER_1_CLASSIFICATION_ERROR", {
        error:
          classError instanceof Error ? classError.message : "Classification failed",
      });
      // Fail-safe: escalate to CLINICAL on classification error
      classificationLabel = "CLINICAL";
      confidence = 0.5;
    }

    // ─── Confidence Threshold Escalation ──────────────────
    const originalLabel = classificationLabel;
    if (classificationLabel === "SAFE" && confidence < 0.75) {
      classificationLabel = "CLINICAL";
    }
    if (classificationLabel === "CLINICAL" && confidence < 0.6) {
      classificationLabel = "EMERGENCY";
    }

    logEvent(traceId, "LAYER_1_CLASSIFICATION_RESULT", {
      originalLabel,
      finalLabel: classificationLabel,
      confidence,
      escalated: originalLabel !== classificationLabel,
    });

    // ═══════════════════════════════════════════════════════
    // ROUTING: Emergency → Immediate Payload
    // ═══════════════════════════════════════════════════════
    if (classificationLabel === "EMERGENCY") {
      logEvent(traceId, "ROUTING_EMERGENCY", { confidence });
      return NextResponse.json(buildEmergencyPayload());
    }

    // ═══════════════════════════════════════════════════════
    // LAYER 2: Generation Node (llama-3.3-70b-versatile)
    // ═══════════════════════════════════════════════════════

    // Fetch patient data for context (via HttpOnly cookie)
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    let patientContext = "";

    if (sessionId) {
      const patient = await getPatient(sessionId);
      if (patient) {
        // DATA MINIMIZATION: Only inject name, appointmentType, visitReason, anxietyLevel
        // Explicitly OMIT dateOfBirth and insuranceProvider
        patientContext = `
Patient Context (minimized for privacy):
- Name: ${patient.name}
- Appointment Type: ${patient.appointmentType}
- Visit Reason: ${patient.visitReason}
- Anxiety Level: ${patient.anxietyLevel}/10
- Estimated Wait: ${patient.estimatedWait} minutes`;

        logEvent(traceId, "LAYER_2_PATIENT_CONTEXT_INJECTED", {
          fields: ["name", "appointmentType", "visitReason", "anxietyLevel"],
          redacted: ["dateOfBirth", "insuranceProvider"],
        });
      }
    }

    // Build the empathetic pivot instruction if CLINICAL
    const clinicalPivot =
      classificationLabel === "CLINICAL"
        ? `\n\nSYSTEM ALERT: The user asked a clinical question. Acknowledge with deep empathy, state your limitations clearly, and pivot to offering comfort and practical waiting-room support. NEVER diagnose, suggest treatments, or provide medical advice under ANY circumstances.`
        : "";

    const systemPrompt = `You are Ava, a warm and empathetic AI companion in a healthcare waiting room. Your role is to provide comfort, reduce anxiety, and help patients feel at ease while they wait for their appointment.

CORE RULES — YOU MUST NEVER BREAK THESE:
1. NEVER diagnose any condition or suggest any diagnosis.
2. NEVER recommend, mention, or discuss specific medications, dosages, or treatments.
3. NEVER interpret test results, lab values, or symptoms.
4. NEVER provide medical advice of any kind.
5. Always remind users that their healthcare provider is the right person for medical questions.
6. Be warm, empathetic, and genuinely caring in every response.
7. Keep responses concise (2-4 sentences typically).
8. You may discuss: waiting room logistics, appointment preparation, breathing exercises, general comfort, and casual friendly conversation.
9. IMPORTANT: If the patient asks about wait time, appointment timing, how long they will wait, or when they will be seen — you MUST answer using the "Estimated Wait" from the Patient Context below. This is administrative/logistics information, NOT medical advice. Give them a clear, friendly answer with the time.
${patientContext}${clinicalPivot}`;

    // Build messages for the LLM
    const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of trimmedHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        llmMessages.push({ role: msg.role, content: msg.content });
      }
    }

    llmMessages.push({ role: "user", content: message });

    logEvent(traceId, "LAYER_2_GENERATION_START", {
      model: "llama-3.3-70b-versatile",
      classification: classificationLabel,
      historyLength: trimmedHistory.length,
    });

    // ═══════════════════════════════════════════════════════
    // LAYER 3: Server-Side Hold & Filter (Streaming)
    // ═══════════════════════════════════════════════════════
    // Buffer chunks at natural breakpoints, run output filter,
    // abort and substitute safe fallback on violation.

    const result = streamText({
      model: groqProvider("llama-3.3-70b-versatile"),
      messages: llmMessages,
      temperature: 0.7,
      maxOutputTokens: 512,
    });

    // Create a custom ReadableStream that buffers and filters
    const encoder = new TextEncoder();
    let buffer = "";
    let aborted = false;

    const filteredStream = new ReadableStream({
      async start(controller) {
        try {
          const textStream = result.textStream;

          for await (const chunk of textStream) {
            if (aborted) break;

            buffer += chunk;

            // Buffer at natural breakpoints (punctuation + space, or newline)
            const breakpointRegex = /[.!?]\s|\n/;
            while (breakpointRegex.test(buffer)) {
              const match = buffer.match(breakpointRegex);
              if (!match || match.index === undefined) break;

              const sentence = buffer.slice(0, match.index + match[0].length);
              buffer = buffer.slice(match.index + match[0].length);

              // Run Layer 3 output filter on the buffered sentence
              const filterResult = filterOutput(sentence);

              if (!filterResult.safe) {
                logEvent(traceId, "LAYER_3_OUTPUT_VIOLATION", {
                  violations: filterResult.violations,
                  interceptedContent: sentence.slice(0, 50) + "...",
                });

                // Abort the stream and enqueue safe fallback
                aborted = true;
                controller.enqueue(encoder.encode(`0:${JSON.stringify(SAFE_FALLBACK_MESSAGE)}\n`));
                controller.close();
                return;
              }

              // Clean sentence — forward to client
              controller.enqueue(encoder.encode(`0:${JSON.stringify(sentence)}\n`));
            }
          }

          // Flush remaining buffer
          if (!aborted && buffer.length > 0) {
            const filterResult = filterOutput(buffer);
            if (!filterResult.safe) {
              logEvent(traceId, "LAYER_3_OUTPUT_VIOLATION_FLUSH", {
                violations: filterResult.violations,
              });
              controller.enqueue(encoder.encode(`0:${JSON.stringify(SAFE_FALLBACK_MESSAGE)}\n`));
            } else {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(buffer)}\n`));
            }
          }

          logEvent(traceId, "LAYER_3_STREAM_COMPLETE", { aborted });
          if (!aborted) {
            controller.close();
          }
        } catch (streamError) {
          logEvent(traceId, "LAYER_3_STREAM_ERROR", {
            error: streamError instanceof Error ? streamError.message : "Stream failed",
          });
          controller.enqueue(
            encoder.encode(
              `0:${JSON.stringify("I'm having a moment — could you try asking me again?")}\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(filteredStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Trace-Id": traceId,
      },
    });
  } catch (error) {
    logEvent(traceId, "ORCHESTRATOR_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "An error occurred processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}
