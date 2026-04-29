#!/usr/bin/env bash
set -euo pipefail

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit

echo "Configured git hooks path to .githooks"
echo "Pre-commit hook is executable"
