import { expect, test } from "@playwright/test";
import { choosePersona, PERSONA, PHONE } from "./helpers";

/** Edge cases from PLAN.md Phase 4 that can be checked in the browser. */
test.use({ viewport: PHONE });

test("doctor opens an invalid link → clear message, no crash", async ({
  page,
}) => {
  await page.goto("/lijecnik/slucaj/not-a-real-token");
  await expect(page.getByText("Poveznica nije ispravna.")).toBeVisible();
});

test("empty message cannot be sent", async ({ page }) => {
  await choosePersona(page, PERSONA.ana);
  await page.getByLabel("Vaša poruka").fill("   ");
  await expect(
    page.getByRole("button", { name: "Pošalji", exact: true }),
  ).toBeDisabled();
});

test("connection drops → friendly message → Pokušaj ponovno works", async ({
  page,
}) => {
  await choosePersona(page, PERSONA.ana);
  // The first chat request fails as if the phone lost its connection.
  let failed = false;
  await page.route("**/api/chat", (route) => {
    if (failed) return route.continue();
    failed = true;
    return route.abort("internetdisconnected");
  });
  await page.getByLabel("Vaša poruka").fill("Boli me uho već dva dana.");
  await page.getByRole("button", { name: "Pošalji", exact: true }).click();
  await expect(page.getByText(/Nema veze s internetom/)).toBeVisible();

  const reply = page.waitForResponse(
    (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
    { timeout: 90_000 },
  );
  await page.getByRole("button", { name: "Pokušaj ponovno" }).click();
  await (await reply).finished();
  await expect(page.getByText(/Nema veze s internetom/)).toHaveCount(0);
  // Sent once: one patient bubble, not two.
  await expect(page.getByText("Boli me uho već dva dana.")).toHaveCount(1);
});

test("English emergency → 112 takeover (deterministic rules)", async ({
  page,
}) => {
  await choosePersona(page, PERSONA.maja);
  await page
    .getByLabel("Vaša poruka")
    .fill("I have chest pain and I can't breathe");
  await page.getByRole("button", { name: "Pošalji", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(
    dialog.getByRole("link", { name: "Nazovi hitnu pomoć na 112" }),
  ).toHaveAttribute("href", "tel:112");
});
