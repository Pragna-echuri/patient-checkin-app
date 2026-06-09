import CheckInForm from "@/components/CheckInForm";

export default function HomePage() {
  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div
          style={{
            fontSize: "2.75rem",
            marginBottom: "0.75rem",
          }}
        >
          🏥
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            background:
              "linear-gradient(135deg, #38bdf8, #06d6a0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "0.5rem",
            letterSpacing: "-0.02em",
          }}
        >
          MedWait Check-In
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            maxWidth: "400px",
            lineHeight: 1.6,
          }}
        >
          Complete your check-in below. Your information is encrypted and
          handled with the highest security standards.
        </p>
      </div>

      {/* Form Card */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "680px",
          padding: "2rem",
        }}
      >
        <CheckInForm />
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        🔒 Your data never leaves this secure session. HIPAA-compliant handling.
      </p>
    </div>
  );
}
