import { NextRequest, NextResponse } from "next/server";
import { accessTokenFrom, backendUrl, bearerHeaders } from "@/lib/auth/backend";
import { REFRESH_COOKIE, clearSessionCookies, csrfIsValid } from "@/lib/auth/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!csrfIsValid(request)) {
    return NextResponse.json(
      { error: { code: "ERR-AUTH-003", message: "Yeu cau bao mat khong hop le." } },
      { status: 403 },
    );
  }

  const accessToken = accessTokenFrom(request);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (accessToken) {
    await fetch(backendUrl("auth/logout"), {
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      headers: bearerHeaders(accessToken, { "content-type": "application/json" }),
      method: "POST",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
