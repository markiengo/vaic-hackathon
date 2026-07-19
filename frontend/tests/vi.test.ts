import { describe, expect, it } from "vitest";
import { vi, viOr, looksLikeBackendMessage } from "@/lib/i18n/vi";

describe("vi", () => {
  it("maps NO_MATCH_CANDIDATES", () => {
    expect(vi("NO_MATCH_CANDIDATES")).toBe("Không tìm thấy đơn hàng hoặc bản ghi phù hợp.");
  });

  it("maps 'No match candidates found for transaction'", () => {
    expect(vi("No match candidates found for transaction")).toBe(
      "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",
    );
  });

  it("maps UNKNOWN_SENDER", () => {
    expect(vi("UNKNOWN_SENDER")).toBe("Chưa xác định được người gửi.");
  });

  it("maps PENDING_REVIEW", () => {
    expect(vi("PENDING_REVIEW")).toBe("Chưa phân loại.");
  });

  it("maps CASH_DISCREPANCY", () => {
    expect(vi("CASH_DISCREPANCY")).toBe("Chênh lệch tiền mặt.");
  });

  it("maps 'Internal server error'", () => {
    expect(vi("Internal server error")).toBe("Lỗi hệ thống. Vui lòng thử lại sau.");
  });

  it("returns original string for unmapped key", () => {
    expect(vi("SOME_UNKNOWN_KEY")).toBe("SOME_UNKNOWN_KEY");
  });

  it("returns empty string for null/undefined", () => {
    expect(vi(null)).toBe("");
    expect(vi(undefined)).toBe("");
  });

  it("maps matched status", () => {
    expect(vi("matched")).toBe("Đã khớp");
  });

  it("maps PENDING resolution status", () => {
    expect(vi("PENDING")).toBe("Cần xác nhận");
  });
});

describe("viOr", () => {
  it("returns mapped value", () => {
    expect(viOr("NO_MATCH_CANDIDATES", "fallback")).toBe(
      "Không tìm thấy đơn hàng hoặc bản ghi phù hợp.",
    );
  });

  it("returns fallback for unmapped key", () => {
    expect(viOr("UNKNOWN_KEY_123", "fallback")).toBe("fallback");
  });

  it("returns fallback for null", () => {
    expect(viOr(null, "fallback")).toBe("fallback");
  });
});

describe("looksLikeBackendMessage", () => {
  it("detects English backend message", () => {
    expect(looksLikeBackendMessage("No match candidates found")).toBe(true);
  });

  it("does not flag Vietnamese text", () => {
    expect(looksLikeBackendMessage("Không tìm thấy đơn hàng")).toBe(false);
  });

  it("does not flag empty string", () => {
    expect(looksLikeBackendMessage("")).toBe(false);
  });

  it("does not flag short strings", () => {
    expect(looksLikeBackendMessage("OK")).toBe(false);
  });
});
