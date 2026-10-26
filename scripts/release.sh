#!/bin/sh
# Based on https://gist.github.com/fatmatto/9e989d582c391446dcf4bf0c8116cb6a
# Increments the project version (e.g. from 2.3.0 to 2.4.0)
# It handles stuff like
# * CHANGELOG
# * NPM package version
# * Git tags

# Stop at the first failing command
set -eu

# Calculating the new version requires to know which kind of update this is
# The default version increment is patch
# Used values: major|minor|patch where in x.y.z :
# major=x
# minor=y
# patch=z
versionType="${1:-patch}"

# Preflight: release only a clean master, in sync with origin, with tests and lint passing
[ "$(git rev-parse --abbrev-ref HEAD)" = "master" ] || { echo "Release only from master"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Working tree is not clean"; exit 1; }
# Tags are needed locally to generate the CHANGELOG sections
git fetch origin --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] || { echo "master is not in sync with origin/master"; exit 1; }
npm test
npx eslint index.js 'test/*' src/
npm whoami > /dev/null

# Increment version without creating a tag and a commit (we will create them later)
npm --no-git-tag-version version "$versionType"

# Using the package.json version
version="$(node -p "require('./package.json').version")"

# Build the commit
git add package.json package-lock.json
git commit -m "📦 Release $version"

# Create an annotated tag
git tag -a "$version" -m "📦 Release $version"

# Generate changelog from commits
npx --yes easy-changelog@1.0.2 --out=./CHANGELOG.md
git add CHANGELOG.md
git commit -m "📒 Update CHANGELOG"

# Release it! Publish before pushing, so a failed publish leaves nothing on origin
npm pack --dry-run
npm publish

# Gotta push them all
git push origin master --follow-tags
