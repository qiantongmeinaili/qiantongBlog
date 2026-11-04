const express = require('express');
const { db, getSetting, nowLocal } = require('../db');
const { render } = require('../markdown');

const router = express.Router();
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const baseUrl = (req) => {
  const configured = getSetting('site_url').replace(/\/+$/, '');
  return configured || `${req.protocol}://${req.get('host')}`;
};
const tagList = (p) => (p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []);

router.get('/', (req, res) => {
  const tag = String(req.query.tag || '').trim();
  const all = db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC").all();
  const posts = tag ? all.filter((p) => tagList(p).includes(tag)) : all;
  const tagCount = {};
  all.forEach((p) => tagList(p).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  res.render('index', { posts, tag, tagCount, title: tag ? `Tag: ${tag}` : '' });
});

router.get('/about', (req, res) => {
  res.render('about', { html: render(getSetting('about') || 'The owner is lazy and hasn\'t written an introduction yet.'), title: 'About' });
});

router.get('/post/:slug', (req, res, next) => {
  const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!post) return next();
  post.html = render(post.content);
  post.tagList = tagList(post);
  const comments = db.prepare("SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC").all(post.id);
  res.render('post', { post, comments, commented: req.query.commented === '1', title: post.title });
});

router.post('/post/:slug/comment', (req, res) => {
  const post = db.prepare("SELECT id, slug FROM posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!post) return res.status(404).send('Not found');
  const author = String(req.body.author || '').trim().slice(0, 60);
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (author && content) {
    db.prepare('INSERT INTO comments (post_id, author, content, created_at) VALUES (?,?,?,?)').run(post.id, author, content, nowLocal());
  }
  res.redirect(`/post/${encodeURIComponent(post.slug)}?commented=1`);
});

router.get('/rss.xml', (req, res) => {
  const posts = db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 20").all();
  const base = baseUrl(req);
  const items = posts.map((p) => [
    '  <item>',
    `    <title>${xmlEsc(p.title)}</title>`,
    `    <link>${base}/post/${encodeURIComponent(p.slug)}</link>`,
    `    <guid isPermaLink="true">${base}/post/${encodeURIComponent(p.slug)}</guid>`,
    `    <pubDate>${new Date(p.created_at.replace(' ', 'T')).toUTCString()}</pubDate>`,
    `    <description>${xmlEsc(p.content.slice(0, 200))}</description>`,
    '  </item>',
  ].join('\n')).join('\n');
  res.type('application/rss+xml; charset=utf-8').send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>${xmlEsc(getSetting('site_title') || 'Personal Blog')}</title>\n<link>${base}</link>\n<description>${xmlEsc(getSetting('subtitle') || '')}</description>\n${items}\n</channel>\n</rss>\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const posts = db.prepare("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY created_at DESC").all();
  const base = baseUrl(req);
  const urls = [`  <url><loc>${base}/</loc></url>`, `  <url><loc>${base}/about</loc></url>`]
    .concat(posts.map((p) => `  <url><loc>${base}/post/${encodeURIComponent(p.slug)}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod></url>`))
    .join('\n');
  res.type('application/xml; charset=utf-8').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

module.exports = router;
