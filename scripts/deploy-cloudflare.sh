#!/bin/sh
set -eu

PROJECT_NAME="${PROJECT_NAME:-qibenniu-tax-risk}"
BRANCH_NAME="${BRANCH_NAME:-main}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUT_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$OUT_DIR"
}
trap cleanup EXIT

cp "$ROOT_DIR/index.html" "$OUT_DIR/index.html"

echo "Deploying $PROJECT_NAME to Cloudflare Pages..."
(cd "$ROOT_DIR" && npx wrangler pages deploy "$OUT_DIR" --project-name="$PROJECT_NAME" --branch="$BRANCH_NAME")
