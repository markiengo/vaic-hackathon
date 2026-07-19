import { test, expect } from "@playwright/test";

test("merchant demo login and dashboard loads", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Salon Hương/ }).click();
  await page.waitForURL("/dashboard");
  await expect(page.getByText("Xin chào, chị Hương")).toBeVisible();
});

test("SHB Operations demo login and ops console loads", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /SHB Operations/ }).click();
  await page.waitForURL("/ops");
  await expect(page.getByText("Bàn điều hành danh mục")).toBeVisible({ timeout: 15000 });
});
