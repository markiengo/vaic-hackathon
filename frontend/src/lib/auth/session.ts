import type { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "taxlens_access";
export const REFRESH_COOKIE = "taxlens_refresh";
export const CSRF_COOKIE = "taxlens_csrf";

export interface BackendTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

const secure =
  process.env.NODE_ENV === "production" && process.env.TAXLENS_COOKIE_SECURE !== "false";

export function setSessionCookies(
  response: NextResponse,
  tokens: BackendTokens,
  csrfToken?: string,
): void {
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: "/",
    sameSite: "lax",
    secure,
  });

  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }

  if (csrfToken) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}

export function clearSessionCookies(response: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: name !== CSRF_COOKIE,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}

function firstForwardedValue(value: string | null): string | undefined {
  const first = value?.split(",", 1)[0]?.trim();
  return first || undefined;
}

function requestOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  const directHost = request.headers.get("host")?.trim() || request.nextUrl.host;
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  )?.replace(/:$/, "");
  const directProtocol = request.nextUrl.protocol.replace(/:$/, "");

  const addOrigin = (protocol: string | undefined, host: string | undefined) => {
    if (!host || (protocol !== "http" && protocol !== "https")) return;

    try {
      origins.add(new URL(`${protocol}://${host}`).origin);
    } catch {
      // Invalid proxy or Host headers must never relax the same-origin check.
    }
  };

  addOrigin(forwardedProtocol ?? directProtocol, directHost);
  addOrigin(forwardedProtocol ?? directProtocol, forwardedHost);
  origins.add(request.nextUrl.origin);
  return origins;
}

export function csrfIsValid(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  const origin = request.headers.get("origin");

  let originIsValid = !origin;
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const isBareOrigin =
        parsedOrigin.pathname === "/" &&
        !parsedOrigin.search &&
        !parsedOrigin.hash &&
        !parsedOrigin.username &&
        !parsedOrigin.password;
      originIsValid = isBareOrigin && requestOrigins(request).has(parsedOrigin.origin);
    } catch {
      originIsValid = false;
    }
  }

  return Boolean(
    cookieToken &&
      headerToken &&
      cookieToken === headerToken &&
      originIsValid,
  );
}
