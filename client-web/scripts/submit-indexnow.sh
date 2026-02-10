#!/bin/bash
# Submit all sitemap URLs to IndexNow (Bing + Yandex)
# Run after each data refresh

SITEMAP="$(dirname "$0")/../dist/sitemap.xml"
KEY=$(cat "$(dirname "$0")/../dist/.indexnow-key" 2>/dev/null)

if [ -z "$KEY" ]; then
  echo "Error: No IndexNow key found"
  exit 1
fi

URLS=$(sed -n 's/.*<loc>\([^<]*\)<\/loc>.*/\1/p' "$SITEMAP")
URL_COUNT=$(echo "$URLS" | wc -l | tr -d ' ')
URL_JSON=$(echo "$URLS" | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')

PAYLOAD="{\"host\":\"pumpclaw.com\",\"key\":\"$KEY\",\"keyLocation\":\"https://pumpclaw.com/$KEY.txt\",\"urlList\":$URL_JSON}"

echo "Submitting $URL_COUNT URLs to IndexNow..."
for ENDPOINT in "https://api.indexnow.org/indexnow" "https://yandex.com/indexnow"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" -d "$PAYLOAD")
  echo "  $(echo $ENDPOINT | cut -d/ -f3): $CODE"
done
