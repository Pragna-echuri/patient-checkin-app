"use client";

import React from "react";

interface CrisisOverlayProps {
  emergencyPhone: string;
  crisisPhone: string;
  message: string;
  onDismiss: () => void;
}

export default function CrisisOverlay({
  emergencyPhone,
  crisisPhone,
  message,
  onDismiss,
}: CrisisOverlayProps) {
  return (
    <div
      className="crisis-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Crisis Support"
      id="crisis-overlay"
    >
      <div className="crisis-card">
        {/* Emergency Icon */}
        <div
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
          }}
          className="pulse-ring"
        >
          🚨
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#fca5a5",
            marginBottom: "1rem",
          }}
        >
          Your Safety Matters
        </h2>

        {/* Message */}
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            marginBottom: "1.5rem",
          }}
        >
          {message}
        </p>

        {/* Emergency Phone */}
        <a
          href={`tel:${emergencyPhone}`}
          className="crisis-phone-link"
          id="emergency-phone-link"
        >
          📞 Emergency Services: {emergencyPhone}
        </a>

        {/* Crisis Hotline */}
        <a
          href={`tel:${crisisPhone}`}
          className="crisis-phone-link"
          id="crisis-phone-link"
          style={{
            background: "rgba(245, 158, 11, 0.15)",
            borderColor: "rgba(245, 158, 11, 0.4)",
            color: "#fbbf24",
          }}
        >
          💛 Crisis & Suicide Hotline: {crisisPhone}
        </a>

        {/* Additional Resources */}
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            marginTop: "1.5rem",
            lineHeight: 1.5,
          }}
        >
          A staff member has been notified and will be with you shortly.
          <br />
          You are not alone. Help is available right now.
        </p>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          id="crisis-dismiss-btn"
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1.5rem",
            background: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "var(--text-secondary)";
            (e.target as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "var(--border-color)";
            (e.target as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
        >
          I understand, continue to waiting room
        </button>
      </div>
    </div>
  );
}
