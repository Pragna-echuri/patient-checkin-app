# MedWait — Patient Check-In & AI Companion

A safety-critical healthcare web application featuring a multi-step patient check-in form, zero-trust session management, and an AI companion ("Ava") with a 4-layer guardrail architecture for safe, empathetic patient interaction.

> ⚠️ **This is a demonstration application.** While it implements real safety patterns, it is not production-ready for actual healthcare use without additional hardening (see [Architectural Limitations](#architectural-limitations)).

---

## Table of Contents

- [Architecture & Zero-Trust](#architecture--zero-trust)
- [Safety Deep Dive](#safety-deep-dive)
- [Telemetry & Audit Trail](#telemetry--audit-trail)
- [Architectural Limitations](#architectural-limitations)
- [Local Setup](#local-setup)
- [Tech Stack](#tech-stack)

---

## Architecture & Zero-Trust

### HttpOnly Cookie Implementation

Patient health information (PHI) is **never exposed to the browser**. The architecture enforces this through:

1. **Check-In API (`/api/checkin`)**: Validates the incoming form data against a strict Zod schema. If validation passes, it generates a UUID `sessionId`, stores the full `PatientData` object in a server-side `Map`, and sets the `sessionId` as an **HttpOnly, Secure, SameSite=Strict** cookie.

2. **Client Blindness**: The client JavaScript, localStorage, and sessionStorage never see the `sessionId` or any PHI. The browser automatically sends the cookie on subsequent requests, but JavaScript cannot read or exfiltrate it.

3. **Orchestrator API (`/api/orchestrator`)**: Reads the `sessionId` from the incoming cookie, fetches the patient's data from the server-side store, and applies **data minimization** — only `name`, `appointmentType`, `visitReason`, and `anxietyLevel` are injected into the LLM prompt. `dateOfBirth` and `insuranceProvider` are explicitly redacted to mitigate prompt-injection PHI leaks.

### Zod API Boundary

The `patientCheckInSchema` in `lib/validations.ts` is the **single source of truth** for data validation, used by both:
- The client form (via React Hook Form's `zodResolver`) for instant feedback
- The server API route for **runtime type safety** — no unvalidated data enters the system

---

## Safety Deep Dive

### 4-Layer Defense Architecture

```
User Message
    │
    ▼
┌─────────────────────────────────┐
│  LAYER 0: Input Scanner         │  ← Deterministic keyword matching
│  (Pre-LLM, zero latency)       │     "suicide", "chest pain", etc.
│  → EMERGENCY? Abort & alert     │
└────────────┬────────────────────┘
             │ PASS
             ▼
┌─────────────────────────────────┐
│  LAYER 1: Classification Node   │  ← llama-3.1-8b-instant (JSON mode)
│  Labels: SAFE | CLINICAL | EMRG │     Fast, low-latency classifier
│  Confidence thresholds:         │
│    SAFE < 0.75 → CLINICAL       │
│    CLINICAL < 0.60 → EMERGENCY  │
└────────────┬────────────────────┘
             │ SAFE or CLINICAL
             ▼
┌─────────────────────────────────┐
│  LAYER 2: Generation Node       │  ← llama-3.3-70b-versatile
│  Empathetic, context-aware Ava  │     Patient context injected
│  CLINICAL → Empathetic Pivot    │     (data-minimized)
└────────────┬────────────────────┘
             │ Streaming output
             ▼
┌─────────────────────────────────┐
│  LAYER 3: Output Filter         │  ← Server-side stream interception
│  Regex (\b word boundaries)     │     Buffers at punctuation
│  Catches: medications, dosages  │     Replaces with safe fallback
│  diagnoses, treatment advice    │     on violation
└────────────┬────────────────────┘
             │ Clean output
             ▼
         Client UI
```

### Layer Details

| Layer | Type | Model | Purpose |
|-------|------|-------|---------|
| 0 | Deterministic | None | Pre-LLM emergency keyword detection |
| 1 | LLM Classifier | llama-3.1-8b-instant | Categorize intent with confidence scores |
| 2 | LLM Generator | llama-3.3-70b-versatile | Empathetic, safe response generation |
| 3 | Deterministic | None | Post-LLM output sanitization |

### Confidence Threshold Logic

The classifier's confidence score drives automatic escalation:
- If `SAFE` but `confidence < 0.75` → escalate to `CLINICAL`
- If `CLINICAL` but `confidence < 0.60` → escalate to `EMERGENCY`

This **fail-safe design** ensures ambiguous messages are always escalated, never dismissed.

### The Empathetic Pivot

When Layer 1 classifies a message as `CLINICAL`, a system alert is injected into Layer 2's prompt:

> *"SYSTEM ALERT: The user asked a clinical question. Acknowledge with deep empathy, state your limitations, and pivot to offering comfort. Never diagnose or advise."*

This ensures Ava acknowledges the patient's concern with genuine empathy while firmly redirecting to their healthcare provider.

---

## Telemetry & Audit Trail

### traceId Lifecycle

Every API request generates a unique `traceId` (UUID) that follows the payload through the entire safety pipeline:

```
Request arrives → traceId generated
    → LAYER_0_INPUT_SCAN (flagged: bool, matchedKeywords: [])
    → LAYER_1_CLASSIFICATION_RESULT (label, confidence, escalated)
    → LAYER_2_PATIENT_CONTEXT_INJECTED (fields used, fields redacted)
    → LAYER_2_GENERATION_START (model, classification, historyLength)
    → LAYER_3_OUTPUT_VIOLATION (if caught, with violation details)
    → LAYER_3_STREAM_COMPLETE (aborted: bool)
```

Each event is emitted as structured JSON to `console.log`, making it trivially parseable by enterprise log aggregators (Splunk, Datadog, ELK, etc.).

### Event Structure

```json
{
  "traceId": "trace-a1b2c3d4-...",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "event": "LAYER_1_CLASSIFICATION_RESULT",
  "context": {
    "originalLabel": "SAFE",
    "finalLabel": "CLINICAL",
    "confidence": 0.68,
    "escalated": true
  }
}
```

---

## Persistent Database Integration (Production Ready)

MedWait is equipped with a hybrid Database Hub ([mock-db.ts](file:///c:/VSCode/All%20my%20projects/Medical%20chatbot/patient-checkin-app/lib/mock-db.ts)) that supports both HTTP-based and TCP-based Redis, ensuring complete compatibility with serverless hosting (like Vercel) and traditional server hosting (like Railway):

- **Serverless (e.g., Vercel)**: Connects via HTTP using `@upstash/redis` (non-blocking REST client).
- **Persistent Server (e.g., Railway, Render)**: Connects via TCP using `ioredis`.
- **Local Fallback**: Falls back automatically to an encrypted in-memory `Map` if no Redis variables are present, ensuring local setup remains zero-config.

### Security: HIPAA-Compliant Encryption at Rest
To safeguard Patient Health Information (PHI) stored in third-party databases, MedWait runs a native encryption sub-layer ([crypto.ts](file:///c:/VSCode/All%20my%20projects/Medical%20chatbot/patient-checkin-app/lib/crypto.ts)):
- All patient context payloads are encrypted using **AES-256-GCM** before writing to Redis.
- Payloads are decrypted on read, using a unique 32-byte `DATABASE_ENCRYPTION_KEY`.

## Architectural Limitations

### 2. Regex-Based Output Filtering

Layer 3's regex patterns use strict `\b` word boundaries, but:

- **False Negatives**: Creative phrasing, misspellings, or euphemisms can bypass regex entirely (e.g., "take 2 of those pills" might not match if the drug name isn't listed).
- **False Positives**: Legitimate sentences mentioning medication in a non-prescriptive context could be filtered.
- **Solution**: For production, implement **semantic evaluation** using a secondary LLM call or a fine-tuned classifier to assess output safety. Consider using Guardrails AI or NeMo Guardrails.

### 3. Classification Reliability

LLM-based classification (Layer 1) can be inconsistent:

- **Prompt Injection**: A sophisticated user could craft messages to trick the classifier.
- **Solution**: Combine with embedding-based semantic similarity and maintain a continuously updated blocklist.

### 4. No Rate Limiting

The current implementation has no rate limiting on API routes. In production:

- Implement per-session rate limiting (e.g., 20 messages per minute)
- Add CAPTCHA for the check-in form
- Use Vercel's Edge Middleware for IP-based rate limiting

---

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- A [Groq API key](https://console.groq.com/)

### Installation

```bash
# Clone / navigate to the project
cd patient-checkin-app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your GROQ_API_KEY
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ Yes | — | Your Groq API key for LLM access |
| `DATABASE_ENCRYPTION_KEY` | No | *Derived* | 32-byte hex key for GCM encryption (Required in prod) |
| `UPSTASH_REDIS_REST_URL` | No | — | HTTP REST URL for Upstash Redis (Serverless prod) |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | HTTP REST token for Upstash Redis (Serverless prod) |
| `REDIS_URL` | No | — | TCP connection URL for standard Redis (Railway prod) |
| `EMERGENCY_PHONE` | No | `112` | Emergency services number (localize for your region) |
| `CRISIS_PHONE` | No | `988` | Crisis/suicide hotline number (localize for your region) |

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the check-in form.

### Testing the Safety Layers

1. **Layer 0 (Input Scan)**: Type "chest pain" in chat → Immediate emergency overlay
2. **Layer 1 (Classifier)**: Type "what medication should I take?" → Empathetic pivot response
3. **Layer 3 (Output Filter)**: The LLM is instructed not to prescribe, but if it slips through, the regex filter catches it server-side
4. **Crisis Overlay**: Triggered by Layer 0 or Layer 1 EMERGENCY classification
5. **Anxiety Escalation**: Check in with anxiety level > 7 → "Staff notified" banner appears

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 (App Router) | Full-stack React framework |
| TypeScript (strict) | Type safety |
| Tailwind CSS | Utility-first styling |
| Zod | Runtime validation (single source of truth) |
| React Hook Form | Performant form management |
| Zustand | Client-side UI state (no PHI) |
| Vercel AI SDK (`ai`, `@ai-sdk/groq`) | Streaming LLM responses |
| Groq SDK (`groq-sdk`) | Non-streaming JSON classification |
| `llama-3.1-8b-instant` | Fast intent classifier |
| `llama-3.3-70b-versatile` | Empathetic response generator |

---

## License

This project is for educational and demonstration purposes. Not licensed for production healthcare use.
