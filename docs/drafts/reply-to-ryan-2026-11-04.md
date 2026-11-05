# Draft reply to Ryan, "January preorder launch: website edits and book strategy" (his email of Nov 2, 2026)

Status: NOT SENT as of Nov 5, 2026. Attach ~/Desktop/Sensa-Book-Measurement-Plan-2026-11-05.pdf when sending. The email sequence copy is not attached (Sydney's call, Nov 5). Ryan's thread lives in Sydney's personal Gmail, which the Claude Gmail connector cannot see (it is signed into positionbird.io). Copy the text below into Gmail.

---

Hi Ryan,

Thanks for the guide. I went through all 47 slides and the book. Most of it is already in, and one thing changed since you wrote: we can fill about 100 orders now, so the site is selling live for Christmas rather than waiting for a January preorder. Details below.

What is live as of today

- Checkout charges the exact page price. Stripe now charges $39, $79, and $103 for the three bundles, so the $39 vs $39.20 mismatch is gone.
- Fall Reset messaging, the weekly countdown, and the "Limited Time" badges are retired. The doctor quotes section is removed until we have verifiable attributions.
- Focused ad landing page at sensawellness.org/kit: one screen explaining the kit, a prominent Order button, the four steps, a 24-second demo cut from our real footage, bundles with exact prices, refund terms, and an FAQ. Navigation is stripped down. This is the page to point Google Ads at.
- Selling now with an automatic switch. Kits ship within 2 weeks of the order, and the site says "Order by December 5 for delivery by Christmas." After 100 paid orders, checkout flips itself to paid pre-order wording so we never oversell the batch.
- Product information is consistent sitewide. The kit steps on the landing page, How To page, FAQs, HowTo schema, and the app prompt all describe the kit we are shipping now: swab, activator in the vial, 15 to 30 minute wait, scan.
- The waitlist option is still there for people who want updates before paying.
- Your MIT alumnus and WRAP lecturer credentials are now on the book page author block and your homepage team card. The kit page is in the sitemap and the AI-readable site summary now lists the real sale prices and the 2-week ship window.

What I would implement first (in order)

1. Turn on Google Ads against /kit this week. Everything on that page is approved copy and the checkout path is one click from the first screen.
2. Book page. It is built and reviewed internally at /book with the real cover, chapter list, an excerpt from "Before we begin," your author disclosure, and Book schema. It is hidden until I have your Payhip link and your sign-off on the excerpt. Once live I will add a tasteful book feature on the homepage below the kit section.
3. Measurement with Malhar. The plan is attached as a PDF. It adopts your event labels from slide 44, keeps free book requests out of revenue by product id and zero price, joins later kit orders back to the request by hashed email where the reader used the same address, and falls back to 30/60/90 day cohorts where it did not. It also lists the four metrics from slide 46 with formulas. Two things it surfaced on our side: the GA4 purchase event on the thank-you page currently reports $0 with no transaction id, and no page carries a Google Ads conversion. Both get fixed before we spend, by moving the revenue event to the Stripe webhook and importing it into Ads from GA4. For that I need admin on the Ads account, or 30 minutes with you to link it.
4. Reader follow-up sequence. Drafted, on your slide 39 timing: delivery email to everyone, then "one useful idea" at +2 days and "how Sensa fits a wellness routine" at +5 days to opted-in readers only, suppressed for anyone who already bought. I will send you the copy to check once the book page is live.
5. AI visibility. I recorded a fixed 10-prompt baseline across ChatGPT, Perplexity, and Google AI Mode today so we measure whether the book changes anything instead of assuming it does. Same panel reruns 30 days after the book page goes live.

What I need from you

- Payhip link for the book, the book's Payhip product id, and a yes on the excerpt and author block I pulled from it.
- Admin access to the Google Ads account for me, or a short call to link GA4 and import the kit purchase conversion.
- Variable cost per kit, so the net contribution number is real rather than gross.
- The approved one-paragraph summary of the complete-kit testing. The evidence section on /kit is written and hidden until you send it.
- One customer we can quote with permission. No reviews are live yet, so the review slot on /kit is empty.
- For the January kit specifically: does "January" mean orders open or kits ship, and is the January kit the dip-and-swirl version from slide 11? If so, the How To page, schema, app prompt, and demo video all need a second pass, and I would rather do that once than twice.
- Storage conditions and expiry for the printed insert and FAQ.

Timeline for the first pass

- This week: Ads live on /kit, Payhip to GA4 plan agreed with Malhar.
- Within a week of your Payhip link: book page public, homepage feature, baseline recorded.
- Two weeks after that: follow-up sequence drafted and the first measurement readout (cost per book request, book-to-kit conversion, time to purchase).

The site says "order," not "preorder," while we can ship in 2 weeks. Checkout switches to preorder wording on its own once the batch is spoken for.

Sydney
