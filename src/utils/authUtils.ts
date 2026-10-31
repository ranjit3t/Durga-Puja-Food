/**
 * Cross-platform authentication utilities for password encryption and verification.
 * Works identically across Web and Mobile runtimes without external native dependencies.
 */

/**
 * Encrypts a plaintext password into a secure hash hex string.
 */
export function encryptPassword(password: string): string {
  if (!password) return "";
  return computeSha256Hex(password);
}

/**
 * Verifies if an input password matches the stored password based on the `encrypted` marker or hash signature (64-char hex / sha256 prefix).
 * Supports both encrypted hashes and legacy plaintext passwords seamlessly.
 */
export function verifyPassword(inputPassword: string, userOrPassword: any): boolean {
  if (!inputPassword) return false;

  let storedPassword = "";
  let isEncrypted = false;

  if (userOrPassword && typeof userOrPassword === "object") {
    storedPassword = userOrPassword.password || "";
    isEncrypted =
      userOrPassword.encrypted === true ||
      userOrPassword.encrypted === "true" ||
      userOrPassword.encrypted === 1 ||
      userOrPassword.encrypted === "1" ||
      storedPassword.length === 64 ||
      storedPassword.startsWith("sha256:");
  } else if (typeof userOrPassword === "string") {
    storedPassword = userOrPassword;
    isEncrypted = storedPassword.length === 64 || storedPassword.startsWith("sha256:");
  }

  if (!storedPassword) return false;

  if (isEncrypted) {
    const hashedInput = encryptPassword(inputPassword);
    return hashedInput === storedPassword;
  } else {
    // Legacy plaintext password check
    return inputPassword === storedPassword;
  }
}

/**
 * Pure JS synchronous SHA-256 hash implementation for cross-platform Web & Mobile execution.
 */
function computeSha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i, j;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let paddedAscii = ascii + "\x80";
  while ((paddedAscii.length % 64) - 56) paddedAscii += "\x00";
  for (i = 0; i < paddedAscii.length; i++) {
    j = paddedAscii.charCodeAt(i);
    const idx = i >> 2;
    words[idx] = (words[idx] || 0) | (j << (((3 - i) % 4) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let slice = 0; slice < paddedAscii.length; slice += 16) {
    const w: number[] = [];
    for (let x = 0; x < 16; x++) {
      w[x] = words[slice + x] || 0;
    }
    const oldHash: number[] = [];
    for (let x = 0; x < 8; x++) {
      oldHash[x] = hash[x] || 0;
    }

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;

      const a = hash[0] || 0;
      const e = hash[4] || 0;
      const temp1 =
        (hash[7] || 0) +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & (hash[5] || 0)) ^ (~e & (hash[6] || 0))) +
        (k[i] || 0) +
        (w[i] =
          i < 16
            ? w[i] || 0
            : ((w[i - 16] || 0) +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                (w[i - 7] || 0) +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & (hash[1] || 0)) ^ (a & (hash[2] || 0)) ^ ((hash[1] || 0) & (hash[2] || 0)));

      for (j = 7; j > 0; j--) hash[j] = hash[j - 1] || 0;
      hash[0] = (temp1 + temp2) | 0;
      hash[4] = ((hash[4] || 0) + temp1) | 0;
    }

    for (i = 0; i < 8; i++) hash[i] = ((hash[i] || 0) + (oldHash[i] || 0)) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const val = hash[i] || 0;
      const b = (val >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}
