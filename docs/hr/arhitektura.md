# Arhitektura

*[English version](../architecture.md)*

Uputko je **posrednik između pacijenta i zdravstvenog sustava**. Pacijent
jednom opiše problem, na hrvatskom (ili engleskom). Fiksni sigurnosni sloj i
AI agent utvrde tko bi to trebao preuzeti, pravi liječnik dobije gotov
sažetak, a pacijent dobije „dođite u ovu bolnicu u ovo vrijeme”. Promjene se
rješavaju obavijestima umjesto telefonskim pozivima.

Ovaj dokument opisuje prototip kakav je izgrađen, kako dijelovi međusobno
komuniciraju i put od prototipa do stvarne usluge: CEZIH, FHIR, e-Naručivanje,
e-Građani i pravni preduvjeti.

> **Napomena o iskrenosti.** U stvarnosti e-uputnicu izdaje liječnik u
> **CEZIH-u**, kroz certificirani program svoje ordinacije. Naš portal za
> liječnike zamjenjuje taj korak. Termini, pacijenti, uputnice i obavijesti u
> prototipu su **sintetički** i tako su označeni u sučelju. Otvoreni podaci ne
> sadrže ništa od toga.

> Dijagrami su na engleskom; opis svakog koraka nalazi se u tekstu ispod njih.

---

## 1. Pregled sustava

![Pregled sustava Uputko: pacijent, liječnik i šalter bolnice lijevo; Next.js aplikacija u sredini (API za razgovor, pravila za hitne znakove, AI agent, tablica usmjeravanja, portal za liječnike, API za naručivanje, stranica slučaja); Supabase Postgres i Realtime desno; cjevovod otvorenih podataka dolje; Claude, Resend i OpenFreeMap gore.](../diagrams/system-overview.png)

*Izvor: [`diagrams/system-overview.py`](../diagrams/system-overview.py) · [SVG](../diagrams/system-overview.svg)*

| Dio | Tehnologija | Zašto |
|---|---|---|
| Aplikacija | Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4 | Jedan repozitorij za stranice i API rute; trenutne objave na Vercelu |
| Baza | Supabase Postgres + PostGIS | Traženje najbližih mjesta (KNN na GIST indeksu), transakcije za naručivanje, Realtime |
| Ažuriranja uživo | Supabase Realtime Broadcast + provjera svakih 15 s kao zaštita | Pacijentov mobitel se osvježi čim liječnik nešto napravi |
| AI | Claude API (`claude-haiku-5-5`, postavlja se s `ANTHROPIC_MODEL`), streaming + alati | Brzi i jeftini kratki odgovori; čita sliku uputnice |
| E-pošta | Resend + React Email | Poruke liječniku i pacijentu, **samo** u demo sandučić tima |
| Karte | MapLibre GL + OpenFreeMap pločice | Otvoreni kod, bez API ključa |
| Podaci | Python 3.12, pandas, rapidfuzz, Nominatim | Neuredni XLS/CSV s javnih portala, približno uparivanje naziva, spremljeno geokodiranje |
| Hosting | Vercel (aplikacija) · Supabase projekt u EU (`eu-west-1`) | Besplatna razina, bez održavanja |

---

## 2. Glavni tokovi

### 2.1 Glavni put: pacijent → liječnik → uputnica → termin

![Glavni put po stazama: 1 pacijent opiše problem; 2 pravila za hitne znakove; 3 AI postavi nekoliko pitanja dok pacijent odgovara; 4 tablica usmjeravanja odabere obiteljskog liječnika; 5 liječnik dobije link e-poštom i otvori portal; 6 učita uputnicu, AI je pročita i liječnik je pošalje; 7 najraniji termin bolnice drži se 15 minuta; 8 na pacijentovom mobitelu uživo se pojavi „Stigla je uputnica!” i pacijent potvrdi; 9 termin je rezerviran, uz datoteku za kalendar i upute za dolazak.](../diagrams/golden-path.png)

