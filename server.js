const { db, nowLocal } = require('./src/db');
const { createApp } = require('./src/app');

// Insert a welcome post on first startup so the frontend isn't empty
if (db.prepare('SELECT COUNT(*) AS c FROM posts').get().c === 0) {
  db.prepare('INSERT INTO posts (title, slug, content, tags, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    .run(
      'Hello, world',
      'hello-world',
      'This is the first post of this blog, written in Markdown.\n\n## What you can do\n\n- Write and publish posts in the admin panel at `/admin`\n- Supports **bold**, *italic*, code blocks, lists, blockquotes\n- Reader comments require admin approval before they are displayed\n\n```js\nconsole.log("hello, blog");\n```\n',
      'Announcement',
      'published',
      nowLocal(),
      nowLocal(),
    );
}

const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => console.log(`blog listening on http://localhost:${port}`));
