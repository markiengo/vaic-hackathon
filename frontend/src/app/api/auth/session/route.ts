import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SessionResponse, SessionUser } from "@/lib/auth/contracts";
import {
  accessTokenFrom,
  backendUrl,
  bearerHeaders,
  refreshBackendSession,
} from "@/lib/auth/backend";
import { CSRF_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/auth/session";

const DEMO_USERS: Record<string, SessionUser> = {
  "demo-U005": {
    id: "U005",
    name: "Nguyễn Thị Hương",
    email: "huong.salonhoa@gmail.com",
    role: "merchant",
    merchant_id: "M001",
    onboarding_completed: false,
  },
  "demo-U002": {
    id: "U002",
    name: "Trần Văn Long",
    email: "long.ops@shb.com.vn",
    role: "ops_staff",
    merchant_id: null,
    onboarding_completed: false,
  },
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  let accessToken = accessTokenFrom(request);

  // Demo bypass: return demo user directly for fake demo tokens
  if (accessToken?.startsWith("demo-")) {
    const demoUser = Object.values(DEMO_USERS).find((u) => accessToken!.includes(u.id));
    if (demoUser) {
      const csrfToken = request.cookies.get(CSRF_COOKIE)?.value ?? randomUUID();
      const response = NextResponse.json<SessionResponse>({ csrfToken, user: demoUser });
      if (!request.cookies.has(CSRF_COOKIE)) {
        setSessionCookies(response, { access_token: accessToken }, csrfToken);
      }
      return response;
    }
  }

  let refreshed = null;

  if (!accessToken) {
    refreshed = await refreshBackendSession(request);
    accessToken = refreshed?.access_token ?? null;
  }

  let meResponse = accessToken
    ? await fetch(backendUrl("auth/me"), {
        cache: "no-store",
        headers: bearerHeaders(accessToken),
      })
    : null;

  if (meResponse?.status === 401 && !refreshed) {
    refreshed = await refreshBackendSession(request);
    if (refreshed) {
      meResponse = await fetch(backendUrl("auth/me"), {
        cache: "no-store",
        headers: bearerHeaders(refreshed.access_token),
      });
    }
  }

  if (!meResponse?.ok) {
    const response = NextResponse.json(
      { error: { code: "ERR-AUTH-002", message: "Phien dang nhap da het han." } },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }

  const csrfToken = request.cookies.get(CSRF_COOKIE)?.value ?? randomUUID();
  const response = NextResponse.json<SessionResponse>({
    csrfToken,
    user: (await meResponse.json()) as SessionUser,
  });
  if (refreshed) setSessionCookies(response, refreshed, csrfToken);
  else if (!request.cookies.has(CSRF_COOKIE)) {
    setSessionCookies(response, { access_token: accessToken! }, csrfToken);
  }
  return response;
}
