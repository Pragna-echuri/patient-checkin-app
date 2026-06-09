import { z } from "zod";
import { patientCheckInSchema } from "./validations";

// ─── Patient Data ───────────────────────────────────────────
// Inferred directly from Zod schema + server-generated fields
export type PatientCheckInInput = z.infer<typeof patientCheckInSchema>;

export interface PatientData extends PatientCheckInInput {
  id: string;
  estimatedWait: number;   // minutes
  checkInTime: string;     // ISO 8601
}

// ─── Chat Types ─────────────────────────────────────────────
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  flagged?: boolean;
  safetyLayer?: string;
}

// ─── Orchestrator Types ─────────────────────────────────────
export type ClassificationLabel = "SAFE" | "CLINICAL" | "EMERGENCY";

export interface ClassificationResult {
  label: ClassificationLabel;
  confidence: number;
}

export interface OrchestratorRequest {
  message: string;
  conversationHistory: ChatMessage[];
}

export interface EmergencyPayload {
  type: "emergency";
  message: string;
  emergencyPhone: string;
  crisisPhone: string;
  flaggedKeywords?: string[];
}

export interface StreamPayload {
  type: "stream";
}

export interface OrchestratorResponse {
  type: "emergency" | "stream";
  payload?: EmergencyPayload;
}
