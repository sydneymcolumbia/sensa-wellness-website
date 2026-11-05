# Book to kit measurement spec (for Malhar)

Draft Nov 4, 2026, updated Nov 5 after the first build pass. Malhar owns what is left to build, Sydney owns Google Analytics and the site, Ryan owns Payhip and Google Ads. Written against slides 43 to 46 of Ryan's January guide and the current site code.

**Built on Nov 5:** the server-side purchase event with the real amount, campaign and GA ids carried from the page into Stripe, the book request intake endpoint, the hashed-email join that marks a kit order as book-assisted, and refund handling. Both secrets are in Vercel as of Nov 5, so server-side events flow from the next order. **Still open:** Google Ads link and conversion import (needs Ads access), the Payhip to Zapier connection (needs Ryan's Payhip product id), the Stripe refund event subscription, the two GA4 admin settings in 6.5, and the reporting tab.

## 1. The question we are answering

Does giving away the book produce paid kit orders at an acceptable cost, and how long does that take? Free book requests are a secondary lead signal. Paid kit orders are the primary sales outcome. The two must never be pooled into one "purchase" total.

## 2. Where the data lives today

| System | What it records | State on Nov 4 |
| --- | --- | --- |
| GA4 property, stream G-X24JYKBTXB | Page views, begin_checkout on the kit and pricing pages, book_view and book_cta_click on the book page, and purchase sent from the server after Stripe confirms payment | Live. The old $0 purchase on the thank-you page is removed. The server purchase carries the real amount and the Stripe session id (fixed Nov 5; the GA secret is in place, so the next paid order is the first one to arrive this way). |
| Stripe (shared Sensa Wellness Inc account) | Paid kit Checkout sessions, refunds, customer email, metadata.promo, metadata.preorder | Live. Admin Orders tab already lists the last 50 paid sessions. |
| Payhip | Free book checkouts, access requests, marketing consent | Not connected yet. Ryan has the account. Our intake endpoint is built and waiting for it. |
| Firestore (sensa-app-7b2b7) | preorders, reviews, analytics cache, and now book_requests and kit_orders | Live. kit_orders starts filling with the next paid order; book_requests fills once Payhip is connected. |
| Google Ads | Spend, clicks, gclid | Account ready. Not linked to GA4. No conversion tag on any page. |

## 3. Event taxonomy (adopt Ryan's labels from slide 44)

| Observed action | GA4 event name | Where it fires | Parameters | Role |
| --- | --- | --- | --- | --- |
| Book page viewed | book_view | book.html on load (exists) | book_title | Diagnostic |
| Book download button clicked | book_cta_click | book.html (exists) | book_title, destination=payhip | Diagnostic |
| Free Payhip checkout completed | book_request_complete | Server side, from the Payhip notification (section 4). Built. | payhip_order_id, product_id, price=0, consent, campaign | Secondary lead outcome |
| Book file retrieved, if Payhip exposes it | book_file_download | Server side, only if Payhip reports downloads separately | payhip_order_id | Separate from request and from reading |
| Paid kit order confirmed | purchase, plus kit_purchase with the same transaction id | Server side from the Stripe webhook. Built. purchase is the standard GA4 event that feeds revenue reports and the Google Ads import; kit_purchase is the plainly named copy for our own reporting. | transaction_id=session id, value, currency, items, coupon, journey (direct, ad, book), book_assisted, preorder | Primary commercial outcome |
| Refund or cancellation | refund, plus kit_refund | Stripe webhook charge.refunded. Built; the Stripe dashboard endpoint must be subscribed to that event. | transaction_id, value, currency, full_refund | Net outcome adjustment |
| Follow-up email link clicked | Standard GA4 session with utm_campaign=book_sequence | Links in docs/book-follow-up-sequence.md | utm_content=email1/2/3 | Diagnostic |

Rules

- Filter by Payhip product id and zero price. Anything with price 0 is a book request, never revenue.
- Do not turn on Payhip's native Google Analytics integration. It sends a generic purchase event for free checkouts into the same property and would pollute kit revenue. If Ryan already enabled it, turn it off before launch.
- Mark purchase and book_request_complete as key events in GA4 Admin. Only purchase gets imported into Google Ads as a conversion. Leave kit_purchase and kit_refund as ordinary events so nothing is counted twice.

## 4. Capturing the free book request

Payhip does not run on our domain, so a browser event on the thank-you page is unreliable. Use the server path.

**Built Nov 5.** The intake endpoint is live at sensawellness.org/api/book-request. It accepts a JSON POST with a shared secret in the x-book-secret header, tolerates the field names Zapier is likely to send (email, order_id, product_id, product_name, price, newsletter or consent, utm fields), stores one record per Payhip order id so a retried notification does not double count, keeps only a hash of the email, and sends book_request_complete to GA4 when the price is zero. An admin-only GET on the same address lists the last 100 requests with a converted count. What remains is on the Payhip side: the Zapier zap and the secret.

1. Payhip notification. Payhip's "New Sale" trigger in Zapier fires for free downloads (slide 45). Zapier posts a JSON payload to our endpoint. If Payhip's own webhooks cover free orders, use those instead and skip Zapier.
2. Endpoint. POST /api/book-request, served through the existing api/social.js rewrite pattern because of the 12-function Vercel cap. Validate a shared secret header. Store one Firestore document per Payhip order in a book_requests collection: payhipOrderId, productId, price, emailHash (sha256 of the lowercased email), emailEncrypted or plain email only if we decide we need it for suppression, consent flag, createdAt, and whatever campaign fields Payhip passes through.
3. GA4 server event. From the same handler, send book_request_complete to GA4 through the Measurement Protocol. Use a client_id from Payhip's custom field if we can pass one through on the outbound link; otherwise use a server-generated client_id and accept that GA4 will not stitch it to the ad click. This is the known limit on slide 45: UTMs on the Payhip link alone do not prove end-to-end attribution.
4. Consent. Store the marketing opt-in state. Only opted-in and non-purchaser emails feed the follow-up sequence.

## 5. Connecting a later kit order back to the book

Identity match, where permitted. **Built Nov 5.** When Stripe confirms a payment, the webhook hashes the buyer email the same way, looks it up in book_requests, and if found writes the request id and the days since the request onto the new kit_orders record, stamps the request with the order, and sends the purchase with book_assisted=true and journey=book. This is the only reliable join we have, and it only works when the reader used the same email at Payhip and Stripe.

Aggregate cohorts, where identity is missing. Report book requesters by week of request, and kit orders among them at 30, 60, and 90 days. A cohort counts as mature at 60 days. Do not report conversion on cohorts younger than 30 days.

Campaign arrival. **Built Nov 5.** A small script on the home, kit, and order pages remembers the campaign parameters a visitor arrived with (utm fields and gclid, first touch for the session) and reads the GA client and session ids from the GA cookies. Checkout passes them into the Stripe session, so every order carries its own arrival data and the server-side purchase lands on the same GA visitor and session as the ad click.

Do not credit the same order twice. **Built Nov 5.** An order is labelled by a fixed precedence: book if the email matched a request or the visitor arrived from a book sequence email, otherwise ad if a gclid or a paid medium is present, otherwise direct. The label is stored on the order and sent with the purchase event.

## 6. Prerequisite fixes on our side

6.1 Fix the purchase event. **Done Nov 5.** The $0 browser event is gone. The webhook sends purchase and kit_purchase with the real amount, the Stripe session id as transaction id, the items, the coupon, and the journey label. The GA4 Measurement Protocol secret is created and stored in Vercel, so events flow from the next order. Verify with the first real $39 order: it should appear in GA4 Realtime under Events as purchase with value 39.

6.2 Google Ads conversion. Link the GA4 property to Ryan's Ads account, import kit_purchase as the conversion action, and enable auto-tagging. No separate Ads tag is required if the import works. Verify a test order shows up in Ads within 24 hours before spending.

6.3 Cross-domain. Add payhip.com to the GA4 cross-domain list so a book page visitor who returns from Payhip keeps the same session where the browser allows it. Two minutes in GA4 Admin.

6.5 Setup checklist (Sydney)

- Vercel environment: GA_API_SECRET and BOOK_REQUEST_SECRET. **Done Nov 5** and redeployed; the intake endpoint now rejects unsigned requests with 401. The BOOK_REQUEST_SECRET value is in Sydney's password manager and goes in the Zapier header x-book-secret.
- Stripe dashboard: on the webhook endpoint for sensawellness.org/api/webhook, add the event charge.refunded next to checkout.session.completed.
- GA4 Admin: mark purchase and book_request_complete as key events; add payhip.com under cross-domain measurement.
- Zapier: trigger Payhip New Sale, action Webhooks by Zapier, POST, JSON, URL https://www.sensawellness.org/api/book-request, header x-book-secret, fields email, order_id, product_id, product_name, price, newsletter.
- Test: send one zap test run and confirm it appears in the admin list; place one real $39 order and confirm purchase shows in GA4 Realtime with value 39.

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

1. Fix 6.1 (done Nov 5, secrets in place) and 6.2 (needs Google Ads access).
2. Build the book_requests endpoint and Firestore collection (done Nov 5, tested with sample payloads). Connect Zapier once Ryan shares the Payhip product id and turns on the zap.
3. Pass UTMs, gclid, and GA ids into Stripe metadata from the kit, order, and home pages (done Nov 5).
4. Email hash join in the webhook (done Nov 5).
5. Setup checklist in 6.5, then the admin Book tab or the weekly Sheet.
6. First readout two weeks after the book page goes live: requests, cost per request, and the 30 day cohort. Conversion and time to order follow once cohorts mature.
