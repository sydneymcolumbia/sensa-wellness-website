const ig = require('../instagram');
const li = require('../linkedin');

// One-time connection of the Sensa Instagram account for dashboard stats.
//
//   GET /api/instagram-auth?key=<INSTAGRAM_SETUP_KEY or LINKEDIN_SETUP_KEY>
//       Starts the Instagram Login flow. Open it while logged into Instagram
//       as the Sensa account (a professional account added as a tester on
//       the Meta app).
//   GET /api/instagram-auth?code=...&state=...
//       Instagram redirects back here; tokens go to Firestore `instagram/auth`.
//
// Long-lived tokens last 60 days and api/social.js refreshes them.

function page(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(
    `<!doctype html><title>${title}</title><body style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p></body>`
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const configuredKey = ig.setupKey();
  if (!configuredKey) {
    console.error('Instagram auth: no setup key configured');
    return page(res, 500, 'Not configured', 'INSTAGRAM_SETUP_KEY (or LINKEDIN_SETUP_KEY) is missing in Vercel.');
  }

  const { key, code, state, error, error_description, error_reason } = req.query || {};

  if (error) {
    return page(res, 400, 'Instagram declined', `${error}${error_reason ? ` (${error_reason})` : ''}: ${error_description || 'no details'}`);
  }

  if (code) {
    if (!ig.verifyState(state)) {
      return page(res, 400, 'Invalid state', 'This sign-in did not start from Sensa, or it took longer than ten minutes. Start again.');
    }
    try {
      const tokens = await ig.exchangeCode(code);
      const db = li.getDb();
      await ig.saveAuth(db, tokens);
      const days = Math.round((tokens.expires_at - Date.now()) / 86400000);
      return page(res, 200, 'Sensa Instagram connected',
        `The account is connected for about ${days} days and will refresh automatically while the dashboard is in use. Open the Social page in the admin to see the numbers.`);
    } catch (err) {
      console.error('Instagram auth callback failed:', err);
      return page(res, 500, 'Connection failed', 'Check the Vercel function logs for details.');
    }
  }

  if (!ig.safeEqual(key, configuredKey)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: ig.authorizationUrl() });
    return res.end();
  } catch (err) {
    console.error('Instagram auth start failed:', err);
    return page(res, 500, 'Not configured', err.message);
  }
};
