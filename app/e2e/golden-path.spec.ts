import { expect, test } from "@playwright/test";
import { choosePersona, finishIntake, PERSONA, PHONE, say } from "./helpers";

const SHOTS = process.env.E2E_SHOTS ?? "test-results/shots";
const UPUTNICA = "public/demo/uputnica-ana-orl.png";

test("golden path: chat → doctor uploads uputnica → patient sees appointment live → confirms", async ({ browser }) => {
  const patientCtx = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  const doctorCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const phone = await patientCtx.newPage();
  const laptop = await doctorCtx.newPage();

  await choosePersona(phone, PERSONA.ana);
  await phone.screenshot({ path: `${SHOTS}/01-chat-empty.png` });
  await say(
    phone,
    "Boli me uho već dva dana, probada, oko 5 od 10. Nemam temperaturu. Slabije čujem na desno uho, postupno. Nemam vrtoglavicu. Imam povišen tlak. U Zagrebu sam.",
  );
  await phone.screenshot({ path: `${SHOTS}/02-chat-first-reply.png` });
  await finishIntake(phone, ["Ne, ništa više. To je sve.", "Ne.", "To je sve, hvala."]);
  await expect(phone.getByRole("heading", { name: "Poslano liječniku" })).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/03-chat-sent.png`, fullPage: true });

  const doctorUrl = await phone.getByRole("link", { name: "Demo: otvori kao liječnik" }).getAttribute("href");
  expect(doctorUrl).toContain("/lijecnik/slucaj/");
  await phone.getByRole("link", { name: "Otvori moj slučaj" }).click();
  await expect(phone.getByText("Čekamo odluku liječnika", { exact: false })).toBeVisible();

  await laptop.goto(doctorUrl!);
  await expect(laptop.getByRole("heading", { name: "Sažetak razgovora" })).toBeVisible();
  await laptop.screenshot({ path: `${SHOTS}/04-doctor-portal.png`, fullPage: true });
  // Opening the portal shows up on the patient's phone.
  await expect(phone.getByText("Liječnik je pregledao").first()).toBeVisible();

  await laptop.locator('input[type="file"]').setInputFiles(UPUTNICA);
  await expect(laptop.getByRole("heading", { name: "Provjerite podatke s uputnice" })).toBeVisible({ timeout: 90_000 });
  await laptop.screenshot({ path: `${SHOTS}/05-doctor-check.png`, fullPage: true });
  await laptop.getByRole("button", { name: "Pošalji pacijentu" }).click();
  await expect(laptop.getByText("Uputnica je poslana pacijentu.")).toBeVisible();

  // The hero moment: the phone updates by itself.
  await expect(phone.getByRole("heading", { name: "Predloženi termin" })).toBeVisible({ timeout: 10_000 });
  await expect(phone.getByRole("heading", { name: "Uputnica" })).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/06-phone-referral-arrived.png`, fullPage: true });
  await phone.getByRole("button", { name: "Potvrdi termin" }).click();
  await expect(phone.getByRole("heading", { name: "Termin potvrđen" })).toBeVisible();
  await expect(phone.getByRole("link", { name: "Dodaj u kalendar" })).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/07-phone-confirmed.png`, fullPage: true });

  await patientCtx.close();
  await doctorCtx.close();
});
