# Book to kit measurement spec (for Malhar)

Draft Nov 4, 2026. Owner: Malhar builds, Sydney owns GA4 and the site, Ryan owns Payhip and Google Ads. Written against slides 43 to 46 of Ryan's January guide and the current site code. Nothing here needs the Payhip link to start.

## 1. The question we are answering

Does giving away the book produce paid kit orders at an acceptable cost, and how long does that take? Free book requests are a secondary lead signal. Paid kit orders are the primary sales outcome. The two must never be pooled into one "purchase" total.

## 2. Where the data lives today

| System | What it records | State on Nov 4 |
| --- | --- | --- |
| GA4 property, stream G-X24JYKBTXB | Page views, begin_checkout on the kit and pricing pages, purchase on success.html, book_view and book_cta_click on the book page | Live. purchase fires with value 0 and an empty transaction_id, so it cannot be used for revenue or de-duplication until fixed (see 6.1). |
| Stripe (shared Sensa Wellness Inc account) | Paid kit Checkout sessions, refunds, customer email, metadata.promo, metadata.preorder | Live. Admin Orders tab already lists the last 50 paid sessions. |
| Payhip | Free book checkouts, access requests, marketing consent | Not connected yet. Ryan has the account. |
| Firestore (sensa-app-7b2b7) | preorders, reviews, analytics cache | Live. Proposed home for book_requests (section 4). |
| Google Ads | Spend, clicks, gclid | Account ready. Not linked to GA4. No conversion tag on any page. |

## 3. Event taxonomy (adopt Ryan's labels from slide 44)

| Observed action | GA4 event name | Where it fires | Parameters | Role |
| --- | --- | --- | --- | --- |
| Book page viewed | book_view | book.html on load (exists) | book_title | Diagnostic |
| Book download button clicked | book_cta_click | book.html (exists) | book_title, destination=payhip | Diagnostic |
| Free Payhip checkout completed | book_request_complete | Server side, from Payhip notification (section 4) | payhip_order_id, product_id, price=0, consent (true/false), source fields | Secondary lead outcome |
| Book file retrieved, if Payhip exposes it | book_file_download | Server side, only if Payhip reports downloads separately | payhip_order_id | Separate from request and from reading |
| Paid kit order confirmed | kit_purchase (rename the current purchase event) | Server side from the Stripe webhook, not from success.html | transaction_id=session id, value=amount_total/100, currency, items, promo, preorder flag | Primary commercial outcome |
| Refund or cancellation | kit_refund | Stripe webhook charge.refunded | transaction_id, value (negative) | Net outcome adjustment |
| Follow-up email link clicked | Standard GA4 session with utm_campaign=book_sequence | Links in docs/book-follow-up-sequence.md | utm_content=email1/2/3 | Diagnostic |

Rules

- Filter by Payhip product id and zero price. Anything with price 0 is a book request, never revenue.
- Do not turn on Payhip's native Google Analytics integration. It sends a generic purchase event for free checkouts into the same property and would pollute kit revenue. If Ryan already enabled it, turn it off before launch.
- Mark book_request_complete and kit_purchase as key events in GA4 Admin. Only kit_purchase gets imported into Google Ads as a conversion.

## 4. Capturing the free book request

Payhip does not run on our domain, so a browser event on the thank-you page is unreliable. Use the server path.

1. Payhip notification. Payhip's "New Sale" trigger in Zapier fires for free downloads (slide 45). Zapier posts a JSON payload to our endpoint. If Payhip's own webhooks cover free orders, use those instead and skip Zapier.
2. Endpoint. POST /api/book-request, served through the existing api/social.js rewrite pattern because of the 12-function Vercel cap. Validate a shared secret header. Store one Firestore document per Payhip order in a book_requests collection: payhipOrderId, productId, price, emailHash (sha256 of the lowercased email), emailEncrypted or plain email only if we decide we need it for suppression, consent flag, createdAt, and whatever campaign fields Payhip passes through.
3. GA4 server event. From the same handler, send book_request_complete to GA4 through the Measurement Protocol. Use a client_id from Payhip's custom field if we can pass one through on the outbound link; otherwise use a server-generated client_id and accept that GA4 will not stitch it to the ad click. This is the known limit on slide 45: UTMs on the Payhip link alone do not prove end-to-end attribution.
4. Consent. Store the marketing opt-in state. Only opted-in and non-purchaser emails feed the follow-up sequence.