*Izvor: [`diagrams/golden-path.py`](../diagrams/golden-path.py) · [SVG](../diagrams/golden-path.svg)*

1. **Profil.** Pacijent odabere demo osobu. Njezini izabrani liječnici su
   stvarni liječnici iz otvorenih podataka HZZO-a (pri postavljanju se svi mogu
   pretražiti po imenu ili gradu).
2. **Razgovor** (`/api/chat`). Svaka poruka prvo prolazi kroz **fiksna pravila
   za hitne znakove** (`lib/agent/redFlags.ts`). Agent je vidi tek ako se
   nijedno pravilo ne aktivira. Agent u svakom koraku postavi jedno kratko
   pitanje, a odgovor stiže riječ po riječ (Server-Sent Events).
3. **Spremnost.** „Pošalji liječniku” se otključa kad je pacijent opisao
   dovoljno (3 od 5 osnovnih podataka ili 3 poruke): `lib/agent/readiness.ts`,
   fiksna pravila.
4. **Sažetak.** Agent poziva alat `submit_case_summary` sa sažetkom spremnim
   za liječnika, provjerenim kroz Zod (`lib/agent/schemas.ts`). Predložena
   djelatnost označena je kao *prijedlog, ne dijagnoza*.
5. **Usmjeravanje radi kod, ne model.** `lib/agent/routing.ts` povezuje
   kategoriju tegobe s prvim kontaktom (zub → stomatolog, ginekološki problem →
   ginekolog, dijete → pedijatar, sve ostalo → obiteljski liječnik).
6. **Liječnik u petlji.** Siguran link (nasumični token, sprema se samo njegov
   hash, vrijedi 72 h) šalje se e-poštom u demo sandučić, a za demo se
   prikazuje i u aplikaciji. Portal prikazuje sažetak, cijeli razgovor i
   obližnje bolnice za predloženu djelatnost.
7. **Uputnica.** Liječnik učita uputnicu koju je izdao (PDF ili slika). Claude
   pročita vrstu, djelatnost, bolnicu, prioritet i napomenu; liječnik provjeri
   i ispravi polja te je pošalje. *U produkciji je ovaj korak CEZIH (§8).*
8. **Naručivanje.** `propose_appointment()` u jednoj SQL transakciji drži
   najraniji slobodni termin u toj bolnici 15 minuta. Jedinstveni indeks
   jamči samo jedan aktivni dogovor po terminu. Ako ta bolnica nema slobodan
   termin u sljedeća 3 tjedna, pokušavaju se najbliže druge bolnice s istom
   djelatnošću (`propose_appointment_at()`), a pacijentu se kaže zašto.
9. **Ažuriranje uživo.** Svaka promjena statusa zapisuje se kao redak u
   `case_events` i emitira; stranica slučaja kod pacijenta ponovno dohvaća
   podatke i animira promjenu.
10. **Potvrda.** Pacijent potvrdi; dobije `.ics` datoteku za kalendar, upute
    za dolazak i potvrdu e-poštom.

### 2.2 Promjene putem obavijesti, ne telefonom

- **Raniji termin.** Kad se termin oslobodi (`/ustanova` → *Oslobodi raniji
  termin* simulira nečije otkazivanje), `offer_freed_slot()` ga nudi pacijentu
  s najkasnijim kasnijim terminom za istu bolnicu i djelatnost i drži ga 15
  minuta. *Prihvati* premješta termin i nudi stari dalje; *Odbij* ga nudi
  sljedećem pacijentu.
- **„Ne paše mi”.** Pacijent označi dane i dijelove dana koji mu odgovaraju;
  bolnica vidi zahtjev s odgovarajućim slobodnim terminima i ponudi jedan;
  pacijent prihvati ili odbije.
- Sve ovo radi kao pojedinačne SQL funkcije sa zaključavanjem redaka, pa dva
  pacijenta nikad ne mogu dobiti isti termin.

