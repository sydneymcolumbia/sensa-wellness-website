# Reply to Ryan, "January preorder launch: website edits and book strategy" (his email of Nov 2, 2026)

Status: SENT by Sydney on Nov 5, 2026, in Ryan's Gmail thread, with Sensa-Book-Measurement-Plan-2026-11-05.pdf (rev. 3) attached. Kept for reference.
---

Hi Ryan,

Thanks for the guide. I went through all 47 slides and the book. Most of it is in already, and one thing changed since you wrote: we can fill about 100 orders now, so the site is selling live for Christmas instead of waiting for a January preorder. Here is where things stand.

Live on the site as of today

- Checkout charges the exact page price: $39, $79, and $103. The $39 versus $39.20 mismatch is gone.
- Fall Reset messaging, the countdown, and the "Limited Time" badges are retired. The doctor quotes are off the page until we have attributions we can verify.
- Focused ad landing page at sensawellness.org/kit: one screen that explains the kit with a prominent Order button, the four steps, a 24-second demo cut from our real footage, bundles with exact prices, refund terms, and an FAQ. This is the page to point Google Ads at.
- Kits ship within 2 weeks of the order, and the site says "Order by December 5 for delivery by Christmas." After 100 paid orders, checkout switches itself to pre-order wording so we never oversell the batch.
- The kit steps on the landing page, How To page, FAQs, schema, and the app prompt all describe the kit we are shipping now: swab, activator in the vial, 15 to 30 minute wait, scan.
- The homepage headline is now "Putting wellness back into your own hands."
- Your MIT alumnus and WRAP lecturer credentials are on the book page author block and the homepage team card.
- The waitlist stays available for people who want updates before paying.

Measurement is built

The attached plan follows your slides 43 to 46 and most of it is already running:

- Every paid order now sends Google Analytics a purchase event with the real amount and the Stripe order id. The old thank-you page reported every order as $0, which would have made Ads optimization impossible.
- Each order carries its campaign source (utm tags and the Google click id) into Stripe, so we can tell direct, ad-assisted, and book-assisted orders apart without double counting.
- The free book request intake is live and waiting for Payhip. Each request is stored by Payhip order id with only a hashed email, never pooled with revenue, and a later kit order from the same reader is tagged automatically.
- The four measures from slide 46 are defined with formulas: cost per book request, book-to-kit conversion on 30, 60, and 90 day cohorts, time to paid order, and net contribution.

The one piece I cannot do alone is importing the purchase conversion into Google Ads. That needs admin on the Ads account, or 30 minutes with you to link it to GA4.

What I would do first

1. Google Ads against /kit this week, once the conversion import is in place.
2. Book page. Built at /book with the real cover, chapter list, an excerpt from "Before we begin," your author disclosure, and Book schema. Hidden until I have your Payhip link and your sign-off on the excerpt. Then it gets a homepage feature below the kit section.
3. Reader follow-up sequence. Drafted on your slide 39 timing: delivery email to everyone, "one useful idea" at +2 days, "how Sensa fits a wellness routine" at +5 days to opted-in readers only, suppressed for anyone who already bought. I will send you the copy to check once the book page is live.
4. AI visibility. I recorded a fixed 10-prompt baseline across ChatGPT, Perplexity, and Google AI Mode before any book pages go public. The same panel reruns 30 days after the book page is live so we measure the change instead of assuming it.

What I need from you

- Payhip link for the book, the book's Payhip product id, and a yes on the excerpt and author block. With the product id I can set up the Zapier step that tells our site about each free request. That needs a login to your Payhip, or you can create the zap and I will send you the exact settings.
- Admin access to the Google Ads account for me, or a short call to link it.
- The approved one-paragraph summary of the complete-kit testing. The evidence section on /kit is written and hidden until you send it.
- For the January kit: does "January" mean orders open or kits ship, and is it the dip-and-swirl version from slide 11? If so, the How To page, schema, app prompt, and demo video all need a second pass, and I would rather do that once.
- Storage conditions and expiry for the printed insert and FAQ.
- Variable cost per kit, so the net contribution number is real rather than gross.

Timeline for the first pass

- This week: Ads live on /kit once the conversion is linked, Zapier connected when the product id arrives.
- Within a week of your Payhip link: book page public, homepage feature, baseline recorded.
- Two weeks after that: follow-up emails in your inbox for review, and the first readout of book requests, cost per request, and the 30 day cohort.

Sydney
