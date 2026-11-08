# Vodič kroz kod

*[English version](../codebase.md)*

Karta Uputkovog koda za članove tima i recenzente: gdje se što nalazi, kako
zahtjev prolazi kroz sustav i kako mijenjati stvari a da se ne pokvari demo.
Za to *zašto* je izgrađen ovako, vidi [`arhitektura.md`](arhitektura.md); za
podatke vidi [`izvori-podataka.md`](izvori-podataka.md).

Nazivi datoteka, funkcija i stanja ostaju na engleskom jer su takvi u kodu.

---

## 1. Karta repozitorija

| Putanja | Sadržaj |
|---|---|
| `CLAUDE.md`, `PLAN.md` | Pravila za suradnike i petodnevni plan |
| `README.md`, `README.hr.md` | Pokretanje, testovi, objava |
| `docs/` | Arhitektura, izvori podataka, ovaj vodič (hrvatski u `docs/hr/`) |
| `docs/diagrams/` | Dijagrami kao kod (`.py`) → `.svg` + `.png`, engleski + hrvatski (`.hr`) |
| `scripts/create-issues.mjs` | Jednokratno: GitHub issueji iz `PLAN.md` |
| `data-pipeline/` | Python ETL → `supabase/seed.sql` |
| `supabase/migrations/` | SQL shema + funkcije, numerirane, primjenjuju se po redu |
| `supabase/seed.sql` | Generira ga cjevovod, spremljen u repozitorij |
| `app/src/app/` | Stranice i API rute (App Router) |
| `app/src/components/` | Sučelje, jedna komponenta po datoteci, po funkcionalnosti |
| `app/src/lib/` | Logika: agent, baza, geo, e-pošta, naručivanje |
| `app/src/hooks/` | `useLiveCase` (ažuriranja uživo) |
| `app/src/i18n/hr.ts` | SVAKI tekst koji korisnik vidi |
| `app/src/middleware.ts` | Prekidač `?demo=1` / `?demo=0` |
| `app/e2e/` | Playwright end-to-end testovi |
| `app/scripts/` | `run-evals.ts`, `copy-maplibre-worker.mjs` |
| `app/public/demo/` | Primjer uputnice za demo |

---

## 2. Stranice

Sve stranice su serverske komponente koje podatke učitavaju na poslužitelju;
samo interaktivni dijelovi su klijentske komponente (`"use client"`).

| URL | Datoteka | Što je |
|---|---|---|
| `/` | `src/app/(patient)/page.tsx` | Početna: jedna glavna radnja, „Moji slučajevi”, kako radi |
| `/profil` | `src/app/(patient)/profil/page.tsx` | Odabir demo osobe, pregled/promjena izabranih liječnika; demo okvir u demo načinu |
| `/chat` | `src/app/(patient)/chat/page.tsx` → `ChatScreen` | Razgovor (preusmjerava na `/profil` ako osoba nije odabrana) |
| `/slucaj/[id]` | `src/app/(patient)/slucaj/[id]/page.tsx` → `CaseScreen` | Stranica slučaja: napredak, uputnica, termin, ponude, vremenska crta (uživo) |
| `/javni-podaci` | `src/app/(patient)/javni-podaci/page.tsx` | Brojke otvorenih podataka, karta gradova, skupovi podataka (predmemorija 1 h) |
| `/lijecnik/slucaj/[token]` | `src/app/(doctor)/lijecnik/slucaj/[token]/page.tsx` | Portal za liječnike (prvo za računalo), dolazi se linkom iz e-pošte |
| `/ustanova` | `src/app/(institution)/ustanova/page.tsx` | Demo panel bolnice: oslobodi raniji termin, odgovori na zahtjeve za promjenu termina |

Grupe ruta `(patient)`, `(doctor)`, `(institution)` samo organiziraju datoteke;
ne pojavljuju se u URL-ovima.

---

## 3. API rute

Svako tijelo zahtjeva, upit i parametar provjerava se kroz **Zod**. Rute za
pacijente provjeravaju je li demo kolačić identiteta (`uputko_patient`)
vlasnik slučaja, termina ili obavijesti (`lib/patientAuth.ts`).

