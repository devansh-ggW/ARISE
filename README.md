# THE ARISE ARC website

A dependency-free, responsive editorial site for THE ARISE ARC.

## Paddle purchase

The site is configured for:
- Product: `pro_01m428dqzbege0b6h8gh9rkv72`
- Price: `pri_01m428fdnrr9rza69pzqf5th0v`
- Base price: INR 199

Paddle.js is loaded from the official CDN. Once a live client-side token is added to `site-config.js`, the Buy button opens a light overlay checkout and the page uses `Paddle.PricePreview()` to show the visitor's localized price. Paddle handles country detection and currency conversion; automatic currency conversion must be enabled for this price in the Paddle dashboard for local-currency pricing. Client-side tokens are safe to expose in frontend code; never put a Paddle API key in this file.

Set:
`clientToken: "live_..."`

For sandbox testing, use a `test_...` token. The code automatically selects sandbox mode for test tokens.

## Run locally

From this directory, run `python3 -m http.server 3000 --bind 0.0.0.0`. The app has no build step.


## Verified ebook fulfillment

After Paddle emits `transaction.completed`, the Supabase Edge Function at:

`https://uynrbgxrztxlusjgbvbd.supabase.co/functions/v1/arise-fulfillment/webhook`

verifies the Paddle webhook signature, confirms the transaction contains the ARISE ARC product/price, and records the completed purchase in `arise_purchases`.

The site listens for Paddle's `checkout.completed` event, captures the transaction ID, and polls the fulfillment endpoint until that transaction is verified. Only then does the Download button appear. A short retry/recovery state is shown if the webhook is still processing.

### One-time Paddle setup

In Paddle, create a webhook notification destination pointing to the endpoint above and subscribe it to `transaction.completed`. Copy that destination's secret key into the Supabase project as the Edge Function secret `PADDLE_WEBHOOK_SECRET`. Keep the secret out of GitHub and out of frontend code.

The fulfillment service is intentionally separate from the public PDF for this MVP. The PDF remains hosted by the ARISE site, while purchase entitlement is granted only from a verified Paddle webhook.

## Backend

- Supabase project: `dewify`
- Edge Function: `arise-fulfillment`
- Database table: `public.arise_purchases`
- Frontend fulfillment endpoint is configured in `site-config.js`
