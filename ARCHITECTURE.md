# Schkeuditz Run — Architecture

A single-event running race website for Schkeuditz. Shares infrastructure with `revolution-crit`.

---

## Repos

| Path | Purpose |
|---|---|
| `/Users/prln255/schkeuditz-run` | **Frontend** — React + Vite + TypeScript, deployed as static site via GitHub Pages |
| `/Users/prln255/revolution-crit-be` | **Backend** — shared with revolution-crit, no changes needed |

Both frontends connect to the same Supabase project: **`okuvxesvadkztizonzky`**.
Data is isolated by `race_calendar.site = 'schkeuditz_run'`.

---

## Stack

Identical to revolution-crit:
- React 19, Vite, TypeScript, Tailwind v4, React Router v7, TanStack Query v5
- `@supabase/supabase-js`, `react-hot-toast`, `xlsx`, `react-markdown`

Design differences: green primary color, `rounded-2xl` cards, animated hover states.

---

## Key difference from revolution-crit

Revolution-crit is a **multi-race calendar** site. Schkeuditz-run is a **single-event** site:
- No `/calendar` route
- Homepage shows the event directly (not a list)
- `RegisterPage` goes straight to category picker (no race picker step)
- Results page is flat — no season/race navigation

The admin flow (create race, edit race, upload results) is identical.

---

## Environment variables

```
VITE_API_BASE_URL=https://revolution-crit-be.onrender.com
VITE_SITE_KEY=schkeuditz_run
VITE_SUPABASE_URL=https://okuvxesvadkztizonzky.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

---

## Categories

| Display | Enum value | Detail |
|---|---|---|
| 5km-Lauf | `lauf_5km` | 5 Runden |
| 10km Lauf | `lauf_10km` | 10 Runden |
| U13m/U15w | `u13m_u15w` | 20 Runden |
| U15m/U17w | `u15m_u17w` | 25 Runden |
| U17m/Masters 4 | `u17m_masters4` | 35 Runden |
| Masters 2/3 | `masters_2_3` | 45 Runden |
| Jedermann leicht | `jedermann_leicht` *(existing)* | 45 Minuten |
| Kids Races | `kids_races` | — |
| Jedermann schwer | `jedermann_schwer` *(existing)* | 60 Minuten |
| Jedefrau | `jedefrau` *(existing)* | 45 Minuten |

New enum values (`lauf_5km`, `lauf_10km`, `u13m_u15w`, `u15m_u17w`, `u17m_masters4`, `masters_2_3`, `kids_races`) are added via migration `20260523000002_add_schkeuditz_categories.sql` in the BE repo.

---

## Deployment

Same GitHub Actions pipeline as revolution-crit. Builds on push to `main`, deploys to GitHub Pages.
`VITE_SITE_KEY=schkeuditz_run` set as a GitHub repo Variable (not a secret).
