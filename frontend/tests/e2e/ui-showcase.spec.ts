import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("UI foundation showcase", () => {
  test("has no serious accessibility violations or horizontal page overflow", async ({ page }) => {
    await page.goto("/ui");
    await expect(page.getByRole("heading", { level: 1, name: "UI foundation" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });

  test("supports keyboard-operated dialog and tabs", async ({ page }) => {
    await page.goto("/ui");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Tạo tác vụ" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Tạo tác vụ đối soát" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Tạo tác vụ đối soát" })).toBeHidden();

    const summaryTab = page.getByRole("tab", { name: "Tóm tắt" });
    await summaryTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Bằng chứng" })).toHaveAttribute("aria-selected", "true");
  });
});