### 2.3 Izravni put (izvan mjesta stanovanja)

Ako je pacijent više od 25 km od kuće, a kategorija dopušta izravan pristup
(stomatologija), slučaj se usmjerava `direct`: bez uputnice i bez e-pošte.
Pacijent dobije najbliže otvorene ordinacije u gradu u kojem se sada nalazi
(KNN pretraga u PostGIS-u, „otvoreno sada” prema radnom vremenu). Ako ništa
nije otvoreno, za svaku ordinaciju piše kad se sljedeći put otvara, uz
najbliži hitni prijem (0–24) za slučaj „ne mogu čekati”.

### 2.4 Hitni put

Pogodak pravila za hitne znakove (bol u prsima uz otežano disanje, znakovi
moždanog udara, jako krvarenje, suicidalne izjave, gubitak svijesti,
anafilaksija, napadaj, znakovi meningitisa, ozljeda glave sa znakovima
opasnosti, trovanje, krvarenje u trudnoći) zaustavlja razgovor **prije nego
što se pozove model**. Pacijent vidi preko cijelog zaslona 112 i najbliži
hitni prijem (OHBP). Modelova vlastita procjena `urgency: hitno` drugi je
sloj koji reagira na isti način.

---

## 3. Sigurnosni dizajn

| Sloj | Gdje | Što jamči |
|---|---|---|
| Pravila za hitne znakove | `lib/agent/redFlags.ts` (hrvatski + engleski) | Fiksna pravila, rade na svakoj poruci prije modela; jedinični testovi s pozitivnim i negativnim primjerima |
| Hitnost prema modelu | `submit_case_summary.urgency = "hitno"` | Druga zaštita za hitne slučajeve koje pravila ne navode |
| Sistemski prompt | `lib/agent/prompt.ts` | Nikad dijagnoza, nikad preporuka lijeka, jedno pitanje odjednom, 112 kad postoji sumnja |
| Fiksno usmjeravanje | `lib/agent/routing.ts` | Model razvrstava; kod odlučuje tko preuzima |
| Liječnik u petlji | Portal za liječnike | Samo liječnik izdaje uputnicu; AI nikad nikoga ne upućuje |
| 112 uvijek vidljiv | `Always112Banner` na svakoj stranici za pacijente | Broj hitne službe nikad nije dalje od jednog dodira |
| Ograničenja zloupotrebe | `lib/rateLimit.ts`, tablica `rate_limits` | Razgovor 40 poruka na sat po posjetitelju, 20 po razgovoru, 800 dnevno ukupno; čitanje uputnice 10 na sat |
| Evaluacije | `lib/agent/evals.ts`, `pnpm eval` | 17 skriptiranih pacijenata (uklj. 2 na engleskom) provjerava hitnost **i** usmjeravanje na pokrenutoj aplikaciji |

---

## 4. Podatkovni model

Oblikovan prema resursima **HL7 FHIR**, tako da je integracija s nacionalnim
sustavima pitanje mapiranja, a ne prepisivanja. Migracije su u
`supabase/migrations/` (numerirane, po redu).

