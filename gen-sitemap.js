const fs = require('fs');
const dir = __dirname;
const base = 'https://www.sensawellness.org/';

const exclude = new Set([
  'admin.html','success.html','chat.html','deck.html','cuvet-animation.html',
  'start.html','privacy.html'
]);

const priority = (f) => {
  if (f === 'index.html') return '1.0';
  if (f === 'pay-now.html') return '0.9';
  if (['what-is-crp.html','how-to.html','app.html','blog.html'].includes(f)) return '0.8';
  if (f.startsWith('compare-') || f.startsWith('hub-') || f === 'weight-loss.html') return '0.8';
  if (f.startsWith('post-')) return '0.7';
  if (['our-story.html','press-kit.html','work-with-us.html','sitemap-page.html'].includes(f)) return '0.6';
  if (['privacy-policy.html','terms-of-service.html','delete-account.html'].includes(f)) return '0.3';
  return '0.5';
};
const changefreq = (f) => {
  if (f === 'index.html' || f === 'blog.html' || f === 'pay-now.html') return 'weekly';
  return 'monthly';
};

const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.html'))
  .filter(f => !exclude.has(f));

const url = (f) => {
  const loc = f === 'index.html' ? base : base + f;
  const lastmod = fs.statSync(dir + '/' + f).mtime.toISOString().slice(0,10);
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq(f)}</changefreq>\n    <priority>${priority(f)}</priority>\n  </url>`;
};

const order = (f) => {
  if (f === 'index.html') return 0;
  if (['pay-now.html','what-is-crp.html','how-to.html','app.html','blog.html','weight-loss.html','our-story.html','press-kit.html','work-with-us.html','sitemap-page.html'].includes(f)) return 1;
  if (f.startsWith('compare-') || f.startsWith('hub-')) return 2;
  if (f.startsWith('post-')) return 3;
  return 4;
};
files.sort((a,b) => order(a)-order(b) || a.localeCompare(b));

const body = files.map(url).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
fs.writeFileSync(dir + '/sitemap.xml', xml);
console.log('Wrote sitemap.xml with', files.length, 'urls');
