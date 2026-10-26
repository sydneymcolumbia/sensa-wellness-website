# ChatGPT merchants (free product listing)

Free listing of the Sensa kit in ChatGPT shopping answers. No fee to join;
OpenAI charges a transaction fee only on Instant Checkout sales, which we
have not enabled. This is separate from ChatGPT Ads (paid) and from the
Google Merchant Center free listing.

## The feed

`product-feed.csv` at the repo root, served at
https://www.sensawellness.org/product-feed.csv

Three rows, one per pack (1, 3, 4 tests), grouped as variants of
`sensa-crp-kit` with `variant_dict {"pack": ...}`. Spec:
https://developers.openai.com/commerce/specs/feed

Values that must stay in step with the site:

| field | source of truth |
|---|---|
| price / sale_price | pay-now.html pricing cards ($49/$39, $99/$79, $129/$103) |
| availability | preorder mode (`pre_order` while preorder.js has PREORDER_MODE true; `in_stock` once kits ship) |
| image_url | hero-product.jpg (1920x1092) |
| url | /pay-now |
| description | wellness-not-device wording, no diagnosis claims |

Flags: `is_eligible_search` true, `is_eligible_checkout` false,
`is_ads_eligible` false. Flip checkout only after the Agentic Commerce
Protocol integration exists on the Stripe checkout.

## Application (needs Sydney's browser)

1. Go to https://chatgpt.com/merchants and apply with the info@ account.
2. Business: Sensa Wellness, https://www.sensawellness.org, US.
3. Feed delivery: file upload / URL, pointing at the feed URL above.
   Refresh is daily on their side; the file only changes when we commit.
4. Category: health and wellness. The kit is a wellness product, not a
   medical device. Do not describe it as diagnostic anywhere in the form.
5. After approval, check the feed status in the merchant dashboard for
   validation errors and fix them in product-feed.csv.

## Keeping it current

- Preorder mode off: change `availability` to `in_stock` in all three rows.
- Price change: update price / sale_price and the pay-now cards together.
- Sale over: delete the sale_price values (leave the column).
