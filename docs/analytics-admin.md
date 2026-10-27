# Google Analytics in the admin dashboard

The Analytics tab in /admin reads the site's GA4 property through the
Google Analytics Data API using the Firebase service account
(FIREBASE_SERVICE_ACCOUNT, firebase-adminsdk-fbsvc@sensa-app-7b2b7.iam.gserviceaccount.com).

## One-time setup (Sydney, about two minutes)

1. Open https://analytics.google.com, pick the Sensa property (the one whose
   web stream has measurement ID G-X24JYKBTXB).
2. Admin (gear, bottom left), Property column, Property access management.
3. Click +, Add users. Email: the service account address above. Role:
   Viewer. Untick "Notify new users by email". Add.
4. Open /admin, Analytics, click Refresh. The property is discovered by
   matching the measurement ID against the property's web streams and is
   cached in Firestore analytics/config. Set GA_PROPERTY_ID in Vercel to
   force a specific property instead.

Both the Analytics Data API and the Analytics Admin API were enabled on the
sensa-app-7b2b7 project on 2026-10-27.

## Files

- lib/ga.js: service-account auth (analytics.readonly), property discovery,
  the batched reports (totals with prior period, daily users, top pages,
  sources, landing pages, events, countries, devices, realtime users).
- lib/handlers/analytics.js: GET /api/analytics?days=7|28|90[&refresh=1],
  admin-only, 15-minute Firestore cache per range (analytics/cache_<days>).
  Served through api/social.js (?action=analytics) via the vercel.json
  rewrite because of the 12-function cap. Refresh also clears the cached
  property so a re-share takes effect.
- admin.html: the Analytics page; CSP hashes in vercel.json recomputed on
  every inline-script edit.

## Notes

- Key events use GA4's keyEvents metric (what GA calls conversions in the
  UI). Mark events as key events in GA Admin, Events, to populate it.
- Realtime users come from runRealtimeReport; it may lag or be unavailable
  on new properties.
- Google rate limits are generous for one dashboard; the cache keeps repeat
  opens from hitting the API.
