import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/public/confirm/route";

const token = "signed.public.capability.token.with-enough-length";

describe("public confirmation proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("inspects server-to-server without authentication or token echo", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ exception_id: 42, status: "OPEN" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const request = new NextRequest("http://localhost/api/public/confirm", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ operation: "inspect", token }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(upstreamFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/confirm\//),
      expect.objectContaining({ method: "GET", cache: "no-store", redirect: "manual" }),
    );
    const init = upstreamFetch.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    expect(await response.text()).not.toContain(token);
  });

  it("rejects cross-origin submission before touching the backend", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);
    const request = new NextRequest("http://localhost/api/public/confirm", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ operation: "submit", token, classification: "revenue" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
