import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

const PUBLIC_ROUTES = ["/", "/login", "/confirm/", "/ui", "/_dev/showcase"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) =>
    route.endsWith("/") ? pathname.startsWith(route) : pathname === route,
  );
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) ||
    request.cookies.has(REFRESH_COOKIE) ||
    request.cookies.get("taxlens_demo")?.value === "1";

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
