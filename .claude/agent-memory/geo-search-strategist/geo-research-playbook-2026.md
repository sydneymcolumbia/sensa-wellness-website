# AI Search (GEO) Research Playbook for Sensa Wellness
Compiled 2026-07-06 from a deep-research run (104 agents, adversarially verified, 10 findings, sources: Ahrefs 75k-brand study, Semrush 126M-prompt AI Visibility Index 2026, arXiv 2604.25707, 2605.14021, 2606.25787, 2601.17109).

## The headline
Off-site beats on-site from here. Grounded LLMs cite third-party sites for brand answers ~6x more than brand-owned sites (85.7% vs 14.3%). Branded web mentions correlate with AI visibility at 0.66-0.71; site page count barely matters (~0.19). YouTube mentions are the single strongest measured signal (~0.74). Post #80 on the blog is worth less than one earned mention.

## What the evidence says (confidence in brackets)

1. [HIGH] Third-party presence dominates. Mentions on YouTube, editorial sites, reviews, and communities drive AI visibility far more than owned content. Ahrefs' advice for small brands: build YouTube, earn editorial mentions, target ChatGPT (least tied to brand-authority metrics).
2. [HIGH] Authority gates the citation pool. 75-88% of citations go to institutional/official/vertical sources (median DA 89 for cited health sources). A small commercial site wins by (a) owning product-specific queries and (b) being referenced BY institutional or vertical sources.
3. [MEDIUM] Cited commercial health sites compensate with credibility signals: 71.1% have explicit "Medically reviewed by" statements with named credentialed reviewers, 86.8% schema (done), 68.4% content over 1,500 words.
4. [MEDIUM] LLMs absorb evidence genres, not question formatting: statistics +61.6% influence, definitions +57.3%, comparisons +55.3%, how-to +41.2%. Q&A/FAQ formatting alone is slightly NEGATIVE (-5.7%). Do not add more FAQ blocks; load pages with numbers, definitions, and head-to-head comparisons.
5. [MEDIUM] Google AI Overviews are winnable without page-one rankings: 29.8% of AIO-cited domains are not on page one, 56.3% of cited hosts were cited exactly once in 40 days. The long tail structurally admits niche sites.
6. [MEDIUM] AIO triggers where Sensa plays: question queries trigger AIOs 64.7% vs 9.5% ("how" 84.3%, "why" 73.4%); health queries activate at ~2x the overall rate. But AIO discounts UGC (Reddit is 0.87% of AIO citations), so Reddit does not reach AIO.
7. [HIGH] Citations concentrate in a small head of domains: 80% of citations from ~18% of domains. The head: YouTube, Wikipedia, Reddit, Statista, LinkedIn (~15% of Google AI Mode), NIH (top Perplexity health domain). Off-site effort goes to that head.
8. [MEDIUM] Per-engine mechanics differ: Perplexity cites ~16 sources/answer and Google ~12 (easier entry for long-tail evidence pages); ChatGPT cites fewer (~7) but each cited page shapes the answer ~4x more (target it with one definitive CRP resource); Gemini cites ~3, almost all from the Wikipedia/Reddit/YouTube head.
9. [MEDIUM] ChatGPT's citation mix is volatile (Reddit citations collapsed from ~60% to ~10% in Sept 2025, later recovered). Single-platform seeding is fragile; diversify.
10. [MEDIUM] Mentions and citations are separate outcomes (Gemini names brands 83.7% of the time but cites them 21.4%). Track brand mentions and URL citations as two separate KPIs per engine.

## Prioritized playbook

### On-site (shippable in code) - candidate phase 3
1. Evidence-density pass on the 20 highest-value posts and 3 compare pages: add concrete statistics with sources (CRP reference ranges, risk multipliers from named studies), crisp definitions near the top, and comparison tables. This is the highest-leverage on-site change per finding 4.
2. Medical reviewer byline system: "Medically reviewed by [name, credentials]" on every health post, plus a reviewer bio page linked site-wide, and reviewedBy in Article schema. Needs the founder to recruit a credentialed reviewer (MD, RN, RD) - code can ship the template immediately and roll out as reviews happen.
3. One definitive CRP resource page (2,500+ words, stats-dense, definitions, comparisons, institutional citations to NIH/PubMed) engineered as the ChatGPT grounding target.
4. Retitle/structure top posts as explicit long how/why questions (AIO trigger pattern), where it can be done without losing existing rankings.
5. Ensure flagship posts exceed 1,500 words of substance.
6. Do NOT add more FAQ blocks (finding 4). Existing ones are fine; the payoff is in what they contain.

### Off-site (founder must do manually)
1. YouTube channel: short CRP/inflammation explainers and kit demos. Strongest single measured signal; also feeds Gemini and Google AI Mode.
2. Earned editorial mentions: pitch at-home-testing roundups, longevity/biohacking newsletters, health publications. Aim for co-occurrence of "Sensa" with "at-home CRP test".
3. LinkedIn founder content (~15% of Google AI Mode citations).
4. Authentic Reddit participation (r/Biohackers, r/QuantifiedSelf, r/longevity) as a diversified secondary channel; it reaches ChatGPT/Gemini but NOT Google AIO.
5. Wikipedia-adjacent presence: become citable/referenced; only attempt a brand article if real notability exists.
6. Get referenced by vertical health sites and alongside NIH/PubMed sources (Perplexity's head).
7. Track two KPIs monthly per engine: brand mentions in answers, and sensawellness.org citations. Query set: "at-home CRP test", "how to test inflammation at home", "what is a normal CRP level", "best at-home inflammation test kit", "how to lower CRP".
