"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/lib/types";
import CrisisOverlay from "./CrisisOverlay";

interface ChatInterfaceProps {
  patientName?: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! 👋 I'm Ava, your waiting room companion. I'm here to help you feel comfortable while you wait. I can answer questions about your visit logistics, share breathing exercises, or just chat. How are you feeling right now?",
  timestamp: Date.now(),
};

export default function ChatInterface({ patientName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [crisisData, setCrisisData] = useState<{
    message: string;
    emergencyPhone: string;
    crisisPhone: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    // Prepare conversation history (last 5 exchanges = 10 messages)
    const history = [...messages, userMessage]
      .filter((m) => m.id !== "welcome")
      .slice(-10);

    try {
      const response = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: history,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      // Check if it's an emergency JSON response
      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.type === "emergency") {
          setCrisisData({
            message: data.message,
            emergencyPhone: data.emergencyPhone || "112",
            crisisPhone: data.crisisPhone || "988",
          });

          const emergencyMsg: ChatMessage = {
            id: uuidv4(),
            role: "assistant",
            content: data.message,
            timestamp: Date.now(),
            flagged: true,
            safetyLayer: "EMERGENCY",
          };
          setMessages((prev) => [...prev, emergencyMsg]);
          setIsStreaming(false);
          return;
        }

        if (data.error) {
          const errorMsg: ChatMessage = {
            id: uuidv4(),
            role: "assistant",
            content: "I'm having a moment — could you try asking me again?",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setIsStreaming(false);
          return;
        }
      }

      // It's a streaming response — read chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      const assistantMsgId = uuidv4();
      let fullContent = "";

      // Add empty assistant message to fill in via streaming
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse the streaming format: 0:"text content"\n
        const lines = chunk.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          // Match Vercel AI SDK stream format: 0:"content"
          const match = line.match(/^0:(".*")$/);
          if (match) {
            try {
              const text = JSON.parse(match[1]);
              fullContent += text;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            } catch {
              // If parsing fails, try to use the raw content
              fullContent += line;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            }
          }
        }
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content:
          "I'm sorry, I seem to be having a technical issue right now. Please let the front desk know if you need any assistance.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Crisis Overlay */}
      {crisisData && (
        <CrisisOverlay
          emergencyPhone={crisisData.emergencyPhone}
          crisisPhone={crisisData.crisisPhone}
          message={crisisData.message}
          onDismiss={() => setCrisisData(null)}
        />
      )}

      <div
        className="glass-card chat-container"
        style={{ height: "480px" }}
        id="chat-interface"
      >
        {/* Chat Header */}
        <div
          style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
          >
            💬
          </div>
          <div>
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Ava — Your Waiting Room Companion
            </h3>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  display: "inline-block",
                }}
                className="pulse-ring"
              />{" "}
              Online
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          id="chat-messages"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.role}`}
              style={
                msg.flagged
                  ? {
                      borderLeft: "3px solid var(--color-danger)",
                      background: "rgba(239, 68, 68, 0.1)",
                    }
                  : {}
              }
            >
              {msg.role === "assistant" && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  {msg.flagged ? "🚨 SAFETY ALERT" : "Ava"}
                </span>
              )}
              {msg.role === "user" && patientName && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.7)",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  {patientName}
                </span>
              )}
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <label htmlFor="chat-input" className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
            Type your message to Ava
          </label>
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            placeholder={
              isStreaming ? "Ava is typing..." : "Type a message..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            autoComplete="off"
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={isStreaming || !inputValue.trim()}
            id="chat-send-btn"
            aria-label="Send message"
          >
            {isStreaming ? (
              <span className="spinner" style={{ width: "16px", height: "16px" }} />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
