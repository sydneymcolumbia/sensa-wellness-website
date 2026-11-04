# AI Search Visibility Baseline, 2026-11-04

**Purpose:** Baseline of how AI answer engines mention, cite, and describe Sensa Wellness before the new book pages are published (see the January preorder guide, slide 42). Re-run this exact panel after the book pages ship and compare against the tables below.

**Date run:** 2026-11-04, approximately 4:15 PM to 4:45 PM local time, from Sydney's Chrome profile.

**Engines, in order:** Perplexity (perplexity.ai), Google AI Mode (google.com/search?udm=50), ChatGPT (chatgpt.com).

## How it was run (repeat identically)

- One prompt per fresh search or chat. No follow-ups. Same wording every time, copied from the panel below.
- Perplexity: opened `https://www.perplexity.ai/search?q=<url-encoded prompt>`, waited for "Finished", read the answer text, then expanded the "N sources" list and checked every source URL for sensawellness.org.
- Google AI Mode: opened `https://www.google.com/search?udm=50&q=<url-encoded prompt>`, read the AI answer, then checked all cited links (including the collapsed "Show all" list) for sensawellness.org.
- ChatGPT: opened `https://chatgpt.com/?q=<url-encoded prompt>` (prefills the composer), pressed send, waited for "Worked for Ns", read the answer and checked inline citation links for sensawellness.org. Model setting shown as "Thinking effort: High" (the account default; not changed).
- "Mentioned" means the answer body names Sensa or Sensa Wellness. "Cited" means a sensawellness.org URL appears among the answer's sources or links, whether or not Sensa is named in the text.

## Session caveats (read before comparing future runs)

- All three engines ran in the browser's existing signed-in sessions, which were already present in Chrome: Perplexity (free plan, signed in through a Google One Tap prompt that fired when the cookie banner area was clicked; no credentials were typed), Google (signed in), ChatGPT (Plus). Signed-in state can personalize answers. A future run from a clean, logged-out profile may differ.
- Google AI Mode answers were strongly UK-localized (Medichecks, Forth, Thriva, Vitall, prices in GBP) even though the prompts were US-oriented. Check the Google account region or run from a US-only profile next time.
- Perplexity showed a Cloudflare "Verify you are human" check twice; it cleared on reload both times without any interaction. If it does not clear, record "not available".
- Perplexity's results page for prompt 7 pulled in Trustpilot pages for sensa.health (a mental health app) and the old Sensa weight-loss product. Both Perplexity and Google explicitly disambiguated Sensa Wellness from those; ChatGPT did too. Brand confusion is a live risk for the name.
- Site facts used to score accuracy: saliva sample, color change read by the Sensa phone app in about 15 minutes, no lab, no blood, 0 to 100 score with tiers "In range", "Worth watching", "Time to reset", single kit $49 (sale $39), 3-pack $99, 4-pack $129, no subscription. All confirmed against index.html on the run date.

## The fixed prompt panel

1. best at-home inflammation test kit
2. how to test inflammation levels at home
3. at home CRP test
4. saliva CRP test
5. is there a saliva test for inflammation
6. at-home hs-CRP test kit with lab results
7. Sensa Wellness inflammation test review
8. what is the Sensa wellness kit
9. Sensa vs Everlywell inflammation test
10. can I measure inflammation without a blood test

## Perplexity

| # | Prompt | Mentioned | Cited sensawellness.org | Accuracy | Competitors named |
|---|--------|-----------|-------------------------|----------|-------------------|
| 1 | best at-home inflammation test kit | no | no | n/a | Everlywell (top pick), My Labs Direct, Labcorp OnDemand, myLAB Box, Spark Diagnostics, GlycanAge, Ulta Lab Tests, Vitall, Nebula |
| 2 | how to test inflammation levels at home | no | no | n/a | GlycanAge, Zone Labs, i-screen, Walk-In Lab, InsideTracker, GrassrootsHealth |
| 3 | at home CRP test | no | no | n/a | ZoomDoc, The Tester, myLAB Box, Everlywell (Amazon), Test-Well, Prima Home, Ulta Lab Tests, Testing.com |
| 4 | saliva CRP test | no (answer says "some home saliva CRP products are marketed as general wellness tools" with a Sensa citation, but does not name Sensa) | yes: https://www.sensawellness.org/ (Fall Reset Sale homepage) | n/a | Salimetrics (research assay); no consumer competitor |
| 5 | is there a saliva test for inflammation | no | yes: https://www.sensawellness.org/compare-inflammation-tests (in sources list, not cited inline) | n/a | InflammAge (Hurdle and Bayer), GetTested DNA test |
| 6 | at-home hs-CRP test kit with lab results | no | no | n/a | Walk-In Lab (ZRT), GetTested, myLAB Box, Better2Know, Labcorp OnDemand, Quest Health, Ulta Lab Tests, RxHomeTest |
| 7 | Sensa Wellness inflammation test review | yes | yes: https://www.sensawellness.org/post-sensa-vs-cor-one, https://www.sensawellness.org/compare-wellness-devices | correct (saliva, about 15 minutes, scan with phone app, 0 to 100 score with three tiers, $49 / 3 for $99 / 4 for $129, no subscription, wellness not diagnostic). Verdict cautious: no independent validation found. | COR One; also surfaced sensa.health and Sensa diet reviews as unrelated |
| 8 | what is the Sensa wellness kit | yes | yes: https://www.sensawellness.org/post-sensa-vs-cor-one, https://www.sensawellness.org/weight-loss, https://www.sensawellness.org/post-sensa-vs-mylab-box | correct (saliva in vial, color develops, scan with app, 0 to 100 score, no needle, no mailing to lab, prices correct) | none in body; myLAB Box and COR One only in suggested follow-ups |
| 9 | Sensa vs Everlywell inflammation test | yes | yes: https://www.sensawellness.org/post-sensa-vs-everlywell, https://www.sensawellness.org/post-how-to-test-inflammation-levels-at-home, https://www.sensawellness.org/post-at-home-hs-crp-test-kit-with-lab-results, https://www.sensawellness.org/post-best-at-home-crp-tests | correct (saliva, color-changing vial read by phone app, about 15 minutes, prices correct). Recommends Everlywell for medically interpretable results. | Everlywell, The Tester, LetsGetChecked and Labcorp OnDemand (via Sensa page title) |
| 10 | can I measure inflammation without a blood test | no | no | n/a | none consumer; fecal calprotectin, FeNO breath test, imaging, Quest |

