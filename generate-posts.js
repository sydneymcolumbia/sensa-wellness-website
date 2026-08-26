const fs = require('fs');
const path = require('path');
const dir = __dirname;

function buildPost(p) {
  const sectionsHTML = p.sections.map(s =>
    `\n                <h2>${s.h2}</h2>\n                ${s.content}`
  ).join('\n');
  const relatedHTML = p.related.map(r =>
    `                    <a href="${r.href}" class="related-card">\n                        <span class="post-category">${r.cat}</span>\n                        <h4>${r.title}</h4>\n                    </a>`
  ).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/png" href="favicon.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${p.title} - Sensa Wellness</title>
    <meta name="description" content="${p.desc}">
    <meta name="theme-color" content="#1800AD">
    <link rel="canonical" href="https://www.sensawellness.org/post-${p.slug}.html">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://www.sensawellness.org/post-${p.slug}.html">
    <meta property="og:title" content="${p.title} - Sensa Wellness">
    <meta property="og:description" content="${p.desc}">
    <meta property="og:image" content="https://www.sensawellness.org/sensa-og.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;700&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="theme.css">
    <style>
        .wellness-disclaimer { font-size: 0.72rem; color: rgba(255,255,255,0.5); max-width: 800px; margin: 0 auto 1rem; line-height: 1.5; text-align: center; }
    </style>
</head>
<body>

    <div class="progress-bar" id="progressBar"></div>

    <header>
        <div class="header-inner">
            <a href="/" class="logo">
                <img src="logo.jpg" alt="Sensa" class="logo-img">
            </a>
            <button class="mobile-toggle" id="mobileToggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <nav id="mainNav">
                <a href="/">Home</a>
                <a href="/#about">About</a>
                <a href="/blog" class="nav-active">Blog</a>
                <a href="/app">App</a>
                <a href="/#team">Team</a>
                <a href="/pay-now" class="btn">Buy Now</a>
            </nav>
        </div>
    </header>

    <article class="post">
        <div class="post-header-section">
            <div class="container post-container">
                <a href="/blog" class="back-link">&larr; Back to Blog</a>
                <div class="post-meta">
                    <span class="post-category">${p.category}</span>
                    <span class="post-date">${p.dateDisplay}</span>
                    <span class="post-read">${p.readTime}</span>
                </div>
                <h1>${p.title}</h1>
                <p class="post-subtitle">${p.subtitle}</p>
            </div>
        </div>

        <div class="container post-container">
            <div class="post-body">

                ${p.intro}
${sectionsHTML}

                <div class="post-cta">
                    <h3>${p.ctaH3}</h3>
                    <p>${p.ctaP}</p>
                    <a href="/pay-now" class="btn">Buy Now</a>
                </div>
            </div>

            <div class="blog-newsletter">
                <h3>Get inflammation insights in your inbox</h3>
                <p>New articles on inflammation science, plus updates on the Sensa at-home CRP test and app.</p>
                <form class="newsletter-form" id="postNewsletterForm">
                    <input type="email" id="postNewsletterEmail" placeholder="Your email address" required>
                    <button type="submit" class="btn">Subscribe</button>
                </form>
                <span class="newsletter-note">No spam. Unsubscribe anytime.</span>
            </div>
            <script>
                document.getElementById('postNewsletterForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    var email = document.getElementById('postNewsletterEmail').value.trim();
                    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return;
                    var btn = e.target.querySelector('button[type="submit"]');
                    btn.textContent = 'Submitting\\u2026';
                    btn.disabled = true;
                    fetch('https://script.google.com/macros/s/AKfycbyQVIxWJrJNYp0KgEMAeF-pfCpGJPmS3w3O4enN_Dv_KITjfjfl5qeZB9uEMAnJ7CWc_g/exec', {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: '', email: email, interest: 'newsletter', source: 'blog-post:' + location.pathname })
                    }).finally(function() {
                        btn.textContent = 'Subscribed!';
                        btn.style.background = '#41a6f0';
                        e.target.reset();
                    });
                });
            </script>

            <div class="related-posts">
                <h3>Related Articles</h3>
                <div class="related-grid">
