const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const { db, getSetting, setSetting } = require('./db');
const SQLiteStore = require('./session-store');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.disable('x-powered-by');

  app.use(express.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));

  let secret = getSetting('session_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setSetting('session_secret', secret);
  }
  app.use(session({
    store: new SQLiteStore(db),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 },
  }));

  app.use((req, res, next) => {
    res.locals.path = req.path;
    res.locals.site = {
      title: getSetting('site_title') || 'My Blog',
      subtitle: getSetting('subtitle') || '',
      icp: getSetting('icp_number') || '',
      year: new Date().getFullYear(),
    };
    next();
  });

  app.use('/', publicRoutes);
  app.use('/admin', adminRoutes);
  app.use((req, res) => res.status(404).render('404', { title: 'Page not found' }));
  return app;
}

module.exports = { createApp };
