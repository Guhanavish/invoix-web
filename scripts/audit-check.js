'use strict';
// Pre-launch audit verification: boots the app and checks SEO/security surfaces.
process.env.PORT = '34572';
const { createApp } = require('../server/app');

const app = createApp();
const srv = app.listen(34572, async () => {
  const out = [];
  try {
    const h = await fetch('http://127.0.0.1:34572/api/health').then((r) => r.json());
    out.push(['health', h.ok === true]);
    const idx = await fetch('http://127.0.0.1:34572/').then((r) => r.text());
    out.push(['index-jsonld', idx.includes('SoftwareApplication')]);
    out.push(['index-og', idx.includes('og-image.png')]);
    out.push(['index-canonical', idx.includes('rel="canonical"')]);
    const rb = await fetch('http://127.0.0.1:34572/robots.txt').then((r) => r.text());
    out.push(['robots', rb.includes('Sitemap')]);
    const sm = await fetch('http://127.0.0.1:34572/sitemap.xml').then((r) => r.text());
    out.push(['sitemap-terms', sm.includes('/terms')]);
    out.push(['llms', (await fetch('http://127.0.0.1:34572/llms.txt').then((r) => r.status)) === 200]);
    const og = await fetch('http://127.0.0.1:34572/og-image.png');
    out.push(['og-img', og.status === 200 && (og.headers.get('content-type') || '').includes('image/png')]);
    const nf = await fetch('http://127.0.0.1:34572/definitely-missing').then((r) => r.text());
    out.push(['spa-fallback', nf.includes('id="root"')]);
    const lim = [];
    for (let i = 0; i < 35; i++) {
      const r = await fetch('http://127.0.0.1:34572/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'x', password: 'y' }),
      });
      lim.push(r.status);
    }
    out.push(['ratelimit-429', lim[lim.length - 1] === 429]);
  } catch (e) {
    out.push(['error', e.message]);
  }
  for (const [k, v] of out) console.log((v === true ? 'PASS' : 'FAIL') + ' ' + k + (v === true ? '' : ' -> ' + v));
  srv.close();
});
