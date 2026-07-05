# Even Hub store listing — Glass Car Dash

Everything needed to fill out the store listing checklist at
`hub.evenrealities.com` (Store listing tab), kept here so the GitHub repo and
the hub listing stay consistent with each other.

## 1. Personal Information

This is an account-level field on the hub (tied to your developer account,
not the app), so it can't be templated here — fill it in directly on the
portal. For reference, the values that match this app's `author` field:

- **Developer name:** Usman Kayani
- **Contact email:** usmankayaniphd@gmail.com

## 2. App icon

Already set (checklist shows a checkmark) — no action needed.

## 3. Cover and screenshots

Three images are in this folder:

- [`hero.png`](hero.png) — stylized cover/marketing image: the HUD overlaid
  on an illustrated night-driving scene, in the style of other Even Hub
  store listings (e.g. Navigaze). **Use this as the cover image.** It's a
  mockup, not a device capture — built to sell the concept at a glance, the
  same way an app icon or a feature graphic isn't a literal screenshot
  either.
- [`screenshot-dashboard.png`](screenshot-dashboard.png) and
  [`screenshot-camera-warning.png`](screenshot-camera-warning.png) — actual
  on-device UI, captured from the **official
  `@evenrealities/evenhub-simulator`** (its `/api/screenshot/glasses`
  automation endpoint — the real 576×288 glasses framebuffer render, not a
  browser approximation). Use these as the supporting screenshots, so the
  listing shows both the pitch (hero) and the real thing (these two).

All three use placeholder demo values (42 mph, limit 30, heading NE / a
240m camera warning) set temporarily for the captures — the real app starts
blank/pending until GPS and the Overpass lookup return real data, and the
simulator can't produce that itself (its console log shows
`unknown variant 'startAppLocationUpdates'` — it doesn't implement the
SDK's location APIs).

## 4. App description

**Short/tagline** (matches `app.json`'s `tagline`, 80 char limit):
> Speed, limit, camera warnings, media — tap to play/pause, swipe to skip

**Full description**, written in the punchy bold-feature-header style used
by other Even Hub listings:

> A driving dashboard and media remote for the Even Realities G2 — hands-free,
> right in your view.
>
> **Speed and limit, always visible.** Your current speed and the local
> speed limit — shown as a real circular road-sign graphic — sit on the
> right side of the display, sourced live from OpenStreetMap as you drive.
>
> **Speed camera warnings.** Nearby fixed speed cameras surface
> automatically, with distance, so there's no surprise.
>
> **Heading, at a glance.** A compass label shows which way you're facing
> alongside your speed.
>
> **Hands-free media control.** Tap to play/pause, swipe up/down for
> next/previous — works with whatever's playing (Spotify, YouTube Music,
> podcasts, anything), no app-specific integration needed.
>
> **Free, open data, no accounts.** Works with no login and no API keys —
> OpenStreetMap's public Overpass API for speed limits/cameras, and your own
> phone's ADB for media control. Nothing is sent to any server the developer
> controls. Full source and one-command setup at
> [github.com/drrobotk/glass-car-dash](https://github.com/drrobotk/glass-car-dash).

## 5. Permissions

Already set (checklist shows a checkmark) — declared in `app/app.json`:

| Permission | Why |
|---|---|
| `location` | Reads current speed/heading and looks up the local speed limit for your position |
| `network` (whitelist: `127.0.0.1:8790`, `overpass-api.de`) | Talks to your own Termux backend (media control) and the public OSM Overpass API (speed limit/camera lookups) |

## 6. Privacy and terms

Draft policy text — accurate as of this app's actual architecture (verified
against the source, not boilerplate):

> **Privacy**
>
> Glass Car Dash does not collect, store, or transmit any personal data to
> its developer or any third party controlled by the developer. There is no
> account system, no analytics, and no advertising.
>
> The app makes exactly two kinds of network request, both described in its
> declared permissions:
>
> 1. **Location lookups** — your device's GPS coordinates (latitude/
>    longitude only) are sent directly from your phone to OpenStreetMap's
>    public Overpass API (`overpass-api.de`) to determine the local speed
>    limit and nearby speed cameras. This is a read-only public map query;
>    no identifying information accompanies it beyond the coordinates
>    themselves, and OSM's own privacy policy governs that request.
> 2. **Media control** — play/pause/next/previous commands are sent to a
>    backend that you run yourself, on your own phone, in Termux. It listens
>    only on `127.0.0.1` (the phone's own loopback interface) — this traffic
>    never leaves your device.
>
> No trip data, speed history, or location history is persisted anywhere;
> trip distance/timer exist only in memory for the current session and are
> discarded when the app closes.
>
> **Terms**
>
> Provided as-is, for personal use, with no warranty. Source code is public
> at <https://github.com/drrobotk/glass-car-dash> under the MIT license.
