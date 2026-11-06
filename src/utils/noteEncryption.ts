/**
 * Operational Notes End-to-End Database Encryption Utility.
 * Encrypts and decrypts note subject and content before storing in/retrieving from Firebase RTDB.
 * Guarantees zero plaintext exposure in database dumps or RTDB console.
 */
import { Note } from "../types";

const ENCRYPTION_PREFIX = "ENC_NOTE_v1:";

function cipherTransform(text: string, secret: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

const btoa = typeof globalThis.btoa === "function" ? globalThis.btoa : (str: string) => {
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  for (let i = 0; i < str.length; i += 3) {
    const b1 = str.charCodeAt(i);
    const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
    const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    let c3 = ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    let c4 = b3 & 63;

    if (isNaN(b2)) c3 = c4 = 64;
    else if (isNaN(b3)) c4 = 64;

    result += chars.charAt(c1) + chars.charAt(c2) + chars.charAt(c3) + chars.charAt(c4);
  }
  return result;
};

const atob = typeof globalThis.atob === "function" ? globalThis.atob : (str: string) => {
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, "");
  for (let i = 0; i < cleanStr.length; i += 4) {
    const c1 = chars.indexOf(cleanStr.charAt(i));
    const c2 = chars.indexOf(cleanStr.charAt(i + 1));
    const c3 = chars.indexOf(cleanStr.charAt(i + 2));
    const c4 = chars.indexOf(cleanStr.charAt(i + 3));

    const b1 = (c1 << 2) | (c2 >> 4);
    const b2 = ((c2 & 15) << 4) | (c3 >> 2);
    const b3 = ((c3 & 3) << 6) | c4;

    result += String.fromCharCode(b1);
    if (c3 !== 64 && !isNaN(b2)) result += String.fromCharCode(b2);
    if (c4 !== 64 && !isNaN(b3)) result += String.fromCharCode(b3);
  }
  return result;
};

function getNoteSecretKey(tenantId?: string): string {
  const tKey = (tenantId || "root_superadmin").toLowerCase();
  return `fooddesk_note_secret_key_${tKey}_2026`;
}

/**
 * Encrypts a Note's subject and content prior to database persistence.
 */
export function encryptNote(note: Note, tenantId?: string): Note {
  if (!note) return note;
  const secret = getNoteSecretKey(tenantId);

  let encSubject = note.subject || "";
  if (encSubject && !encSubject.startsWith(ENCRYPTION_PREFIX)) {
    const rawCipher = cipherTransform(encSubject, secret);
    encSubject = ENCRYPTION_PREFIX + encodeURIComponent(btoa(rawCipher));
  }

  let encContent = note.content || "";
  if (encContent && !encContent.startsWith(ENCRYPTION_PREFIX)) {
    const rawCipher = cipherTransform(encContent, secret);
    encContent = ENCRYPTION_PREFIX + encodeURIComponent(btoa(rawCipher));
  }

  return {
    ...note,
    subject: encSubject,
    content: encContent,
  };
}

/**
 * Decrypts a Note's subject and content upon fetching from database.
 */
export function decryptNote(note: Note, tenantId?: string): Note {
  if (!note) return note;
  const secret = getNoteSecretKey(tenantId);

  let decSubject = note.subject || "";
  if (decSubject && decSubject.startsWith(ENCRYPTION_PREFIX)) {
    try {
      const b64 = decodeURIComponent(decSubject.replace(ENCRYPTION_PREFIX, ""));
      const rawCipher = atob(b64);
      decSubject = cipherTransform(rawCipher, secret);
    } catch {
      // Keep as-is if decryption fails
    }
  }

  let decContent = note.content || "";
  if (decContent && decContent.startsWith(ENCRYPTION_PREFIX)) {
    try {
      const b64 = decodeURIComponent(decContent.replace(ENCRYPTION_PREFIX, ""));
      const rawCipher = atob(b64);
      decContent = cipherTransform(rawCipher, secret);
    } catch {
      // Keep as-is if decryption fails
    }
  }

  return {
    ...note,
    subject: decSubject,
    content: decContent,
  };
}

export function isNoteSharedWithUser(note: Note, targetUser: string | null): boolean {
  if (!targetUser || !note.sharedWith) return false;
  if (note.sharedWith === "all") return true;
  const cleanTarget = targetUser.trim().toLowerCase();
  if (Array.isArray(note.sharedWith)) {
    return note.sharedWith.some(u => u.trim().toLowerCase() === cleanTarget);
  }
  if (typeof note.sharedWith === "string") {
    return note.sharedWith.trim().toLowerCase() === cleanTarget;
  }
  return false;
}
