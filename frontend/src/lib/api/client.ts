export interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "ERR-GEN-002",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function isDemoMode(): boolean {
  return readCookie("taxlens_demo") === "1";
}

const DEMO_BACKEND_URL = "http://127.0.0.1:8000/api/v1";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");

  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = readCookie("taxlens_csrf");
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
  }

  // Demo mode: call backend directly, no auth needed
  if (isDemoMode()) {
    const url = `${DEMO_BACKEND_URL}/${path.replace(/^\//, "")}`;
    const response = await fetch(url, {
      ...init,
      cache: init.cache ?? "no-store",
      headers,
      method,
    });
    if (!response.ok) {
      let envelope: ApiErrorEnvelope = {};
      try { envelope = (await response.json()) as ApiErrorEnvelope; } catch {}
      throw new ApiError(
        envelope.error?.message ?? "Khong the ket noi den TaxLens.",
        response.status,
        envelope.error?.code,
        envelope.error?.details,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    cache: init.cache ?? "no-store",
    credentials: "same-origin",
    headers,
    method,
  });

  if (!response.ok) {
    let envelope: ApiErrorEnvelope = {};
    try {
      envelope = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // A non-JSON upstream failure still becomes one stable client error.
    }
    throw new ApiError(
      envelope.error?.message ?? "Khong the ket noi den TaxLens.",
      response.status,
      envelope.error?.code,
      envelope.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function jsonBody(value: unknown): Pick<RequestInit, "body"> {
  return { body: JSON.stringify(value) };
}
