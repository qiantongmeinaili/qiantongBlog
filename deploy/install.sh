#!/usr/bin/env bash
# One-click install on Debian/Ubuntu (including InstaBox machines). Run with sudo if needed:
#   sudo bash deploy/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_MAJOR="$(node -v 2>/dev/null | sed 's/v//; s/\..*//' || echo 0)"
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  echo "Installing Node.js 20 ..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Installing dependencies ..."
npm install --omit=dev --no-audit --no-fund
mkdir -p data

if command -v systemctl >/dev/null 2>&1 && [ -d /etc/systemd/system ]; then
  cat > /etc/systemd/system/blog.service <<EOF
[Unit]
Description=Personal blog
After=network.target

[Service]
WorkingDirectory=$PWD
ExecStart=$(command -v node) server.js
Environment=PORT=3000
Restart=always
User=$(id -un)

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now blog
  echo "Installed as systemd service: systemctl status blog"
else
  nohup node server.js > blog.log 2>&1 &
  echo "Started in background, logs in blog.log"
fi
echo "Next: publish port 3000 in the platform's Ports tab, then open /admin/setup"
