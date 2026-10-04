# THE ARISE ARC website

A dependency-free, responsive editorial site for THE ARISE ARC.

## Paddle purchase

The site is configured for:
- Product: `pro_01m428dqzbege0b6h8gh9rkv72`
- Price: `pri_01m428fdnrr9rza69pzqf5th0v`
- Base price: INR 199

Paddle.js is loaded from the official CDN. Once a live client-side token is added to `site-config.js`, the Buy button opens a light overlay checkout and the page uses `Paddle.PricePreview()` to show the visitor's localized price. Paddle handles country detection and currency conversion; automatic currency conversion must be enabled for this price in the Paddle dashboard for local-currency pricing.

Client-side tokens are safe to expose in frontend code; never put a Paddle API key in this file.

## Purchase recovery

ARISE uses a browser-only purchase flow. After Paddle reports `checkout.completed`, the transaction ID is saved in `localStorage` and the ebook download is unlocked in that browser. No Supabase, database, Worker, or other backend is required.

The PDF is currently hosted at the site's public ebook URL, so this is an MVP convenience flow rather than secure entitlement protection. A user who needs to recover a purchase can reopen the site in the same browser.

## Run locally

From this directory, run `python3 -m http.server 3000 --bind 0.0.0.0`. The app has no build step.