| Metoda · putanja | Datoteka | Svrha |
|---|---|---|
| `POST /api/chat` | `api/chat/route.ts` | Jedan korak razgovora, streaman kao Server-Sent Events (`case`, `ready`, `delta`, `options`, `outcome`, `error`, `done`). Zastavice: `finish` (Pošalji liječniku), `retry` (ponovno odgovori na zadnju poruku) |
| `GET/POST/DELETE /api/session` | `api/session/route.ts` | Koja sam osoba / odaberi jednu / zaboravi je |
| `GET /api/cases/[id]` | `api/cases/[id]/route.ts` | Svježi podaci slučaja; stranica slučaja ih ponovno dohvaća na svaki signal uživo |
| `GET /api/practitioners?role=&q=` | `api/practitioners/route.ts` | Pretraga liječnika pri postavljanju (otvoreni podaci) |
| `POST /api/profile/doctors` | `api/profile/doctors/route.ts` | Promjena izabranog liječnika |
| `POST /api/doctor/[token]/extract` | `api/doctor/[token]/[action]/route.ts` | Čitanje učitane uputnice Claudeom; uparivanje djelatnosti + bolnice |
| `GET /api/doctor/[token]/institutions` | ista datoteka | Bolnice blizu pacijenta za djelatnost |
| `POST /api/doctor/[token]/issue` | ista datoteka | Spremi uputnicu, rezerviraj najraniji termin (ili najbližu drugu bolnicu), obavijesti pacijenta |
| `POST /api/doctor/[token]/invite` | ista datoteka | „Pozovite pacijenta na pregled” umjesto uputnice |
| `GET /api/appointments/[id]/ics` | `api/appointments/[id]/[action]/route.ts` | Datoteka za kalendar |
| `POST /api/appointments/[id]/(confirm\|cancel\|reschedule)` | ista datoteka | Pacijentove radnje nad terminom |
| `POST /api/notifications/[id]/(accept\|decline)` | `api/notifications/[id]/[action]/route.ts` | Odgovor na ponudu ranijeg / novog termina |
| `POST /api/institution/(free-earlier\|offer)` | `api/institution/[action]/route.ts` | Radnje demo panela bolnice |
| `GET /api/referrals/[id]/document` | `api/referrals/[id]/document/route.ts` | Učitana uputnica, samo za njezina pacijenta |
| `POST /api/demo/reset` | `api/demo/reset/route.ts` | Samo u demo načinu: obriši slučajeve osoba, oslobodi njihove termine |

---

## 4. Jedna poruka u razgovoru, od početka do kraja

Što se događa kad pacijent pošalje „Boli me uho već dva dana”:

1. **`ChatScreen`** (`components/chat/ChatScreen.tsx`) doda oblačić, otvori
   `POST /api/chat` i čita tok događaja.
2. **`api/chat/route.ts`**: provjeri kolačić osobe, provjeri tijelo zahtjeva,
   primijeni ograničenja (`lib/rateLimit.ts`), pronađe ili stvori slučaj,
   spremi lokaciju ako je zadana, spremi poruku.
3. **Sigurnosna provjera**: `checkRedFlags(message)` (`lib/agent/redFlags.ts`).
   Pogodak → `escalateEmergency()` (`lib/agent/outcome.ts`) → događaj
   `outcome` → `EmergencyTakeover`. Model se nikad ne poziva.
4. **Korak agenta**: `runAgentTurn()` (`lib/agent/run.ts`) šalje Claudeu
   sistemski prompt (`lib/agent/prompt.ts`), pacijentov kontekst i povijest s
   tri alata: `get_my_doctors`, `find_places`, `submit_case_summary`. Tekst
   stiže u preglednik kao događaji `delta`; završni redak `OPCIJE: a | b`
   postaje gumbi za brzi odgovor (`lib/agent/options.ts`).
5. **Slanje**: kad agent pozove `submit_case_summary`, sažetak se provjerava
   (`lib/agent/schemas.ts`), a `submitCase()` (`lib/agent/outcome.ts`) pokreće
   **fiksno usmjeravanje** (`lib/agent/routing.ts`): izravno (najbliža
   otvorena ordinacija) ili preko izabranog liječnika (e-pošta + link za liječnika).
6. **Demo način** obavija 4. korak: `demoSafeTurn()` u istoj ruti prelazi na
   pripremljeni odgovor (`lib/demo.ts`) ako ništa ne stigne unutar 8 s.

---

## 5. Moduli u `src/lib`

