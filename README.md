# The Luxe Version — Studio Admin

React + Vite admin for [the-luxeversion.vercel.app](https://the-luxeversion.vercel.app/).
Fully standalone — all data lives in your browser's `localStorage`. No backend,
no API keys, no network calls.

## Getting started

```bash
npm install
npm run dev        # → http://localhost:5173
```

### Login

| Email | Password |
| --- | --- |
| `admin@theluxeversion.com` | `Luxe@2026` |

Credentials are defined in [`src/lib/store.js`](src/lib/store.js) — edit them there
if you want to change them.

## Pages

- **Dashboard** — catalogue value, pieces in stock, journal + enquiry counts
- **Pieces** — product CRUD with Luxe schema (reference #, dimensions, materials, edit tag, bespoke flag)
- **Categories** — Sculptures / Vases / Tabletop / Lighting
- **The Edit** — curated tags (Statement / New / Limited / Designer)
- **Journal** — essays, guides, studio notes
- **Banners** — home hero, category tiles, feature banners
- **Enquiry** — bespoke, appointment, interior consultation enquiries
- **Settings** — studio info, profile, reset local data

## Data

Every resource is backed by `localStorage` under the `luxe:` prefix. First boot
seeds the admin from [`src/data/seed.js`](src/data/seed.js). You can wipe and
reseed from **Settings → Data → Reset all local data**.

Images are stored as base64 data URLs on the row itself — downscaled to a
1600px long edge via canvas before being saved. Keep gallery sizes reasonable;
browser storage is finite.

## Build

```bash
npm run build      # outputs to dist/
npm run preview
```

## Tech

React 18 · Vite · React Router · zero runtime deps beyond those.
