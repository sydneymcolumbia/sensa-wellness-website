# Planoly as the source for the admin Social page

Since October 27, 2026 the Social page in /admin reads LinkedIn, Instagram
and Facebook data from the Sensa Wellness Planoly workspace instead of the
platform APIs directly. The direct LinkedIn and Instagram connections
(docs/linkedin-autopost.md, lib/instagram.js) remain as a fallback when
Planoly is not connected.

## Why

Planoly already holds live, auto-publishing connections to Instagram,
LinkedIn, Facebook and YouTube for the workspace, so it needs no LinkedIn
Community Management approval and no Meta developer app. Planoly exposes
its data through an MCP server (JSON-RPC over HTTPS) protected by standard
OAuth 2.1 with refresh tokens; there are no API keys.

## Files

- lib/planoly.js: OAuth client (dynamic registration, PKCE, refresh) and a
  minimal MCP client; `fetchStats` builds the dashboard payload.
- lib/handlers/planoly-auth.js: one-time connect flow, served at
  /api/planoly-auth through the rewrite in vercel.json into api/social.js
  (the Hobby plan caps the project at 12 functions).
- api/social.js: Planoly first, direct connections as fallback; 15-minute
  Firestore cache unchanged.
- admin.html: renders either shape; Facebook card shows only with Planoly.
  Any edit to the inline scripts needs the CSP hashes in vercel.json
  recomputed.

Firestore: planoly/client (registered OAuth client), planoly/pending (PKCE
verifier for the sign-in in flight), planoly/auth (tokens + workspace id).

## Connect (one time, about one minute)

1. Sign in to app.planoly.com as the owner of the Sensa Wellness workspace.
2. Open https://www.sensawellness.org/api/planoly-auth?key=SETUP_KEY where
   SETUP_KEY is the PLANOLY_SETUP_KEY Vercel variable, or LINKEDIN_SETUP_KEY
   when PLANOLY_SETUP_KEY is not set (that is the case today).
3. Planoly shows an approval screen for "Sensa Wellness Admin Dashboard".
   Click Allow.
4. You land on a "Sensa Planoly connected" page naming the workspace.
5. Open /admin, Social. The header reads "via Planoly".

To disconnect: /api/planoly-auth?key=SETUP_KEY&disconnect=1.
Reconnect after changing the Planoly password (tokens are revoked).

## What the page shows

- LinkedIn: followers, views in the window, recent posts published through
  Planoly with views, likes, comments, shares. Posts made directly on
  LinkedIn are not listed.
- Instagram: followers, reach in the window, recent posts with reach, likes,
  comments, saves.
- Facebook: count of posts in the window and the recent list. Planoly has
  no Facebook page metrics tool, so no reach or engagement for Facebook.
- Window is 30 days (PLANOLY_WINDOW_DAYS). Planoly caches analytics for
  about three hours.

## Troubleshooting

- "not connected" everywhere with a Planoly error in the message: the token
  was revoked or Planoly changed its server. Reconnect.
- One channel failing while others work: that channel needs reconnecting
  inside Planoly (Settings, Workspaces). The error text comes from Planoly.
- 404 on the setup URL: wrong key.
