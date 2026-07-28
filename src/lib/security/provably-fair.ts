import { createHmac, createHash, randomBytes } from "crypto";

/**
 * Spinora Cryptographic Provably Fair RNG Engine.
 * Implements HMAC-SHA256 transparent seed generation & validation.
 */

export interface ProvablyFairSeeds {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface ProvablyFairResult {
  hash: string;
  numberResult: number; // Floating point number in range [0, 1)
  integerResult: number; // Scaled integer result based on target max
}

/**
 * Generate a random 64-character hex server seed and its public SHA-256 hash.
 */
export function generateServerSeedPair(): { serverSeed: string; serverSeedHash: string } {
  const serverSeed = randomBytes(32).toString("hex");
  const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
  return { serverSeed, serverSeedHash };
}

/**
 * Generate a random client seed string.
 */
export function generateClientSeed(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Calculate HMAC-SHA256 hash and derive a deterministic result in [0, 1) or [0, max).
 */
export function calculateProvablyFairResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  maxResult: number = 1000000
): ProvablyFairResult {
  const message = `${clientSeed}:${nonce}`;
  const hmac = createHmac("sha256", serverSeed);
  hmac.update(message);
  const hash = hmac.digest("hex");

  // Take first 8 characters (32 bits) of the hash to produce a uniform random float
  const hexSubstring = hash.substring(0, 8);
  const intVal = parseInt(hexSubstring, 16);
  const numberResult = intVal / 0xffffffff;
  const integerResult = Math.floor(numberResult * maxResult);

  return {
    hash,
    numberResult,
    integerResult,
  };
}

/**
 * Verify a previously played round's fairness using public inputs.
 */
export function verifyRoundFairness(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  maxResult: number = 1000000
): { isValid: boolean; expectedHash: string; numberResult: number; integerResult: number } {
  const computedServerSeedHash = createHash("sha256").update(serverSeed).digest("hex");
  const isValidServerSeed = computedServerSeedHash.toLowerCase() === serverSeedHash.toLowerCase();

  const { hash, numberResult, integerResult } = calculateProvablyFairResult(serverSeed, clientSeed, nonce, maxResult);

  return {
    isValid: isValidServerSeed,
    expectedHash: hash,
    numberResult,
    integerResult,
  };
}
