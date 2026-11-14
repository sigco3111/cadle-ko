#!/usr/bin/env bash
# cadle-ko 빌드 재현 스크립트 (참고용)
set -euo pipefail
SHA=$(git ls-remote https://github.com/Humpalumps/Cadle.git HEAD | cut -f1)
git clone --quiet https://github.com/Humpalumps/Cadle.git /tmp/up
git -C /tmp/up checkout --quiet "$SHA"
rsync -a --exclude '.git' --exclude '.github' --exclude '.claude' --exclude 'progress' --exclude 'progress.html' --exclude 'docs' /tmp/up/ ./
npm install
npx vite build --base=/cadle-ko/
rm -rf docs && mkdir -p docs && cp -a dist/. docs/ && touch docs/.nojekyll
perl -pi -e 's{(?<!cadle-ko)/assets/}{/cadle-ko/assets/}g' $(find docs -name '*.js' -o -name '*.css' -o -name '*.html')
perl -pi -e 's{href="/play}{href="/cadle-ko/play}g; s{href="/"}{href="/cadle-ko/"}g' docs/index.html

