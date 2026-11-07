import { expect, test } from "@playwright/test";
import { choosePersona, PERSONA, PHONE, say, sendNow } from "./helpers";

const SHOTS = process.env.E2E_SHOTS ?? "test-results/shots";

// The change flow needs the appointment the golden path creates: run in order.
test.describe.configure({ mode: "serial" });
const UPUTNICA = "public/demo/uputnica-ana-orl.png";

test("golden path: chat → doctor uploads uputnica → patient sees appointment live → confirms", async ({
  browser,
}) => {
  const patientCtx = await browser.newContext({ viewport: PHONE });
  const doctorCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const phone = await patientCtx.newPage();
  const laptop = await doctorCtx.newPage();

  await choosePersona(phone, PERSONA.ana);
  await phone.screenshot({ path: `${SHOTS}/01-chat-empty.png` });
  // One vague message keeps "Pošalji liječniku" locked, with a hint.
  await say(phone, "Boli me uho.");
  await expect(
    phone.getByRole("button", { name: "Pošalji liječniku" }),
  ).toBeDisabled();
  await expect(phone.getByText(/Recite još:/)).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/02-chat-locked.png` });
  // One good answer unlocks it; the patient sends without more questions.
  await say(
    phone,
    "Već dva dana, probada, oko 5 od 10. Nemam temperaturu. U Zagrebu sam.",
  );
  await expect(
    phone.getByRole("button", { name: "Pošalji liječniku" }),
  ).toBeEnabled();
  await phone.screenshot({ path: `${SHOTS}/02b-chat-unlocked.png` });
  await sendNow(phone);
  await expect(
    phone.getByRole("heading", { name: "Poslano liječniku" }),
  ).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/03-chat-sent.png`, fullPage: true });

  const doctorUrl = await phone
    .getByRole("link", { name: "Demo: otvori kao liječnik" })
    .getAttribute("href");
  expect(doctorUrl).toContain("/lijecnik/slucaj/");
  await phone.getByRole("link", { name: "Otvori moj slučaj" }).click();
  await expect(
    phone.getByText("Čekamo odluku liječnika", { exact: false }),
  ).toBeVisible();

  await laptop.goto(doctorUrl!);
  await expect(
    laptop.getByRole("heading", { name: "Sažetak razgovora" }),
  ).toBeVisible();
  await laptop.screenshot({
    path: `${SHOTS}/04-doctor-portal.png`,
    fullPage: true,
  });
  // Opening the portal shows up on the patient's phone.
  await expect(phone.getByText("Liječnik je pregledao").first()).toBeVisible();

  await laptop.locator('input[type="file"]').setInputFiles(UPUTNICA);
  await expect(
    laptop.getByRole("heading", { name: "Provjerite podatke s uputnice" }),
  ).toBeVisible({ timeout: 90_000 });
  await laptop.screenshot({
    path: `${SHOTS}/05-doctor-check.png`,
    fullPage: true,
  });
  await laptop.getByRole("button", { name: "Pošalji pacijentu" }).click();
  await expect(
    laptop.getByText("Uputnica je poslana pacijentu."),
  ).toBeVisible();

  // The hero moment: the phone updates by itself.
  await expect(
    phone.getByRole("heading", { name: "Predloženi termin" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(phone.getByRole("heading", { name: "Uputnica" })).toBeVisible();
  await phone.screenshot({
    path: `${SHOTS}/06-phone-referral-arrived.png`,
    fullPage: true,
  });
  await phone.getByRole("button", { name: "Potvrdi termin" }).click();
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();
  await expect(
    phone.getByRole("link", { name: "Dodaj u kalendar" }),
  ).toBeVisible();
  await phone.screenshot({
    path: `${SHOTS}/07-phone-confirmed.png`,
    fullPage: true,
  });

  await patientCtx.close();
  await doctorCtx.close();
});

/** Runs after the golden path: Ana has a confirmed appointment. */
test("changes by notification: ne paše mi → institution offers → accept; earlier slot → accept", async ({
  browser,
}) => {
  const phone = await (await browser.newContext({ viewport: PHONE })).newPage();
  const desk = await (
    await browser.newContext({ viewport: { width: 1200, height: 900 } })
  ).newPage();

  await phone.goto("/profil");
  const ana = phone.locator("li", {
    has: phone.getByText("Ana Horvat", { exact: true }),
  });
  if (await ana.getByRole("button", { name: "Odaberi" }).isVisible())
    await ana.getByRole("button", { name: "Odaberi" }).click();
  await expect(ana.getByRole("button", { name: "Odabrano" })).toBeVisible();
  await phone.goto("/");
  await phone.locator("a", { hasText: "Termin potvrđen" }).first().click();
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();

  // "Ne paše mi": the first 5 days are full, so pick mornings from day 6 on.
  await phone.getByRole("button", { name: "Ne paše mi" }).click();
  const mornings = phone.getByRole("button", { name: "Ujutro" });
  for (const i of [5, 6, 7, 8]) await mornings.nth(i).click();
  await phone.screenshot({
    path: `${SHOTS}/20-availability.png`,
    fullPage: true,
  });
  await phone.getByRole("button", { name: "Pošalji", exact: true }).click();
  await expect(
    phone.getByRole("heading", { name: "Tražite drugi termin" }),
  ).toBeVisible();

  await desk.goto("/ustanova");
  await desk
    .getByRole("button", { name: /Ponudi ovaj termin/ })
    .first()
    .click();
  await expect(desk.getByText("Ponuda je poslana pacijentu.")).toBeVisible();
  await expect(
    phone.getByRole("heading", { name: "Novi prijedlog termina" }),
  ).toBeVisible({ timeout: 20_000 });
  await phone.screenshot({ path: `${SHOTS}/21-reschedule-offer.png` });
  await phone.getByRole("button", { name: "Prihvati" }).click();
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();

  await desk.goto("/ustanova");
  await desk
    .getByRole("button", { name: "Oslobodi raniji termin" })
    .first()
    .click();
  await expect(
    desk.getByText("Termin je oslobođen i ponuđen pacijentu."),
  ).toBeVisible();
  await expect(
    phone.getByRole("heading", { name: "Oslobodio se raniji termin" }),
  ).toBeVisible({ timeout: 20_000 });
  await phone.screenshot({ path: `${SHOTS}/22-earlier-offer.png` });
  await phone.getByRole("button", { name: "Prihvati" }).click();
  await expect(
    phone.getByRole("heading", { name: "Oslobodio se raniji termin" }),
  ).toHaveCount(0);
  await expect(
    phone.getByRole("heading", { name: "Termin potvrđen" }),
  ).toBeVisible();
  await expect(phone.getByText("Termin promijenjen").first()).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/23-moved.png`, fullPage: true });
});
