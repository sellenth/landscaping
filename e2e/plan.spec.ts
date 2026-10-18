import { expect, test, type Page } from "@playwright/test";

// Any uncaught error in the page fails the test.
let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && pageErrors.push(m.text()));
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

async function canvasBox(page: Page) {
  const box = await page.getByTestId("plan-canvas").boundingBox();
  if (!box) throw new Error("canvas not visible");
  return box;
}

async function drag(page: Page, from: [number, number], to: [number, number], steps = 12) {
  const b = await canvasBox(page);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + to[0], b.y + to[1], { steps });
  await page.mouse.up();
}

test("draw a patio with a typed size and see it in the bid", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await expect(page.getByText("Start a plan")).toBeVisible();

  // Rectangle tool: click once, type 20' x 15', Enter.
  await page.keyboard.press("r");
  const b = await canvasBox(page);
  await page.mouse.click(b.x + 300, b.y + 250);
  await page.keyboard.type("20'");
  await page.keyboard.press("Tab");
  await page.keyboard.type("15'");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("selection-area")).toHaveText("300 sq ft");
  await page.getByRole("radio", { name: "Flagstone patio" }).first().click();
  await expect(page.getByTestId("qty-flagstone")).toContainText("300");
  await expect(page.getByTestId("quantities-total")).toHaveText("$5,400.00");

  // Change the price and the total follows.
  await page.getByRole("button", { name: /Flagstone patio/ }).click();
  await page.locator("#price-flagstone").fill("20");
  await page.locator("#price-flagstone").press("Enter");
  await expect(page.getByTestId("quantities-total")).toHaveText("$6,000.00");

  // Undo the price change.
  await page.keyboard.press("Escape");
  await page.getByTestId("plan-canvas").focus();
  await page.keyboard.press("Control+z");
  await expect(page.getByTestId("quantities-total")).toHaveText("$5,400.00");
});

test("sketch a closed bed with the smooth curve tool", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.keyboard.press("c");
  const b = await canvasBox(page);
  const cx = 500, cy = 400;
  await page.mouse.move(b.x + cx + 150, b.y + cy);
  await page.mouse.down();
  for (let i = 1; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const wobble = Math.sin(i * 2.3) * 3;
    await page.mouse.move(b.x + cx + Math.cos(a) * (150 + wobble), b.y + cy + Math.sin(a) * (90 + wobble));
  }
  await page.mouse.up();

  const doc = await page.evaluate(() => (window as unknown as { __editor: { doc: { objects: { name: string; path: { closed: boolean; nodes: unknown[] } }[] } } }).__editor.doc);
  expect(doc.objects).toHaveLength(1);
  expect(doc.objects[0].name).toBe("Bed");
  expect(doc.objects[0].path.closed).toBe(true);
  expect(doc.objects[0].path.nodes.length).toBeLessThan(16);
});

test("work survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.keyboard.press("o");
  await drag(page, [300, 300], [450, 420]);
  await expect(page.getByText("Saving…")).toBeHidden();
  await expect(page.getByText("All changes saved on this computer")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await expect(page.getByText("Start a plan")).toBeHidden();
  const count = await page.evaluate(() => (window as unknown as { __editor: { doc: { objects: unknown[] } } }).__editor.doc.objects.length);
  expect(count).toBe(1);
});

test("import an aerial photo and set its scale", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#8a9a6b";
    ctx.fillRect(0, 0, 400, 300);
    return c.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import image" }).click();
  await (await chooser).setFiles({ name: "aerial.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByText("Underlay image:")).toBeVisible();

  type Win = { __editor: { doc: { underlays: { width: number }[] }; getState(): { view: { scale: number } } } };
  const widthBefore = await page.evaluate(() => (window as unknown as Win).__editor.doc.underlays[0].width);
  const scale = await page.evaluate(() => (window as unknown as Win).__editor.getState().view.scale);

  await page.getByRole("button", { name: "Set scale…" }).click();
  const b = await canvasBox(page);
  await page.mouse.click(b.x + 400, b.y + 400);
  await page.mouse.click(b.x + 600, b.y + 400);
  await page.keyboard.type("50'");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Scale set")).toBeVisible();

  // The two clicked points were 200 px apart; they must now be 50 ft (600") apart.
  const widthAfter = await page.evaluate(() => (window as unknown as Win).__editor.doc.underlays[0].width);
  expect(widthAfter / widthBefore).toBeCloseTo(600 / (200 / scale), 3);
});
