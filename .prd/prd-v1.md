---
version: 1
status: built
date: 2026-06-01
author: faustli
previous: null
---

# ISS Tracker — v1: Live Map

## 1. Problem

People are curious about where the International Space Station is *right now*, but the answer isn't glanceable. Existing tools either bury the position behind sign-ups, overload the screen with telemetry, or require installing an app. There's no friction-free "open a URL, see the dot on a map, watch it move" experience.

If we don't solve this, the curious user bounces between cluttered sites or gives up. The opportunity is a clean, single-purpose page anyone can open and immediately understand.

## 2. Solution

A single-page web app that shows a world map with the ISS's current position as a marker. The position auto-refreshes every few seconds and the marker animates to each new location, so the station visibly tracks across the map in real time. A small readout shows latitude, longitude, altitude, and velocity. A follow toggle keeps the map centered on the station (on by default) or lets the user pan freely.

## 3. Scope

| This PRD covers | This PRD does NOT cover |
| --- | --- |
| Live map with auto-refreshing ISS marker | Pass predictions for a user's location |
| Marker animation between position updates | Orbital ground-track / trajectory line |
| Lat / lon / altitude / velocity readout | Crew roster aboard the ISS |
| Follow toggle (auto-recenter) | User accounts, persistence, history |
| Server-side API proxy to the data source | Notifications / alerts |
| Graceful handling of fetch failures (stale indicator) | Mobile native app |
| Deployable to Vercel | Multiple satellites / object selection |

## 4. Architecture

> **Stack note:** The workshop default stack is Next.js + Convex + Tailwind. v1 stores no data — the position is fetched live from an external API on every poll and never persisted — so **Convex is intentionally omitted**; there is nothing to store or query. Stack used: **Next.js (App Router) + TypeScript + Tailwind CSS + Leaflet/react-leaflet**, deployed on Vercel. Map tiles come from OpenStreetMap (free, no API key).

#### Plugin/component structure

```
ISS-Tracker2/
├── app/
│   ├── layout.tsx          # root layout, Tailwind + Leaflet CSS
│   ├── page.tsx            # home page; renders the map (client)
│   ├── globals.css         # Tailwind directives + base styles
│   └── api/
│       └── iss/
│           └── route.ts    # server proxy → wheretheiss.at
├── components/
│   └── IssMap.tsx          # 'use client' Leaflet map + marker + readout
├── lib/
│   └── iss.ts              # IssPosition type + typed fetch helper
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind config + .gitignore
```

#### Key components

- **`app/api/iss/route.ts`** — Server route that proxies `https://api.wheretheiss.at/v1/satellites/25544`. Owns the upstream contract; normalizes the response to a stable shape. Exists so the browser never calls the third-party API directly (avoids CORS surprises, lets us throttle/cache, and isolates the data source so it can be swapped without touching the UI).
- **`components/IssMap.tsx`** — Client component owning all map state. Initializes the Leaflet map and OSM tile layer, places the 🛰️ marker, polls `/api/iss` on an interval, animates the marker to each new position, renders the readout overlay, and manages the follow toggle. Depends on `lib/iss.ts` for fetching and types.
- **`lib/iss.ts`** — Defines the `IssPosition` type (`latitude`, `longitude`, `altitude`, `velocity`, `timestamp`) and a typed fetch helper against the internal `/api/iss` route. Single source of truth for the position shape.

#### Data flow

```
Browser (IssMap, every ~5s)
   │  GET /api/iss
   ▼
Next.js route handler  ──►  wheretheiss.at/v1/satellites/25544
   │  normalized JSON
   ▼
IssPosition { latitude, longitude, altitude, velocity, timestamp }
   │
   ▼
Marker animates to new lat/lon  +  readout updates
(if follow = on → map recenters)
```

#### Integration points

Greenfield — no existing code to integrate with. The internal `/api/iss` route is the single seam between the UI and the external data provider; swapping providers (e.g. to Open Notify or TLE-based propagation) is confined to that route and `lib/iss.ts`.

## 5. Success Metrics

| Metric | Target |
| --- | --- |
| Marker appears on first load | < 3s on a normal connection |
| Position refresh cadence | Every 5s, marker animates (no teleport jump) |
| Movement visible to the eye | Position visibly changes within ~30s of watching |
| Resilience | A failed poll keeps the last position + shows a stale indicator; no crash/blank map |
| Type safety | No `any` on the position path; `IssPosition` enforced end to end |
| Deploys to Vercel | `npm run build` succeeds; preview deploy renders the live map |

## 6. Out of Scope

- Pass predictions / "when is it overhead for me"
- Orbital ground-track line or trajectory projection
- Crew roster and detailed telemetry beyond the four readout values
- User accounts, saved locations, history, or any persistence
- Notifications or alerts
- Tracking satellites other than the ISS (NORAD 25544)
- Native mobile app

## User/System Flow

```
User opens URL
      │
      ▼
Map loads (OSM tiles)  ──►  initial GET /api/iss
      │                          │
      ▼                          ▼
Marker placed at current ISS position + readout populated
      │
      ▼
Every 5s: poll /api/iss ──► marker animates to new position
      │                          │ (on failure)
      ▼                          ▼
Follow on? recenter map     keep last position, show "stale" badge
```

## Dependencies & Risks

| Dependency/Risk | Impact | Mitigation |
| --- | --- | --- |
| wheretheiss.at availability / rate limits | No fresh positions if it's down or throttles | Server proxy can cache/throttle; UI holds last position + stale indicator; provider isolated behind `/api/iss` for easy swap |
| Leaflet requires `window` (no SSR) | Map can't render server-side | `IssMap` is a client component; load it client-only |
| OSM tile usage policy | Tile requests could be blocked under heavy load | Single-page, light usage; can switch tile provider later if needed |

## Privacy & Security

No user data is collected, stored, or transmitted. The app makes outbound requests only to the ISS position API (via our proxy) and the OSM tile server. No accounts, no cookies, no PII. The third-party API key requirement is none (wheretheiss.at is keyless).
