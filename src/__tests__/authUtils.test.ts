/// <reference types="jest" />
import { encryptPassword, verifyPassword } from "../utils/authUtils";

describe("Authentication Utilities (Password Encryption & Verification with Marker)", () => {
  it("encrypts password into a sha256 hash hex string", () => {
    const raw = "password123";
    const encrypted = encryptPassword(raw);
    expect(encrypted).toBeDefined();
    expect(encrypted.length).toBe(64); // SHA-256 hex length
    expect(encrypted).not.toBe(raw);
  });

  it("verifies encrypted passwords correctly when encrypted flag is true", () => {
    const raw = "secret456";
    const encrypted = encryptPassword(raw);
    const user = { password: encrypted, encrypted: true };
    expect(verifyPassword(raw, user)).toBe(true);
    expect(verifyPassword("wrong", user)).toBe(false);
  });

  it("verifies plaintext passwords correctly when encrypted flag is false or omitted (legacy)", () => {
    const plaintext = "legacyPass";
    const user = { password: plaintext, encrypted: false };
    expect(verifyPassword(plaintext, user)).toBe(true);
    expect(verifyPassword("wrong", user)).toBe(false);
  });
});
