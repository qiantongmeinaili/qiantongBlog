# Personal blog (dynamic)

A self-hosted dynamic blog: Express + SQLite + Markdown, with admin panel, comment moderation, RSS and sitemap. Zero external services, single SQLite file holds all data.

## Features

- Posts: Markdown writing, draft/published, tags, slug URLs
- Comments: readers submit, admin approves before display
- Admin: password init (scrypt hash), session persisted in SQLite, login rate limit
- Frontend: server-side rendering, dark mode, RSS (`/rss.xml`), sitemap (`/sitemap.xml`), about page
- Settings: site title, subtitle, site URL, ICP number (footer), about content
- Security: Markdown raw HTML escaped (XSS-safe), httpOnly cookies, parameterized SQL

## Local dev

```bash
npm install
npm start          # http://localhost:3000
npm run smoke      # end-to-end smoke test
```

First visit `/admin/setup` to create the admin password.

## Deploy to InstaBox (or any Debian/Ubuntu box)

1. Upload this directory (Filesystem tab or `git clone`), then:
   ```bash
   bash deploy/install.sh     # add sudo if not root
   ```
2. In the platform Ports tab, publish port 3000.
3. Open the public URL + `/admin/setup`, set password, fill site settings.
4. Backups: copy `data/blog.db` somewhere safe (or snapshot the machine).

## Later: Aliyun production

Same code runs unchanged. Put nginx in front with TLS (certbot), proxy to 127.0.0.1:3000,
keep the provided systemd unit, point your filed domain A record at the server,
and fill the ICP number in admin settings so the footer stays compliant.

## Layout

```
server.js            entry, seeds welcome post
src/app.js           express app assembly
src/db.js            SQLite schema + settings helpers
src/routes/public.js frontend routes
src/routes/admin.js  admin routes
views/               EJS templates
public/style.css     single stylesheet, light/dark
deploy/install.sh    one-click install
scripts/smoke.js     e2e smoke test
data/                SQLite database (gitignored)
```