## 5. Connecting a later kit order back to the book

Identity match, where permitted. When the Stripe webhook receives checkout.session.completed, hash customer_details.email the same way and look it up in book_requests. If found, write bookRequestId and daysSinceRequest onto the order record and send kit_purchase with a book_assisted=true parameter. This is the only reliable join we have, and it only works when the reader used the same email at Payhip and Stripe.

Aggregate cohorts, where identity is missing. Report book requesters by week of request, and kit orders among them at 30, 60, and 90 days. A cohort counts as mature at 60 days. Do not report conversion on cohorts younger than 30 days.

Campaign arrival. Keep gclid and UTM parameters on the kit landing page and pass them into Stripe as metadata (utm_source, utm_medium, utm_campaign, gclid) from kit.html and pay-now.html at checkout time. This lets us separate direct ad buyers from book-assisted buyers without GA4.

Do not credit the same order twice. An order is either direct, book-assisted, or ad-assisted by a fixed precedence: book-assisted if an email match exists, otherwise ad-assisted if gclid is present, otherwise direct.

## 6. Prerequisite fixes on our side

6.1 Fix the purchase event. success.html fires purchase with value 0 and transaction_id empty, which GA4 counts as a conversion with no revenue and cannot de-duplicate on reload. Move the revenue event to the Stripe webhook (server side, Measurement Protocol, event name kit_purchase) and leave the browser event as a lightweight page view. If we keep a browser event, pass {CHECKOUT_SESSION_ID} in the success_url and look the amount up.

6.2 Google Ads conversion. Link the GA4 property to Ryan's Ads account, import kit_purchase as the conversion action, and enable auto-tagging. No separate Ads tag is required if the import works. Verify a test order shows up in Ads within 24 hours before spending.

6.3 Cross-domain. Add payhip.com to the GA4 cross-domain list so a book page visitor who returns from Payhip keeps the same session where the browser allows it.

6.4 Admin reporting. Add a Book tab to the admin Orders page that reads book_requests and the joined order fields. A Google Sheet pulled weekly is acceptable for the first month.

## 7. The four metrics Ryan asked for (slide 46 definitions)

| Metric | Formula | Notes |
| --- | --- | --- |
| Cost per book request | Attributed ad spend / unique completed free requests | Unique on emailHash. Spend only from campaigns whose landing page or ad led to the book page. |
| Book-to-kit conversion | Unique later kit buyers / mature unique requester cohort | Mature means 60 days old. Report 30, 60, 90 day versions. |
| Time to paid order | Median and 75th percentile days between the free request and the first paid kit order | Median only, no averages; one slow buyer skews a mean. |
| Net paid contribution | Kit revenue minus discounts, refunds, variable cost per kit, and acquisition spend | Variable cost per kit comes from Ryan or Priyank. Until we have it, report gross contribution and label it as such. |

Also report direct versus book-assisted journeys side by side, using the precedence rule in section 5, so the book-led campaign can be judged on its own.

## 8. What we need from Ryan

- Payhip: product id for the book, confirmation that a free checkout triggers New Sale, whether download events are exposed, and whether the marketing opt-in checkbox is on.
- Google Ads: admin access for Sydney, or a 30 minute session to link GA4 and import the conversion.
- Variable cost per kit for the net contribution line.

## 9. Order of work

1. Fix 6.1 and 6.2 (needed for ads regardless of the book).
2. Build the book_requests endpoint and Firestore collection; test with a manual Zapier payload.
3. Pass UTMs and gclid into Stripe metadata from the kit page.
4. Email hash join in the webhook.
5. Admin Book tab or the weekly Sheet.
6. First readout two weeks after the book page goes live: requests, cost per request, and the 30 day cohort. Conversion and time to order follow once cohorts mature.
