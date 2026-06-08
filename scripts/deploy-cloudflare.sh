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
cp "$ROOT_DIR/admin.html" "$OUT_DIR/admin.html"
mkdir -p "$OUT_DIR/admin"
cp "$ROOT_DIR/admin.html" "$OUT_DIR/admin/index.html"
cp "$ROOT_DIR/_headers" "$OUT_DIR/_headers"
cp -R "$ROOT_DIR/assets" "$OUT_DIR/assets"
cp -R "$ROOT_DIR/functions" "$OUT_DIR/functions"

echo "Deploying $PROJECT_NAME to Cloudflare Pages..."
(cd "$ROOT_DIR" && npx wrangler pages deploy "$OUT_DIR" --project-name="$PROJECT_NAME" --branch="$BRANCH_NAME")
