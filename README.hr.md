# Uputko

*[English version](README.md)*

AI agent koji građanima Hrvatske pomaže snaći se u zdravstvenom sustavu.
**Datathon Portala otvorenih podataka 2026**, izazov A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.

**Demo uživo:** https://uputko.vercel.app

Svi podaci o pacijentima u ovom projektu su izmišljeni (sintetički). Uputko nikad
ne postavlja dijagnozu i nikad ne preporučuje lijekove; u hitnom slučaju nazovite **112**.

---

## Problem

Doći do liječnika u Hrvatskoj često znači ići od liječnika do liječnika, otići
nekamo samo po uputnicu, nagađati u koju bolnicu ići i nekoliko puta zvati da
bi se pomaknuo jedan termin. Najteže je starijim osobama, studentima i onima
koji su na putu, daleko od svog liječnika.

## Što Uputko radi

Pacijent **jednom** opiše što ga muči, običnim hrvatskim jezikom (ili
engleskim). Sve ostalo događa se u pozadini:

1. **Sigurnost na prvom mjestu.** Fiksna pravila provjeravaju svaku poruku
   *prije* nego što je AI vidi. Hitni slučajevi (bol u prsima uz otežano
   disanje, znakovi moždanog udara, jako krvarenje, suicidalne misli…)
   zaustavljaju razgovor i prikazuju **112** te najbliži hitni prijem (OHBP).
2. **Kratak razgovor.** Asistent postavi nekoliko ciljanih pitanja, jedno po jedno.
3. **Pravi liječnik.** O tome tko prvi preuzima slučaj odlučuje kod, a ne AI:
   zub → stomatolog, ginekološki problem → ginekolog, dijete → pedijatar, sve
   ostalo → obiteljski liječnik. Ako ste izvan svog mjesta i boli vas zub →
   najbliži otvoreni stomatolog u gradu u kojem se nalazite, bez uputnice.
4. **Liječnik u petlji.** Izabrani liječnik dobije gotov sažetak (nikad
   dijagnozu) i siguran link te izdaje uputnicu.
5. **Termin.** Predlaže se najraniji slobodni termin u odgovarajućoj bolnici;
   pacijent ga potvrdi jednim dodirom i dobije upute za dolazak i datoteku za kalendar.
6. **Promjene putem obavijesti.** Oslobodi se raniji termin → *Prihvati / Odbij*.
   Termin ne odgovara → *Ne paše mi* → bolnica ponudi drugi.

Liječnici, bolnice, djelatnosti i lokacije dolaze iz **otvorenih podataka**
(data.gov.hr: HZZO i Grad Zagreb, povezano s OpenStreetMapom). Vidi
[`docs/hr/izvori-podataka.md`](docs/hr/izvori-podataka.md).

> U stvarnosti se e-uputnica izdaje u **CEZIH-u**; naš portal za liječnike
> zamjenjuje taj korak. Termini, uputnice i obavijesti su sintetički. Put do
> produkcije opisan je u [`docs/hr/arhitektura.md`](docs/hr/arhitektura.md).

---

## Isprobajte (bez prijave)

Nema lozinki. Odaberete jednu od tri **izmišljene** osobe; njihovi izabrani
liječnici su stvarni liječnici iz otvorenih podataka HZZO-a.

| Osoba | Priča | Što se dogodi |
|---|---|---|
| **Ana Horvat**, 72, Zagreb | Boli je uho dva dana | Obiteljski liječnik → uputnica za ORL → termin u KBC-u Zagreb |
| **Luka Kovačević**, 21, student u Varaždinu, liječnici u Osijeku | Zubobolja | Najbliži otvoreni stomatolog u Varaždinu, bez uputnice |
| **Maja Babić**, 34, Split | Dijete ima temperaturu | Pedijatar |

1. Otvorite https://uputko.vercel.app → **Opišite problem** → odaberite **Anu**.
2. Napišite: „Boli me uho već dva dana”, odgovorite na nekoliko pitanja, pritisnite **Pošalji liječniku**.
3. Kliknite **Demo: otvori kao liječnik** (u stvarnosti taj link stiže e-poštom).
4. U portalu za liječnike učitajte [`app/public/demo/uputnica-ana-orl.png`](app/public/demo/uputnica-ana-orl.png)
   (ili je tamo preuzmite), provjerite polja, **Pošalji pacijentu**.
5. Natrag na stranici slučaja kod pacijenta: **Stigla je uputnica!** → **Potvrdi termin**.
6. Strana bolnice: otvorite `/ustanova` → **Oslobodi raniji termin** → pacijent
   dobije ponudu ranijeg termina.
7. Hitni slučaj: kao Maja napišite „jako me boli u prsima i ne mogu disati”.

Ostale stranice: `/javni-podaci` (korišteni otvoreni podaci), `/profil` (promjena osobe ili liječnika).

### Sigurni demo način (za snimanje)

Otvorite bilo koju stranicu s **`?demo=1`** (npr. `https://uputko.vercel.app/profil?demo=1`)
i u pacijentovom **i** u liječnikovom pregledniku:

- Ako je AI spor (ništa unutar 8 s) ili ne radi, razgovor se nastavlja
  pripremljenim razgovorom za tu osobu, a čitanje primjera uputnice koristi
  njezin poznati sadržaj. Snimka nikad ne zastaje.
