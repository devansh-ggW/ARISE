# THE ARISE ARC website

A dependency-free, responsive one-page editorial website for THE ARISE ARC. The supplied official cover is preserved as the same 1024×1536 artwork in a high-fidelity local WebP (`cover.webp`, approximately 208 KB) so the public preview URL can serve it directly.

## Set the purchase destination

Edit the single `purchaseUrl` value in [`site-config.js`](./site-config.js) and paste the real `https://` checkout URL. Once set, both purchase links open that URL in a separate tab. Leave it blank until a real checkout exists; the calls to action then open an email to `dewifystores@gmail.com` so the purchase path remains usable without pretending a checkout is configured.

## Run locally

From this directory, run `python3 -m http.server 3000 --bind 0.0.0.0`. The app has no build step or external library/font requests. The Webdev Preview uses the same port.
