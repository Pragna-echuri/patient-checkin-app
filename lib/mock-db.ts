import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import { PatientData } from "./types";
import { encrypt, decrypt } from "./crypto";

// ─── Persistent Database Hub ──────────────────────────────────
// Connects to Upstash Redis (Serverless-optimized HTTP) or standard Redis (TCP),
// and falls back to an encrypted in-memory Map in development.
// All patient PHI is encrypted at rest using AES-256-GCM before writing to the database.

let upstashClient: UpstashRedis | null = null;
let ioRedisClient: Redis | null = null;

const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const isIoRedisConfigured = !!process.env.REDIS_URL;

if (isUpstashConfigured) {
  upstashClient = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  console.log("Database Hub: Upstash Redis client initialized successfully (HTTP).");
} else if (isIoRedisConfigured) {
  // Use lazyConnect so that it doesn't block startup if Redis server is down/unreachable
  ioRedisClient = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
  });
  console.log("Database Hub: TCP Redis (ioredis) client initialized successfully.");
} else {
  console.log(
    "Database Hub: No Redis environment variables found. Using encrypted in-memory fallback Map."
  );
}

// ─── Local In-Memory Fallback ────────────────────────────────
const globalForDb = globalThis as unknown as {
  __patientStore: Map<string, string> | undefined;
};

if (!globalForDb.__patientStore) {
  globalForDb.__patientStore = new Map<string, string>();
}

const inMemoryStore = globalForDb.__patientStore;

/**
 * Encrypts and stores patient data. Session expires in 4 hours.
 */
export async function storePatient(sessionId: string, data: PatientData): Promise<void> {
  const rawText = JSON.stringify(data);
  const encryptedText = encrypt(rawText);

  if (upstashClient) {
    // 4 hours = 14400 seconds
    await upstashClient.set(`session:${sessionId}`, encryptedText, { ex: 14400 });
  } else if (ioRedisClient) {
    await ioRedisClient.set(`session:${sessionId}`, encryptedText, "EX", 14400);
  } else {
    inMemoryStore.set(sessionId, encryptedText);
  }
}

/**
 * Retrieves and decrypts patient data. Returns undefined if not found or corrupted.
 */
export async function getPatient(sessionId: string): Promise<PatientData | undefined> {
  let encryptedText: string | null = null;

  if (upstashClient) {
    encryptedText = await upstashClient.get(`session:${sessionId}`);
  } else if (ioRedisClient) {
    // ioredis get returns string | null
    encryptedText = await ioRedisClient.get(`session:${sessionId}`);
  } else {
    encryptedText = inMemoryStore.get(sessionId) || null;
  }

  if (!encryptedText) {
    return undefined;
  }

  try {
    const rawText = decrypt(encryptedText);
    return JSON.parse(rawText) as PatientData;
  } catch (err) {
    console.error(`Database Hub: Failed to decrypt or parse session ${sessionId}:`, err);
    return undefined;
  }
}

/**
 * Removes a patient session. Returns true if deleted, false otherwise.
 */
export async function removePatient(sessionId: string): Promise<boolean> {
  if (upstashClient) {
    const deleted = await upstashClient.del(`session:${sessionId}`);
    return deleted > 0;
  } else if (ioRedisClient) {
    const deleted = await ioRedisClient.del(`session:${sessionId}`);
    return deleted > 0;
  } else {
    return inMemoryStore.delete(sessionId);
  }
}

/**
 * Returns the number of active sessions (useful for telemetry and diagnostics).
 */
export async function getSessionCount(): Promise<number> {
  if (upstashClient) {
    const keys = await upstashClient.keys("session:*");
    return keys.length;
  } else if (ioRedisClient) {
    const keys = await ioRedisClient.keys("session:*");
    return keys.length;
  } else {
    return inMemoryStore.size;
  }
}
