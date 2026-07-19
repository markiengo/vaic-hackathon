import { describe, expect, it } from "vitest";
import { formatConfidence, formatMoney, formatMoneyOrDash, humanize, sourceLabel } from "@/features/ledger/format";

describe("formatMoney", () => {
  it("formats valid positive number", () => {
    expect(formatMoney(1_250_000)).toBe("1.250.000 ₫");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("0 ₫");
  });

  it("formats decimal string from API", () => {
    expect(formatMoney("350000.00")).toBe("350.000 ₫");
  });

  it("returns fallback for undefined", () => {
    expect(formatMoney(undefined)).toBe("Không có số tiền hợp lệ");
  });

  it("returns fallback for null", () => {
    expect(formatMoney(null)).toBe("Không có số tiền hợp lệ");
  });

  it("returns fallback for empty string", () => {
    expect(formatMoney("")).toBe("Không có số tiền hợp lệ");
  });

  it("returns fallback for NaN", () => {
    expect(formatMoney(NaN)).toBe("Không có số tiền hợp lệ");
  });

  it("returns fallback for non-numeric string", () => {
    expect(formatMoney("abc")).toBe("Không có số tiền hợp lệ");
  });

  it("formats negative number (refund)", () => {
    expect(formatMoney(-500_000)).toBe("-500.000 ₫");
  });
});

describe("formatMoneyOrDash", () => {
  it("formats valid number", () => {
    expect(formatMoneyOrDash(580_000)).toBe("580.000 ₫");
  });

  it("returns dash for null", () => {
    expect(formatMoneyOrDash(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatMoneyOrDash(undefined)).toBe("—");
  });
});

describe("formatConfidence", () => {
  it("formats 0-1 decimal as percentage", () => {
    expect(formatConfidence(0.82)).toBe("82%");
  });

  it("formats integer percentage", () => {
    expect(formatConfidence(82)).toBe("82%");
  });

  it("returns fallback for undefined", () => {
    expect(formatConfidence(undefined)).toBe("Chưa xác định");
  });

  it("returns fallback for null", () => {
    expect(formatConfidence(null)).toBe("Chưa xác định");
  });

  it("returns fallback for NaN", () => {
    expect(formatConfidence(NaN)).toBe("Chưa xác định");
  });
});

describe("humanize", () => {
  it("maps known classification", () => {
    expect(humanize("revenue")).toBe("Doanh thu");
  });

  it("maps internal_transfer", () => {
    expect(humanize("internal_transfer")).toBe("Chuyển nội bộ");
  });

  it("returns fallback for null", () => {
    expect(humanize(null)).toBe("Chưa xác định");
  });
});

describe("sourceLabel", () => {
  it("maps SHB", () => {
    expect(sourceLabel("SHB")).toBe("SHB");
  });

  it("maps sepay", () => {
    expect(sourceLabel("sepay")).toBe("SePay");
  });

  it("returns fallback for null", () => {
    expect(sourceLabel(null)).toBe("Chưa rõ");
  });
});
