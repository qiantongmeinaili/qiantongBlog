const session = require('express-session');

// Persist sessions in SQLite so login state isn't lost on process restart
class SQLiteStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    db.exec('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER)');
  }
  get(sid, cb) {
    try {
      const row = this.db.prepare('SELECT data, expires FROM sessions WHERE sid = ?').get(sid);
      if (!row || row.expires < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.data));
    } catch (err) { cb(err); }
  }
  set(sid, sess, cb) {
    try {
      const expires = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 7 * 24 * 3600 * 1000;
      this.db.prepare('INSERT INTO sessions (sid, data, expires) VALUES (?,?,?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires')
        .run(sid, JSON.stringify(sess), expires);
      cb(null);
    } catch (err) { cb(err); }
  }
  destroy(sid, cb) {
    try { this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid); cb(null); } catch (err) { cb(err); }
  }
  clear(cb) {
    try { this.db.prepare('DELETE FROM sessions').run(); cb(null); } catch (err) { cb(err); }
  }
}

module.exports = SQLiteStore;
