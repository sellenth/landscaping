import { test } from "@playwright/test";
import { sampleDocument } from "./sample";

const OUT = process.env.SCREENSHOT_DIR;
test.skip(!OUT, "set SCREENSHOT_DIR to capture screenshots");

test("capture screenshots", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("plan-canvas").waitFor();
  await page.evaluate((doc) => (window as any).__editor.load(doc), sampleDocument() as any);
  await page.getByRole("button", { name: "Fit" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/overview.png` });
  // Zoom into the patio and select it.
  await page.evaluate(() => {
    const ed = (window as any).__editor;
    const patio = ed.doc.objects.find((o: any) => o.name === "Patio");
    ed.select([patio.id]);
    ed.set({ view: { scale: 3.2, ox: -28 * 12 * 3.2 + 120, oy: 6 * 12 * 3.2 + 160 } });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/zoomed.png` });
  await page.evaluate(() => (window as any).__editor.setTool("node"));
  await page.evaluate(() => {
    const ed = (window as any).__editor;
    const bed = ed.doc.objects.find((o: any) => o.name === "Bed A");
    ed.select([bed.id]);
    ed.set({ tool: "node", view: { scale: 1.6, ox: 80, oy: 40 } });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/nodes.png` });
});
