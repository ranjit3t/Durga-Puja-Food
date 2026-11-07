import { withServerTimeout } from "../utils/asyncUtils";
import { UI_TEXT } from "../strings";

describe("Server Timeout Watcher Utility", () => {
  it("resolves normally if the async call completes before timeout", async () => {
    const fastPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("success"), 50);
    });

    const result = await withServerTimeout(fastPromise, 500);
    expect(result).toBe("success");
  });

  it("rejects gracefully with timeout error if the async call hangs beyond timeout", async () => {
    const hangingPromise = new Promise<string>(() => {
      // Never resolves or rejects
    });

    await expect(withServerTimeout(hangingPromise, 100)).rejects.toThrow(
      UI_TEXT.serverTimeoutError
    );
  });

  it("uses UI_TEXT.serverTimeoutMs from strings.ts as default timeout configuration", () => {
    expect(UI_TEXT.serverTimeoutMs).toBe(30000);
    expect(typeof UI_TEXT.serverTimeoutMs).toBe("number");
    expect(UI_TEXT.serverTimeoutError).toContain("timed out");
  });
});
