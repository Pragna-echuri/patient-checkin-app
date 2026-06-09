// ─── LAYER 0: Deterministic Input Scanner ───────────────────
// Lightweight, pre-LLM keyword detection for high-risk content.
// Evaluated BEFORE any API call to minimize latency on emergencies.

const HIGH_RISK_KEYWORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "want to die",
  "end my life",
  "self-harm",
  "self harm",
  "cutting myself",
  "overdose",
  "chest pain",
  "heart attack",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "severe bleeding",
  "bleeding heavily",
  "stroke",
  "seizure",
  "unconscious",
  "anaphylaxis",
  "allergic reaction severe",
  "choking",
  "stabbed",
  "shot",
  "gunshot",
  "poisoning",
  "poisoned",
];

export interface InputScanResult {
  flagged: boolean;
  matchedKeywords: string[];
}

/**
 * Layer 0: Scan user input for high-risk emergency keywords.
 * Case-insensitive matching against a curated keyword list.
 */
export function scanInput(message: string): InputScanResult {
  const lower = message.toLowerCase();
  const matchedKeywords = HIGH_RISK_KEYWORDS.filter((keyword) =>
    lower.includes(keyword)
  );

  return {
    flagged: matchedKeywords.length > 0,
    matchedKeywords,
  };
}

// ─── LAYER 3: Deterministic Output Filter ───────────────────
// Server-side post-LLM filter using strict word boundaries (\b)
// to detect medication patterns and diagnostic language.

// Medication patterns: drug names and dosage formats
const MEDICATION_PATTERNS = [
  /\b(?:aspirin|ibuprofen|acetaminophen|tylenol|advil|motrin)\b/i,
  /\b(?:amoxicillin|azithromycin|ciprofloxacin|metformin|lisinopril)\b/i,
  /\b(?:omeprazole|atorvastatin|simvastatin|levothyroxine|amlodipine)\b/i,
  /\b(?:metoprolol|losartan|gabapentin|hydrochlorothiazide|sertraline)\b/i,
  /\b(?:prednisone|fluoxetine|escitalopram|duloxetine|tramadol)\b/i,
  /\b(?:oxycodone|hydrocodone|morphine|codeine|fentanyl)\b/i,
  /\b(?:xanax|valium|ativan|klonopin|ambien)\b/i,
  /\b(?:viagra|cialis)\b/i,
  /\b(?:take|prescribe|administer|inject)\s+\d+\s*(?:mg|ml|mcg|units?|tablets?|capsules?|pills?)\b/i,
  /\d+\s*(?:mg|ml|mcg)\s+(?:of\s+)?\w+/i,
];

// Diagnostic language patterns
const DIAGNOSTIC_PATTERNS = [
  /\byou\s+(?:have|suffer\s+from|are\s+diagnosed\s+with)\b/i,
  /\b(?:diagnosis|diagnosed)\s+(?:is|as|with)\b/i,
  /\b(?:i\s+(?:prescribe|recommend\s+taking|suggest\s+you\s+take))\b/i,
  /\bthis\s+(?:is|looks\s+like|appears\s+to\s+be)\s+(?:a\s+)?(?:case\s+of\s+)?\w+\s+(?:disease|syndrome|disorder|infection|condition)\b/i,
  /\byour\s+(?:test\s+results?|labs?|bloodwork)\s+(?:show|indicate|reveal|confirm)\b/i,
  /\b(?:start|begin)\s+(?:a\s+)?(?:course|regimen|treatment)\s+of\b/i,
];

export interface OutputFilterResult {
  safe: boolean;
  violations: string[];
  cleanedContent?: string;
}

/**
 * Layer 3: Filter LLM output for medication/diagnostic language.
 * Uses strict word boundaries to minimize false positives.
 */
export function filterOutput(content: string): OutputFilterResult {
  const violations: string[] = [];

  for (const pattern of MEDICATION_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      violations.push(`Medication reference: "${match[0]}"`);
    }
  }

  for (const pattern of DIAGNOSTIC_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      violations.push(`Diagnostic language: "${match[0]}"`);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Safe fallback message when output filter catches a violation.
 */
export const SAFE_FALLBACK_MESSAGE =
  "I appreciate you sharing that with me. For anything related to medical advice, diagnoses, or medications, please speak directly with your healthcare provider during your appointment today. They'll be able to give you the personalized care you deserve. Is there anything else about your visit I can help with — like what to expect or how to feel more comfortable while you wait?";
