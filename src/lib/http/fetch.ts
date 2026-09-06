const DEFAULT_TIMEOUT_MS = 15_000;

/** Server-side fetch with timeout + no-store. Pass through abort signals. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`fetch timeout after ${timeoutMs}ms: ${url}`)), timeoutMs);
  const parent = init.signal;
  if (parent?.aborted) controller.abort(parent.reason);
  const onAbort = () => controller.abort(parent?.reason);
  parent?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onAbort);
  }
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