| Modul | Zadužen za |
|---|---|
| `agent/prompt.ts` | Sistemski prompt (hrvatski; odgovara na pacijentovu jeziku) + kontekst pojedinog pacijenta |
| `agent/run.ts` | Petlja agenta: streaming, alati, najviše 4 poziva modela po poruci |
| `agent/redFlags.ts` | Fiksna pravila za hitne slučajeve (hrvatski + engleski), prepoznaju negaciju |
| `agent/routing.ts` | Kategorija → prvi kontakt; „izvan mjesta” = > 25 km → izravno za stomatologiju |
| `agent/readiness.ts` | Kad se otključava „Pošalji liječniku” |
| `agent/schemas.ts` | Sažetak slučaja (Zod + JSON Schema predana alatu) |
| `agent/outcome.ts` | `submitCase`, `escalateEmergency`: što se događa nakon sažetka |
| `agent/options.ts` | Čitanje retka za brze odgovore (`OPCIJE:` / `OPTIONS:`) |
| `agent/extractReferral.ts` | Čitanje PDF-a/slike uputnice Claudeom (strukturirani izlaz) |
| `agent/evals.ts` | 17 skriptiranih pacijenata za `pnpm eval` |
| `demo.ts` | Sigurni demo način: kolačić, pripremljeni razgovori, primjer uputnice |
| `caseData.ts` | Sve što stranica slučaja prikazuje, u jednom objektu `CaseView` |
| `cases.ts` | `addCaseEvent()`: zapiši događaj, promijeni status, pošalji uživo |
| `appointments.ts` | Prikaz termina, `.ics`, dostava obavijesti + e-pošta |
| `institution.ts` | Podaci za demo panel bolnice |
| `doctorCase.ts`, `doctorTokens.ts` | Link za liječnika → slučaj; stvaranje/provjera tokena (sprema se hash, 72 h) |
| `patients.ts`, `patientAuth.ts`, `session.ts` | Profil osobe, provjere vlasništva, kolačić identiteta |
| `location.ts` | Naziv grada → točka; spremi gdje je pacijent sada |
| `geo/places.ts` | Najbliža mjesta (PostGIS KNN), otvoreno sada, sljedeće otvaranje, dežurstvo |
| `geo/nextOpening.ts` | „Otvara se ponedjeljak u 7:00” (čista funkcija, testirana) |
| `geo/distance.ts` | Zračna udaljenost, oblikovanje „0,4 km” |
| `email/*` | React Email predlošci + `sendDemoEmail()` (uvijek samo na `DEMO_INBOX`) |
| `realtime/broadcast.ts` | Signal „nešto se promijenilo” na `case:<id>` / `patient:<id>` |
| `db/server.ts` | Supabase klijent sa service role ključem: **samo kod na poslužitelju** |
| `db/browser.ts` | Javni klijent, koristi se samo za slušanje signala uživo |
| `db/types.ts` | Tipovi baze (ažuriraju se ručno kad dodate tablicu ili funkciju) |
| `rateLimit.ts` | Ograničenja za sve što troši kredite modela |
| `format.ts`, `ics.ts`, `similarity.ts`, `ui.ts`, `utils.ts`, `env.ts` | Pomoćne funkcije: datumi po zagrebačkom vremenu, datoteke za kalendar, približno uparivanje, zajedničke klase gumba/kartica, `cn()`, provjerene varijable okruženja |

---

## 6. Komponente

| Mapa | Komponente |
|---|---|
| `chat/` | `ChatScreen` (stanje + tok), `MessageBubble`, `Composer`, `VoiceButton` (Web Speech hr-HR), `QuickReplies`, `LocationBar`, `FinishBar`, `OutcomeCard` |
| `case/` | `CaseScreen`, `CaseProgress` (4 koraka), `CaseTimeline`, `ReferralArrived`, `ReferralCard`, `StatusPill`, `MyCases` |
| `appointment/` | `AppointmentCard` (potvrdi, „ne paše mi”, otkaži, kalendar, upute za dolazak), `AvailabilityPicker` |
| `notifications/` | `OfferCard` (ponuda ranijeg / novog termina, iskoči kao obavijest na mobitelu) |
| `map/` | `InstitutionMap` (MapLibre, učitava se tek kad je na zaslonu), `PlaceCard`, `OpenBadge`, `OnCallCard` |
| `emergency/` | `EmergencyTakeover` (112 preko cijelog zaslona), `Always112Banner` |
| `doctor/` | `DoctorDecision` (učitaj → provjeri → pošalji; povuci i ispusti; U / Ctrl+Enter) |
| `onboarding/` | `PersonaPicker`, `ChooseDoctors` |
| `data/` | `SourceChip` („Izvor: HZZO (data.gov.hr)” → `/javni-podaci`) |
| `layout/` | `AppHeader`, `DemoBar`, `MotionProvider`, `PhoneFrame` (trenutno se ne koristi) |
| `settings/` | `TextSizeToggle` („Veća slova”) |
| `institution/` | `BookingActions` (demo panel bolnice) |
| `ui/` | shadcn osnovne komponente: mijenjati oprezno |

