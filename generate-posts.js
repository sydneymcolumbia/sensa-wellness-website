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

  // Aug 24 -- ACC declares inflammation a modifiable cardiovascular risk factor
  {
    slug: 'inflammation-modifiable-heart-risk',
    title: 'Inflammation Joins the Short List of Modifiable Heart Risk Factors',
    desc: 'The American College of Cardiology now calls inflammation "clinically actionable" for cardiovascular disease. Here is what the 2025 ACC Scientific Statement says, and why it matters for how people think about tracking hsCRP at home.',
    subtitle: 'For decades, doctors managed heart disease around cholesterol, blood pressure, blood sugar, and smoking. A major 2025 statement from the American College of Cardiology has added a fifth factor to that short list, one that most people have never had measured: chronic low-grade inflammation.',
    category: 'News',
    dateDisplay: 'August 24, 2026',
    readTime: '7 min read',
    intro: `<p>For nearly a generation, the story of preventable heart disease has been told in four numbers: LDL cholesterol, blood pressure, hemoglobin A1c, and pack-years of smoking. Those numbers still matter enormously. But they have never fully explained why some people with normal cholesterol still have heart attacks, and why aggressively lowering LDL leaves a stubborn residue of cardiovascular risk that will not go away. The missing variable, researchers now argue with growing confidence, is inflammation.</p>

                <p>In September 2025, the American College of Cardiology (ACC) published a Scientific Statement in the Journal of the American College of Cardiology titled <em>Inflammation and Cardiovascular Disease</em>. It concludes, in language unusually direct for a consensus document, that the evidence linking inflammation with atherosclerotic cardiovascular disease is <strong>"no longer exploratory but is compelling and clinically actionable."</strong> Coverage of that statement rippled through cardiology media through 2026, with Medscape describing inflammation as having formally "joined the list of modifiable cardiovascular risk factors." For a wellness field that has spent years arguing that CRP tracking matters, it is a watershed.</p>`,
    sections: [
      {
        h2: 'What the 2025 ACC Statement Actually Says',
        content: `<p><strong>Residual inflammatory risk is real.</strong> The heart of the ACC Scientific Statement, led by George Mensah, Paul Ridker, Francine Welty, and colleagues, is that high-sensitivity C-reactive protein (hsCRP) remains strongly predictive of recurrent cardiovascular events even in people already taking statins with well-controlled LDL. This is the concept of "residual inflammatory risk": once you have wrung as much benefit as possible out of lowering LDL, whatever risk remains is shaped in large part by how inflamed the vasculature still is. The statement calls this out as one of the most important unmet needs in preventive cardiology today.</p>

                <p><strong>hsCRP flags higher-risk healthy people too.</strong> The statement also revisits the primary prevention case. In apparently healthy adults, an elevated hsCRP identifies a higher-risk group, even when LDL cholesterol looks normal. Randomized trials cited in the document show that statin therapy in this group meaningfully reduces first major cardiovascular events. That is a meaningful shift: inflammation is not just a marker of trouble in people with known disease, it is a way to spot trouble before it starts.</p>

                <p><strong>An actionable, monitorable factor.</strong> Perhaps most importantly, the ACC statement puts inflammation into the same conceptual bucket as cholesterol and blood pressure. It is something to <em>assess, monitor, and modify</em>. That framing matters, because it moves inflammation out of the world of vague general-wellness language and into the world of measurable, trackable inputs that clinicians and patients can act on together over time. The full statement is available in the Journal of the American College of Cardiology (<a href="https://doi.org/10.1016/j.jacc.2025.08.047" target="_blank" rel="noopener">Mensah et al., 2025, doi:10.1016/j.jacc.2025.08.047</a>).</p>`
      },
      {
        h2: 'Why This News Landed in 2026',
        content: `<p><strong>A pileup of confirming evidence.</strong> The ACC statement did not appear in a vacuum. Through 2025 and 2026, a run of studies continued to reinforce the same pattern. A prospective cohort study of 1,828 adults, published in Nutrition, Metabolism &amp; Cardiovascular Diseases in early 2026, found that people with high hsCRP had nearly three times the hazard of a major cardiovascular event compared to those with low hsCRP, independent of body fat percentage (<a href="https://doi.org/10.1016/j.numecd.2026.104700" target="_blank" rel="noopener">Bennouar et al., 2026, doi:10.1016/j.numecd.2026.104700</a>). Inflammation, that study found, mediated a substantial portion of the link between excess body fat and cardiovascular events.</p>

                <p><strong>Immune biology beyond the classic markers.</strong> An August 2026 study in the European Heart Journal, using single-cell multi-omics on immune cells from patients with and without coronary artery disease, identified immunological signatures of cardiovascular risk that were <em>independent</em> of hsCRP and IL-6 (<a href="https://doi.org/10.1093/eurheartj/ehag553" target="_blank" rel="noopener">Horstmann et al., 2026, doi:10.1093/eurheartj/ehag553</a>). That does not diminish CRP; it does the opposite. It shows that once you take inflammation seriously as an axis of risk, there is even more biology waiting to be mapped underneath it. The ACC statement is likely to be the first of several, not the last word.</p>

                <p><strong>The GLP-1 signal.</strong> Fresh reporting through 2026 has also focused on GLP-1 receptor agonists like semaglutide and tirzepatide, which appear to lower hsCRP substantially, in some analyses by more than 2 mg/L versus placebo. Because these medications are now used by millions of people, cardiologists have become very interested in whether their cardiovascular benefit is partly an anti-inflammatory effect. That question, discussed in the ACC document and revisited at the 2026 International Congress on Obesity, is another reason inflammation has been front of mind in cardiovascular medicine this year.</p>`
      },
      {
        h2: 'What "Modifiable" Actually Looks Like',
        content: `<p><strong>The behavioral levers.</strong> One of the most useful parts of the ACC Scientific Statement is its summary of behavioral and lifestyle inputs that measurably lower inflammatory markers. The evidence is not exotic. Regular moderate exercise reduces hsCRP over months. Mediterranean-pattern eating, high in olive oil, legumes, whole grains, fatty fish, and vegetables, lowers CRP in multiple controlled trials. Smoking cessation drops hsCRP substantially, often within a year. Sleep of consistent duration and quality reduces inflammatory cytokines. Weight loss, when it reduces visceral fat, is one of the most reliable ways to bring an elevated hsCRP down.</p>

                <p><strong>The pharmacological levers.</strong> The statement also reviews the pharmacology. Statins are anti-inflammatory as well as lipid-lowering; the JUPITER trial showed that people with normal LDL but elevated hsCRP still benefited from rosuvastatin. Low-dose colchicine has emerged as an anti-inflammatory add-on for secondary prevention. Interleukin-6 pathway inhibitors like ziltivekimab are being tested in large trials, including the ongoing ZEUS trial in more than 6,000 patients with atherosclerotic cardiovascular disease, chronic kidney disease, and elevated hsCRP. None of these replace lifestyle work. They are additive tools when inflammation stays high despite everything else.</p>

                <p><strong>Why measurement matters more now.</strong> The practical implication is straightforward. Once a risk factor moves onto the "modifiable" list, tracking it stops being an academic exercise. Cholesterol is monitored because it responds to what you do. Blood pressure is monitored for the same reason. Inflammation is now in that category. But unlike cholesterol and blood pressure, most people have never had their hsCRP measured, let alone tracked over time.</p>`
      },
      {
        h2: 'What This Means for Everyday Wellness',
        content: `<p><strong>A number worth knowing.</strong> The 2025 ACC Scientific Statement does not tell everyone to become obsessed with their inflammation number. It does something more useful: it establishes that hsCRP is a legitimate piece of the cardiovascular picture, on par with the numbers people already track. For anyone thinking about long-term health, understanding roughly where your inflammatory baseline sits, and whether it trends up or down over time, is now defensible medically as well as intuitively.</p>

                <p><strong>Trend over snapshot.</strong> One of the reasons inflammation has lagged cholesterol as a clinical target is that a single CRP reading is noisy. Acute infections, injuries, dental issues, and recent intense workouts can push CRP up transiently. That is why the ACC statement, and most of the underlying research, emphasizes repeated measurement and trend interpretation rather than a single number. A hsCRP result is most useful when you have several over time and can see the direction of travel alongside changes in weight, sleep, exercise, diet, and stress.</p>

                <p><strong>Data to bring to your doctor.</strong> None of this replaces medical care. Sensa is a general wellness tool, not a diagnostic. What it offers is data: a way to see, in your own body, how the inflammatory factor that the American College of Cardiology now calls modifiable actually moves in response to the way you live. That data belongs in a conversation with a healthcare provider who knows your history, your medications, and your risks. What has changed with the 2025 ACC statement is that the conversation is worth having.</p>

                <p>Inflammation was, for a long time, the risk factor cardiologists talked about carefully in journals and rarely mentioned to patients. That is ending. The list of modifiable cardiovascular risk factors has grown by one, and the newest addition is one you can start tracking at home.</p>`
      }
    ],
    ctaH3: 'Track the risk factor cardiology just added.',
    ctaP: 'Sensa is a general wellness at-home CRP test designed to help you monitor your inflammation trend over time. It is not a diagnostic device, but the numbers it gives you are data you can bring to your healthcare provider.',
    related: [
      { href: '/post-crp-heart-attack-risk', cat: 'Science', title: 'CRP and Heart Attack Risk: What Your Inflammation Number Predicts' },
      { href: '/post-hscrp-vs-crp', cat: 'Science', title: 'hsCRP vs Standard CRP: What Is the Difference?' },
      { href: '/post-atherosclerosis-inflammation', cat: 'Science', title: 'Atherosclerosis and Inflammation: Why Plaque Is an Inflammatory Disease' }
    ]
  }

];

posts.forEach(p => {
  const filePath = path.join(dir, `post-${p.slug}.html`);
  fs.writeFileSync(filePath, buildPost(p));
  console.log(`Written: post-${p.slug}.html`);
});

console.log(`\nDone. ${posts.length} files written.`);
