import { describe, expect, it } from "vitest";
import { merchantNavigation, operationsNavigation } from "@/config/navigation";

describe("canonical navigation", () => {
  it("keeps the seven merchant destinations in locked order", () => {
    expect(merchantNavigation.map((item) => item.href)).toEqual([
      "/dashboard",
      "/assistant",
      "/transactions",
      "/exceptions",
      "/invoices",
      "/sales",
      "/tax-readiness",
    ]);
  });

  it("keeps the six SHB operations destinations", () => {
    expect(operationsNavigation).toHaveLength(6);
    expect(operationsNavigation.map((item) => item.group)).toEqual([
      "VẬN HÀNH",
      "VẬN HÀNH",
      "VẬN HÀNH",
      "GIÁM SÁT HỆ THỐNG",
      "GIÁM SÁT HỆ THỐNG",
      "GIÁM SÁT HỆ THỐNG",
    ]);
  });
});
