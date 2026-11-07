import { expect, test } from "@playwright/test";
import { PERSONA, PHONE } from "./helpers";

/**
 * Demo-safe mode (?demo=1): reset, Ana's intake, the doctor reads the sample
 * uputnica and the phone receives the appointment. With E2E_DEMO_OFFLINE=1 the
 * server runs with UPUTKO_DEMO_OFFLINE=1 (no model calls at all) and the
 * prepared replies are checked word for word.
 */
const offline = process.env.E2E_DEMO_OFFLINE === "1";

test.use({ viewport: PHONE });

test("demo mode: reset, Ana's intake, doctor sends the uputnica", async ({
  page,
  browser,
}) => {
  await page.goto("/profil?demo=1");
  await expect(page).toHaveURL(/\/profil$/); // the switch removes ?demo=1
  await expect(page.getByRole("heading", { name: "Demo način" })).toBeVisible();
  await page.getByRole("button", { name: "Počni ispočetka" }).click();
  await expect(page.getByText(/stari slučajevi su obrisani/)).toBeVisible();

  const ana = page.locator("li", {
    has: page.getByText(PERSONA.ana, { exact: true }),
  });
  if (await ana.getByRole("button", { name: "Odaberi" }).isVisible())
    await ana.getByRole("button", { name: "Odaberi" }).click();
  await expect(ana.getByRole("button", { name: "Odabrano" })).toBeVisible();
  await page.getByRole("link", { name: "Nastavi na razgovor" }).click();

  const reply = () =>
    page.waitForResponse(
      (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
      { timeout: 90_000 },
    );
  let r = reply();
  await page.getByRole("button", { name: "Boli me uho" }).click();
  await (await r).finished();
  if (offline)
    await expect(page.getByText("Koliko jako boli, od 1 do 10?")).toBeVisible();

  const box = page.getByLabel("Vaša poruka");
  await box.fill("Već dva dana, probada, oko 5 od 10. Nemam temperaturu.");
  r = reply();
  await page.getByRole("button", { name: "Pošalji", exact: true }).click();
  await (await r).finished();

  const send = page.getByRole("button", { name: "Pošalji liječniku" });
  await expect(send).toBeEnabled({ timeout: 15_000 });
  r = reply();
  await send.click();
  await (await r).finished();
  await expect(
    page.getByRole("heading", { name: "Poslano liječniku" }),
  ).toBeVisible({ timeout: 30_000 });

  // Doctor side, also in demo mode: reading the sample uputnica cannot stall.
  const doctorUrl = await page
    .getByRole("link", { name: "Demo: otvori kao liječnik" })
    .getAttribute("href");
  await page.getByRole("link", { name: "Otvori moj slučaj" }).click();
  const laptop = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  await laptop.goto(`${new URL(doctorUrl!).pathname}?demo=1`);
  await laptop
    .locator('input[type="file"]')
    .setInputFiles("public/demo/uputnica-ana-orl.png");
  await expect(
    laptop.getByRole("heading", { name: "Provjerite podatke s uputnice" }),
  ).toBeVisible({ timeout: 60_000 });
  await laptop.keyboard.press("Control+Enter");
  await expect(
    laptop.getByText("Uputnica je poslana pacijentu."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stigla je uputnica!" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Predloženi termin" }),
  ).toBeVisible();
  await laptop.context().close();

  // Turn demo mode off again for this browser.
  await page.goto("/profil?demo=0");
  await expect(page.getByRole("heading", { name: "Demo način" })).toHaveCount(
    0,
  );
});
