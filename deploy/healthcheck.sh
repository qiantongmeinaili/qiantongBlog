#!/usr/bin/env bash
# Post-deploy health check.
#   bash deploy/healthcheck.sh                 # check local instance
#   bash deploy/healthcheck.sh https://public.url   # check through proxy/nginx
set -u
BASE="${1:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
fail=0

check() {
  local path="$1"; shift
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")"
  for expect in "$@"; do
    if [ "$code" = "$expect" ]; then
      echo "ok   $path -> $code"
      return 0
    fi
  done
  echo "FAIL $path -> $code (expected: $*)"
  fail=1
}

check / 200
check /about 200
check /rss.xml 200
check /sitemap.xml 200
check /static/style.css 200
check /admin/login 200 302   # 302 on a fresh install before /admin/setup
check /no-such-page 404

if [ "$fail" = 0 ]; then echo "HEALTH OK: $BASE"; else echo "HEALTH FAILED: $BASE"; fi
exit "$fail"
