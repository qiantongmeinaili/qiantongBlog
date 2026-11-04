// End-to-end smoke test: starts a temporary instance and walks through the main flows once
const path = require('node:path');
const os = require('node:os');
process.env.DATA_DIR = path.join(os.tmpdir(), `blog-smoke-${Date.now()}`);

const { createApp } = require('../src/app');
const server = createApp().listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let cookie = '';
async function req(method, url, body) {
  const res = await fetch(base + url, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return res;
}
const assert = (cond, msg) => {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exitCode = 1; } else { console.log(`ok: ${msg}`); }
};

(async () => {
  assert((await req('GET', '/')).status === 200, 'Homepage 200');
  assert((await req('GET', '/admin/setup')).status === 200, 'Initialization page 200');
  await req('POST', '/admin/setup', { password: 'test12345' });
  assert((await req('POST', '/admin/login', { password: 'test12345' })).status === 302, 'Login succeeds and redirects');
  await req('POST', '/admin/posts', { title: 'Test post', slug: 'test', content: '# Hi\n\nBody **bold**', tags: 'test, life', status: 'published' });
  const postRes = await req('GET', '/post/test');
  const postHtml = await postRes.text();
  assert(postRes.status === 200 && postHtml.includes('<h1>Hi</h1>'), 'Post is published and Markdown is rendered');
  assert(postHtml.includes('<strong>bold</strong>'), 'Bold works');
  await req('POST', '/post/test/comment', { author: 'Reader', content: 'Well written!' });
  const adminHtml = await (await req('GET', '/admin')).text();
  assert(adminHtml.includes('Reader') && adminHtml.includes('Well written!'), 'Pending comment shows in admin panel');
  assert(!postHtml.includes('Well written!'), 'Unapproved comment not shown on frontend');
  await req('POST', '/admin/comments/1/approve', {});
  const approvedHtml = await (await req('GET', '/post/test')).text();
  assert(approvedHtml.includes('Well written!'), 'Comment shown on frontend after approval');
  assert((await req('GET', '/rss.xml')).status === 200, 'RSS 200');
  assert((await req('GET', '/sitemap.xml')).status === 200, 'Sitemap 200');
  assert((await req('GET', '/nope')).status === 404, '404 page');
  server.close();
  console.log(process.exitCode ? 'SMOKE FAILED' : 'SMOKE PASSED');
  process.exit(process.exitCode || 0);
})().catch((err) => { console.error(err); process.exit(1); });
