# Schkeuditz Run — Implementation Plan

Single-race running event website. Shares the same Supabase project and Express backend as `revolution-crit`, isolated by `site = 'schkeuditz_run'`.

---

## Phase 1 — Repository Setup

- [ ] Create new GitHub repo `schkeuditz-run`
- [ ] `git init` locally at `/Users/prln255/schkeuditz-run`
- [ ] Copy the full `src/`, config files, and tooling from `revolution-crit` as the starting point
  - `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`, `index.html`
  - `.github/workflows/deploy.yaml` (same GitHub Pages deploy pipeline)
- [ ] Update `package.json` name to `schkeuditz-run`
- [ ] Create `.env` with:
  ```
  VITE_API_BASE_URL=https://revolution-crit-be.onrender.com
  VITE_SITE_KEY=schkeuditz_run
  VITE_SUPABASE_URL=https://okuvxesvadkztizonzky.supabase.co
  VITE_SUPABASE_ANON_KEY=<same anon key>
  ```
- [ ] Add GitHub repo **Variables**: `VITE_API_BASE_URL`, `VITE_SITE_KEY=schkeuditz_run`
- [ ] Add GitHub repo **Secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Phase 2 — Database Migration (in `revolution-crit-be`)

New file: `supabase/migrations/20260523000002_add_schkeuditz_categories.sql`

New enum values needed (others already exist: `jedermann_leicht`, `jedermann_schwer`, `jedefrau`):

| Display name        | New enum value     |
|---------------------|--------------------|
| 5km-Lauf            | `lauf_5km`         |
| 10km Lauf           | `lauf_10km`        |
| U13m/U15w           | `u13m_u15w`        |
| U15m/U17w           | `u15m_u17w`        |
| U17m/Masters 4      | `u17m_masters4`    |
| Masters 2/3         | `masters_2_3`      |
| Kids Races          | `kids_races`       |

Also insert labels into `race_categories` for each new value.

Run via: **Supabase SQL editor** or `supabase db push`.

---

## Phase 3 — Design System

Revolution-crit uses a neutral/dark palette. Schkeuditz Run uses **green as primary** with a sportier, more interactive feel.

### Colors (Tailwind custom tokens)
```
primary:        #16a34a  (green-600)
primary-hover:  #15803d  (green-700)
primary-light:  #dcfce7  (green-100)
surface:        #f0fdf4  (green-50)  ← page background
text:           #14532d  (green-950) for headings
border:         #bbf7d0  (green-200)
```

### Style rules
- Rounded corners: `rounded-2xl` on cards (vs `rounded-lg` in rev-crit)
- Border style: `border-2 border-green-200` on cards; `ring-2 ring-green-400` on focus
- Button: filled green with white text; outline variant with green border
- Hover transitions: `transition-all duration-200` on cards (scale + shadow)
- Hero section: full-width banner with a race/running image + green overlay
- Typography: slightly bolder headings, uppercase tracking on labels

### Components to restyle (all from scratch, not copied)
- `Header.tsx` — green top bar, logo left, nav right
- `Footer.tsx` — dark green background
- `RaceCard.tsx` / `RaceTable.tsx` — replaced by a single `EventCard.tsx` (since it's one event)
- Form inputs — green focus ring, rounded
- Buttons — green primary, outlined secondary

---

## Phase 4 — Page Structure

Since schkeuditz-run is a **single event site** (not a calendar), the page structure is simpler than revolution-crit.

### Routes

| Path | Page | Notes |
|---|---|---|
| `/` | `HomePage` | Hero + event info + CTA to register |
| `/register` | `RegisterPage` | Category picker → Stripe |
| `/registration-success` | `RegistrationSuccessPage` | Post-Stripe confirmation |
| `/results` | `ResultsPage` | Public results table, filterable by category |
| `/races/new` | `NewRacePage` (Admin) | Same as rev-crit |
| `/races/:raceId/edit` | `EditRacePage` (Admin) | Same as rev-crit |
| `/races/:raceId/results` | `RaceResultsPage` (Admin) | Same as rev-crit |
| `/login` | `LoginPage` | Same as rev-crit |
| `/imprint` | `ImprintPage` | Static |
| `/privacy` | `PrivacyPage` | Static |

No `/calendar` route — there is only one event, shown directly on home.

### `HomePage` layout
1. **Hero** — full-width, race photo background, green overlay, event name + date + location, "Jetzt anmelden" CTA button
2. **Event info strip** — date / location / distance summary (3 cards)
3. **Categories grid** — all 9 categories as cards with distance/rounds info
4. **Registration CTA** — prominent green button section
5. **Results teaser** (after race date) — latest results or link

### `RegisterPage`
- Same flow as `RaceRegistrationPage` in rev-crit
- Shows only schkeuditz categories (filtered by `site`)
- The `frauen`-style hidden-category pattern can be reused for results-only categories

---

## Phase 5 — Shared Code (copy from revolution-crit, minimal changes)

These files are copied verbatim or near-verbatim:

| File | Change needed |
|---|---|
| `lib/supabase.ts` | None |
| `lib/raceCalendar.ts` | None (already uses `VITE_SITE_KEY`) |
| `lib/raceCategories.ts` | None |
| `lib/paymentApi.ts` | None |
| `lib/participants.ts` | None |
| `lib/nations.ts` | None |
| `types.ts` | None |
| `pages/NewRacePage.tsx` | None (already writes `site`) |
| `pages/EditRacePage.tsx` | None |
| `pages/RaceResultsPage.tsx` | None |
| `pages/LoginPage.tsx` | Restyle only |
| `pages/RegistrationSuccessPage.tsx` | Restyle only |
| `components/RequireAuth.tsx` | None |

---

## Phase 6 — Category Display Config

Add a local config file `src/lib/schkeuditzCategories.ts` that maps enum values to display info shown on the homepage:

```ts
{ id: 'lauf_5km',       label: '5km-Lauf',        detail: '5 Runden'    }
{ id: 'lauf_10km',      label: '10km Lauf',        detail: '10 Runden'   }
{ id: 'u13m_u15w',      label: 'U13m / U15w',      detail: '20 Runden'   }
{ id: 'u15m_u17w',      label: 'U15m / U17w',      detail: '25 Runden'   }
{ id: 'u17m_masters4',  label: 'U17m / Masters 4', detail: '35 Runden'   }
{ id: 'masters_2_3',    label: 'Masters 2/3',       detail: '45 Runden'   }
{ id: 'jedermann_leicht', label: 'Jedermann leicht', detail: '45 Minuten' }
{ id: 'kids_races',     label: 'Kids Races',        detail: ''            }
{ id: 'jedermann_schwer', label: 'Jedermann schwer', detail: '60 Minuten' }
{ id: 'jedefrau',       label: 'Jedefrau',          detail: '45 Minuten' }
```

Used on the homepage categories grid and the register page category picker.

---

## Phase 7 — Deployment

- Push to `main` → GitHub Actions builds and deploys to GitHub Pages
- Configure custom domain if applicable (add `CNAME` file to `public/`)
- Verify `VITE_SITE_KEY=schkeuditz_run` is set in GitHub repo Variables

---

## Execution order

```
1. Phase 2  — DB migration (unblocks everything)
2. Phase 1  — Repo + tooling setup
3. Phase 3  — Design tokens + global styles
4. Phase 5  — Copy shared lib/pages
5. Phase 6  — Category config
6. Phase 4  — Build new pages (HomePage, RegisterPage, Results)
7. Phase 7  — Deploy + verify
```
