"use client";

import React from "react";
import WaitingRoomDashboard from "@/components/WaitingRoomDashboard";
import SafetyBanner from "@/components/SafetyBanner";
import ChatInterface from "@/components/ChatInterface";

interface PatientContext {
  name: string;
  appointmentType: string;
  estimatedWait: number;
  anxietyLevel: number;
  checkInTime: string;
}

interface WaitingRoomClientProps {
  patientContext: PatientContext | null;
}

export default function WaitingRoomClient({
  patientContext,
}: WaitingRoomClientProps) {
  if (!patientContext) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
        className="page-enter"
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
          }}
        >
          Session Not Found
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            maxWidth: "400px",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          It looks like you haven&apos;t checked in yet, or your session has expired.
          Please complete the check-in form to access the waiting room.
        </p>
        <a
          href="/"
          className="btn-primary"
          style={{ textDecoration: "none" }}
        >
          Go to Check-In →
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* Top Section: Dashboard */}
      <WaitingRoomDashboard
        patientName={patientContext.name}
        appointmentType={patientContext.appointmentType}
        estimatedWait={patientContext.estimatedWait}
        anxietyLevel={patientContext.anxietyLevel}
        checkInTime={patientContext.checkInTime}
      />

      {/* Safety Banner */}
      <div style={{ marginBottom: "1rem" }}>
        <SafetyBanner />
      </div>

      {/* Chat Section */}
      <div>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
            }}
          >
            💬
          </span>
          Chat with Ava
        </h2>
        <ChatInterface patientName={patientContext.name} />
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: "1.5rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        🔒 This session is secure. Your health information is protected by
        HttpOnly cookies and server-side storage. No PHI is stored in your
        browser.
      </p>
    </div>
  );
}
