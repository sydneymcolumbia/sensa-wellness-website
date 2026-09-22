---
name: privacy-posture
description: Sensa's standing privacy/compliance posture, the health data fields treated as consumer health data, and every third party that can receive them
metadata:
  type: project
---

Sensa Wellness is a **general wellness product, not a medical device, not HIPAA covered**. The governing regimes are therefore state consumer health data laws (Washington My Health My Data Act, Nevada SB 370), the FTC Health Breach Notification Rule, and the FTC Act, not HIPAA. The privacy policy keeps a HIPAA Notice section only to explain that HIPAA does **not** apply.

**Data treated as consumer health data** (settled in the Sept 2026 review):
- Wellness score (0 to 100) and range (In range / Worth watching / Time to reset), plus scan timestamp
- Optical color index and average blue channel value from the vial scan (the raw numbers behind the score)
- Optional health profile answers (16 fields, incl. race/ethnicity, self-reported conditions, alcohol, peptide use)
- Support chat text, because users volunteer symptoms in it

Scan **photos never leave the device**. Only derived numbers are transmitted. This is load-bearing for every policy statement we make.

**Complete list of third parties that can receive health data** (no corporate affiliates exist):
- Google Firebase: Firestore + auth, stores scans and health profile
- Vercel: website + server functions, standard server logs
- Anthropic: receives ONLY support chat text + first name. Never scans, profile, or email
- Resend: delivers escalation emails containing transcript + name + email

Google Analytics 4 (G-X24JYKBTXB) runs on the **marketing site only**, never in the app, and never receives any of the above. No BAA is needed anywhere since HIPAA does not apply, but each of these is a processor and needs a DPA-style commitment.

**Why:** Nearly every policy sentence we write depends on this exact scope. Getting the vendor list or the "photo stays on device" fact wrong turns an accurate disclosure into an FTC deception problem.

**How to apply:** Before adding any SDK, pixel, analytics tool, or vendor that could touch scan results, the health profile, or support text, check it against this list and update both [[privacy-docs-map]] documents in the same change. A new recipient means a policy edit, not just a code change.
