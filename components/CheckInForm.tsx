"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  patientCheckInSchema,
  PatientCheckInFormData,
  appointmentTypes,
} from "@/lib/validations";

const STEPS = [
  { title: "Personal Info", icon: "👤" },
  { title: "Appointment", icon: "📋" },
  { title: "Consent", icon: "✅" },
];

export default function CheckInForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientCheckInFormData>({
    resolver: zodResolver(patientCheckInSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      appointmentType: undefined,
      visitReason: "",
      insuranceProvider: "",
      consentSigned: undefined as unknown as true,
      anxietyLevel: 5,
    },
    mode: "onBlur",
  });

  const anxietyLevel = watch("anxietyLevel");

  const getAnxietyColor = (level: number) => {
    if (level <= 3) return "#06d6a0";
    if (level <= 6) return "#f59e0b";
    return "#ef4444";
  };

  const getAnxietyLabel = (level: number) => {
    if (level <= 2) return "Very Calm";
    if (level <= 4) return "Slightly Anxious";
    if (level <= 6) return "Moderately Anxious";
    if (level <= 8) return "Quite Anxious";
    return "Very Anxious";
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof PatientCheckInFormData)[] = [];

    switch (step) {
      case 0:
        fieldsToValidate = ["name", "dateOfBirth", "insuranceProvider"];
        break;
      case 1:
        fieldsToValidate = ["appointmentType", "visitReason"];
        break;
      case 2:
        fieldsToValidate = ["consentSigned", "anxietyLevel"];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid && step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = async (data: PatientCheckInFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessages = result.errors
          ? Object.values(result.errors).flat().join(", ")
          : "Check-in failed. Please try again.";
        setSubmitError(errorMessages as string);
        return;
      }

      router.push("/waiting-room");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: "640px", margin: "0 auto" }}>
      {/* ─── Step Indicator ──────────────────────────────── */}
      <div className="step-indicator" style={{ marginBottom: "2rem" }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div
              className={`step-dot ${
                i < step ? "completed" : i === step ? "active" : "pending"
              }`}
              title={s.title}
            >
              {i < step ? "✓" : s.icon}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`step-line ${i < step ? "completed" : ""}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ─── Step Labels ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2rem",
          paddingInline: "0.25rem",
        }}
      >
        {STEPS.map((s, i) => (
          <span
            key={i}
            style={{
              fontSize: "0.75rem",
              color: i === step ? "var(--color-primary-light)" : "var(--text-muted)",
              fontWeight: i === step ? 600 : 400,
              textAlign: "center",
              flex: 1,
              transition: "all 0.3s ease",
            }}
          >
            {s.title}
          </span>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ═══ STEP 0: Personal Info ═══════════════════════ */}
        {step === 0 && (
          <div
            className="page-enter"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                background:
                  "linear-gradient(135deg, var(--color-primary-light), var(--color-accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Welcome! Let&apos;s get you checked in.
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Your information is encrypted and handled securely.
            </p>

            <div>
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="Enter your full name"
                {...register("name")}
              />
              {errors.name && (
                <p className="form-error">⚠ {errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="form-label">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className={`form-input ${errors.dateOfBirth ? "error" : ""}`}
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="form-error">⚠ {errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="insuranceProvider" className="form-label">
                Insurance Provider
              </label>
              <input
                id="insuranceProvider"
                type="text"
                className={`form-input ${errors.insuranceProvider ? "error" : ""}`}
                placeholder="e.g., Blue Cross Blue Shield"
                {...register("insuranceProvider")}
              />
              {errors.insuranceProvider && (
                <p className="form-error">
                  ⚠ {errors.insuranceProvider.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 1: Appointment Details ═════════════════ */}
        {step === 1 && (
          <div
            className="page-enter"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                background:
                  "linear-gradient(135deg, var(--color-primary-light), var(--color-accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Tell us about your visit
            </h2>

            <div>
              <label htmlFor="appointmentType" className="form-label">
                Appointment Type
              </label>
              <select
                id="appointmentType"
                className={`form-input ${errors.appointmentType ? "error" : ""}`}
                {...register("appointmentType")}
              >
                <option value="">Select appointment type...</option>
                {appointmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.appointmentType && (
                <p className="form-error">
                  ⚠ {errors.appointmentType.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="visitReason" className="form-label">
                Reason for Visit
              </label>
              <textarea
                id="visitReason"
                className={`form-input ${errors.visitReason ? "error" : ""}`}
                placeholder="Please describe the reason for your visit today (minimum 10 characters)"
                rows={4}
                style={{ resize: "vertical", minHeight: "100px" }}
                {...register("visitReason")}
              />
              {errors.visitReason && (
                <p className="form-error">⚠ {errors.visitReason.message}</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Consent & Anxiety ══════════════════ */}
        {step === 2 && (
          <div
            className="page-enter"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                background:
                  "linear-gradient(135deg, var(--color-primary-light), var(--color-accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Almost done!
            </h2>

            {/* Anxiety Level */}
            <div>
              <label htmlFor="anxietyLevel" className="form-label">
                How are you feeling about today&apos;s visit?
              </label>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                1 = Very Calm — 10 = Very Anxious
              </p>

              <div style={{ position: "relative", padding: "0.5rem 0" }}>
                <input
                  id="anxietyLevel"
                  type="range"
                  min={1}
                  max={10}
                  className="anxiety-slider"
                  style={{
                    background: `linear-gradient(to right, #06d6a0, #f59e0b, #ef4444)`,
                  }}
                  {...register("anxietyLevel", { valueAsNumber: true })}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    😌 Calm
                  </span>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: getAnxietyColor(anxietyLevel),
                      transition: "color 0.3s ease",
                    }}
                  >
                    {anxietyLevel} — {getAnxietyLabel(anxietyLevel)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    😰 Anxious
                  </span>
                </div>
              </div>
              {errors.anxietyLevel && (
                <p className="form-error">⚠ {errors.anxietyLevel.message}</p>
              )}
            </div>

            {/* Consent */}
            <div
              style={{
                background: "rgba(14, 165, 233, 0.08)",
                border: "1px solid rgba(14, 165, 233, 0.2)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <input
                  id="consentSigned"
                  type="checkbox"
                  style={{
                    width: "20px",
                    height: "20px",
                    marginTop: "2px",
                    accentColor: "var(--color-primary)",
                    cursor: "pointer",
                  }}
                  onChange={(e) => {
                    setValue("consentSigned", e.target.checked as unknown as true, {
                      shouldValidate: true,
                    });
                  }}
                />
                <label
                  htmlFor="consentSigned"
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    lineHeight: 1.6,
                  }}
                >
                  I consent to the collection and processing of my health information
                  for the purpose of this visit. I understand that my data is handled
                  securely and in compliance with applicable privacy regulations. I
                  also understand that the AI companion in the waiting room is{" "}
                  <strong style={{ color: "var(--color-warning)" }}>
                    not a medical professional
                  </strong>{" "}
                  and cannot provide diagnoses or medical advice.
                </label>
              </div>
              {errors.consentSigned && (
                <p className="form-error" style={{ marginTop: "0.5rem", marginLeft: "2rem" }}>
                  ⚠ {errors.consentSigned.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Submit Error ──────────────────────────────── */}
        {submitError && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            ⚠ {submitError}
          </div>
        )}

        {/* ─── Navigation Buttons ────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "2rem",
            gap: "1rem",
          }}
        >
          {step > 0 ? (
            <button type="button" className="btn-secondary" onClick={handleBack}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={handleNext}>
              Continue →
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Checking in...
                </>
              ) : (
                "Complete Check-In ✓"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