| Tablica | FHIR pandan | Sadržaj |
|---|---|---|
| `institutions` | Organization / Location | 5.128 bolnica, domova zdravlja i ordinacija; PostGIS točka; `source_dataset` na svakom retku |
| `specialties`, `institution_services` | HealthcareService | 174 djelatnosti HZZO-a i koja ih ustanova nudi |
| `institution_hours` | Location.hoursOfOperation | Radno vrijeme (OSM, 0–24 za OHBP, demo-popunjeno gdje je označeno) |
| `practitioners` | Practitioner / PractitionerRole | 4.901 izabrani liječnik iz HZZO-a (obiteljski, stomatolog, ginekolog, pedijatar) |
| `patients`, `patient_practitioners` | Patient, CareTeam | 3 sintetičke osobe i njihovi izabrani liječnici |
| `cases` | Encounter + QuestionnaireResponse | Status, put, hitnost, strukturirani sažetak, gdje je pacijent sada |
| `messages` | Communication | Zapis razgovora |
| `referrals` | ServiceRequest | Vrsta, djelatnost, prioritet, bolnica, napomena, učitani dokument |
| `slots` | Slot | **Sintetički** termini od 30 minuta, 3 tjedna unaprijed, u bolnicama u demo gradovima |
| `appointments` | Appointment | proposed → confirmed / reschedule_requested / cancelled |
| `notifications` | Communication | Ponude ranijeg termina i promjene termina (Prihvati / Odbij) |
| `case_events` | AuditEvent | Svaka promjena statusa; pokreće vremensku crtu i ažuriranja uživo |
| `doctor_tokens` | — | Hash svakog linka za liječnika, istek, prva upotreba |
| `rate_limits` | — | Brojači posjetitelja kao hash (IP adrese se ne spremaju) |

**Stanja slučaja:** `intake → triaged → sent_to_doctor → viewed_by_doctor →
referral_issued → appointment_proposed → appointment_confirmed`, te
`routed_direct`, `emergency_escalated`, `reschedule_requested`, `closed`.

Funkcije u bazi (PL/pgSQL, samo za poslužitelj): `nearest_institutions`,
`open_status`, `propose_appointment`, `propose_appointment_at`,
`confirm_appointment`, `cancel_appointment`, `offer_freed_slot`,
`accept_slot_offer`, `decline_slot_offer`, `request_reschedule`,
`offer_reschedule`, `free_slot`, `release_expired_holds`,
`generate_demo_slots`, `patient_profile`, `institution_card`,
`search_practitioners`, `open_data_stats`, `demo_reset`, `hit_rate_limit`.

---

## 5. Sigurnost i privatnost (razina prototipa)

- **Samo sintetički pacijenti.** Nema stvarnih zdravstvenih podataka u
  repozitoriju, bazi, zapisima ni videu. Imena stvarnih liječnika dolaze iz
  javnih podataka HZZO-a; nijedna poruka nikad se ne šalje stvarnom liječniku.
  Sva e-pošta ide u jedan sandučić pod kontrolom tima.
- **Row Level Security** uključen je za svaku tablicu. Otvoreni podaci su
  javno čitljivi; tablice s pacijentovim podacima nemaju javnih pravila, pa ih
  mogu čitati i pisati samo rute na poslužitelju (service role, nikad se ne
  šalje u preglednik).
- **Provjera vlasništva** na svakoj API ruti za pacijente: demo kolačić
  identiteta mora biti vlasnik slučaja, termina ili obavijesti.
- **Linkovi za liječnike:** nasumični token u e-pošti; sprema se samo SHA-256
  hash; istječe nakon 72 h. (CLAUDE.md je tražio jednokratne linkove;
  ostavili smo ih višekratnima do isteka jer liječnici osvježavaju stranice.)
- **Realtime ne prenosi podatke,** samo signal „nešto se promijenilo”;
  stranica zatim ponovno dohvaća podatke kroz autentificirani API.
- **Tajne** su samo u `.env.local` / varijablama okruženja na Vercelu;
  `app/.env.example` navodi nazive.
- **Nema osobnih podataka u zapisima;** brojači posjetitelja spremaju
  jednosmjerni hash, a ne IP.

---

## 6. Pouzdanost

