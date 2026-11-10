# ASHA Visit Planner

An offline-first visit planner for frontline health workers in India.

**Live demo:** https://aminoragit.github.io/asha-visit-planner/
**Author:** Sojung Na (나소정)
**Built for:** Code for a Billion Hackathon 2026 — Challenge #06, Health
**Licence:** MIT

## The problem

An ASHA (Accredited Social Health Activist) is a community health worker under
India's National Health Mission. The programme began in 2005 under the
National Rural Health Mission, and the usual norm is one ASHA per 1,000 people
in rural areas. Each worker keeps track of dozens of households: who is
pregnant, which children are due for immunisation, and who needs a follow-up
after a referral. In villages with patchy mobile signal, that list usually
lives on paper. Paper lists get lost, dates get missed, and nobody can see at
a glance which visits are overdue.

## What this does

ASHA Visit Planner is a single web page that runs in the browser and works
offline. It gives a health worker:

- **A household list** — add a household with a name, village, household
  size, and a short note. Search by name or village.
- **Visit checklists** — antenatal, immunisation, and follow-up visits, each
  with a short checklist to tick off during the visit.
- **Due-date reminders worked out on the device** — enter a child's birth date
  and the app adds four planning visits (6 weeks, 10 weeks, 14 weeks, and
  9 months after birth). Enter an expected delivery date and it adds two
  antenatal check-in visits. Every date is a suggestion the worker can change
  or delete.
- **A dashboard** — counts of visits due today, overdue, upcoming, and
  completed, plus a progress bar and a list of overdue visits first.
- **Backup and restore** — download all data as one JSON file, and load it
  back on another device. Nothing is sent to any server.

All data is stored in the browser's local storage on the device itself. There
is no account, no sign-in, and no network call. The app works with the
network off.

## What this does not do

This tool gives no medical advice. It names no medicines and sets no doses.
The checklists are planning prompts — things to check and ask about on a
visit. The immunisation dates are standard planning intervals; the app tells
the worker to check the child's immunisation card and the local health centre
for the exact dates. For any health question, the worker should follow the
guidance of the local health centre.

## Try it

1. Open the live demo link above.
2. Click **Households**, then **Load sample households** to see three sample
   families with four sample visits (one overdue, one due today, one
   upcoming, one completed). Sample entries are marked "Sample".
3. Open a visit, tick checklist items, and click **Mark visit done**.
4. Add your own household and visit to see the dashboard update.

To start over, go to **Data & backup** and click **Delete all data**
(download a backup first if you need the data).

## Run it yourself

No build step and no server code. Any static host works:

```bash
git clone https://github.com/Aminoragit/asha-visit-planner.git
cd asha-visit-planner
python3 -m http.server 8000
# open http://localhost:8000/
```

Or open `index.html` directly in a browser. The app is three files:
`index.html`, `styles.css`, `app.js`. It uses no libraries and loads no
resources from outside.

## How the dates are worked out

- A visit is **overdue** when its due date is before today and it is not
  marked done; **due today** when the due date is today; **upcoming** after
  that.
- The immunisation helper adds visits at 6, 10, and 14 weeks and at 9 months
  after the birth date. These are the usual planning intervals used in
  India's immunisation schedule — the app says so on screen and tells the
  worker to confirm against the child's card.
- The antenatal helper adds check-ins 4 weeks and 1 week before the expected
  delivery date. These are suggestions only.

## Facts used, and where they come from

- ASHA stands for Accredited Social Health Activist; the programme began in
  2005 under the National Rural Health Mission, now part of the National
  Health Mission (Ministry of Health and Family Welfare).
  Source: National Health Mission / MoHFW ASHA guidelines
  (https://nhm.gov.in/) and the ASHA programme record
  (https://en.wikipedia.org/wiki/Accredited_Social_Health_Activist).
- The usual norm is one ASHA per 1,000 people in rural areas, relaxed in
  tribal, hilly, or desert areas. Source: MoHFW ASHA guidelines, as cited
  in the same references above.
- No headcount for the ASHA workforce is stated here: published figures
  differ by year and source, so the app does not quote one.

All names, villages, and dates in the sample data are made up for
demonstration.

## Hackathon notes

- Challenge: #06 Health — frontline health workers, preventive care,
  diagnostics access, public-health surveillance.
- Hackathon: Code for a Billion 2026 (https://codeforindia.org/hackathon).
  Submissions close 15 November 2026. Winners are announced 5 December 2026.
- Registration is a sign-up at AgentFoundry.me (the official IDE). This
  project was built with standard web tooling because the author does not
  yet hold an AgentFoundry account; the author must sign up there and link
  this repo to complete registration.
- Judging (25% each): size of the problem, severity of the problem, quality
  of the solution, proven impact. The app is deployed and usable now, so
  impact can be checked by opening the live link and using it.

## Licence

MIT — see `LICENSE`. Copyright (c) 2026 Sojung Na.