---

## 7. Baza podataka

Migracije se izvršavaju redom imena datoteka. Za novu migraciju napravite
sljedeću numeriranu datoteku, primijenite je lokalno, ažurirajte
`src/lib/db/types.ts` i nakon spajanja je pošaljite u hostanu bazu (vidi §11).

| Migracija | Što dodaje |
|---|---|
| `20261105000001_reference_data` | Tablice otvorenih podataka: ustanove (PostGIS), djelatnosti, usluge, radno vrijeme, liječnici |
| `20261105000002_patient_flow` | Pacijenti, slučajevi, poruke, uputnice, termini, dogovori, obavijesti, događaji slučaja; jedan aktivni dogovor po terminu |
| `20261105000003_functions_security` | Pretraga najbližih mjesta, status otvorenosti, generator sintetičkih termina, Row Level Security, Realtime |
| `20261106000001_doctor_loop_booking` | Tokeni za liječnike, ograničenja, sve funkcije naručivanja i ponuda, profil pacijenta, kartica ustanove |
| `20261107000001_open_data_stats` | Brojke za `/javni-podaci` |
| `20261107000002_fix_slot_availability` | Termin je slobodan samo ako ga ne drži nijedan aktivni dogovor |
| `20261107000003_demo_reset` | „Počni ispočetka” za demo način (samo sintetički pacijenti) |
| `20261107000004_propose_at_institution` | Naručivanje u najbližoj drugoj bolnici kad je odabrana popunjena |

Sve funkcije koje mijenjaju stanje oduzete su javnim ulogama: mogu ih pozivati
samo rute na poslužitelju (service role).

---

## 8. Ažuriranja uživo

`addCaseEvent()` zapisuje redak u `case_events` i poziva `broadcast()` na
`case:<id>`. `useLiveCase()` (`src/hooks/useLiveCase.ts`) sluša teme slučaja i
pacijenta te ponovno dohvaća `/api/cases/[id]`, uz provjeru svakih 15 s kao
zaštitu. Signal ne nosi podatke; ponovno dohvaćanje ide kroz autentificirani API.

---

## 9. Cjevovod podataka (`data-pipeline/`)

| Datoteka | Korak |
|---|---|
| `sources.py` | Svaki skup podataka (CKAN paket + resurs) |
| `fetch.py` | Preuzimanje preko data.gov.hr CKAN API-ja + OpenStreetMap Overpassa → `data/raw/` (+ `manifest.json`) |
| `transform.py` | Čišćenje, normalizacija, približno spajanje bolnica, mapiranje djelatnosti, uklanjanje duplikata → `data/clean/` |
| `geocode.py` | Koordinate koje nedostaju preko Nominatima (1 zahtjev/s), spremljene u `data/cache/geocode.json`, provjera pogrešnog grada |
| `load.py` | `data/clean/` + sintetičke osobe/radno vrijeme → `supabase/seed.sql` |
| `build.sh` | Ponovna izgradnja bez interneta iz spremljenog snimka |
| `tests/test_transform.py` | pytest za transformacije |

Sirovi i očišćeni snimci spremljeni su u repozitorij, pa `./build.sh` ne treba internet.

---

## 10. Testovi

| Naredba (u `app/`) | Što | Trošak |
|---|---|---|
| `pnpm typecheck && pnpm lint && pnpm test` | TypeScript, ESLint, 138 Vitest jediničnih testova (hitni znakovi, usmjeravanje, spremnost, opcije, sljedeće otvaranje, sličnost, kalendar) | besplatno, bez interneta |
| `pnpm exec playwright test` | End-to-end u Chromiumu + Firefoxu: glavni put, promjena termina, hitni slučaj, izravni put, demo način, rubni slučajevi, axe pristupačnost (normalna/veća slova) + tipkovnica | stvarni pozivi modela, centi |
| `E2E_BASE_URL=https://uputko.vercel.app pnpm exec playwright test --project=chromium` | Isto, na stranici uživo | centi |
| `pnpm eval [scenario-id]` | 17 skriptiranih pacijenata protiv pokrenute aplikacije; provjerava hitnost **i** usmjeravanje | centi |
| `cd data-pipeline && .venv/bin/python -m pytest -q` | Transformacije cjevovoda | besplatno |