| Rizik | Rezervno rješenje |
|---|---|
| Model spor ili nedostupan tijekom snimanja | **Sigurni demo način** (`?demo=1`): ako ništa ne stigne unutar 8 s, nastavlja se pripremljeni razgovor te osobe; čitanje primjera uputnice koristi njezin poznati sadržaj. `UPUTKO_DEMO_OFFLINE=1` potpuno preskače model. |
| Model zakaže za stvarnog korisnika | Dva automatska ponovna pokušaja; zatim prijateljska poruka s *Pokušaj ponovno* (poruka se nikad ne sprema dvaput) |
| Prekine se Realtime veza | Stranica slučaja provjerava svakih 15 s |
| Ne učitaju se pločice karte | Adresa je uvijek ispisana uz kartu; karte se učitavaju tek kad su na zaslonu |
| Servis za rute nedostupan | Koristimo samo zračnu udaljenost (bez vanjskog servisa za rute) |
| Nestane URL skupa podataka | Sirovi snimak otvorenih podataka spremljen je u repozitorij; baza se ponovno gradi bez interneta jednom naredbom |
| Dva pacijenta, jedan termin | Zaključavanje redaka u SQL-u + jedinstveni indeks na aktivnim terminima |

Testirano s: 138 jediničnih testova (Vitest), Playwright end-to-end testovi u
Chromiumu i Firefoxu (glavni put, hitni slučaj, izravni put, promjena termina,
demo način, rubni slučajevi, axe pristupačnost u svijetlom/tamnom/većim
slovima) i evaluacije agenta.

---

## 7. Kako se skalira izvan prototipa

Aplikacija **ne čuva stanje**: svaki zahtjev može se izvršiti na bilo kojoj
instanci poslužitelja; sve stanje je u Postgresu. Koraci skaliranja, nijedan
ne traži redizajn:

1. **Opterećenje čitanjem** (pretraga, karte, otvoreni podaci): Postgres
   replike za čitanje; otvoreni podaci rijetko se mijenjaju i mogu se
   spremiti u predmemoriju na rubu mreže.
2. **Opterećenje razgovorom:** agent je jedan kratak streamani zahtjev po
   poruci; Vercel/Node skalira se horizontalno. Prompt caching drži troškove
   modela niskima.
3. **Natjecanje oko termina:** svako naručivanje je jedna kratka transakcija
   sa zaključavanjem jednog termina, što se dobro skalira. U produkciji
   terminima upravljaju sustavi bolnica (vidi §8), a Uputko samo prosljeđuje
   zahtjeve.
4. **Obavijesti:** s obavijesti u aplikaciji + e-pošte prijeći na Web Push i
   SMS kroz red čekanja, da spori pružatelji nikad ne blokiraju zahtjev.
5. **Osvježavanje podataka:** cjevovod je idempotentan i može se ponovno
   pokrenuti; zakazati ga (npr. svake noći) prema živom CKAN API-ju umjesto
   spremljenog snimka.

---

## 8. Put do produkcije (dokumentiran, nije izgrađen)

![Put do produkcije: pacijent se prijavi preko e-Građana / NIAS-a i jednom opiše problem Uputku; Uputko šalje sažetak u certificirani program ordinacije izabranog liječnika primarne zaštite; liječnik izdaje e-uputnicu u CEZIH-u; uputnica ide u e-Naručivanje, koje naručuje kod bolnice; termini, raniji termini i nova vremena vraćaju se Uputku, koji obavještava pacijenta push porukom ili SMS-om.](../diagrams/production-path.png)

*Izvor: [`diagrams/production-path.py`](../diagrams/production-path.py) · [SVG](../diagrams/production-path.svg)*

