#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Load config from .env
if [ -f .env ]; then
  source .env
fi

if [ -z "$DEPLOY_SERVER" ] || [ -z "$DEPLOY_DIR" ]; then
  echo "❌ Set DEPLOY_SERVER and DEPLOY_DIR in .env"
  echo "   Example:"
  echo "   DEPLOY_SERVER=root@your-server"
  echo "   DEPLOY_DIR=/opt/pumpclaw-web"
  exit 1
fi

# Bump patch version
npm version patch --no-git-tag-version

# Get new version
VERSION=$(node -p "require('./package.json').version")
echo "📦 Version bumped to $VERSION"

npm run build
echo "✅ Build complete - v$VERSION"

# Deploy to server via rsync
echo "🚀 Deploying v$VERSION to server..."
rsync -avz --delete dist/ "$DEPLOY_SERVER:$DEPLOY_DIR/"
echo "✅ Deployed v$VERSION to pumpclaw.com"

# Commit version bump
if [ "${SKIP_COMMIT:-}" != "1" ]; then
  git add package.json 2>/dev/null || true
  git diff --cached --quiet package.json 2>/dev/null || {
    git commit -m "v$VERSION" --no-verify 2>/dev/null || true
    git push origin main 2>/dev/null || true
  }
fi
