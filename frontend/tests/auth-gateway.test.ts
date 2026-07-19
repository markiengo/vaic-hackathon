import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  csrfIsValid,
  setSessionCookies,
} from "@/lib/auth/session";

function mutationRequest(
  headerToken = "csrf-token",
  cookieToken = "csrf-token",
  origin = "http://localhost",
  requestHeaders: Record<string, string> = {},
) {
  return new NextRequest("http://localhost/api/backend/merchants/M001/reconcile", {
    headers: {
      cookie: `${CSRF_COOKIE}=${cookieToken}`,
      origin,
      "x-csrf-token": headerToken,
      ...requestHeaders,
    },
    method: "POST",
  });
}

describe("same-origin session gateway", () => {
  it("accepts only matching CSRF values from the same origin", () => {
    expect(csrfIsValid(mutationRequest())).toBe(true);
    expect(csrfIsValid(mutationRequest("wrong"))).toBe(false);
    expect(csrfIsValid(mutationRequest("csrf-token", "csrf-token", "https://attacker.example"))).toBe(false);
  });

  it("uses the external Host when Next internally represents a loopback request as localhost", () => {
    expect(
      csrfIsValid(
        mutationRequest("csrf-token", "csrf-token", "http://127.0.0.1:3000", {
          host: "127.0.0.1:3000",
        }),
      ),
    ).toBe(true);
  });

  it("supports an HTTPS reverse proxy without accepting a different origin", () => {
    const proxyHeaders = {
      host: "taxlens.internal:3000",
      "x-forwarded-host": "taxlens.example",
      "x-forwarded-proto": "https",
    };

    expect(
      csrfIsValid(
        mutationRequest("csrf-token", "csrf-token", "https://taxlens.example", proxyHeaders),
      ),
    ).toBe(true);
    expect(
      csrfIsValid(
        mutationRequest("csrf-token", "csrf-token", "https://attacker.example", proxyHeaders),
      ),
    ).toBe(false);
  });

  it("rejects malformed origins and scheme mismatches", () => {
    expect(csrfIsValid(mutationRequest("csrf-token", "csrf-token", "not-an-origin"))).toBe(false);
    expect(
      csrfIsValid(
        mutationRequest("csrf-token", "csrf-token", "https://127.0.0.1:3000", {
          host: "127.0.0.1:3000",
        }),
      ),
    ).toBe(false);
  });

  it("keeps access and refresh tokens HttpOnly while exposing only the CSRF token", () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookies(
      response,
      { access_token: "access", refresh_token: "refresh" },
      "csrf-token",
    );

    const cookies = response.cookies.getAll();
    expect(cookies.map(({ name }) => name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ACCESS_COOKIE}=access; Path=/;`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain(`${CSRF_COOKIE}=csrf-token; Path=/;`);
  });

  it("expires every session cookie on logout", () => {
    const response = NextResponse.json({ ok: true });
    clearSessionCookies(response);
    expect(response.cookies.getAll()).toHaveLength(5);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("query key contract", () => {
  it("scopes merchant data by merchant and period", () => {
    expect(queryKeys.dashboard("M001", "2026-08")).toEqual(["dashboard", "M001", "2026-08"]);
    expect(queryKeys.dashboard("M002", "2026-08")).not.toEqual(
      queryKeys.dashboard("M001", "2026-08"),
    );
  });
});
