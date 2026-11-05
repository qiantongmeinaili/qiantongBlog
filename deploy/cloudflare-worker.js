// Cloudflare Worker: put your own domain in front of the InstaBox preview URL.
// The InstaBox proxy routes by Host header (foreign Host -> 404), so the Worker
// rewrites Host back to the origin host while TLS terminates at Cloudflare.
//
// Setup:
//   1. Delegate the subdomain to Cloudflare nameservers (NS record at the ccwu.cc panel)
//   2. Add the subdomain zone in Cloudflare, create a Worker with this file
//   3. In the zone, route all traffic (route: qiantongmeinaili.ccwu.cc/*) to the Worker
const ORIGIN = 'https://3000-agq2lxp5z5xgenbo6556dqtbwm.instabox.tech';

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const target = new URL(url.pathname + url.search, ORIGIN);
    const headers = new Headers(req.headers);
    headers.set('Host', target.host);
    headers.set('X-Forwarded-Host', url.host);
    const res = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: 'manual',
    });
    const out = new Response(res.body, res);
    const loc = out.headers.get('location');
    if (loc && loc.startsWith(ORIGIN)) out.headers.set('Location', loc.slice(ORIGIN.length) || '/');
    return out;
  },
};