**Perplexity rates:** mentioned 3/10, cited 5/10, accuracy 3/3 correct.

## Google AI Mode

| # | Prompt | Mentioned | Cited sensawellness.org | Accuracy | Competitors named |
|---|--------|-----------|-------------------------|----------|-------------------|
| 1 | best at-home inflammation test kit | no | yes: https://www.sensawellness.org/post-best-at-home-crp-tests (in the collapsed "Show all" list, not cited inline) | n/a | Medichecks, Vitall, Prima Home (Home Health UK, Amazon UK), GlycanAge, Rezure, GetTested, Hone Health, BetterVitals |
| 2 | how to test inflammation levels at home | no | no | n/a | Medichecks, YorkTest, Forth, Rezure, GetTested, Vitall, Better2Know, Prima |
| 3 | at home CRP test | no | no | n/a | Prima Home, Medichecks, Forth, Thriva, Home Health UK, GetTested, Rezure, Vitall, Mayfield Clinic |
| 4 | saliva CRP test | no | no | n/a | none consumer; NIH, MDPI, Johns Hopkins Nursing, Salimetrics research sources |
| 5 | is there a saliva test for inflammation | no | no | n/a | InflammAge (Hurdle and Bayer), Salimetrics; "several commercial wellness companies offer mail-in spit kits" (unnamed) |
| 6 | at-home hs-CRP test kit with lab results | no | no | n/a | Medichecks, Forth, Thriva, MedicinesOnline, Mayfield Clinic, Better2Know, GetTested, Prima (all UK) |
| 7 | Sensa Wellness inflammation test review | yes | yes: https://www.sensawellness.org/post-best-at-home-crp-tests, https://www.sensawellness.org/post-sensa-vs-cor-one, https://www.sensawellness.org/post-sensa-vs-everlywell, https://www.sensawellness.org/post-zone-2-training-inflammation (inline link) | correct (spit into vial with reagent, color change, scan with app, 0 to 100 score with the three named tiers, about 15 minutes, $49 single or about $32 in multi-packs, no subscription, wellness product not FDA cleared). Explicitly separates Sensa Wellness from Sensa Health. | Labcorp OnDemand, Everlywell |
| 8 | what is the Sensa wellness kit | yes | yes: https://www.sensawellness.org/, https://www.sensawellness.org/post-at-home-hs-crp-test-kit-with-lab-results, https://www.sensawellness.org/how-to (listed in sources as "How to Use Sensa") | correct (saliva, color reaction, scan with companion app, 0 to 100 score with three tiers, about 15 minutes, prices $49 / $99 / $129, no lab, no blood, not a medical device). Also names the Google Play app listing. | none; notes Sensa is separate from the Sensa CBT app and the old Sensa supplement |
| 9 | Sensa vs Everlywell inflammation test | yes | yes: https://www.sensawellness.org/, https://www.sensawellness.org/post-sensa-vs-everlywell, https://www.sensawellness.org/post-best-at-home-crp-tests | correct (saliva vial, no needle, analyzed at home in the Sensa app, about 15 minutes, 0 to 100 score, from $49 down to about $32 in multi-packs) | Everlywell |
| 10 | can I measure inflammation without a blood test | no | no | n/a | none consumer; fecal calprotectin, synovial fluid, imaging, wearable sweat CRP sensors (research) |

