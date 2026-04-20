#!/usr/bin/env bash
# Run all harness tests (Python + Node.js)
# Usage: bash test/run_tests.sh [--python-only] [--node-only]

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

PYTHON_ONLY=false
NODE_ONLY=false
for arg in "$@"; do
  case $arg in
    --python-only) PYTHON_ONLY=true ;;
    --node-only)   NODE_ONLY=true ;;
  esac
done

# ── Python tests ──────────────────────────────────────────────────────────────
run_python() {
  echo "=== Python tests ==="
  if ! command -v pytest &>/dev/null; then
    echo "pytest not found. Install with: pip install pytest"
    exit 1
  fi
  cd "$SCRIPT_DIR/python"
  pytest -v --tb=short
  cd "$ROOT"
}

# ── Node.js tests ─────────────────────────────────────────────────────────────
run_node() {
  echo ""
  echo "=== Node.js tests ==="

  # Install CLI deps (needed for @clack/prompts import in integration tests)
  if [ ! -d "$ROOT/tools/cli/node_modules" ]; then
    echo "Installing CLI dependencies..."
    cd "$ROOT/tools/cli"
    npm install --silent
    cd "$ROOT"
  fi

  cd "$SCRIPT_DIR/node"
  node --test test_update.js test_status.js
  cd "$ROOT"
}

# ── Run ───────────────────────────────────────────────────────────────────────
if $NODE_ONLY; then
  run_node
elif $PYTHON_ONLY; then
  run_python
else
  run_python
  run_node
fi

echo ""
echo "All tests passed."
