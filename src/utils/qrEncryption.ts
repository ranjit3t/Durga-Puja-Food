/**
 * Utility functions for encrypting and decrypting QR code pass payloads.
 * Encrypts the ENTIRE URL text and pass payload into an obfuscated cipher string so that
 * generic camera apps, Google Lens, or external QR scanners cannot read any plain text URL or pass details.
 * Ensures the app's internal camera scanner can decrypt and process pass IDs across all
 * scanning modes (Normal Scan, Quick Checkout, Parcel Checkout).
 */

const QR_SECRET_KEY = "DPF_SECURE_QR_PASS_SECRET_2026";
const PAYLOAD_PREFIX = "DPFPASS:";
const DPF_ENC_PREFIX = "DPF_ENC_";

// Cross-platform Base64 string encoding helpers
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function toBase64(str: string): string {
  if (typeof globalThis.btoa === "function") {
    try {
      return globalThis.btoa(str);
    } catch {
      // Fallback
    }
  }
  let result = "";
  for (let i = 0; i < str.length; i += 3) {
    const b1 = str.charCodeAt(i);
    const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    const enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    const enc4 = b3 & 63;

    result += BASE64_CHARS.charAt(enc1) + BASE64_CHARS.charAt(enc2) +
      (i + 1 < str.length ? BASE64_CHARS.charAt(enc3) : "=") +
      (i + 2 < str.length ? BASE64_CHARS.charAt(enc4) : "=");
  }
  return result;
}

function fromBase64(input: string): string {
  if (typeof globalThis.atob === "function") {
    try {
      return globalThis.atob(input);
    } catch {
      // Fallback
    }
  }
  let str = input.replace(/=+$/, "");
  let output = "";
  for (let i = 0; i < str.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(str.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(str.charAt(i + 1));
    const enc3 = i + 2 < str.length ? BASE64_CHARS.indexOf(str.charAt(i + 2)) : 64;
    const enc4 = i + 3 < str.length ? BASE64_CHARS.indexOf(str.charAt(i + 3)) : 64;

    const b1 = (enc1 << 2) | (enc2 >> 4);
    const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const b3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(b1);
    if (enc3 !== 64) output += String.fromCharCode(b2);
    if (enc4 !== 64) output += String.fromCharCode(b3);
  }
  return output;
}

/**
 * Encrypts a subscription pass ID into a fully encrypted cipher string for QR code generation.
 * The entire URL/payload text is encrypted. External camera scanners will only see encrypted text
 * and cannot read any plain URL text or pass details.
 */
export function encryptQrPayload(id: string, tenantId: string = "", seasonCode: string = "", block: string = "", flat: string = ""): string {
  if (!id) return "";
  try {
    const rawPayload = `${PAYLOAD_PREFIX}TENANT:${tenantId || ""}:SEASON:${seasonCode || ""}:BLOCK:${block || ""}:FLAT:${flat || ""}:ID:${id}`;
    const key = QR_SECRET_KEY;
    let xorStr = "";
    for (let i = 0; i < rawPayload.length; i++) {
      xorStr += String.fromCharCode(rawPayload.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const b64 = toBase64(xorStr);
    return `${DPF_ENC_PREFIX}${encodeURIComponent(b64)}`;
  } catch {
    return `${DPF_ENC_PREFIX}${encodeURIComponent(id)}`;
  }
}

export interface DecodedQrPayload {
  tenantId: string;
  seasonCode: string;
  passId: string;
}

/**
 * Decrypts a scanned QR payload or cipher text string.
 * Returns the decrypted subscription ID if valid, or null if the input is not a valid encrypted QR payload.
 */
export function decryptQrPayload(scannedData: string): string | null {
  const details = decryptQrPayloadDetails(scannedData);
  return details ? details.passId : null;
}

export function decryptQrPayloadDetails(scannedData: string): DecodedQrPayload | null {
  if (!scannedData || typeof scannedData !== "string") return null;
  const trimmed = scannedData.trim();

  let cipherToken = "";
  if (trimmed.startsWith(DPF_ENC_PREFIX)) {
    cipherToken = trimmed.substring(DPF_ENC_PREFIX.length);
  } else if (trimmed.includes("/pass/enc:")) {
    cipherToken = trimmed.split("/pass/enc:")[1] || "";
  } else if (trimmed.startsWith("enc:")) {
    cipherToken = trimmed.substring(4);
  } else {
    return null;
  }

  if (!cipherToken) return null;

  try {
    const rawB64 = decodeURIComponent(cipherToken);
    const decodedXor = fromBase64(rawB64);
    const key = QR_SECRET_KEY;
    let original = "";
    for (let i = 0; i < decodedXor.length; i++) {
      original += String.fromCharCode(decodedXor.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }

    if (original.startsWith(PAYLOAD_PREFIX)) {
      const payloadBody = original.substring(PAYLOAD_PREFIX.length);
      let tenantId = "";
      let seasonCode = "";
      let passId = "";

      const tenantMatch = payloadBody.match(/TENANT:([^:]+)/);
      if (tenantMatch) tenantId = tenantMatch[1];

      const seasonMatch = payloadBody.match(/SEASON:([^:]+)/);
      if (seasonMatch) seasonCode = seasonMatch[1];

      if (payloadBody.includes("ID:")) {
        const parts = payloadBody.split("ID:");
        passId = parts[parts.length - 1] || "";
      } else {
        passId = payloadBody;
      }

      return { tenantId, seasonCode, passId: passId.trim() };
    }
    return null;
  } catch {
    return null;
  }
}
