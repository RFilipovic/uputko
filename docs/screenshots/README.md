# Screenshots

Every screen of the deployed app (https://uputko.vercel.app), taken on 09.11.2026 with synthetic personas only (Maja Babić, Luka Kovačević). Phone shots are 390 px wide; desktop shots are 1440×900.

Regenerate: `cd app && pnpm screenshots` (runs `e2e/screenshots.spec.ts` against the deployed URL; it calls the model and writes demo cases to the hosted database).

| File | Screen |
|---|---|
| `01-pocetna-*` | Landing page (phone, desktop) |
| `02-profil-*` | Profile: choose a demo persona and chosen doctors |
| `03-javni-podaci-*` | Open data used by the app, with sources |
| `04-lijecnik-nevazeci-link-*` | Doctor portal with an invalid or expired link |
| `05-pocetna-moji-slucajevi` | Landing page with the patient's cases |
| `10-razgovor-prazan` | Chat, before the first message |
| `11-razgovor-pitanja` | Chat, follow-up questions |
| `12-razgovor-spremno-za-slanje` | Chat, "Pošalji liječniku" unlocked |
| `13-razgovor-poslano` | Case sent to the chosen doctor |
| `14-slucaj-ceka-lijecnika` | Case page, waiting for the doctor |
| `15-slucaj-stigla-uputnica` | Uputnica arrived (live update) |
| `16-slucaj-predlozeni-termin` | Proposed appointment, with map |
| `17-slucaj-termin-potvrden` | Confirmed appointment: calendar, what to bring |
| `18-slucaj-odabir-dostupnosti` | "Ne paše mi": patient picks free times |
| `19-slucaj-trazi-drugi-termin` | Reschedule request sent |
| `20-lijecnik-sazetak` | Doctor portal: case summary (desktop) |
| `21-lijecnik-provjera-uputnice` | Doctor uploads the uputnica and checks what was read |
| `22-lijecnik-poslano` | Doctor portal: uputnica sent |
| `23-slucaj-racunalo` | Case page on desktop |
| `30-ustanova-panel` | Demo institution panel: reschedule requests, free a slot |
| `40-obavijest-novi-prijedlog` | Notification: institution offers a new time |
| `41-obavijest-raniji-termin*` | Notification: an earlier slot freed up (phone, desktop) |
| `50-izravno-lokacija` | Patient sets their current city (away from home) |
| `51-izravno-najblize-ordinacije` | Toothache away from home: nearest dentists, no referral |
| `60-hitno-112-*` | Emergency takeover: call 112, nearest emergency department |

Slots, appointments and uputnice are synthetic demo data. In reality the e-uputnica is issued in CEZIH.
