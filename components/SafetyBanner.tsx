"use client";

import React from "react";

interface SafetyBannerProps {
  emergencyPhone?: string;
}

export default function SafetyBanner({
  emergencyPhone = "112",
}: SafetyBannerProps) {
  return (
    <div className="safety-banner" role="alert" id="safety-banner">
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🤖</span>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        <strong>Ava is an AI assistant.</strong> She cannot diagnose, prescribe,
        or provide medical advice. For medical emergencies, call{" "}
        <a
          href={`tel:${emergencyPhone}`}
          style={{
            color: "#fbbf24",
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          {emergencyPhone}
        </a>{" "}
        immediately.
      </p>
    </div>
  );
}