${relatedHTML}
                </div>
            </div>
        </div>
    </article>

    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <h3>Sensa Wellness</h3>
                    <p>Sensa Wellness is on a mission to make inflammation monitoring as simple as brushing your teeth. Because understanding what's happening inside your body shouldn't require a lab visit.</p>
                </div>
                <div class="footer-links">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/#about">About</a></li>
                        <li><a href="/blog">Blog</a></li>
                        <li><a href="/pay-now">Buy Now</a></li>
                        <li><a href="/work-with-us">Work With Us</a></li>
                        <li><a href="/editorial-standards">Editorial Standards</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Solutions</h4>
                    <ul>
                        <li><a href="#">Inflammation Monitoring</a></li>
                        <li><a href="#">Preventive Screening</a></li>
                        <li><a href="/app">Mobile Integration</a></li>
                        <li><a href="#">Community Programs</a></li>
                        <li><a href="#">Corporate Wellness</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Contact</h4>
                    <div class="footer-contact-item">
                        sensawellness@gmail.com
                    </div>
                    <div class="social-links">
                        <a href="#" class="social-link" aria-label="Instagram">IG</a>
                        <a href="#" class="social-link" aria-label="LinkedIn">in</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p class="wellness-disclaimer">Sensa is a general wellness product intended to support a healthy lifestyle. It is not intended to diagnose, treat, cure, or prevent any disease or medical condition. Results are not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns about your health, consult a qualified healthcare provider.</p>
                &copy; 2026 Sensa Wellness. All Rights Reserved.
            </div>
        </div>
    </footer>

    <button class="scroll-top" id="scrollTop" aria-label="Scroll to top">Top</button>

    <script>
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            document.getElementById('progressBar').style.width = (scrollTop / scrollHeight) * 100 + '%';
            const btn = document.getElementById('scrollTop');
            if (scrollTop > 400) { btn.classList.add('visible'); } else { btn.classList.remove('visible'); }
        });
        document.getElementById('scrollTop').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        document.getElementById('mobileToggle').addEventListener('click', () => { document.getElementById('mainNav').classList.toggle('active'); });
        document.querySelectorAll('#mainNav a').forEach(link => { link.addEventListener('click', () => { document.getElementById('mainNav').classList.remove('active'); }); });
    </script>