**Google AI Mode rates:** mentioned 3/10, cited 4/10, accuracy 3/3 correct.

## ChatGPT

| # | Prompt | Mentioned | Cited sensawellness.org | Accuracy | Competitors named |
|---|--------|-----------|-------------------------|----------|-------------------|
| 1 | best at-home inflammation test kit | no | no | n/a | Everlywell (top pick), myLAB Box, SiPhox Health, Labcorp OnDemand |
| 2 | how to test inflammation levels at home | no | no | n/a | none named (generic mail-in hs-CRP kit advice; MedlinePlus and JACC cited) |
| 3 | at home CRP test | no | no | n/a | Everlywell, myLAB Box, Labcorp OnDemand |
| 4 | saliva CRP test | yes | yes: https://www.sensawellness.org/post-saliva-crp-test (inline link) | correct ($49 at-home test, saliva sample plus smartphone app, wellness score in about 15 minutes; notes Sensa has not published accuracy or blood-correlation figures and that shipping depends on the next production batch) | none consumer |
| 5 | is there a saliva test for inflammation | no | no | n/a | none; says there is no widely established validated at-home saliva test |
| 6 | at-home hs-CRP test kit with lab results | no | no (only a generic line that "a saliva-based inflammation score is not interchangeable with a clinical hs-CRP result") | n/a | Everlywell, myLAB Box, Quest Health |
| 7 | Sensa Wellness inflammation test review | yes | yes: https://www.sensawellness.org/ (inline "Official Sensa Wellness website"); source chips also reference the product page and the science explainer page | correct (saliva, about 15 minutes, no needles, no lab, app-based 0 to 100 score, $39 to $49, no subscription, general wellness tool not a diagnostic). Verdict: convenient but unvalidated; prefers lab hs-CRP. Separates Sensa Wellness from sensa.health. | Labcorp hs-CRP, Everlywell |
| 8 | what is the Sensa wellness kit | yes | yes: https://www.sensawellness.org/ (inline); product page cited as a source chip | correct (spit into vial, color change, scan with app, score in about 15 minutes, CRP, $49 regular and $39 sale). Minor paraphrase: tiers described as "low, moderate, or high" rather than the site's tier names. | none |
| 9 | Sensa vs Everlywell inflammation test | yes | yes: https://www.sensawellness.org/ (inline) | correct (saliva CRP, about 15 minutes, app-based 0 to 100 score, $49 single and $32.25 each in a 4-pack, no lab, no physician review, not FDA cleared) | Everlywell |
| 10 | can I measure inflammation without a blood test | no | no | n/a | none; lists saliva (experimental), stool calprotectin, urine, wearables, imaging |

**ChatGPT rates:** mentioned 4/10, cited 4/10, accuracy 4/4 correct.

## Summary: the five measures from the guide

| Measure | Perplexity | Google AI Mode | ChatGPT |
|---------|------------|----------------|---------|
| Sensa mention rate (prompts mentioning Sensa / 10) | 3/10 (30%) | 3/10 (30%) | 4/10 (40%) |
| Owned-source citation rate (prompts citing a sensawellness.org page / 10) | 5/10 (50%) | 4/10 (40%) | 4/10 (40%) |
| Brand-description accuracy (correct / responses describing Sensa) | 3/3 (100%) | 3/3 (100%) | 4/4 (100%) |
| AI referral traffic | read from GA4 referrer report, not measured here | read from GA4 referrer report, not measured here | read from GA4 referrer report, not measured here |
| Commercial outcome | not measured here | not measured here | not measured here |

Combined across the 30 prompt-engine pairs: mentioned 10/30 (33%), cited 13/30 (43%), accuracy 10/10 correct.

## Observations for the next run

- Every mention came from the three brand prompts (7, 8, 9) plus one generic win: ChatGPT named Sensa for "saliva CRP test" (prompt 4), and Perplexity cited the homepage for the same prompt without naming it. No engine named Sensa for prompts 1, 2, 3, 6, or 10.
- The pages doing the citation work are the comparison posts (post-sensa-vs-everlywell, post-sensa-vs-cor-one, post-sensa-vs-mylab-box, post-best-at-home-crp-tests), the two exact-match posts (post-how-to-test-inflammation-levels-at-home, post-at-home-hs-crp-test-kit-with-lab-results), post-saliva-crp-test, compare-inflammation-tests, compare-wellness-devices, weight-loss, and the homepage.
- All three engines repeat the same critique: no published accuracy or blood-correlation data for the kit itself. That line is being lifted from our own science explainer, so it is accurate, but it is the main reason each engine recommends a lab test over Sensa.
- Perplexity and ChatGPT both read the Fall Reset Sale price ($39) from the homepage. Prices in AI answers will lag whatever the site shows on the day of the run.
- Google AI Mode's UK bias means prompts 1, 2, 3, and 6 compared Sensa against UK mail-in kits we do not compete with. Re-run from a US profile before treating those rows as a US baseline.
