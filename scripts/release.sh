#!/usr/bin/env bash
set -euo pipefail

VERSION_ARGS=("$@")

if [ ${#VERSION_ARGS[@]} -gt 0 ]; then
  echo "==> Bumping version: vlt version ${VERSION_ARGS[*]}"
  vlt version "${VERSION_ARGS[@]}"
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists." >&2
  exit 1
fi

echo "==> Tagging $TAG"
git tag -a "$TAG" -m "$TAG"

echo "==> Pushing tag to origin"
git push origin "$TAG"

echo "==> Publishing to registry"
vlt publish

echo "==> Released $TAG"
