# THE ARISE ARC website

A dependency-free, responsive editorial site for THE ARISE ARC. The complete ebook is currently available as a free download at `./The_Arise_Arc_Ebook.pdf`.

## Free ebook

The homepage links directly to the local PDF with a same-origin download action. The supplied cover remains the visual source of truth.

## Future checkout

When a real HTTPS checkout exists, set `purchaseUrl` in [`site-config.js`](./site-config.js). The same main CTA can then switch from the free PDF to the configured checkout without rebuilding the page.

## Run locally

From this directory, run `python3 -m http.server 3000 --bind 0.0.0.0`. The app has no build step or external library/font requests.
