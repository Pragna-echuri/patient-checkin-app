import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes is the recommended standard for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

/**
 * Retrieves the encryption key, either from a hex environment variable,
 * a raw string hashed to 32 bytes, or a deterministic fallback for development.
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.DATABASE_ENCRYPTION_KEY;
  if (keyEnv) {
    // If it's a 64-char hex string, parse it directly to a 32-byte key
    if (/^[0-9a-fA-F]{64}$/.test(keyEnv)) {
      return Buffer.from(keyEnv, "hex");
    }
    // If it's a raw password/passphrase, hash it with SHA-256 to make it exactly 32 bytes
    return crypto.createHash("sha256").update(keyEnv).digest();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: DATABASE_ENCRYPTION_KEY must be configured in production!");
  }

  // Deterministic local development key so session data survives server reloads
  return crypto.createHash("sha256").update("medwait-local-dev-fallback-key-safe-and-warm").digest();
}

/**
 * Encrypts cleartext using AES-256-GCM and returns a string in format: `iv:authTag:encryptedData`
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a cipher text string formatted as `iv:authTag:encryptedData` using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format (expected iv:authTag:encryptedData)");
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedDataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
