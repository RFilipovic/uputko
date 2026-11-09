import { expect, test, type Page } from "@playwright/test";
import { choosePersona, PERSONA, PHONE, say, sendNow } from "./helpers";

/**
 * Screenshots of every screen for the documentation (docs/screenshots/).
 * Not part of the normal test run: SCREENSHOTS=1 pnpm screenshots
 * Uses Maja (doctor loop) and Luka (direct route, emergency), never Ana.
 */
test.skip(!process.env.SCREENSHOTS, "Run with SCREENSHOTS=1");
test.describe.configure({ mode: "serial" });

const DIR = "../docs/screenshots";
const DESKTOP = { width: 1440, height: 900 };

// For full-page shots: let the page grow instead of scrolling inside, and stop
// sticky bars from landing in the middle of the image.
const UNPIN = `
  .h-dvh, .lg\\:h-dvh { height: auto !important; }
  main, .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
  .sticky, .fixed:not([role=alertdialog]):not([role=alertdialog] *) { position: static !important; }
`;

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const map = page.locator(".maplibregl-canvas").first();
  if (await map.count())
    await page.waitForTimeout(2500); // map tiles
  else await page.waitForTimeout(600); // let motion settle
  const style = fullPage ? await page.addStyleTag({ content: UNPIN }) : null;
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage });
  await style?.evaluate((el) => (el as Element).remove());
}

test("public screens", async ({ browser }) => {
  for (const [label, viewport] of [
    ["mobitel", PHONE],
    ["racunalo", DESKTOP],
  ] as const) {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.goto("/");
    await shot(page, `01-pocetna-${label}`, true);
    await page.goto("/profil");
    await shot(page, `02-profil-${label}`, true);
    await page.goto("/javni-podaci");
    await shot(page, `03-javni-podaci-${label}`, true);
    await page.goto("/lijecnik/slucaj/nevazeci-link");
    await shot(page, `04-lijecnik-nevazeci-link-${label}`);
    await page.context().close();
  }
});

