/**
 * Field-Level Encryption for Sensitive Data
 * 
 * Uses AES-256-GCM encryption with authenticated encryption
 * to protect sensitive fields like SnapTrade secrets.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.DATA_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('DATA_ENCRYPTION_KEY environment variable is required for encryption');
    }

    // Key should be 32 bytes (64 hex characters)
    if (key.length !== 64) {
        throw new Error('DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    return Buffer.from(key, 'hex');
}

/**
 * Encrypts a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encrypt()
 * @param encryptedData - The encrypted string in format: iv:authTag:ciphertext
 * @returns The original plaintext string
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Checks if a string appears to be encrypted (has our format)
 * @param value - The string to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;

    const parts = value.split(':');
    if (parts.length !== 3) return false;

    // Check if parts look like hex strings of expected lengths
    const [ivHex, authTagHex] = parts;
    return ivHex.length === IV_LENGTH * 2 && authTagHex.length === AUTH_TAG_LENGTH * 2;
}

/**
 * Safely decrypts a value, returning the original if it's not encrypted
 * Useful during migration period when some values may not yet be encrypted
 * @param value - The value to decrypt
 * @returns Decrypted value, or original if not encrypted
 */
export function safeDecrypt(value: string | null | undefined): string | null {
    if (!value) return null;

    if (isEncrypted(value)) {
        try {
            return decrypt(value);
        } catch (e) {
            console.error('Failed to decrypt value, returning as-is:', e);
            return value;
        }
    }

    // Not encrypted, return as-is (backwards compatibility)
    return value;
}
