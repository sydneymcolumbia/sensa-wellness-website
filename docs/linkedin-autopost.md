# LinkedIn auto-posting

Every day at 15:00 UTC, `/api/linkedin-cron` shares the newest blog post to the
Sensa Wellness LinkedIn page. The blog agent publishes at 05:00 UTC on
weekdays, so each article is shared the same day. Days with no new post are a
no-op.

## Files

- `lib/linkedin.js` shared helpers: OAuth, token refresh, LinkedIn Posts API,
  sitemap and article metadata, caption builder.
- `lib/handlers/linkedin-auth.js` one-time page connection (OAuth start and callback), served at /api/linkedin-auth through a rewrite into api/social.js because the Hobby plan caps deployments at 12 functions.
- `api/linkedin-cron.js` the daily job, plus dry-run and manual share modes.
- `vercel.json` cron entry.

Firestore (server-side only): `linkedin/auth` tokens, `linkedin/state`
bookkeeping, `linkedin_posts/{slug}` one record per shared article.

## LinkedIn app setup (Path A, Sensa-owned developer login)

1. Log into linkedin.com/developers with the Sensa LinkedIn profile that is a
   super admin of the Sensa Wellness page. Create an app, pick the Sensa
   Wellness page, privacy policy `https://www.sensawellness.org/privacy-policy`.
2. Settings tab: Verify the company association as a page admin.
3. Products tab: request **Community Management API**. Posting as the page
   needs the `w_organization_social` scope, which only this product grants.
4. Auth tab: add the redirect URL
   `https://www.sensawellness.org/api/linkedin-auth` and note the Client ID
   and Client Secret.
5. Organization ID: open the page as admin; the number in
   `linkedin.com/company/<number>/admin/` is it. (The vanity URL
   `/company/sensawellness` does not contain it.)

## Vercel environment variables

| Name | Value |
| --- | --- |
| `LINKEDIN_CLIENT_ID` | `78fxabucn45k8r` (app "Sensa Wellness Posting", created Oct 9 2026) |
| `LINKEDIN_CLIENT_SECRET` | from the app's Auth tab |
| `LINKEDIN_ORG_ID` | `112357960` (Sensa Wellness page) |
| `LINKEDIN_SETUP_KEY` | long random string; guards the connect link |
| `LINKEDIN_CAPTION_MODE` | optional. `claude` for a model-written intro, otherwise title + summary |
| `LINKEDIN_HASHTAGS` | optional, for example `#inflammation #wellness` |
| `LINKEDIN_ALERT_EMAIL` | optional, defaults to the preorder alert address |
| `LINKEDIN_API_VERSION` | optional, defaults to `202609`; LinkedIn sunsets each version after about a year, bump when the deprecation notice appears |

Already present and reused: `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT`,
`RESEND_API_KEY`, `ANTHROPIC_API_KEY` (only for caption mode `claude`).

## Connecting the page

1. Deploy with the variables above set.
2. In a browser logged into LinkedIn as a page admin, open
   `https://www.sensawellness.org/api/linkedin-auth?key=<LINKEDIN_SETUP_KEY>`.
3. Approve the scopes. The callback checks that the account administers the
   page, stores the tokens, and shows a confirmation.

Tokens last 60 days. If LinkedIn has enabled refresh tokens for the app they
renew automatically. Otherwise the cron emails a warning 10 days before expiry
and the link above must be opened again.

## First run and testing

The first cron run only records the existing catalogue in `linkedin/state`
and posts nothing. After that, each run shares at most one new article.

```
# Preview without posting
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.sensawellness.org/api/linkedin-cron?dry=1"

# Share one specific article now (refused if already shared)
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.sensawellness.org/api/linkedin-cron?slug=post-aging-inflammation"
```

## Captions

Default caption is the article h1, the meta description, and a UTM-tagged
link. Em dashes are stripped as a safeguard. LinkedIn does not scrape Open
Graph tags for API-created article posts, so the cron downloads the post's
`og:image`, uploads it through the Images API, and attaches it as the card
thumbnail. If that upload fails the article is still shared, without a
picture, and the reason is in the Vercel logs.

With `LINKEDIN_CAPTION_MODE=claude`, a 60 to 120 word intro is written from the
title and summary only, with no medical claims, no emojis, and no em dashes.
Any model error falls back to the default caption.

## Admin Social page (added Oct 9 2026)

`admin.html` has a Social page backed by `GET /api/social` (admin token
required). It shows LinkedIn followers, 30 day impressions, per-article
stats for posts the auto-poster shared, and Instagram followers, 28 day
reach, and recent posts. Results are cached in Firestore `social/cache` for
15 minutes; the Refresh button bypasses the cache.

LinkedIn numbers use the same token as the poster (scopes
`r_organization_social` and `r_organization_admin`). If the Products tab
request did not include the Page analytics use case, the follower and
statistics calls may return 403; the card then shows the error text under
the table. Request Page analytics on the Products tab to clear it.

### Instagram setup (Instagram API with Instagram Login)

1. The Sensa Instagram account must be a professional account (Business or
   Creator). Switch in the Instagram app under Settings, Account type.
2. At developers.facebook.com create an app, use case "Instagram", and open
   the Instagram API setup. Copy the **Instagram App ID** and **Instagram App
   Secret** (these differ from the Meta app id).
3. Under App roles, Roles, add the Sensa Instagram account as an **Instagram
   Tester**. Accept the invite in the Instagram app: Settings, Website
   permissions, Apps and websites, Tester invites. While the account is a
   tester, no Meta app review is needed.
4. In the Instagram API settings add the redirect URI
   `https://www.sensawellness.org/api/instagram-auth`.
5. Vercel variables: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`. The connect
   link reuses `LINKEDIN_SETUP_KEY` unless `INSTAGRAM_SETUP_KEY` is set.
6. Logged into Instagram as the Sensa account, open
   `https://www.sensawellness.org/api/instagram-auth?key=<setup key>` and
   approve. Tokens last 60 days and refresh automatically when the Social
   page is used.
