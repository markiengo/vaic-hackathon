import { NextRequest, NextResponse } from "next/server";
import {
  accessTokenFrom,
  backendUrl,
  bearerHeaders,
  refreshBackendSession,
} from "@/lib/auth/backend";
import { clearSessionCookies, csrfIsValid, setSessionCookies } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_HEADERS = ["accept", "content-type", "idempotency-key", "if-none-match"];
const RETURN_HEADERS = ["cache-control", "content-disposition", "content-type", "etag"];

async function proxy(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (!SAFE_METHODS.has(request.method) && !csrfIsValid(request)) {
    return NextResponse.json(
      { error: { code: "ERR-AUTH-003", message: "Yeu cau bao mat khong hop le." } },
      { status: 403 },
    );
  }

  const { path } = await context.params;
  if (!path.length || ["auth", "webhooks"].includes(path[0])) {
    return NextResponse.json(
      { error: { code: "ERR-GEN-001", message: "Duong dan gateway khong hop le." } },
      { status: 400 },
    );
  }

  const encodedPath = path.map(encodeURIComponent).join("/");
  const target = new URL(backendUrl(encodedPath));
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const upstreamHeaders = new Headers();
  for (const name of ALLOWED_HEADERS) {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }

  const body = SAFE_METHODS.has(request.method) ? undefined : await request.arrayBuffer();
  let accessToken = accessTokenFrom(request);
  let refreshed = null;

  if (!accessToken) {
    refreshed = await refreshBackendSession(request);
    accessToken = refreshed?.access_token ?? null;
  }

  if (!accessToken) {
    const response = NextResponse.json(
      { error: { code: "ERR-AUTH-001", message: "Can dang nhap de tiep tuc." } },
      { status: 401 },
    );
    clearSessionCookies(response);
    return response;
  }

  const send = (token: string) =>
    fetch(target, {
      body,
      cache: "no-store",
      headers: bearerHeaders(token, upstreamHeaders),
      method: request.method,
      redirect: "manual",
    });

  let upstream = await send(accessToken);
  if (upstream.status === 401 && !refreshed) {
    refreshed = await refreshBackendSession(request);
    if (refreshed) upstream = await send(refreshed.access_token);
  }

  const responseHeaders = new Headers();
  for (const name of RETURN_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const response = new NextResponse(upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
  });

  if (refreshed) setSessionCookies(response, refreshed);
  if (upstream.status === 401) clearSessionCookies(response);
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
