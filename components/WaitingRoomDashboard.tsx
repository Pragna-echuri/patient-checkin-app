"use client";

import React, { useState, useEffect } from "react";

interface WaitingRoomDashboardProps {
  patientName: string;
  appointmentType: string;
  estimatedWait: number;
  anxietyLevel: number;
  checkInTime: string;
}

export default function WaitingRoomDashboard({
  patientName,
  appointmentType,
  estimatedWait,
  anxietyLevel,
  checkInTime,
}: WaitingRoomDashboardProps) {
  const [showStaffAlert, setShowStaffAlert] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Human-in-the-Loop: auto-trigger staff alert for high anxiety
  useEffect(() => {
    if (anxietyLevel > 7) {
      setShowStaffAlert(true);
    }
  }, [anxietyLevel]);

  // Calculate elapsed wait time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(checkInTime).getTime()) / 60000
      );
      setElapsedMinutes(elapsed);
    }, 30000); // Update every 30 seconds

    // Initial calculation
    const elapsed = Math.floor(
      (Date.now() - new Date(checkInTime).getTime()) / 60000
    );
    setElapsedMinutes(elapsed);

    return () => clearInterval(interval);
  }, [checkInTime]);

  const remainingWait = Math.max(0, estimatedWait - elapsedMinutes);

  const getWaitColor = () => {
    if (remainingWait <= 5) return "var(--color-accent)";
    if (remainingWait <= 15) return "var(--color-primary-light)";
    return "var(--color-warning)";
  };

  const firstName = patientName.split(" ")[0];

  return (
    <div className="page-enter">
      {/* Greeting */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            background:
              "linear-gradient(135deg, var(--color-primary-light), var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.25rem",
          }}
        >
          Welcome, {firstName}! 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          You&apos;re checked in and in the queue. Here&apos;s your visit overview.
        </p>
      </div>

      {/* Staff Alert Banner */}
      {showStaffAlert && (
        <div className="staff-alert" role="alert" id="staff-alert-banner" style={{ marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.1rem" }}>⚕️</span>
          <p style={{ margin: 0 }}>
            <strong>Staff has been notified</strong> — A team member is aware
            you may need extra support today. They&apos;ll check in with you shortly.
          </p>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="dashboard-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card" id="wait-time-card">
          <div className="stat-value" style={{ color: getWaitColor() }}>
            {remainingWait > 0 ? `~${remainingWait}` : "Soon!"}
          </div>
          <div className="stat-label">
            {remainingWait > 0 ? "Minutes Remaining" : "You're Up Next"}
          </div>

          {/* Progress bar */}
          <div
            style={{
              marginTop: "0.75rem",
              height: "4px",
              background: "var(--bg-input)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (elapsedMinutes / estimatedWait) * 100)}%`,
                background: `linear-gradient(90deg, var(--color-primary), var(--color-accent))`,
                borderRadius: "2px",
                transition: "width 1s ease",
              }}
            />
          </div>
        </div>

        <div className="stat-card" id="appointment-type-card">
          <div className="stat-value" style={{ fontSize: "1.25rem" }}>
            📋
          </div>
          <div className="stat-label">{appointmentType}</div>
        </div>

        <div className="stat-card" id="checkin-time-card">
          <div className="stat-value" style={{ fontSize: "1.25rem" }}>
            🕐
          </div>
          <div className="stat-label">
            Checked in at{" "}
            {mounted
              ? new Date(checkInTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </div>
        </div>

        <div className="stat-card" id="anxiety-level-card">
          <div
            className="stat-value"
            style={{
              color:
                anxietyLevel <= 3
                  ? "#06d6a0"
                  : anxietyLevel <= 6
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          >
            {anxietyLevel}/10
          </div>
          <div className="stat-label">Comfort Level</div>
        </div>
      </div>
    </div>
  );
}
