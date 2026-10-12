import { ApiError } from './json-client.ts';

export class UploadRateLimitError extends ApiError {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(429, 'rate_limited', 'Upload busy. Your progress is saved.');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function waitForChunkRetry(
  attempt: number,
  retryAfterSeconds: number,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  if (retryAfterSeconds > 30) throw new UploadRateLimitError(retryAfterSeconds);
  const delay =
    Math.max(retryAfterSeconds, 2 ** (attempt + 1)) * 1000 +
    Math.floor(Math.random() * 251);
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}