| Dio prototipa | Postaje | Napomene |
|---|---|---|
| Odabir demo osobe | Prijava preko **e-Građana / NIAS-a** | Nacionalni identitet; pacijentovi izabrani liječnici dolazili bi iz evidencije HZZO-a umjesto ručnog odabira. TODO(verify): uvjeti pristupa za uslugu treće strane |
| Portal za liječnike + učitavanje | Dodatak ili link u **certificiranom programu ordinacije**, koji izdaje e-uputnicu u **CEZIH-u** | Sažetak se mapira na FHIR `QuestionnaireResponse` / `Encounter`; uputnica na `ServiceRequest`. TODO(verify): koje FHIR profile i sučelja CEZIH nudi trećim stranama |
| Sintetički termini + panel `/ustanova` | **e-Naručivanje** i bolnički informacijski sustavi | Naš model `Slot` / `Appointment` mapira se 1:1. Ponude ranijeg termina i „ne paše mi” postaju poruke šalteru za naručivanje umjesto telefonskih poziva, što štedi i bolnicama. TODO(verify): dostupna sučelja e-Naručivanja |
| E-pošta u demo sandučić | Sigurne poruke unutar CEZIH-a / programa ordinacije | Nema zdravstvenih podataka u običnoj e-pošti |
| Obavijesti u aplikaciji | Web/native push + SMS kao rezerva | SMS je važan za starije pacijente bez pametnih telefona |
| Snimak otvorenih podataka (HZZO datoteke 2017.–2018.) | Živi registri koji se redovito osvježavaju | Potrebno je i strojno čitljivo radno vrijeme i raspored dežurstava, koji se danas ne objavljuju |

---

## 9. Pravni i organizacijski preduvjeti

Ovo se mora riješiti prije nego što uslugu koriste stvarni pacijenti. Riječ je
o procjenama koje treba napraviti, a ne o zaključcima; zadnju riječ imaju
kvalificirani pravnik i regulatori.

- **GDPR, članak 9.:** zdravstveni podaci su posebna kategorija. Potrebni su
  zakonita osnova i izričita privola, **procjena učinka na zaštitu podataka**
  (DPIA), obrada isključivo u EU i ugovori o obradi podataka s pružateljima
  hostinga i AI-ja.
- **EU Uredba o medicinskim proizvodima (MDR):** softver koji trijažira
  pacijente može se smatrati medicinskim proizvodom. Potrebna je regulatorna
  procjena, vjerojatno praćena CE oznakom.
- **EU Akt o umjetnoj inteligenciji:** AI sustav za zdravstvenu trijažu
  vjerojatno je **visokorizičan**. To znači upravljanje rizikom, ljudski nadzor
  (dizajn s liječnikom u petlji tu pomaže), obveze bilježenja i transparentnosti.
- **HZZO / Ministarstvo zdravstva:** sporazum o integraciji te **certifikacija
  za CEZIH** za svaku komponentu koja dira e-uputnicu ili naručivanje.
- **Klinička validacija:** pravila za hitne znakove i tablicu usmjeravanja
  moraju pregledati i potvrditi liječnici prije stvarne upotrebe.
- **Pristupačnost:** usluge javnog sektora moraju zadovoljiti WCAG 2.1 AA
  (EU Direktiva o pristupačnosti mrežnih stranica); prototip već prolazi
  automatske provjere WCAG 2.2 AA na stranicama za pacijente.

---

## 10. Poznata ograničenja

- Otvoreni podaci HZZO-a su iz **2017.–2018.**; neki liječnici i bolnice su se promijenili.
- Otvoreni podaci **nemaju radno vrijeme ni raspored dežurstava** za većinu
  ordinacija; demo gradovi imaju ručno popunjeno radno vrijeme, označeno
  `demo_hand_filled`.
- Oko 12 % lokacija je približno (na razini poštanskog broja). One se
  rangiraju iza točnih, a adresa se uvijek prikazuje.
- Udaljenosti su zračne, a ne vrijeme putovanja.
- Glasovni unos koristi Web Speech API preglednika; kvaliteta ovisi o pregledniku.
- Za zubobolju izvan radnog vremena stvarna rezervna opcija je stomatološka
  dežurna služba, koju otvoreni podaci ne objavljuju; umjesto toga upućujemo
  na najbliži hitni prijem. TODO(verify) s liječnikom.

Vidi [`izvori-podataka.md`](izvori-podataka.md) za svaki skup podataka i
način povezivanja te [`vodic-kroz-kod.md`](vodic-kroz-kod.md) za vodič kroz kod.
