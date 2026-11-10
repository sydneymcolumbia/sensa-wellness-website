# AI shopping query posts, publishing queue

Each row is one blog post aimed at a shopping query that AI assistants currently answer without naming Sensa. A cloud routine takes the top row with status `queued`, writes and publishes the post, then changes the status to `published YYYY-MM-DD` and records the filename. Posts go live two per day, Nov 3 to Nov 7, 2026.

Rules the routine follows are in the routine prompt. Keep this table in sync by hand if a post is published any other way.

| # | Target query | Working title | Slug | Angle | Status |
|---|--------------|---------------|------|-------|--------|
| 1 | best at-home inflammation test kit to buy | The Best At-Home Inflammation Test Kit to Buy in 2026 | post-best-at-home-inflammation-test-kit-to-buy | Buyer's guide: lab kits vs at-home trend trackers, with Sensa as the saliva option; honest about when a lab kit is the better buy | published 2026-11-03 (post-best-at-home-inflammation-test-kit-to-buy.html) |
| 2 | where can I buy a CRP test for home use | Where Can I Buy a CRP Test for Home Use? | post-where-to-buy-crp-test-for-home-use | Every place you can actually order one (brand sites, Amazon, draw-site labs, Sensa direct), with price and sample type per seller | published 2026-11-03 (post-where-to-buy-crp-test-for-home-use.html) |
| 3 | saliva inflammation test kit, where to order | Saliva Inflammation Test Kit: Where to Order One | post-saliva-inflammation-test-kit-where-to-order | Sensa is the only consumer saliva CRP kit we know of; explain what it is, what it is not, and how to order | published 2026-11-04 (post-saliva-inflammation-test-kit-where-to-order.html) |
| 4 | cheapest at-home CRP test | What Is the Cheapest At-Home CRP Test? | post-cheapest-at-home-crp-test | Price-per-result table across Sensa, Everlywell, myLAB Box, Labcorp OnDemand, Quest Health; cheapest depends on whether you need a lab number | published 2026-11-04 (post-cheapest-at-home-crp-test.html) |
| 5 | inflammation test I can do at home without a blood draw | Inflammation Tests You Can Do at Home Without a Blood Draw | post-inflammation-test-at-home-without-blood-draw | Finger prick still counts as blood; saliva is the only needle-free route; what each option tells you | published 2026-11-05 (post-inflammation-test-at-home-without-blood-draw.html) |
| 6 | how much does the Sensa Wellness test cost | How Much Does the Sensa Wellness Test Cost? | post-how-much-does-sensa-cost | Exact current prices, per-test math, what is included, no subscription, free shipping, sale note | published 2026-11-05 (post-how-much-does-sensa-cost.html) |
| 7 | Sensa Wellness 3-pack price | Sensa Wellness 3-Pack: Price and What You Get | post-sensa-3-pack-price | The three-pack specifically: price, per-test cost, who it suits, how it compares with single and four-pack | published 2026-11-10 (post-sensa-3-pack-price.html) |
| 8 | does Sensa Wellness ship for free | Does Sensa Wellness Ship for Free? | post-does-sensa-ship-for-free | Shipping policy, delivery time, where we ship, what the kit arrives as, storage once it arrives | queued |
| 9 | Sensa Wellness discount code or sale | Sensa Wellness Sales and Discount Codes: What Is Running Now | post-sensa-discount-code-sale | The weekly sale, how it works, the honest answer on codes, newsletter as the way to hear about offers | queued |
