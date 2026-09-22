---
name: privacy-open-risks
description: Published privacy claims that are not yet verified in product or config, and the operational commitments that now need someone to actually run them
metadata:
  type: project
---

As of 2026-09-22 the privacy documents make these commitments. Each is only true if something outside the HTML is actually configured or done. Treat every one as an open item until confirmed.

1. **"Ad personalization and Google Signals are not used"** (stated in both policies). GA4 turns `allow_ad_personalization_signals` on by default, and Google Signals is a property-level admin setting. Neither is disabled anywhere in the repo, and the GA4 tag is on 337 pages that no single edit reaches. Someone must turn Google Signals off in the GA4 admin property and disable ad personalization on the tag, or the statement is inaccurate.
2. **"Health profile is collected only with your affirmative opt-in"**. The web/site copy says optional; nobody has confirmed the Flutter app (`/Users/sydneymurphy/sensa_app`) shows a real consent screen rather than merely optional fields. Optional is not the same as affirmative opt-in under MHMDA.
3. **Operational promises with no owner yet**: escalated support transcripts deleted from the mailbox after 90 days; inactive accounts deleted after 24 months with an email warning first; deletion requests propagated to Firebase, Vercel, Anthropic, and Resend; a 30-day response clock and a "Privacy Appeal" review by someone uninvolved in the original decision. None of these are automated.
4. **Breach notice within 60 days** is committed to. No incident response runbook exists.
5. `gen-sitemap.js` regenerates `sitemap.xml` from disk and still lists the deleted `privacy.html` in its exclude set; `consumer-health-data.html` is not in its 0.3-priority list, so a regen will re-rank it.

**Why:** A published policy is an enforceable representation. The FTC's health-privacy cases are almost entirely about companies whose policy was more protective than their configuration, not about companies with no policy.

**How to apply:** Raise items 1 and 2 before treating the Sept 2026 policy work as finished, and re-check them before any counsel review. See [[privacy-docs-map]] for where the claims live.
