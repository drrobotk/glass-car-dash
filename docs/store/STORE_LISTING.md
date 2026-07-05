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

Two screenshots are in this folder, captured from the **official
`@evenrealities/evenhub-simulator`** (its `/api/screenshot/glasses`
automation endpoint — the actual 576×288 glasses framebuffer render, not a
browser approximation) so they match real hardware rendering:

- [`screenshot-dashboard.png`](screenshot-dashboard.png) — main view: current
  speed (42 mph), the circular speed-limit sign (30), heading (NE). **Use
  this as the cover image.**
- [`screenshot-camera-warning.png`](screenshot-camera-warning.png) — same
  view with a speed camera proximity warning showing (▲ 240m) instead of
  heading, demonstrating that feature.

The numbers shown are placeholder demo values set temporarily for the
screenshot (the real app starts with everything blank/pending until GPS and
the Overpass lookup return real data) — not a live capture, since the
simulator doesn't implement the SDK's location APIs (confirmed via its
console log: `unknown variant 'startAppLocationUpdates'`).

## 4. App description

**Short/tagline** (matches `app.json`'s `tagline`, 80 char limit):
> Speed, limit, camera warnings, media — tap to play/pause, swipe to skip

**Full description** (matches `app.json`'s `description`):
> A driving dashboard for the Even Realities G2: current speed, local speed
> limit shown as a circular road-sign graphic, heading and speed camera
> proximity, alongside a media remote (tap to play/pause, scroll up for next
> track, scroll down for previous track, double-tap to exit). Media control
> is driven by your phone's own ADB (wireless debugging), routed through a
> Termux backend — no media-app-specific integration needed, it works with
> whatever's currently playing. Speed/limit data comes directly from your
> phone's GPS and the OSM Overpass API.

If the hub's description field allows more room than `app.json`'s (which has
no documented length cap, unlike some fields), this longer version adds
useful setup context:

> Everything runs on your own phone — nothing is sent to any server the
> developer controls. GPS coordinates go directly to OpenStreetMap's public
> Overpass API to look up the speed limit and nearby speed cameras for your
> position; media commands go to a small backend you run yourself in Termux,
> which only ever listens on `127.0.0.1` (the phone's own loopback). See the
> [GitHub repo](https://github.com/drrobotk/glass-car-dash) for full setup
> instructions — a single command in Termux installs and starts everything.

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