test("doctor loop: chat → doctor → uputnica → appointment → changes", async ({
  browser,
}) => {
  const phone = await (await browser.newContext({ viewport: PHONE })).newPage();
  const laptop = await (
    await browser.newContext({ viewport: DESKTOP })
  ).newPage();

  await choosePersona(phone, PERSONA.maja);
  await shot(phone, "10-razgovor-prazan");
  await say(phone, "Kći ima temperaturu.");
  await shot(phone, "11-razgovor-pitanja");
  await say(
    phone,
    "Ima 4 godine, od jučer ima 38,5, kašlje i slabije jede. Nema drugih bolesti. U Splitu smo.",
  );
  await shot(phone, "12-razgovor-spremno-za-slanje");
  await sendNow(phone);
  await expect(
    phone.getByRole("heading", { name: "Poslano liječniku" }),
  ).toBeVisible({ timeout: 30_000 });
  await shot(phone, "13-razgovor-poslano", true);

  const doctorUrl = await phone
    .getByRole("link", { name: "Demo: otvori kao liječnik" })
    .getAttribute("href");
  await phone.getByRole("link", { name: "Otvori moj slučaj" }).click();
  await expect(
    phone.getByText("Čekamo odluku liječnika", { exact: false }),
  ).toBeVisible();
  await shot(phone, "14-slucaj-ceka-lijecnika", true);

  await laptop.goto(new URL(doctorUrl!).pathname);
  await expect(
    laptop.getByRole("heading", { name: "Sažetak razgovora" }),
  ).toBeVisible();
  await shot(laptop, "20-lijecnik-sazetak", true);
  await laptop
    .locator('input[type="file"]')
    .setInputFiles("public/demo/uputnica-maja-pedijatrija.png");
  await expect(
    laptop.getByRole("heading", { name: "Provjerite podatke s uputnice" }),
  ).toBeVisible({ timeout: 90_000 });
  await shot(laptop, "21-lijecnik-provjera-uputnice", true);
  // Paediatrics has no synthetic slots: the doctor picks ORL at KBC Split,
  // which has free times, so the flow reaches an appointment.
  await laptop
    .getByLabel("Specijalnost")
    .selectOption({ label: "Otorinolaringologija" });
  await laptop
    .locator("label", { hasText: "Klinički bolnički centar Split" })
    .first()
    .click();
  await laptop.getByRole("button", { name: "Pošalji pacijentu" }).click();
  await expect(
    laptop.getByText("Uputnica je poslana pacijentu."),
  ).toBeVisible();
  await shot(laptop, "22-lijecnik-poslano");

  await expect(
    phone.getByRole("heading", { name: "Predloženi termin" }),
  ).toBeVisible({ timeout: 20_000 });
  await shot(phone, "15-slucaj-stigla-uputnica");
  await shot(phone, "16-slucaj-predlozeni-termin", true);
  await phone.getByRole("button", { name: "Potvrdi termin" }).click();
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();
  await shot(phone, "17-slucaj-termin-potvrden", true);

  // "Ne paše mi" → availability → the institution offers another time.
  await phone.getByRole("button", { name: "Ne paše mi" }).click();
  const mornings = phone.getByRole("button", { name: "Ujutro" });
  for (const i of [5, 6, 7, 8]) await mornings.nth(i).click();
  await shot(phone, "18-slucaj-odabir-dostupnosti", true);
  await phone.getByRole("button", { name: "Pošalji", exact: true }).click();
  await expect(
    phone.getByRole("heading", { name: "Tražite drugi termin" }),
  ).toBeVisible();
  await shot(phone, "19-slucaj-trazi-drugi-termin", true);

  await laptop.goto("/ustanova");
  await shot(laptop, "30-ustanova-panel", true);
  const offer = laptop
    .locator("li, article, section", { hasText: "Maja Babić" })
    .getByRole("button", { name: /Ponudi ovaj termin/ })
    .first();
  await (
    (await offer.isVisible())
      ? offer
      : laptop.getByRole("button", { name: /Ponudi ovaj termin/ }).first()
  ).click();
  await expect(laptop.getByText("Ponuda je poslana pacijentu.")).toBeVisible();
  await expect(
    phone.getByRole("heading", { name: "Novi prijedlog termina" }),
  ).toBeVisible({ timeout: 20_000 });
  await shot(phone, "40-obavijest-novi-prijedlog");
  await phone.getByRole("button", { name: "Prihvati" }).click();
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();

  // Earlier slot freed → offer on the phone.
  await laptop.goto("/ustanova");
  await laptop
    .getByRole("button", { name: "Oslobodi raniji termin" })
    .first()
    .click();
  await expect(
    laptop.getByText("Termin je oslobođen i ponuđen pacijentu."),
  ).toBeVisible();
  const earlier = phone.getByRole("heading", {
    name: "Oslobodio se raniji termin",
  });
  await earlier.waitFor({ timeout: 20_000 }).catch(() => {});
  if (await earlier.isVisible())
    await shot(phone, "41-obavijest-raniji-termin");

  // The same case on a laptop (the offer is still open), then without it.
  const desk = await (
    await browser.newContext({
      viewport: DESKTOP,
      storageState: await phone.context().storageState(),
    })
  ).newPage();
  await desk.goto(phone.url());
  await shot(desk, "41-obavijest-raniji-termin-racunalo");
  if (await earlier.isVisible()) {
    await phone.getByRole("button", { name: "Prihvati" }).click();
    await expect(earlier).toHaveCount(0);
  }
  await desk.reload();
  await shot(desk, "23-slucaj-racunalo", true);
  await phone.goto("/");
  await shot(phone, "05-pocetna-moji-slucajevi", true);
  await desk.context().close();
});

test("direct route: toothache away from home", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await choosePersona(page, PERSONA.luka);
  await page.getByPlaceholder(/Varaždin/).fill("Varaždin");
  await page.getByRole("button", { name: "Potvrdi" }).click();
  await shot(page, "50-izravno-lokacija");
  await say(
    page,
    "Boli me zub od jučer, jako, oko 7 od 10. Nemam temperaturu, malo je otečena desna. Nemam drugih bolesti ni lijekova.",
  );
  const done = page.getByRole("heading", {
    name: /Idite ovdje|Najbliže ordinacije/,
  });
  for (const a of ["Samo oko zuba.", "Ne, ništa drugo.", "To je sve."]) {
    if (await done.isVisible()) break;
    if (await page.getByRole("button", { name: "Da, pošalji" }).isVisible()) {
      await sendNow(page);
      break;
    }
    if (!(await page.getByLabel("Vaša poruka").isVisible())) break;
    await say(page, a);
  }
  if (await page.getByRole("button", { name: "Da, pošalji" }).isVisible())
    await sendNow(page);
  await expect(done).toBeVisible();
  await shot(page, "51-izravno-najblize-ordinacije", true);
});

test("emergency: 112 takeover", async ({ browser }) => {
  for (const [label, viewport] of [
    ["mobitel", PHONE],
    ["racunalo", DESKTOP],
  ] as const) {
    const page = await (await browser.newContext({ viewport })).newPage();
    await choosePersona(page, PERSONA.luka);
    await say(page, "jako me boli u prsima i ne mogu disati");
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await shot(page, `60-hitno-112-${label}`);
    await page.context().close();
  }
});
