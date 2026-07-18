import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/auth/backend";

const CLASSIFICATIONS = new Set(["revenue", "internal_transfer", "loan", "other"]);

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse(403, "ERR-AUTH-003", "Yêu cầu xác nhận không cùng nguồn.");
  }

  let payload: { token?: unknown; operation?: unknown; classification?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return errorResponse(400, "ERR-GEN-001", "Yêu cầu xác nhận không hợp lệ.");
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  const operation = payload.operation === "submit" ? "submit" : payload.operation === "inspect" ? "inspect" : null;
  if (token.length < 20 || token.length > 4096 || !operation) {
    return errorResponse(400, "ERR-GEN-001", "Yêu cầu xác nhận không hợp lệ.");
  }
  if (operation === "submit" && (typeof payload.classification !== "string" || !CLASSIFICATIONS.has(payload.classification))) {
    return errorResponse(400, "ERR-GEN-001", "Phân loại không hợp lệ.");
  }

  try {
    const upstream = await fetch(backendUrl(`confirm/${encodeURIComponent(token)}`), {
      method: operation === "submit" ? "POST" : "GET",
      body: operation === "submit" ? JSON.stringify({ classification: payload.classification }) : undefined,
      headers: operation === "submit" ? { "content-type": "application/json" } : undefined,
      cache: "no-store",
      redirect: "manual",
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "cache-control": "no-store",
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "referrer-policy": "no-referrer",
      },
    });
  } catch {
    return errorResponse(502, "ERR-GEN-003", "TaxLens tạm thời không thể kiểm tra liên kết.");
  }
}
