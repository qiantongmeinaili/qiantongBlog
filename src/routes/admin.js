const express = require('express');
const crypto = require('node:crypto');
const { db, getSetting, setSetting, nowLocal } = require('../db');

const router = express.Router();
const loginAttempts = [];

const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
};
const verifyPassword = (pw, stored) => {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
};
const hasAdmin = () => !!getSetting('admin_pass');
const requireAuth = (req, res, next) => (req.session.admin ? next() : res.redirect('/admin/login'));
const slugify = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
const normTags = (s) => [...new Set(String(s || '').split(/[,，]/).map((t) => t.trim()).filter(Boolean))].join(',');

router.get('/setup', (req, res) => {
  if (hasAdmin()) return res.redirect('/admin/login');
  res.render('admin/setup', { title: 'Blog initialization' });
});
router.post('/setup', (req, res) => {
  if (hasAdmin()) return res.redirect('/admin/login');
  const pw = String(req.body.password || '');
  if (pw.length < 8) return res.status(400).render('admin/setup', { title: 'Blog initialization', error: 'Password must be at least 8 characters' });
  setSetting('admin_pass', hashPassword(pw));
  res.redirect('/admin/login');
});
router.get('/login', (req, res) => {
  if (!hasAdmin()) return res.redirect('/admin/setup');
  res.render('admin/login', { title: 'Login', error: req.query.error || '' });
});
router.post('/login', (req, res) => {
  const now = Date.now();
  while (loginAttempts.length && now - loginAttempts[0] > 60000) loginAttempts.shift();
  if (loginAttempts.length >= 5) {
    return res.status(429).render('admin/login', { title: 'Login', error: 'Too many attempts. Please try again in 1 minute' });
  }
  const stored = getSetting('admin_pass');
  if (stored && verifyPassword(String(req.body.password || ''), stored)) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  loginAttempts.push(now);
  res.status(401).render('admin/login', { title: 'Login', error: 'Incorrect password' });
});
router.post('/logout', requireAuth, (req, res) => req.session.destroy(() => res.redirect('/')));

router.get('/', requireAuth, (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY updated_at DESC').all();
  const pending = db.prepare("SELECT c.*, p.title AS post_title, p.slug AS post_slug FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.status = 'pending' ORDER BY c.created_at DESC").all();
  res.render('admin/index', { posts, pending, title: 'Admin panel' });
});

router.get('/posts/new', requireAuth, (req, res) => {
  res.render('admin/edit', { post: { id: null, title: '', slug: '', tags: '', content: '', status: 'draft' }, title: 'New post' });
});
router.post('/posts', requireAuth, (req, res) => {
  const now = nowLocal();
  try {
    const info = db.prepare('INSERT INTO posts (title, slug, content, tags, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(String(req.body.title || 'Untitled'), 'tmp', String(req.body.content || ''), normTags(req.body.tags), req.body.status === 'published' ? 'published' : 'draft', now, now);
    const slug = slugify(req.body.slug) || `p-${info.lastInsertRowid}`;
    db.prepare('UPDATE posts SET slug = ? WHERE id = ?').run(slug, info.lastInsertRowid);
  } catch (err) {
    return res.status(400).send(`Save failed: ${err.message}`);
  }
  res.redirect('/admin');
});
router.get('/posts/:id/edit', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.redirect('/admin');
  res.render('admin/edit', { post, title: 'Edit post' });
});
router.post('/posts/:id', requireAuth, (req, res) => {
  const slug = slugify(req.body.slug) || `p-${req.params.id}`;
  try {
    db.prepare('UPDATE posts SET title = ?, slug = ?, content = ?, tags = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(String(req.body.title || 'Untitled'), slug, String(req.body.content || ''), normTags(req.body.tags), req.body.status === 'published' ? 'published' : 'draft', nowLocal(), req.params.id);
  } catch (err) {
    return res.status(400).send(`Save failed: ${err.message}`);
  }
  res.redirect('/admin');
});
router.post('/posts/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

router.post('/comments/:id/approve', requireAuth, (req, res) => {
  db.prepare("UPDATE comments SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.redirect('/admin');
});
router.post('/comments/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

router.get('/settings', requireAuth, (req, res) => {
  res.render('admin/settings', {
    title: 'Site settings',
    s: {
      site_title: getSetting('site_title'),
      subtitle: getSetting('subtitle'),
      site_url: getSetting('site_url'),
      icp_number: getSetting('icp_number'),
      about: getSetting('about'),
    },
  });
});
router.post('/settings', requireAuth, (req, res) => {
  ['site_title', 'subtitle', 'site_url', 'icp_number', 'about'].forEach((k) => setSetting(k, String(req.body[k] || '')));
  res.redirect('/admin/settings');
});

module.exports = router;
