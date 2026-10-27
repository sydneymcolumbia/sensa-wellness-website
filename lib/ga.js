const { JWT } = require('google-auth-library');
const { getDb } = require('./linkedin');

// Google Analytics 4 for the admin dashboard.
//
// Reads through the Firebase service account (FIREBASE_SERVICE_ACCOUNT),
// which must be added as a Viewer on the GA4 property in GA Admin,
// Property access management. The property is discovered once by matching
// the site's measurement ID against the property's web data streams and
// cached in Firestore `analytics/config`; set GA_PROPERTY_ID to skip
// discovery.

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-X24JYKBTXB';
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta';
const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

let jwt = null;
function serviceAccount() {
  return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}
function serviceEmail() {
  try { return serviceAccount().client_email; } catch (err) { return 'the Firebase service account'; }
}
function client() {
  if (!jwt) {
    const sa = serviceAccount();
    jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: SCOPES });
  }
  return jwt;
}

async function gfetch(url, body) {
  const { token } = await client().getAccessToken();
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error((data.error && data.error.message) || `Google Analytics returned HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

function accessHint() {
  return `Add ${serviceEmail()} as a Viewer on the GA4 property (GA Admin, Property access management), then refresh.`;
}

async function discoverProperty(db) {
  const ref = db.collection('analytics').doc('config');
  const snap = await ref.get();
  if (snap.exists && snap.data().propertyId) return snap.data();
  if (process.env.GA_PROPERTY_ID) {
    const cfg = { propertyId: String(process.env.GA_PROPERTY_ID), propertyName: null, source: 'env', discoveredAt: Date.now() };
    await ref.set(cfg);
    return cfg;
  }
  const sums = await gfetch(`${ADMIN_API}/accountSummaries?pageSize=200`);
  const accounts = sums.accountSummaries || [];
  if (!accounts.length) throw new Error(`No Google Analytics property is shared with the service account yet. ${accessHint()}`);
  for (const acct of accounts) {
    for (const prop of acct.propertySummaries || []) {
      const streams = await gfetch(`${ADMIN_API}/${prop.property}/dataStreams`).catch(() => ({}));
      for (const s of streams.dataStreams || []) {
        if (s.webStreamData && s.webStreamData.measurementId === MEASUREMENT_ID) {
          const cfg = {
            propertyId: prop.property.replace('properties/', ''),
            propertyName: prop.displayName || null,
            accountName: acct.displayName || null,
            streamName: s.displayName || null,
            source: 'discovered',
            discoveredAt: Date.now(),
          };
          await ref.set(cfg);
          return cfg;
        }
      }
    }
  }
  throw new Error(`The service account can see ${accounts.length} GA account(s) but none has a web stream with measurement ID ${MEASUREMENT_ID}. ${accessHint()}`);
}

// ---------------------------------------------------------------------------
// Reports

function rows(report, dimCount, metricNames) {
  return (report.rows || []).map(r => {
    const out = {};
    (r.dimensionValues || []).slice(0, dimCount).forEach((d, i) => { out[`d${i}`] = d.value; });
    metricNames.forEach((name, i) => { out[name] = Number((r.metricValues[i] || {}).value || 0); });
    return out;
  });
}

function totalsOf(report, metricNames, rangeIndex) {
  // With two date ranges, each row carries a dateRange dimension last.
  const out = {};
  metricNames.forEach(n => { out[n] = 0; });
  (report.rows || []).forEach(r => {
    const dims = r.dimensionValues || [];
    const range = dims.length ? dims[dims.length - 1].value : 'date_range_0';
    if (range !== `date_range_${rangeIndex}`) return;
    metricNames.forEach((n, i) => { out[n] += Number((r.metricValues[i] || {}).value || 0); });
  });
  return out;
}

const TOTAL_METRICS = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagedSessions', 'userEngagementDuration', 'keyEvents'];

async function buildReport(db, days) {
  const cfg = await discoverProperty(db);
  const pid = cfg.propertyId;
  const current = { startDate: `${days}daysAgo`, endDate: 'today' };
  const previous = { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` };
  const m = names => names.map(name => ({ name }));
  const d = names => names.map(name => ({ name }));

  const batchA = {
    requests: [
      { dateRanges: [current, previous], metrics: m(TOTAL_METRICS) },
      { dateRanges: [current], dimensions: d(['date']), metrics: m(['activeUsers', 'sessions', 'screenPageViews']), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
      { dateRanges: [current], dimensions: d(['pagePath', 'pageTitle']), metrics: m(['screenPageViews', 'activeUsers']), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 20 },
      { dateRanges: [current], dimensions: d(['sessionSource', 'sessionMedium']), metrics: m(['sessions', 'activeUsers']), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
      { dateRanges: [current], dimensions: d(['country']), metrics: m(['activeUsers']), orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 },
    ],
  };
  const batchB = {
    requests: [
      { dateRanges: [current], dimensions: d(['eventName']), metrics: m(['eventCount']), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 25 },
      { dateRanges: [current], dimensions: d(['deviceCategory']), metrics: m(['activeUsers']), orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 5 },
      { dateRanges: [current], dimensions: d(['landingPage']), metrics: m(['sessions']), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 12 },
    ],
  };

  const [a, b, rt] = await Promise.all([
    gfetch(`${DATA_API}/properties/${pid}:batchRunReports`, batchA),
    gfetch(`${DATA_API}/properties/${pid}:batchRunReports`, batchB),
    gfetch(`${DATA_API}/properties/${pid}:runRealtimeReport`, { metrics: m(['activeUsers']) }).catch(err => ({ error: err.message })),
  ]);
  const A = a.reports || [];
  const B = b.reports || [];

  const totals = totalsOf(A[0] || {}, TOTAL_METRICS, 0);
  const prev = totalsOf(A[0] || {}, TOTAL_METRICS, 1);
  const derive = t => ({
    ...t,
    engagementRate: t.sessions ? t.engagedSessions / t.sessions : 0,
    avgEngagementSeconds: t.activeUsers ? t.userEngagementDuration / t.activeUsers : 0,
  });

  const realtime = rt && rt.rows && rt.rows[0] ? Number(rt.rows[0].metricValues[0].value) : (rt && rt.error ? null : 0);

  return {
    connected: true,
    propertyId: pid,
    propertyName: cfg.propertyName || null,
    days,
    totals: derive(totals),
    previous: derive(prev),
    daily: rows(A[1] || {}, 1, ['activeUsers', 'sessions', 'screenPageViews']).map(r => ({ date: r.d0, users: r.activeUsers, sessions: r.sessions, views: r.screenPageViews })),
    pages: rows(A[2] || {}, 2, ['screenPageViews', 'activeUsers']).map(r => ({ path: r.d0, title: r.d1, views: r.screenPageViews, users: r.activeUsers })),
    sources: rows(A[3] || {}, 2, ['sessions', 'activeUsers']).map(r => ({ source: r.d0, medium: r.d1, sessions: r.sessions, users: r.activeUsers })),
    countries: rows(A[4] || {}, 1, ['activeUsers']).map(r => ({ country: r.d0, users: r.activeUsers })),
    events: rows(B[0] || {}, 1, ['eventCount']).map(r => ({ name: r.d0, count: r.eventCount })),
    devices: rows(B[1] || {}, 1, ['activeUsers']).map(r => ({ device: r.d0, users: r.activeUsers })),
    landing: rows(B[2] || {}, 1, ['sessions']).map(r => ({ path: r.d0, sessions: r.sessions })),
    realtimeUsers: realtime,
    realtimeError: rt && rt.error ? rt.error : null,
  };
}

module.exports = { getDb, serviceEmail, discoverProperty, buildReport, accessHint, MEASUREMENT_ID };
