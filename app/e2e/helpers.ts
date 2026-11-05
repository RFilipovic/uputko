import { expect, type Page } from "@playwright/test";

export const PHONE = { width: 390, height: 844 };
export const PERSONA = {
  ana: "Ana Horvat",
  luka: "Luka Kovačević",
  maja: "Maja Babić",
} as const;

/** Choose a demo persona on /profil and go to the chat. */
export async function choosePersona(page: Page, name: string) {
  await page.goto("/profil");
  const card = page.locator("li", {
    has: page.getByText(name, { exact: true }),
  });
  const chosen = card.getByRole("button", { name: "Odabrano" });
  if (!(await chosen.isVisible()))
    await card.getByRole("button", { name: "Odaberi" }).click();
  await expect(card.getByRole("button", { name: "Odabrano" })).toBeVisible();
  await page.getByRole("link", { name: "Nastavi na razgovor" }).click();
  await expect(
    page.getByRole("heading", { name: "Dobar dan! Što vas muči?" }),
  ).toBeVisible();
}

/** Send a chat message and wait until the reply has finished streaming. */
export async function say(page: Page, text: string) {
  const box = page.getByLabel("Vaša poruka");
  await box.fill(text);
  const reply = page.waitForResponse(
    (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
    {
      timeout: 90_000,
    },
  );
  await page.getByRole("button", { name: "Pošalji", exact: true }).click();
  await (await reply).finished();
  await expect(page.getByLabel("Uputko piše…")).toHaveCount(0, {
    timeout: 15_000,
  });
}

/** Keep answering briefly until the intake ends (the composer disappears). */
export async function finishIntake(page: Page, answers: string[]) {
  for (const a of answers) {
    if (!(await page.getByLabel("Vaša poruka").isVisible())) return;
    await say(page, a);
  }
}

/** Press "Pošalji liječniku" (must be unlocked) and wait for the result. */
export async function sendNow(page: Page) {
  const button = page.getByRole("button", { name: "Pošalji liječniku" });
  await expect(button).toBeEnabled();
  const reply = page.waitForResponse(
    (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
    {
      timeout: 90_000,
    },
  );
  await button.click();
  await (await reply).finished();
}
