# who cares i'm rich — agent memory

This file orients a Claude (or any agent) working in this repo. Read it before doing anything beyond answering a quick question about the code.

## What this is

`whocaresimrich.com` is a single-page, static map of the expensive side of New York — white-tablecloth places, omakase counters, old-guard chop houses, the rooms you go to when you're not budgeting. It is the paired companion to `therentstoodamnhigh.com` (a map of cheap lunches under twenty dollars or so). The two sites share nearly all scaffolding; the differences are aesthetic (caviar and champagne versus bodega deli-light) and editorial (who is and isn't on the list).

The site sits behind a soft password gate. The gate is not cryptographic; anyone reading the page source can bypass it. Its purpose is social friction, not security.

## Repository layout

- `index.html` — the single page. Contains the gate, the map container, the header, the list aside, and the Open Graph / Twitter / favicon wiring for rich link previews. Cache-busts CSS and JS with a `?v=N` query string.
- `app.js` — module-like IIFE. Handles the gate (with localStorage flag `wcir:unlocked`), initializes Leaflet on a CartoDB dark tile layer, fetches `restaurants.json`, renders markers and the list, wires geolocation plus distance sort. The password currently lives at the top of the file as `PASSWORD`. Change it there if you want to rotate.
- `styles.css` — caviar-and-champagne palette (dark purples, gold accents, Playfair Display + Cormorant Garamond). The important correctness note is that `[hidden] { display: none !important; }` lives near the top so it beats the `#gate { display: flex }` ID specificity; without the `!important` the gate refuses to hide after unlock.
- `restaurants.json` — the seed data. Each entry has `name`, `neighborhood`, `address`, `lat`, `lng`, and at least one of `dish` / `notes`. `price` and `hours` are optional.
- `CNAME` — `whocaresimrich.com`. GitHub Pages uses this to bind the custom domain.
- `.nojekyll` — empty marker that disables Jekyll processing on GitHub Pages.
- `icon.png`, `og.png` — favicon / apple-touch / OG card image. Current versions are placeholders in the house palette and should be replaced with real art when the user wants to.

## Deploy flow

1. Edit files in this working copy.
2. `git add` the changes, commit with an imperative one-liner, `git push origin main`.
3. GitHub Pages rebuilds within roughly a minute. Because the JS fetches `restaurants.json` with `cache: 'no-cache'`, data edits don't need a version bump. For CSS / JS / HTML changes, bump `?v=N` in `index.html` so browsers don't serve stale assets.
4. Custom-domain HTTPS is configured through the Pages settings page on github.com. Don't tick "Enforce HTTPS" until the DNS check shows green — doing it early breaks the cert issuance.

Commits should use `pkalikman@users.noreply.github.com` as the author email to satisfy GitHub's email-privacy rule (private email without the noreply form triggers `GH007` on push).

## Editorial conventions

The voice is dry, specific, and confident. A couple of sharp sentences per entry beats a paragraph of adjectives. Name the dish you're actually ordering. A line of texture — what the room looks like, who the crowd is, a pet peeve — goes further than a rating.

**Prices.** Do not use Uber Eats, Seamless, DoorDash, or any delivery platform as a price source. Those platforms mark up menus. Acceptable sources, in rough order of preference: a photo the user took in the restaurant; a photo posted by someone on Instagram / Google Maps that is unambiguously of the in-store menu; the restaurant's own website if it publishes current pricing. If none of those is reachable or reliable, leave the `price` field out entirely and flag it in conversation — the user will fill it in.

**Coordinates and addresses.** Verify both on Google Maps before committing. The house method: navigate to `google.com/maps/search/?api=1&query=<Name+Neighborhood>`, wait for the place page, pull `!3d<lat>!4d<lng>` from the URL and the address from the `button[aria-label^="Address:"]` element. Round coords to five decimals — that's ~1.1m of precision, which is absurdly more than enough.

**Neighborhood naming.** Use the common colloquial name (`West Village, Manhattan`, `Cobble Hill, Brooklyn`) rather than ZIP-coded formalism.

**Closed or moved places.** Flag in the `notes`. Don't quietly delete — the user may have context.

## How to engage with the user on entries

The user thinks in short, specific edits. Typical requests look like:

- "Add Bar Oliver to the list."
- "Update Waverly Inn — the chicken pot pie is what to order, not the burger."
- "Correct the address on Peking Duck House; that's the midtown one."
- "Drop Contra, they closed."

When a request comes in:

1. If the name is unambiguous, look it up on Google Maps via the house method above. Confirm the address looks right and the coords are sensible for the neighborhood. If there are multiple locations (e.g., Peking Duck House has Midtown and Chinatown), ask which.
2. Draft the entry with `name`, `neighborhood`, `address`, `lat`, `lng`, a `dish` line that says *what to order*, and a short `notes` line with room-texture or editorial color. Skip `price` unless you have a non-platform source.
3. Before committing, show the user the entry — prose, not JSON — and ask if the dish-and-notes call is right. The user cares about editorial voice more than the data shape.
4. Commit with a short, specific message (`Add Bar Oliver (1 Oliver St)`), push, and confirm the live site loaded.

When the user asks for a bulk edit ("can you re-do the notes for all the West Village places"), go one at a time in the same conversation rather than dumping a rewritten file. The user wants to steer the voice.

If you aren't sure about a claim — the restaurant's current hours, whether it's still open, who owns it now — say so. Confident-sounding wrong details are worse than a hedge.

## Known gotchas

- The sandbox's egress proxy blocks the live site's own domain (`therentstoodamnhigh.com` / `whocaresimrich.com`) and most third-party hosts. Verification of a push usually has to happen through the Chrome browser tool, not `curl`.
- `let map, userMarker;` and the other top-level `let` declarations must appear before the `if (localStorage.getItem(STORAGE_KEY) === '1') { unlock(); }` block, or the unlock path hits a temporal dead zone on reload.
- Nominatim and Google Maps REST endpoints are blocked from the shell sandbox. Use the Chrome browser tool for coordinate lookups.
