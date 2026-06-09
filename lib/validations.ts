import { z } from "zod";

// ─── Single Source of Truth ─────────────────────────────────
// Used on both client (React Hook Form) and server (API route)

export const appointmentTypes = [
  "General Checkup",
  "Blood Draw",
  "X-Ray",
  "Cardiology",
  "Dermatology",
  "Follow-Up",
] as const;

export const patientCheckInSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  dateOfBirth: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date < new Date();
      },
      { message: "Must be a valid date in the past" }
    ),

  appointmentType: z.enum(appointmentTypes, {
    message: "Please select a valid appointment type",
  }),

  visitReason: z
    .string()
    .min(10, "Please describe your visit reason in at least 10 characters")
    .max(500, "Visit reason must be under 500 characters")
    .trim(),

  insuranceProvider: z
    .string()
    .min(2, "Insurance provider must be at least 2 characters")
    .max(100, "Insurance provider must be under 100 characters")
    .trim(),

  consentSigned: z.literal(true, {
    message: "You must sign the consent to proceed",
  }),

  anxietyLevel: z
    .number()
    .int("Anxiety level must be a whole number")
    .min(1, "Anxiety level must be at least 1")
    .max(10, "Anxiety level cannot exceed 10"),
});

export type PatientCheckInFormData = z.infer<typeof patientCheckInSchema>;