Prije snimanja ili spajanja u `main` moraju proći testovi glavnog puta i hitnog slučaja.

---

## 11. Česti zadaci

**Dodati ili promijeniti tekst u sučelju.** Mijenjajte samo `src/i18n/hr.ts`;
nikad ne stavljajte tekst izravno u komponente.

**Dodati stranicu ili komponentu.** Stavite je u odgovarajuću mapu (§2, §6).
Svaki asinkroni dio treba stanja učitavanja (skeleton), praznog prikaza,
greške i uspjeha, pristup tipkovnicom i poštivanje smanjenog
kretanja. Osnovni tekst je 18 px, a raspored mora izdržati „Veća slova”
(21 px). Pokrenite `e2e/a11y.spec.ts`.

**Promijeniti pravila za hitne slučajeve ili sistemski prompt.** Ažurirajte
`redFlags.test.ts` (pozitivan **i** negativan primjer za svako pravilo),
pokrenite `pnpm test` i `pnpm eval` te u commitu navedite promjenu ponašanja
(CLAUDE.md §3, pravilo 6).

**Dodati pripremljeni demo razgovor za osobu.** `SCRIPTS` u `src/lib/demo.ts`,
po imenu osobe.

**Dodati migraciju.** Nova numerirana datoteka u `supabase/migrations/`, zatim
lokalno: `pnpm dlx supabase@3.0.0 db reset` (ili primijenite datoteku na
pokrenutu lokalnu bazu), ažurirajte `src/lib/db/types.ts`. Nakon spajanja u
`main`: `pnpm dlx supabase@3.0.0 db push --remote` iz korijena repozitorija
(projekt mora biti povezan; obratite se Renéu).

**Urediti dijagram.** Dijagrami u arhitekturi i izvorima podataka nacrtani su
kodom: `docs/diagrams/*.py` postavljaju svaki okvir i strelicu po koordinatama
(zajedničke pomoćne funkcije u `kit.py`). Svaka skripta drži engleski i
hrvatski tekst jedan uz drugi (`t("English", "Hrvatski")`) i zapisuje
`<naziv>.svg` i `<naziv>.hr.svg`. Promijenite skriptu, zatim iz
`docs/diagrams/` pokrenite `python3 <naziv>.py && node render.cjs` da se
ponovno generiraju SVG-ovi i PNG-ovi (treba `app/node_modules`). Provjerite
stanu li dulji hrvatski natpisi te commitajte skriptu, SVG-ove i PNG-ove.

**Objava.** Spojite u `main`: Vercel objavljuje automatski. Zatim pošaljite
nove migracije i pokrenite end-to-end testove na URL-u uživo.

**Ažurirati dokumentaciju.** Dokumentacija postoji na engleskom (`README.md`,
`docs/*.md`) i hrvatskom (`README.hr.md`, `docs/hr/*.md`). Kad mijenjate jednu
verziju, promijenite i drugu.

---

## 12. Zamke

- **Node ≥ 20** (koristimo 22). Na Nodeu 18 Tailwind pada s `ERR_REQUIRE_ESM`.
  Bez nadogradnje sustava: `npx -y -p node@22 -p pnpm@9 -c 'pnpm dev'`.
- **Ne pokrećite `pnpm build` dok radi `pnpm dev`**: oba koriste `app/.next`
  i kvare jedan drugoga.
- **Linkovi u e-pošti** grade se iz adrese zahtjeva. Lokalno je to
  `http://localhost:3000`, pa link za liječnika otvoren na mobitelu ne radi;
  zamijenite `localhost` LAN adresom računala. Na Vercelu to nije problem.
- **Ograničenja tijekom intenzivnog lokalnog testiranja**: obrišite ih s
  `delete from rate_limits;` u Supabase Studiju (samo lokalno).
- **Demo način vrijedi po pregledniku** (kolačić). I liječnikov preglednik
  treba `?demo=1` za rezervno čitanje uputnice.
- **Vercel previewi** ne uspijevaju za commitove osoba koje nisu članovi
  Vercel projekta. Merge commitovi koje napravi član objavljuju se normalno.
- **Lokalna i hostana baza**: Supabase CLI cilja lokalnu bazu ako ne dodate
  `--remote`. `db reset --remote` briše produkciju; za nove migracije koristite
  `db push --remote`.
