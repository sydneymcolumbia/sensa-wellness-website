const crypto = require('crypto');
const { Resend } = require('resend');
const li = require('../lib/linkedin');

// Daily share of the newest blog post to the Sensa Wellness LinkedIn page.
// Scheduled in vercel.json; Vercel sends `Authorization: Bearer CRON_SECRET`.
//
// Manual use with the same bearer token:
//   GET /api/linkedin-cron?dry=1          show what would be posted, post nothing
//   GET /api/linkedin-cron?slug=post-xyz  share one specific article now
//
// Flow: read sitemap.xml, diff post slugs against linkedin/state.knownSlugs,
// fetch metadata for the new ones, share the most recently published one,
// record it in linkedin_posts, and mark every new slug as known. On the very
// first run nothing is posted; the current catalogue is just recorded so the
// backlog is never dumped onto the page.

const ALERT_EMAIL = process.env.LINKEDIN_ALERT_EMAIL || process.env.PREORDER_ALERT_EMAIL || 'sydneylizmurphy@gmail.com';
const ALERT_FROM = process.env.ORDER_ALERT_FROM || 'Sensa Orders <orders@sensawellness.org>';
// A post older than this is never auto-shared, even if it slipped through
// the slug diff (for example after a state reset).
const MAX_AGE_DAYS = Number(process.env.LINKEDIN_MAX_AGE_DAYS || 10);

async function alert(subject, lines) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: ALERT_FROM, to: ALERT_EMAIL, subject, text: lines.join('\n') });
  } catch (err) {
    console.error('LinkedIn cron: alert email failed', err.message);
  }
}

function authorized(req) {
  if (!process.env.CRON_SECRET) return false;
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`, 'utf8');
  const provided = Buffer.from(String(req.headers.authorization || ''), 'utf8');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

module.exports = async function handler(req, res) {
  if (!process.env.CRON_SECRET) {
    console.error('LinkedIn cron: CRON_SECRET is not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const dry = req.query?.dry === '1';
  const forcedSlug = typeof req.query?.slug === 'string' && /^post-[a-z0-9-]+$/.test(req.query.slug)
    ? req.query.slug
    : null;

  const db = li.getDb();
  const stateRef = db.collection('linkedin').doc('state');
  const startedAt = new Date().toISOString();

  try {
    const slugs = await li.fetchSitemapPostSlugs();
    if (slugs.length === 0) throw new Error('sitemap contained no blog posts');

    const stateSnap = await stateRef.get();
    const state = stateSnap.exists ? stateSnap.data() : null;

    // First run: record the catalogue, post nothing.
    if (!state && !forcedSlug) {
      if (!dry) {
        await stateRef.set({ knownSlugs: slugs, seededAt: startedAt, lastRunAt: startedAt, lastResult: 'seeded' });
      }
      return res.status(200).json({ ok: true, action: 'seeded', known: slugs.length, dry });
    }

    const known = new Set(state?.knownSlugs || []);
    let candidates = forcedSlug ? [forcedSlug] : slugs.filter(s => !known.has(s));

    if (candidates.length === 0) {
      if (!dry) await stateRef.set({ lastRunAt: startedAt, lastResult: 'nothing new' }, { merge: true });
      return res.status(200).json({ ok: true, action: 'nothing new', dry });
    }

    // Guard against sharing the same article twice, even when forced.
    const alreadyShared = new Set();
    for (const slug of candidates) {
      const snap = await db.collection('linkedin_posts').doc(slug).get();
      if (snap.exists) alreadyShared.add(slug);
    }
    candidates = candidates.filter(s => !alreadyShared.has(s));
    if (candidates.length === 0) {
      return res.status(200).json({ ok: true, action: 'already shared', slugs: [...alreadyShared], dry });
    }

    const metas = [];
    for (const slug of candidates.slice(0, 10)) {
      try {
        metas.push(await li.fetchPostMeta(slug));
      } catch (err) {
        console.error('LinkedIn cron: could not read', slug, err.message);
      }
    }
    if (metas.length === 0) throw new Error(`could not read any of: ${candidates.join(', ')}`);

    metas.sort((a, b) => String(b.datePublished || '').localeCompare(String(a.datePublished || '')));
    let pick = metas[0];

    if (!forcedSlug && pick.datePublished) {
      const ageDays = (Date.now() - Date.parse(pick.datePublished)) / 86400000;
      if (ageDays > MAX_AGE_DAYS) {
        if (!dry) {
          await stateRef.set({
            knownSlugs: [...new Set([...known, ...candidates])],
            lastRunAt: startedAt,
            lastResult: `skipped ${pick.slug} (published ${pick.datePublished}, older than ${MAX_AGE_DAYS} days)`,
          }, { merge: true });
        }
        return res.status(200).json({ ok: true, action: 'skipped stale', slug: pick.slug, datePublished: pick.datePublished, dry });
      }
    }

    if (!pick.title || !pick.description) {
      throw new Error(`${pick.slug} is missing a title or meta description`);
    }

    const { caption, mode } = await li.buildCaption(pick);

    if (dry) {
      return res.status(200).json({ ok: true, action: 'dry run', pick, captionMode: mode, caption, otherNew: metas.slice(1).map(m => m.slug) });
    }

    const auth = await li.loadAuth(db);
    const { token, refreshed, auth: liveAuth } = await li.ensureFreshToken(db, auth);

    // Article cards only get a picture if we upload one; a failed upload
    // still shares the article, just without the image.
    let thumbnail = null;
    try {
      thumbnail = await li.uploadThumbnail(token, pick.image);
    } catch (err) {
      console.error('LinkedIn cron: thumbnail skipped for', pick.slug, err.message);
    }

    const postUrn = await li.createArticlePost(token, {
      commentary: caption,
      url: pick.url,
      title: pick.title,
      description: pick.description,
      thumbnail,
    });

    await db.collection('linkedin_posts').doc(pick.slug).set({
      slug: pick.slug,
      url: pick.url,
      title: pick.title,
      datePublished: pick.datePublished,
      postUrn,
      thumbnail,
      caption,
      captionMode: mode,
      postedAt: startedAt,
    });

    // Every new slug becomes known, so a day with two new posts shares only
    // the newest and quietly retires the other.
    await stateRef.set({
      knownSlugs: [...new Set([...known, ...candidates])],
      lastRunAt: startedAt,
      lastResult: `posted ${pick.slug}`,
      lastPostUrn: postUrn,
    }, { merge: true });

    // Warn before a connection without refresh tokens runs out.
    const daysLeft = liveAuth.expires_at ? Math.floor((liveAuth.expires_at - Date.now()) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 10 && !liveAuth.refresh_token) {
      await alert(`Sensa LinkedIn token expires in ${daysLeft} days`, [
        'The LinkedIn page connection will stop working soon.',
        'Open https://www.sensawellness.org/api/linkedin-auth?key=<LINKEDIN_SETUP_KEY> as a page admin to reconnect.',
      ]);
    }

    return res.status(200).json({ ok: true, action: 'posted', slug: pick.slug, postUrn, thumbnail: Boolean(thumbnail), captionMode: mode, refreshed, skipped: metas.slice(1).map(m => m.slug) });
  } catch (err) {
    console.error('LinkedIn cron failed:', err);
    await stateRef.set({ lastRunAt: startedAt, lastResult: `error: ${err.message}` }, { merge: true }).catch(() => {});
    await alert('Sensa LinkedIn auto-post failed', [
      `Time: ${startedAt}`,
      `Error: ${err.message}`,
      '',
      'Check the Vercel logs for /api/linkedin-cron.',
    ]);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
