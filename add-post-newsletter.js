const fs = require('fs');
const path = require('path');
const dir = '/Users/sydneymurphy/sensawellness';

const MARKER = 'id="postNewsletterForm"';
const ANCHOR = '            <div class="related-posts">';

const BLOCK = `            <div class="blog-newsletter">
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

`;

const files = fs.readdirSync(dir).filter(f => /^post-.*\.html$/.test(f));
let added = 0, skipped = 0, missing = 0;

files.forEach(f => {
  const filePath = path.join(dir, f);
  const html = fs.readFileSync(filePath, 'utf8');
  if (html.includes(MARKER)) { skipped++; return; }
  if (!html.includes(ANCHOR)) { console.log(`NO ANCHOR: ${f}`); missing++; return; }
  fs.writeFileSync(filePath, html.replace(ANCHOR, BLOCK + ANCHOR));
  added++;
});

console.log(`Done. ${added} updated, ${skipped} already had the form, ${missing} missing anchor.`);