- `/profil` prikazuje **Počni ispočetka**: briše stare slučajeve osoba i
  oslobađa njihove termine, za čistu snimku.
- `?demo=0` ga isključuje.

---

## Pokretanje lokalno

Potrebno: **Node ≥ 20** (koristimo 22), pnpm 9, Docker, Python ≥ 3.12 (samo za
ponovnu izgradnju podataka).

```bash
# 1. Baza (lokalni Supabase u Dockeru; prvo pokretanje preuzima slike)
pnpm dlx supabase@3.0.0 start          # primjenjuje i migracije + seed
pnpm dlx supabase@3.0.0 db reset       # neobavezno: izgradnja od nule

# 2. Aplikacija
cd app
cp .env.example .env.local             # upišite vrijednosti koje ispiše `supabase start`
pnpm install
pnpm dev                               # http://localhost:3000
```

Supabase Studio (sučelje za bazu): http://127.0.0.1:54323

Varijable okruženja navedene su i objašnjene u
[`app/.env.example`](app/.env.example): Supabase ključevi, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`, `DEMO_INBOX` (svaka demo poruka e-pošte ide **samo** tamo),
`UPUTKO_DEMO_OFFLINE` (demo način bez ikakvih poziva AI-ju).

> Na Nodeu 18 aplikacija pada s `ERR_REQUIRE_ESM`. Bez nadogradnje:
> `npx -y -p node@22 -p pnpm@9 -c 'pnpm dev'`.

## Testovi

```bash
cd app
pnpm typecheck && pnpm lint && pnpm test   # 138 jediničnih testova, bez interneta
pnpm test:e2e                              # Playwright, Chromium + Firefox (stvarni pozivi AI-ju, centi)
pnpm eval                                  # 17 skriptiranih pacijenata protiv pokrenute aplikacije (centi)
E2E_BASE_URL=https://uputko.vercel.app pnpm exec playwright test --project=chromium   # stranica uživo

cd ../data-pipeline
.venv/bin/python -m pytest -q && .venv/bin/ruff check .
```

End-to-end testovi pokrivaju glavni put, promjenu termina i ponude ranijeg
termina, hitni put, izravni put (zubobolja), demo način, rubne slučajeve te
automatske provjere pristupačnosti (axe, WCAG 2.2 AA) uz normalna i veća
slova.

Zaštita od zloupotrebe: razgovor je ograničen na 40 poruka na sat po
posjetitelju, 20 po razgovoru i 800 dnevno ukupno; čitanje uputnice na 10 na
sat po posjetitelju.

## Ponovna izgradnja podataka

```bash
cd data-pipeline
./build.sh     # bez interneta: spremljeni sirovi snimak → data/clean → ../supabase/seed.sql
```

Osvježavanje s interneta (CKAN API, OpenStreetMap, Nominatim) opisano je u
[`docs/hr/izvori-podataka.md`](docs/hr/izvori-podataka.md#ponovna-izgradnja).

## Objava (deploy)

- **Aplikacija:** Vercel projekt `uputko` (Root Directory `app`). Svaki push na
  `main` objavljuje se u produkciju; ostale grane dobiju preview URL. Varijable
  iz `app/.env.example` postavljene su u Vercel → Settings → Environment Variables.
- **Baza:** hostani Supabase projekt u EU (`eu-west-1`). Nove migracije nakon
  spajanja: `pnpm dlx supabase@3.0.0 db push --remote` iz korijena repozitorija
  (projekt mora biti povezan: `pnpm dlx supabase@3.0.0 link --project-ref <ref>`).
  CLI cilja lokalnu bazu ako ne dodate `--remote`. Za pristup se obratite Renéu.

## Dokumentacija

| Dokument | Sadržaj |
|---|---|
| [`docs/hr/arhitektura.md`](docs/hr/arhitektura.md) | Dijagram sustava, tokovi, sigurnosni dizajn, podatkovni model (FHIR), skaliranje, put prema CEZIH-u / e-Naručivanju / e-Građanima, pravni preduvjeti |
| [`docs/hr/izvori-podataka.md`](docs/hr/izvori-podataka.md) | Svaki skup podataka: izdavač, licenca, datum, način povezivanja, ograničenja |
| [`docs/hr/vodic-kroz-kod.md`](docs/hr/vodic-kroz-kod.md) | Vodič kroz kod: stranice, API, moduli, baza, testovi, česti zadaci |
| [`CLAUDE.md`](CLAUDE.md), [`PLAN.md`](PLAN.md) | Pravila za suradnike i petodnevni plan (na engleskom) |

## Repozitorij

| Mapa | Sadržaj |
|---|---|
| `app/` | Next.js 15 aplikacija: za pacijente (prvo mobitel), portal za liječnike, demo panel bolnice |
| `data-pipeline/` | Python ETL: data.gov.hr CKAN API → čišćenje → geokodiranje → `supabase/seed.sql` |
| `supabase/` | Postgres + PostGIS shema (migracije) i generirani seed |
| `docs/` | Arhitektura, izvori podataka, vodič kroz kod (engleski; hrvatski u `docs/hr/`) |
