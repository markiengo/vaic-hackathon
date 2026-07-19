import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// Check for console errors
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

await page.screenshot({ path: "login-check.png", fullPage: false });

await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(500);
await page.screenshot({ path: "login-check-mobile.png", fullPage: false });

await browser.close();
console.log("Screenshots saved");
console.log("Console errors:", errors.length);
