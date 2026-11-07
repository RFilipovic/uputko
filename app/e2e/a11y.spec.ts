import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { choosePersona, PERSONA, PHONE } from "./helpers";

/**
 * Automated WCAG 2.2 AA check (axe) on the patient pages, in light and dark
 * mode and with "Veća slova". Maps are excluded: map tiles are third-party
 * images and every place is also listed in text.
 */
const PAGES = ["/", "/profil", "/chat", "/javni-podaci"];
const MODES = [
  { name: "light", dark: false, large: false },
  { name: "dark", dark: true, large: false },
  { name: "large text", dark: false, large: true },
] as const;

async function scan(page: Page) {
  // Let entrance animations finish so colours are final.
  await page.waitForTimeout(600);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude(".maplibregl-map")
    .exclude("nextjs-portal")
    .analyze();
  return result.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
}

for (const mode of MODES) {
  test(`axe: patient pages, ${mode.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: PHONE,
      colorScheme: mode.dark ? "dark" : "light",
    });
    const page = await ctx.newPage();
    await page.addInitScript((large) => {
      if (large) localStorage.setItem("text", "large");
    }, mode.large);
    await choosePersona(page, PERSONA.ana);

    const problems: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      problems.push(...(await scan(page)).map((p) => `${path}: ${p}`));
    }
    // The newest case of this persona, if the other tests created one.
    await page.goto("/");
    const caseLink = page.locator('a[href^="/slucaj/"]').first();
    if (await caseLink.isVisible()) {
      await caseLink.click();
      await page.waitForURL(/\/slucaj\//);
      await page.waitForLoadState("networkidle");
      problems.push(...(await scan(page)).map((p) => `case: ${p}`));
    }
    await ctx.close();
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("keyboard only: from the home page into the chat", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await choosePersona(page, PERSONA.ana);
  await page.goto("/");
  // Tab until the main action has focus, then Enter.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(
      () => document.activeElement?.textContent ?? "",
    );
    if (name.includes("Opišite problem")) break;
  }
  await expect(page.locator(":focus")).toContainText("Opišite problem");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Dobar dan! Što vas muči?" }),
  ).toBeVisible();
  // The message box is reachable and usable from the keyboard.
  await page.getByLabel("Vaša poruka").focus();
  await page.keyboard.type("Boli me uho");
  await expect(page.getByLabel("Vaša poruka")).toHaveValue("Boli me uho");
});
