// utils/crypto.ts

import * as Crypto from 'expo-crypto';

/**
 * Hash a PIN using SHA256
 * @param pin - The PIN to hash
 * @returns Promise<string> - The hashed PIN in hexadecimal format
 */
export async function hashPIN(pin: string): Promise<string> {
  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    return digest;
  } catch (error) {
    console.error('Error hashing PIN:', error);
    throw error;
  }
}

/**
 * Compare a PIN with its hash
 * @param pin - The plain PIN to check
 * @param hash - The hashed PIN to compare against
 * @returns Promise<boolean> - True if PIN matches the hash
 */
export async function comparePINWithHash(pin: string, hash: string): Promise<boolean> {
  try {
    const pinHash = await hashPIN(pin);
    return pinHash === hash;
  } catch (error) {
    console.error('Error comparing PIN:', error);
    return false;
  }
}
