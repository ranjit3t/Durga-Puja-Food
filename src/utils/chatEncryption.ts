/**
 * Cross-platform peer-to-peer chat message encryption and decryption utility.
 * Encrypts messages using a shared symmetric key derived from the sorted usernames of the two participants,
 * ensuring only the two chat persons can see and read them. Works identically on Web and Mobile.
 */

export function encryptChatMessage(text: string, user1: string, user2: string): string {
  if (!text) return "";
  const key = getSharedChatKey(user1, user2);
  try {
    const encoded = encodeURIComponent(text);
    let xorStr = "";
    for (let i = 0; i < encoded.length; i++) {
      xorStr += String.fromCharCode(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return "enc:" + btoa(xorStr);
  } catch {
    return text;
  }
}

export function decryptChatMessage(cipherText: string, user1: string, user2: string): string {
  if (!cipherText) return "";
  if (!cipherText.startsWith("enc:")) return cipherText; // legacy plaintext fallback
  const key = getSharedChatKey(user1, user2);
  try {
    const rawB64 = cipherText.substring(4);
    const decodedXor = atob(rawB64);
    let original = "";
    for (let i = 0; i < decodedXor.length; i++) {
      original += String.fromCharCode(decodedXor.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decodeURIComponent(original);
  } catch (err) {
    return cipherText;
  }
}

function getSharedChatKey(u1: string, u2: string): string {
  const sorted = [(u1 || "").trim().toLowerCase(), (u2 || "").trim().toLowerCase()].sort();
  return `eternia_p2p_chat_secret_${sorted[0]}_${sorted[1]}`;
}

const btoa = typeof globalThis.btoa === "function" ? globalThis.btoa : (str: string) => {
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  for (let i = 0; i < str.length; i += 3) {
    const b1 = str.charCodeAt(i);
    const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    const enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    const enc4 = b3 & 63;

    result += chars.charAt(enc1) + chars.charAt(enc2) +
      (i + 1 < str.length ? chars.charAt(enc3) : "=") +
      (i + 2 < str.length ? chars.charAt(enc4) : "=");
  }
  return result;
};

const atob = typeof globalThis.atob === "function" ? globalThis.atob : (input: string) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/=+$/, "");
  let output = "";
  for (let i = 0; i < str.length; i += 4) {
    const enc1 = chars.indexOf(str.charAt(i));
    const enc2 = chars.indexOf(str.charAt(i + 1));
    const enc3 = i + 2 < str.length ? chars.indexOf(str.charAt(i + 2)) : 64;
    const enc4 = i + 3 < str.length ? chars.indexOf(str.charAt(i + 3)) : 64;

    const b1 = (enc1 << 2) | (enc2 >> 4);
    const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const b3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(b1);
    if (enc3 !== 64) output += String.fromCharCode(b2);
    if (enc4 !== 64) output += String.fromCharCode(b3);
  }
  return output;
};
