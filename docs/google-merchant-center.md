# Google Merchant Center (free listings)

Free product listing in Google Shopping, Google AI Mode and Gemini shopping
answers. Those surfaces read the Merchant Center feed (the Shopping Graph),
not the Product JSON-LD on the page, so the site is invisible to them until
this exists. No cost; ads are a separate opt-in we are not using.

## The feed

`google-merchant-feed.tsv` at the repo root, served at
https://www.sensawellness.org/google-merchant-feed.tsv

Three rows, one per pack, grouped by `item_group_id` sensa-crp-kit. Tab
separated, UTF-8, Google attribute names. Spec:
https://support.google.com/merchants/answer/7052112

Values that must match the landing page (/pay-now), because Google checks:

| attribute | source of truth |
|---|---|
| price / sale_price | pay-now.html pricing cards ($49/$39, $99/$79, $129/$103) |
| availability | preorder mode. `out_of_stock` while preorder.js has PREORDER_MODE true (the page says kits are temporarily out of stock). `in_stock` once kits ship. `preorder` is allowed only with a real `availability_date` column, within a year, so do not use it without a date we will honor. |
| image_link | hero-product.jpg, 1920x1092, well over the 500x500 minimum |
| identifier_exists | `no`, since the kit has no GTIN or MPN. If a UPC is ever bought, add `gtin` and drop this column. |

Same source copy as product-feed.csv (the ChatGPT feed); keep the two in
step when either changes.

## Setup walkthrough (needs Sydney's browser, about 30 minutes)

Use the Google account named info@sensawellness.org. It already owns the
Search Console property for the site, which makes website verification a
one-click step.

1. Go to https://merchants.google.com and click Get started. Business name
   Sensa Wellness, country United States, time zone Eastern.
2. Business info: website https://www.sensawellness.org. Claim it. Pick the
   Search Console option; it verifies instantly because info@ owns the
   property. Do not pick the HTML tag option (it would need a site change and
   a CSP edit).
3. Shipping: add one service, United States, free shipping, 0.00 USD,
   handling and transit times 1 to 3 and 3 to 7 business days (edit to the
   real numbers once kits ship).
4. Return policy: Google asks for one on free listings. Enter whatever the
   terms page says at the time of purchase; if there is no written policy
   yet, choose "no returns" rather than inventing a window, and revisit.
5. Products > Add products > Add products from a file > Scheduled fetch.
   File URL https://www.sensawellness.org/google-merchant-feed.tsv, fetch
   daily, any time. Name it "Sensa site feed". Save and click Fetch now.
6. Wait 10 to 30 minutes, then open Products > Needs attention. Expect
   warnings for missing GTIN (ignore, identifier_exists covers it). Fix any
   error by editing the TSV in the repo and pushing; the daily fetch picks it
   up, or click Fetch now.
7. Growth > Manage programs: confirm "Free listings" is enabled (it usually
   is by default). Do not enable Shopping ads.
8. Policy review: a wellness test kit can draw a "healthcare and medicines"
   review. The feed never calls it diagnostic or a medical device. If a
   product is disapproved for policy, read the reason before changing copy
   and keep the wellness-not-device wording.

## Keeping it current

- Preorder mode off: set `availability` to `in_stock` in all three rows.
- Price change: update price and sale_price here, in product-feed.csv, and
  in the pay-now cards together. A mismatch gets the item disapproved.
- Sale over: clear the sale_price cells (keep the column).
