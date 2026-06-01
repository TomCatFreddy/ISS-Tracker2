# ISS Tracker

A real-time International Space Station tracker built with Next.js 16, React 19, Leaflet, and Tailwind CSS v4. The map polls the ISS position every few seconds and animates the marker as the station moves across the globe.

## Features

- Live ISS position via `/api/iss` (server-side proxy to [wheretheiss.at](https://wheretheiss.at) — no API key required)
- Interactive Leaflet map with animated marker
- Follow-toggle that keeps the viewport centred on the ISS
- Readout overlay showing latitude, longitude, altitude, and velocity
- Stale-data indicator when the feed is unavailable

## Local development

Node 20 or later is required (Next.js 16 minimum).

```bash
fnm use 20          # or: nvm use 20 / node --version >=20
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other npm scripts:

| Script | Description |
|---|---|
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |

## Data source

ISS position data comes from **[wheretheiss.at](https://wheretheiss.at/w/satellite/25544)** via their public JSON API (`https://api.wheretheiss.at/v1/satellites/25544`). No API key or account is required.

## Deploy to Vercel

### Prerequisites

- [Node 20+](https://nodejs.org/) installed
- A [Vercel account](https://vercel.com/signup)

### Steps

```bash
# 1. Install the Vercel CLI (once)
npm i -g vercel

# 2. Log in
vercel login

# 3. Deploy a preview
vercel

# 4. Deploy to production
vercel --prod
```

During the first deploy Vercel will ask a few questions. Accept the defaults:

- **Set up and deploy?** Yes
- **Which scope?** Your personal account (or team)
- **Link to an existing project?** No (creates a new one)
- **Framework preset** auto-detects as **Next.js** — confirm it

**No environment variables are required.** The `/api/iss` route proxies wheretheiss.at server-side, so there are no CORS issues and no secrets to configure.

The production URL will be printed after the deploy completes.
