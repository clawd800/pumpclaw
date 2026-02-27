#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Bump patch version
npm version patch --no-git-tag-version

# Get new version (single source of truth: package.json)
VERSION=$(node -p "require('./package.json').version")

echo "📦 Version bumped to $VERSION"

npm run build

echo "✅ Build complete - v$VERSION"

# Deploy to GitHub Pages
if [ "${SKIP_DEPLOY:-}" != "1" ]; then
  npx gh-pages -d dist --no-history 2>&1
  echo "🚀 Deployed v$VERSION to pumpclaw.com"
fi

# Commit version bump
if [ "${SKIP_COMMIT:-}" != "1" ] && git diff --quiet package.json 2>/dev/null; then
  : # No changes to commit
elif [ "${SKIP_COMMIT:-}" != "1" ]; then
  git add package.json
  git commit -m "v$VERSION" --no-verify 2>/dev/null || true
  git push origin main 2>/dev/null || true
fi
