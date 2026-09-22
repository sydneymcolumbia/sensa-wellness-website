---
name: privacy-docs-map
description: Which legal page says what, and the rule that privacy-policy.html and consumer-health-data.html must be edited together
metadata:
  type: project
---

Sensa publishes two privacy documents, and state law requires them to be **separate and distinct**:
- `privacy-policy.html` is the general policy. Section 5 is a summary "Consumer Health Data" section that links out.
- `consumer-health-data.html` is the standalone Consumer Health Data Privacy Policy required by the Washington My Health My Data Act. It carries the fuller version of the same content.

`terms-of-service.html` section 3 (Eligibility) has the age rules: 18+, or 13+ with parental consent, never under 13. It must stay consistent with the Children's Privacy section of the privacy policy.

The stale `privacy.html` (a March 2026 policy that had drifted badly out of date) was **deleted** in Sept 2026; `/privacy` is handled by a 301 in `vercel.json`. Do not resurrect it.

Washington law requires a **link to the consumer health data policy on the homepage**, so `index.html` carries "Consumer Health Data" in both the footer quick links and the footer copyright bar. Do not remove either.

**Why:** The two documents overlap on purpose. If only one is updated, the site is publishing two contradictory statements about the same practice, which is the exact failure mode regulators look for.

**How to apply:** Any change to what health data is collected, who receives it, retention periods, or consent flow gets applied to **both** documents plus the Last updated date on each, in one change. See [[privacy-posture]] for the authoritative data and vendor scope, and [[privacy-open-risks]] for claims that are not yet verified.
