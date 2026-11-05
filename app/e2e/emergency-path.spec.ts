import { expect, test } from "@playwright/test";
import { choosePersona, PERSONA, PHONE, say } from "./helpers";

const SHOTS = process.env.E2E_SHOTS ?? "test-results/shots";

test.use({ viewport: PHONE });

test("emergency path: chest pain → 112 takeover with nearest emergency department", async ({
  page,
}) => {
  await choosePersona(page, PERSONA.maja);
  await say(page, "jako me boli u prsima i ne mogu disati");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Odmah nazovite 112" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Nazovi hitnu pomoć na 112" }),
  ).toHaveAttribute("href", "tel:112");
  await expect(
    dialog.getByText("Klinički bolnički centar Split"),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/08-emergency.png` });
});

test("direct path: toothache away from home → nearest open dentist, no referral", async ({
  page,
}) => {
  await choosePersona(page, PERSONA.luka);
  await page.getByPlaceholder(/Varaždin/).fill("Varaždin");
  await page.getByRole("button", { name: "Potvrdi" }).click();
  await say(
    page,
    "Boli me zub od jučer, jako, oko 7 od 10. Nemam temperaturu, malo je otečena desna. Nemam drugih bolesti ni lijekova.",
  );
  for (const a of ["Samo oko zuba.", "Ne, ništa drugo.", "To je sve."]) {
    if (
      await page
        .getByRole("heading", { name: /Idite ovdje|Najbliže ordinacije/ })
        .isVisible()
    )
      break;
    if (!(await page.getByLabel("Vaša poruka").isVisible())) break;
    await say(page, a);
  }
  await expect(
    page.getByRole("heading", { name: /Idite ovdje|Najbliže ordinacije/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Za ovo vam ne treba uputnica.").first(),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/09-direct.png`, fullPage: true });
});
