import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, type BackendTokens } from "./session";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export function backendUrl(path: string): string {
  const baseUrl = process.env.TAXLENS_BACKEND_URL ?? DEFAULT_BACKEND_URL;
  return `${baseUrl.replace(/\/$/, "")}/api/v1/${path.replace(/^\//, "")}`;
}

export function bearerHeaders(accessToken: string, headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set("authorization", `Bearer ${accessToken}`);
  return result;
}

export async function refreshBackendSession(request: NextRequest): Promise<BackendTokens | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const response = await fetch(backendUrl("auth/refresh"), {
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) return null;
  const tokens = (await response.json()) as BackendTokens;
  return { ...tokens, refresh_token: tokens.refresh_token ?? refreshToken };
}

export function accessTokenFrom(request: NextRequest): string | null {
  return request.cookies.get(ACCESS_COOKIE)?.value ?? null;
}
