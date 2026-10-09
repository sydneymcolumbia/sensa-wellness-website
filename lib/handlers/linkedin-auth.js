const li = require('../linkedin');

// One-time connection of the Sensa Wellness LinkedIn page.
//
//   GET /api/linkedin-auth?key=<LINKEDIN_SETUP_KEY>
//       Starts the OAuth flow. Open it while logged into LinkedIn as a super
//       admin or content admin of the Sensa Wellness page.
//   GET /api/linkedin-auth?code=...&state=...
//       LinkedIn redirects back here. The code is exchanged for tokens, the
//       member is checked against the page's admin list, and the tokens are
//       stored in Firestore `linkedin/auth` for api/linkedin-cron.js.
//
// Re-run the first URL whenever the token expires (60 days unless LinkedIn
// has enabled refresh tokens for the app).

function page(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(
    `<!doctype html><title>${title}</title><body style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p></body>`
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.LINKEDIN_SETUP_KEY) {
    console.error('LinkedIn auth: LINKEDIN_SETUP_KEY is not configured');
    return page(res, 500, 'Not configured', 'LINKEDIN_SETUP_KEY is missing in Vercel.');
  }

  const { key, code, state, error, error_description } = req.query || {};

  // LinkedIn sends error details back here when the member declines.
  if (error) {
    return page(res, 400, 'LinkedIn declined', `${error}: ${error_description || 'no details'}`);
  }

  // Step 2: callback with an authorization code.
  if (code) {
    if (!li.verifyState(state)) {
      return page(res, 400, 'Invalid state', 'This sign-in did not start from Sensa, or it took longer than ten minutes. Start again.');
    }
    try {
      const tokens = await li.exchangeCode(code);
      const allowed = await li.memberAdministersOrg(tokens.access_token);
      if (!allowed) {
        return page(res, 403, 'Not a page admin',
          'The LinkedIn account you signed in with does not administer the Sensa Wellness page, so nothing was saved. Sign in with a page super admin or content admin.');
      }
      const db = li.getDb();
      await li.saveAuth(db, tokens);
      const days = Math.round((tokens.expires_at - Date.now()) / 86400000);
      return page(res, 200, 'Sensa LinkedIn connected',
        `The page is connected. Access lasts about ${days} days${tokens.refresh_token ? ' and will refresh automatically' : ', then revisit this link to reconnect'}. The daily cron will share each new blog post from here on.`);
    } catch (err) {
      console.error('LinkedIn auth callback failed:', err);
      return page(res, 500, 'Connection failed', 'Check the Vercel function logs for details.');
    }
  }

  // Step 1: start the flow. Guarded so only someone holding the setup key
  // can begin a connection that would end up stored for the cron.
  if (!li.safeEqual(key, process.env.LINKEDIN_SETUP_KEY)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: li.authorizationUrl() });
    return res.end();
  } catch (err) {
    console.error('LinkedIn auth start failed:', err);
    return page(res, 500, 'Not configured', err.message);
  }
};
