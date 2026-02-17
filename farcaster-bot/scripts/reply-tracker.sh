#!/bin/bash
# reply-tracker.sh — Robust reply dedup for PumpClaw growth loop
# Usage:
#   ./reply-tracker.sh blocklist          → outputs blocked usernames (one per line)
#   ./reply-tracker.sh log <user> <hash>  → logs a reply
#   ./reply-tracker.sh stats              → shows reply counts per user

REPLY_LOG="$HOME/clawd/projects/pumpclaw/farcaster-bot/reply-log.json"
GROWTH_LOG="$HOME/clawd/memory/pumpclaw-growth.md"
TODAY=$(date -u +%Y-%m-%d)

# Ensure reply-log.json exists with valid JSON
if [ ! -f "$REPLY_LOG" ] || [ ! -s "$REPLY_LOG" ]; then
  echo '{"replies":[]}' > "$REPLY_LOG"
fi
# Fix legacy empty {} format
if [ "$(cat "$REPLY_LOG" 2>/dev/null)" = "{}" ]; then
  echo '{"replies":[]}' > "$REPLY_LOG"
fi

case "${1:-}" in
  blocklist)
    # Source 1: reply-log.json
    LOG_USERS=$(python3 -c "
import json
from datetime import datetime, timedelta

with open('${REPLY_LOG}') as f:
    data = json.load(f)

replies = data.get('replies', [])
today = '${TODAY}'

user_dates = {}
for r in replies:
    d = r.get('date','')[:10]
    u = r.get('user','').lower().strip('@')
    if not u: continue
    if u not in user_dates:
        user_dates[u] = []
    user_dates[u].append(d)

blocked = set()
for u, dates in user_dates.items():
    # Block if replied today
    if today in dates:
        blocked.add(u)
    # Block if 3+ total replies (48h cooldown)
    if len(dates) >= 3:
        blocked.add(u)

for u in sorted(blocked):
    print(u)
" 2>/dev/null)

    # Source 2: growth log — grep for today's replied/engaged usernames
    GROWTH_USERS=$(python3 -c "
import re, sys

today = '${TODAY}'
in_today = False
users = set()

with open('${GROWTH_LOG}', 'r') as f:
    for line in f:
        # Check if we're in today's section
        if re.search(r'##.*' + re.escape(today), line):
            in_today = True
            continue
        if in_today and re.match(r'##.*\d{4}-\d{2}-\d{2}', line) and today not in line:
            in_today = False
            continue
        if in_today:
            # Find @username patterns after 'Replied to' or 'Engaged'
            for m in re.finditer(r'(?:Replied to|Engaged|engaged)\s+@([a-zA-Z0-9_.-]+)', line, re.IGNORECASE):
                users.add(m.group(1).lower())
            # Also catch '**@username**' pattern
            for m in re.finditer(r'\*\*@([a-zA-Z0-9_.-]+)\*\*', line):
                users.add(m.group(1).lower())

for u in sorted(users):
    print(u)
" 2>/dev/null)

    # Combine and deduplicate
    echo -e "${LOG_USERS}\n${GROWTH_USERS}" | sort -u | grep -v '^$'
    ;;

  log)
    USER="${2:-}"
    HASH="${3:-unknown}"
    if [ -z "$USER" ]; then
      echo "Error: usage: reply-tracker.sh log <username> <hash>"
      exit 1
    fi
    # Clean the username
    USER=$(echo "$USER" | tr -d '@' | tr '[:upper:]' '[:lower:]')
    
    python3 -c "
import json
from datetime import datetime, timedelta

f = '${REPLY_LOG}'
with open(f) as fh:
    data = json.load(fh)

if 'replies' not in data:
    data = {'replies': []}

data['replies'].append({
    'user': '${USER}',
    'hash': '${HASH}',
    'date': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
})

# Keep only last 7 days
cutoff = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%dT00:00:00Z')
data['replies'] = [r for r in data['replies'] if r.get('date','') >= cutoff]

with open(f, 'w') as fh:
    json.dump(data, fh, indent=2)

h = '${HASH}'
print(f'✅ Logged reply to @${USER} ({h[:16]})')
" 2>&1
    ;;

  stats)
    python3 -c "
import json
from collections import Counter

with open('${REPLY_LOG}') as f:
    data = json.load(f)

replies = data.get('replies', [])
counts = Counter(r.get('user','') for r in replies)
print(f'Total replies logged: {len(replies)}')
print('---')
for user, count in counts.most_common(20):
    print(f'  @{user}: {count}x')
" 2>/dev/null
    ;;

  *)
    echo "Usage: reply-tracker.sh {blocklist|log|stats}"
    echo "  blocklist  — list blocked usernames (replied today or 3+ in 48h)"
    echo "  log <user> <hash> — log a reply"
    echo "  stats      — show reply counts"
    exit 1
    ;;
esac
