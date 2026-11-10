import { encryptQrPayload, decryptQrPayload, decryptQrPayloadDetails } from "../utils/qrEncryption";

describe("QR Code Encryption & Decryption Utility (qrEncryption.ts)", () => {
  describe("encryptQrPayload", () => {
    it("returns empty string when id is empty or invalid", () => {
      expect(encryptQrPayload("")).toBe("");
      expect(encryptQrPayload(null as any)).toBe("");
      expect(encryptQrPayload(undefined as any)).toBe("");
    });

    it("encrypts pass ID into a DPF_ENC_ prefixed cipher string", () => {
      const encrypted = encryptQrPayload("14-3S");
      expect(encrypted.startsWith("DPF_ENC_")).toBe(true);
    });

    it("completely obfuscates pass ID, domain, and URL structures", () => {
      const passId = "14-3S";
      const encrypted = encryptQrPayload(passId);

      expect(encrypted).not.toContain(passId);
      expect(encrypted).not.toContain("https://");
      expect(encrypted).not.toContain("durga-puja-food");
      expect(encrypted).not.toContain("/flat/");
      expect(encrypted).not.toContain("/pass/");
    });

    it("generates distinct cipher strings for different pass IDs", () => {
      const enc1 = encryptQrPayload("14-3S");
      const enc2 = encryptQrPayload("6-2E");
      const enc3 = encryptQrPayload("A-101");

      expect(enc1).not.toEqual(enc2);
      expect(enc2).not.toEqual(enc3);
      expect(enc1).not.toEqual(enc3);
    });
  });

  describe("decryptQrPayload", () => {
    it("returns null for empty, whitespace, or invalid inputs", () => {
      expect(decryptQrPayload("")).toBeNull();
      expect(decryptQrPayload("   ")).toBeNull();
      expect(decryptQrPayload(null as any)).toBeNull();
      expect(decryptQrPayload(undefined as any)).toBeNull();
    });

    it("successfully decrypts cipher string back to the exact original pass ID", () => {
      const testIds = ["14-3S", "6-2E", "A-101", "B-999", "FLAT_X_123"];

      for (const id of testIds) {
        const encrypted = encryptQrPayload(id);
        const decrypted = decryptQrPayload(encrypted);
        expect(decrypted).toBe(id);
      }
    });

    it("decrypts full payload details including tenantId and seasonCode", () => {
      const encrypted = encryptQrPayload("14-3S", "fooddesk", "DP2027", "14", "3S");
      const details = decryptQrPayloadDetails(encrypted);
      expect(details).toEqual({
        tenantId: "fooddesk",
        seasonCode: "DP2027",
        passId: "14-3S",
      });
    });

    /*
    it("handles legacy and alternative encrypted format prefixes for backwards compatibility", () => {
      // Simulate legacy URL format
      const passId = "14-3S";
      const encrypted = encryptQrPayload(passId);
      const cipherToken = encrypted.replace("DPF_ENC_", "");

      const legacyUrlFormat = `https://durga-puja-food.app/pass/enc:${cipherToken}`;
      expect(decryptQrPayload(legacyUrlFormat)).toBe(passId);

      const legacyEncPrefixFormat = `enc:${cipherToken}`;
      expect(decryptQrPayload(legacyEncPrefixFormat)).toBe(passId);
    });
    */

    it("rejects unencrypted URLs and arbitrary strings gracefully returning null", () => {
      expect(decryptQrPayload("https://durga-puja-food.app/flat/14-3S")).toBeNull();
      expect(decryptQrPayload("https://google.com")).toBeNull();
      expect(decryptQrPayload("14-3S")).toBeNull();
      expect(decryptQrPayload("DPF_ENC_")).toBeNull();
      expect(decryptQrPayload("DPF_ENC_INVALID_CORRUPTED_DATA_!!!")).toBeNull();
    });
  });

  describe("Custom Base64 Fallback", () => {
    it("works correctly when globalThis.btoa and atob are temporarily disabled", () => {
      const originalBtoa = globalThis.btoa;
      const originalAtob = globalThis.atob;

      try {
        // Disable native btoa/atob to test fallback encoder/decoder
        (globalThis as any).btoa = undefined;
        (globalThis as any).atob = undefined;

        const passId = "CUSTOM_BASE64_TEST_42";
        const encrypted = encryptQrPayload(passId);
        expect(encrypted.startsWith("DPF_ENC_")).toBe(true);

        const decrypted = decryptQrPayload(encrypted);
        expect(decrypted).toBe(passId);
      } finally {
        globalThis.btoa = originalBtoa;
        globalThis.atob = originalAtob;
      }
    });
  });
});
