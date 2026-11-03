/**
 * Server and Network Async Timeout Utility
 * Prevents sync/async calls to the backend server from hanging infinitely or blocking the app UI.
 */
import { UI_TEXT } from "../strings";

/**
 * Watches a server promise and enforces a timeout configured in strings.ts.
 * If the server call hangs or takes longer than `timeoutMs` (defaults to UI_TEXT.serverTimeoutMs),
 * it rejects with a timeout error so the caller can fail gracefully without blocking the app.
 *
 * @param promise The server/network async operation
 * @param timeoutMs Timeout limit in milliseconds (defaults to UI_TEXT.serverTimeoutMs)
 * @param errorMessage Error text when timeout expires (defaults to UI_TEXT.serverTimeoutError)
 */
export function withServerTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = UI_TEXT.serverTimeoutMs,
  errorMessage: string = UI_TEXT.serverTimeoutError
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
}
