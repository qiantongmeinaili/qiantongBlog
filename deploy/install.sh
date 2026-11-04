#!/usr/bin/env bash
# One-click install on Debian/Ubuntu (including InstaBox machines).
# Run as a normal user: sudo is used only for the systemd unit, and if sudo or
# systemd is unavailable the script falls back to a nohup background process.
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_MAJOR="$(node -v 2>/dev/null | sed 's/v//; s/\..*//' || echo 0)"
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  echo "Installing Node.js 20 (needs root) ..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt-get install -y nodejs
fi

echo "Installing dependencies ..."
npm install --omit=dev --no-audit --no-fund
mkdir -p data

NODE_BIN="$(command -v node)"
RUN_USER="$(id -un)"

SYSTEMD_OK=0
if command -v systemctl >/dev/null 2>&1 && systemctl is-system-running >/dev/null 2>&1; then
  SYSTEMD_OK=1
fi

start_nohup() {
  pkill -f "node server.js" 2>/dev/null || true
  nohup "$NODE_BIN" server.js > blog.log 2>&1 &
  echo "Started in background (pid $!), logs in blog.log"
  echo "Note: rerun bash deploy/install.sh after a machine reboot"
}

install_systemd() {
  local unit
  unit="[Unit]
Description=Personal blog
After=network.target

[Service]
WorkingDirectory=$PWD
ExecStart=$NODE_BIN server.js
Environment=PORT=3000
Restart=always
User=$RUN_USER

[Install]
WantedBy=multi-user.target"
  if [ -w /etc/systemd/system ]; then
    printf '%s\n' "$unit" > /etc/systemd/system/blog.service
    systemctl daemon-reload
    systemctl enable --now blog
  elif command -v sudo >/dev/null 2>&1; then
    printf '%s\n' "$unit" | sudo tee /etc/systemd/system/blog.service >/dev/null
    sudo systemctl daemon-reload
    sudo systemctl enable --now blog
  else
    return 1
  fi
  systemctl is-active --quiet blog
}

if [ "$SYSTEMD_OK" -eq 1 ] && install_systemd; then
  echo "Running as systemd service: systemctl status blog"
else
  start_nohup
fi
echo "Next: publish port 3000 in the platform's Ports tab, then open /admin/setup"
