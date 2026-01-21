#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000/api/v1}
TIMESTAMP=$(date +%s)
EMAIL="autotest+${TIMESTAMP}@example.com"

echo "Registering test user: $EMAIL"
REG=$(curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"firstName\":\"Auto\",\"lastName\":\"Test\",\"password\":\"password123\"}")
echo "Registration response: $REG"

ACCESS_TOKEN=$(printf '%s' "$REG" | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8'); try{const j=JSON.parse(s); console.log((j.tokens && j.tokens.accessToken) || '');}catch(e){}")
REFRESH_TOKEN=$(printf '%s' "$REG" | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8'); try{const j=JSON.parse(s); console.log((j.tokens && j.tokens.refreshToken) || '');}catch(e){}")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Registration did not return tokens; attempting login..."
  LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}")
  ACCESS_TOKEN=$(printf '%s' "$LOGIN" | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8'); try{const j=JSON.parse(s); console.log((j.tokens && j.tokens.accessToken) || '');}catch(e){}")
  REFRESH_TOKEN=$(printf '%s' "$LOGIN" | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8'); try{const j=JSON.parse(s); console.log((j.tokens && j.tokens.refreshToken) || '');}catch(e){}")
fi

echo "Captured tokens:"
echo "  ACCESS_TOKEN: ${ACCESS_TOKEN:+[REDACTED]}"
echo "  REFRESH_TOKEN: ${REFRESH_TOKEN:+[REDACTED]}"

OUT_DIR=tests
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/results_${TIMESTAMP}.log"

echo "Running commands from test.curl.txt; results -> $OUT"
i=0; skipped=0
while IFS= read -r line || [ -n "$line" ]; do
  tline=$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  if [ -z "$tline" ] || [[ $tline == \#* ]]; then
    continue
  fi
  # Skip commands that require admin/seller tokens or unresolved resource placeholders
  if echo "$tline" | grep -qE '\$ADMIN_TOKEN|\$SELLER_TOKEN|<USER_ID>|<PRODUCT_ID>|<ORDER_ID>|<COUPON_ID>|<REVIEW_ID>'; then
    echo "SKIP: $tline" >> "$OUT"
    skipped=$((skipped+1))
    continue
  fi

  # Special-case: auth/refresh uses a nested-quote expansion in the template file
  if echo "$tline" | grep -q "/auth/refresh"; then
    cmd="curl -sS -X POST \"$BASE_URL/auth/refresh\" -H \"Content-Type: application/json\" -d \"{\\\"refreshToken\\\":\\\"$REFRESH_TOKEN\\\"}\""
  else
    # Substitute runtime tokens (safe simple replacements)
    cmd="$tline"
    cmd=${cmd//\$TOKEN/$ACCESS_TOKEN}
    cmd=${cmd//\$REFRESH_TOKEN/$REFRESH_TOKEN}
  fi
  echo "RUN: $cmd" >> "$OUT"
  echo ">>> $cmd" >> "$OUT"
  # Execute command, capture output (don't exit on failures of individual commands)
  eval "$cmd" >> "$OUT" 2>&1 || true
  echo >> "$OUT"
  i=$((i+1))
done < test.curl.txt

echo "Done. Ran $i commands, skipped $skipped. Results in $OUT"
echo "Notes: admin/seller flows and commands needing resource IDs were skipped. To include them, set env vars ADMIN_TOKEN, SELLER_TOKEN, or replace placeholders with real IDs."
