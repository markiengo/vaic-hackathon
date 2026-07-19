import { NextRequest, NextResponse } from "next/server";
import { accessTokenFrom, backendUrl, bearerHeaders } from "@/lib/auth/backend";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = accessTokenFrom(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "ERR-AUTH-002", message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  const upstream = await fetch(backendUrl("auth/me/onboarding"), {
    method: "POST",
    cache: "no-store",
    headers: bearerHeaders(accessToken),
  });

  if (!upstream.ok) {
    return new NextResponse(upstream.body, {
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
      status: upstream.status,
    });
  }

  const payload = (await upstream.json()) as { onboarding_completed: boolean; completed_at: string };
  return NextResponse.json(payload);
}