<script src="theme-fx.js" defer></script>
</body>
</html>`;
}

const posts = [

  // Aug 26 -- News: ZEUS Phase 3 trial (ziltivekimab/IL-6 inhibitor) null result despite CRP reduction
  {
    slug: 'zeus-trial-crp-inflammation',
    title: 'When Lowering CRP Wasn\'t Enough: What the ZEUS Trial Tells Us About Inflammation',
    desc: 'A major Phase 3 trial showed that an IL-6 inhibitor sharply reduced CRP — but did not prevent heart attacks or strokes. Here is what the null result means for inflammation science and CRP monitoring.',
    subtitle: 'On July 31, 2026, Novo Nordisk announced that ziltivekimab — a drug that reliably lowers IL-6 and hsCRP — failed to reduce cardiovascular events in over 6,300 high-risk patients. The finding is complicated, and it matters.',
    category: 'News',
    dateDisplay: 'August 26, 2026',
    readTime: '8 min read',
    intro: `<div class="answer-box">
                    <span class="answer-label">The short answer</span>
                    <p>The ZEUS Phase 3 trial found that ziltivekimab, an IL-6 inhibitor, significantly reduced hsCRP and free IL-6 in patients with cardiovascular disease, chronic kidney disease, and elevated inflammation — but produced no reduction in heart attacks, strokes, or cardiovascular death (HR 0.99). The null result does not mean CRP is an unreliable biomarker. It means that pharmacologically suppressing one inflammatory signaling pathway is more complicated than it sounds, and that understanding what drives your own CRP — through lifestyle, metabolic health, and longitudinal monitoring — may matter more than any single intervention.</p>
                </div>

                <p>For years, one of medicine's most tantalizing hypotheses has been this: if inflammation is a major driver of cardiovascular disease, and if we can suppress inflammation with a drug, we should be able to prevent heart attacks and strokes. The logic is straightforward. The evidence linking elevated C-reactive protein (CRP) to cardiovascular risk is extensive and well-replicated. Therapies that target the inflammatory cascade have shown promise in both laboratory settings and earlier trials. The question was whether a highly specific anti-inflammatory biologic — designed precisely to interrupt the IL-6 signaling pathway that drives CRP production — could translate that biological logic into clinical outcomes.</p>

                <p>On July 31, 2026, Novo Nordisk announced that it could not — at least not in the ZEUS trial. <a href="https://www.globenewswire.com/news-release/2026/07/31/3336733/0/en/novo-nordisk-provides-update-on-the-zeus-phase-3-trial-in-people-with-ascvd-ckd-and-inflammation.html" target="_blank" rel="noopener">The topline results from ZEUS</a>, a Phase 3 cardiovascular outcomes trial of ziltivekimab in over 6,300 patients with atherosclerotic cardiovascular disease (ASCVD), chronic kidney disease (CKD), and elevated hsCRP, showed no reduction in major adverse cardiovascular events (MACE). The hazard ratio was 0.99 — effectively identical outcomes between the treatment and placebo arms. The drug did exactly what it was designed to do biologically. It just did not do what patients and researchers hoped it would do clinically.</p>`,
    sections: [
      {
        h2: 'What the ZEUS Trial Was Designed to Prove',
        content: `<p><strong>The scientific rationale behind ZEUS was built on decades of observational and mechanistic research.</strong> CRP and its upstream regulator interleukin-6 (IL-6) are established markers of systemic inflammation. IL-6 is a cytokine produced by immune cells and adipose tissue in response to stress, infection, and chronic low-grade inflammation; it signals the liver to produce acute-phase proteins, most notably CRP. Elevated hsCRP — particularly above 2 mg/L — has been consistently associated with increased risk of heart attack, stroke, and cardiovascular mortality in large prospective studies, even after controlling for LDL cholesterol, blood pressure, and other traditional risk factors.</p>

                <p><strong>Ziltivekimab is a highly specific inhibitor of the IL-6 ligand</strong>, meaning it binds to IL-6 itself before it can activate its receptor, blocking the downstream signal that tells the liver to raise CRP. The drug had already demonstrated strong biological activity in earlier studies: in the RESCUE trial (2021), ziltivekimab dramatically reduced hsCRP, fibrinogen, serum amyloid A, and other inflammatory markers in patients with chronic kidney disease and elevated inflammation — exactly the population enrolled in ZEUS. The biological mechanism was sound. The question was whether that biological effect translated into fewer cardiovascular events.</p>

                <p><strong>The trial was large and carefully designed.</strong> ZEUS enrolled more than 6,300 participants with ASCVD, CKD (estimated glomerular filtration rate between 15 and 59 mL/min/1.73m&#178;), and hsCRP &#8805;2 mg/L. Participants received either ziltivekimab 15 mg once monthly or placebo on top of standard-of-care therapy. The primary outcome was MACE: a composite of cardiovascular death, nonfatal myocardial infarction, and nonfatal stroke. It was one of the most rigorously designed anti-inflammatory cardiovascular outcomes trials ever conducted, and it was anticipated to provide a definitive answer to whether IL-6 pathway inhibition could protect the heart.</p>`
      },
      {
        h2: 'The Results: CRP Fell. Heart Attacks Did Not.',
        content: `<p><strong>The drug delivered on its biological promise.</strong> Ziltivekimab produced the expected, significant reductions in free IL-6 and hsCRP in treated patients. Target engagement was confirmed. Biologically, the drug did exactly what its designers intended: it interrupted the IL-6 signaling pathway and measurably suppressed the downstream inflammatory response captured by CRP. From a pure pharmacology standpoint, the drug worked.</p>

                <p><strong>But the clinical outcome was flat.</strong> <a href="https://www.hcplive.com/view/ziltivekimab-fails-to-reduce-mace-risk-in-phase-3-zeus-trial" target="_blank" rel="noopener">According to topline results released July 31, 2026</a>, the hazard ratio for MACE was 0.99 (95% CI: 0.88&#8211;1.11) — a precision null result. There was no statistically significant difference in cardiovascular death, nonfatal myocardial infarction, or nonfatal stroke between patients who received ziltivekimab and those who received placebo. In a trial of more than 6,300 participants with this level of follow-up, a null result is not ambiguous. It means the intervention, in this population, did not produce the hoped-for cardiovascular protection despite measurably lowering a validated inflammatory biomarker.</p>

                <p><strong>Safety signals added another layer of nuance.</strong> Serious infections were more frequent in the ziltivekimab arm than in the placebo arm — a finding consistent with the known biology of IL-6 pathway blockade. IL-6 plays an important role in the acute immune response to infection, and suppressing it can blunt the body's ability to mount that response quickly. This is a class effect seen with other IL-6 pathway inhibitors like tocilizumab. Full safety data will be presented at an upcoming scientific meeting, and two additional ziltivekimab trials — HERMES (in heart failure patients) and ARTEMIS (post-acute MI) — remain ongoing, with readouts expected in early 2027.</p>`
      },
      {
        h2: 'What This Tells Us About CRP, IL-6, and the Inflammation Hypothesis',
        content: `<p><strong>The ZEUS result does not mean CRP is an unreliable marker of cardiovascular risk.</strong> The observational evidence linking elevated hsCRP to cardiovascular events is extensive and replicates consistently across hundreds of studies in diverse populations. The 2025 ACC Scientific Statement on Inflammation and Cardiovascular Disease, published in the <em>Journal of the American College of Cardiology</em>, concluded that "the evidence linking inflammation with ASCVD is no longer exploratory but is compelling and clinically actionable." That foundation did not shift with the ZEUS trial. Elevated hsCRP still predicts residual cardiovascular risk, particularly in patients whose LDL is already managed by statins.</p>

                <p><strong>What the ZEUS result suggests is that reducing CRP pharmacologically does not automatically protect the cardiovascular system.</strong> The contrast with earlier trials is instructive. In the CANTOS trial (2017), canakinumab — an antibody targeting IL-1&#946;, the cytokine upstream of IL-6 in the same inflammatory cascade — reduced MACE by 15% (HR 0.85) in post-myocardial infarction patients with elevated hsCRP. Both canakinumab and ziltivekimab lower CRP through the same pathway. Both are antibodies. One was positive; one was not. Similarly, colchicine — which acts further upstream, on the NLRP3 inflammasome — reduced cardiovascular events in both the COLCOT and LoDoCo2 trials. The pattern suggests that <em>where</em> you intervene in the inflammatory cascade matters, and that IL-6 inhibition specifically, at least in the CKD-heavy population enrolled in ZEUS, may not be the right lever.</p>

                <p><strong>The chronic kidney disease population enrolled in ZEUS may also be a critical variable.</strong> Patients with significant kidney disease have altered inflammatory profiles driven by uremic toxins, oxidative stress, altered gut microbiome, and reduced clearance of inflammatory mediators — all of which can sustain CRP elevation through multiple simultaneous pathways. Blocking one of those pathways (IL-6) may be insufficient when several others are still operating. The ZEUS trial was explicitly designed to test IL-6 inhibition in this high-need population. The answer, for now, appears to be that it does not produce a measurable clinical benefit in this context — though the two ongoing trials in different patient populations (HERMES, ARTEMIS) may tell a different story.</p>`
      },
      {
        h2: 'What This Means for Monitoring Your Own Inflammation',
        content: `<p><strong>The complexity of the ZEUS result is actually an argument for understanding your own inflammatory picture more clearly, not less.</strong> If chronic inflammation is multifactorial — driven by diet, adipose tissue activity, stress, poor sleep, dysbiosis, and metabolic dysfunction, among other inputs — then addressing it requires more than suppressing one signaling molecule pharmacologically. It requires identifying what is driving your particular inflammatory state and making changes that address those drivers. That is not something a single biologic can do. It is something that consistent lifestyle modification, tracked over time, can begin to accomplish.</p>

                <p><strong>CRP remains a meaningful signal of what is happening inside your body.</strong> An elevated hsCRP in an otherwise healthy person still indicates that something is generating chronic low-grade inflammation — and that information is still actionable. It is a prompt to examine sleep quality, dietary patterns, physical activity, body composition, stress load, and any symptoms worth discussing with a healthcare provider. The ZEUS trial did not change any of that. What it demonstrated, specifically, is that pharmacologically suppressing one downstream marker of inflammation — without addressing the upstream drivers — may not be sufficient to change hard cardiovascular outcomes. For most people outside a clinical trial, the relevant implication is not "find a pill that lowers CRP" but "understand why CRP is elevated and make the changes that address those reasons."</p>

                <p><strong>Sensa is a general wellness tool for that kind of longitudinal self-monitoring.</strong> Tracking your hsCRP over time — alongside the lifestyle changes you are making — gives you real data on whether those changes are moving your inflammatory baseline in the right direction. It does not replace a cardiovascular risk assessment by a clinician, and it does not diagnose or treat any condition. But in a period when inflammation research is moving fast and the picture is becoming more nuanced, having a sense of your own CRP trend is useful data to bring to those conversations. The ZEUS trial is a reminder that inflammation is complicated. Monitoring it is still worthwhile — and the scientific complexity is exactly why paying attention to your own numbers, over time, matters.</p>`
      }
    ],
    ctaH3: 'Track your inflammatory baseline over time',
    ctaP: 'Sensa is a general wellness at-home CRP test designed for longitudinal monitoring. See how lifestyle changes move your numbers — and bring real data to your next healthcare conversation. Not a diagnostic, just your own biology, made visible.',
    related: [
      { href: '/post-inflammation-modifiable-heart-risk', cat: 'News', title: 'Inflammation Joins the Short List of Modifiable Heart Risk Factors' },
      { href: '/post-crp-heart-attack-risk', cat: 'Science', title: 'CRP and Heart Attack Risk: What Your Inflammation Number Predicts' },
      { href: '/post-heart-disease-inflammation', cat: 'Conditions', title: 'How Does Inflammation Drive Heart Disease?' }
    ]
  }

];

posts.forEach(p => {
  const filePath = path.join(dir, `post-${p.slug}.html`);
  fs.writeFileSync(filePath, buildPost(p));
  console.log(`Written: post-${p.slug}.html`);
});

console.log(`\nDone. ${posts.length} files written.`);
