import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedWait — Patient Check-In & AI Companion",
  description:
    "A secure, HIPAA-compliant patient check-in system with an AI-powered waiting room companion for comfort and support.",
  keywords: ["patient check-in", "healthcare", "AI companion", "waiting room"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gradient-animated">
        <main>{children}</main>
      </body>
    </html>
  );
}
