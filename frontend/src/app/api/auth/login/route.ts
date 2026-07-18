import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SessionResponse, SessionUser } from "@/lib/auth/contracts";
import { backendUrl, bearerHeaders } from "@/lib/auth/backend";
import { setSessionCookies, type BackendTokens } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "ERR-AUTH-001", message: "Thong tin dang nhap khong hop le." } },
      { status: 400 },
    );
  }

  const loginResponse = await fetch(backendUrl("auth/login"), {
    body: JSON.stringify(parsed.data),
    cache: "no-store",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!loginResponse.ok) {
    return new NextResponse(loginResponse.body, {
      headers: { "content-type": loginResponse.headers.get("content-type") ?? "application/json" },
      status: loginResponse.status,
    });
  }

  const tokens = (await loginResponse.json()) as BackendTokens;
  const meResponse = await fetch(backendUrl("auth/me"), {
    cache: "no-store",
    headers: bearerHeaders(tokens.access_token),
  });

  if (!meResponse.ok) {
    return NextResponse.json(
      { error: { code: "ERR-AUTH-001", message: "Khong the khoi tao phien dang nhap." } },
      { status: 502 },
    );
  }

  const csrfToken = randomUUID();
  const response = NextResponse.json<SessionResponse>({
    csrfToken,
    user: (await meResponse.json()) as SessionUser,
  });
  setSessionCookies(response, tokens, csrfToken);
  return response;
}
