const planoly = require('../planoly');

// One-time connection of the Sensa Wellness Planoly workspace.
//
//   GET /api/planoly-auth?key=<PLANOLY_SETUP_KEY>
//       Starts the OAuth flow. Open it while logged into Planoly as the owner
//       of the Sensa Wellness workspace.
//   GET /api/planoly-auth?code=...&state=...
//       Planoly redirects back here. The code is exchanged for tokens, the
//       Sensa Wellness workspace is located, and everything is stored in
//       Firestore `planoly/auth` for api/social.js.
//   GET /api/planoly-auth?key=<PLANOLY_SETUP_KEY>&disconnect=1
//       Forgets the stored tokens.
//
// The setup key falls back to LINKEDIN_SETUP_KEY so no new Vercel variable
// is needed.

function page(res, status, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(
    `<!doctype html><title>${title}</title><body style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p><p><a href="/admin">Back to the dashboard</a></p></body>`
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!planoly.setupKey()) {
    console.error('Planoly auth: no setup key configured');
    return page(res, 500, 'Not configured', 'PLANOLY_SETUP_KEY (or LINKEDIN_SETUP_KEY) is missing in Vercel.');
  }

  const { key, code, state, error, error_description, disconnect } = req.query || {};
  const db = planoly.getDb();

  if (error) {
    return page(res, 400, 'Planoly declined', `${error}: ${error_description || 'no details'}`);
  }

  // Step 2: callback with an authorization code.
  if (code) {
    try {
      const tokens = await planoly.exchangeCode(db, code, state);
      const session = await new planoly.McpSession(tokens.access_token).init();
      const ws = await planoly.findWorkspace(session);
      await planoly.saveAuth(db, { ...tokens, workspace_id: ws.id, workspace_name: ws.name || null, connected_at: Date.now() });
      await db.collection('social').doc('cache').delete().catch(() => {});
      return page(res, 200, 'Sensa Planoly connected',
        `The dashboard now reads from the Planoly workspace "${ws.name || ws.id}". ${tokens.refresh_token ? 'Access refreshes automatically.' : 'Planoly issued no refresh token, so this will need to be repeated when access expires.'} Open the Social page in the dashboard.`);
    } catch (err) {
      console.error('Planoly auth callback failed:', err);
      return page(res, 400, 'Connection failed', `${err.message}. Start again from the setup link.`);
    }
  }

  // Step 1 (and disconnect): guarded by the setup key.
  if (!planoly.safeEqual(key, planoly.setupKey())) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (disconnect === '1') {
    await planoly.clearAuth(db);
    await db.collection('social').doc('cache').delete().catch(() => {});
    return page(res, 200, 'Planoly disconnected', 'The stored Planoly tokens were removed. The Social page falls back to the direct LinkedIn and Instagram connections, if any.');
  }
  try {
    const url = await planoly.startAuth(db);
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: url });
    return res.end();
  } catch (err) {
    console.error('Planoly auth start failed:', err);
    return page(res, 500, 'Could not start', err.message);
  }
};
