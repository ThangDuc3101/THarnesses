/**
 * Tests for update.js hash-based update logic.
 * Run: node --test test_update.js
 * Prerequisites: npm install in tools/cli/
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../..");

const MANAGED_SOURCES = [
  "memory/progress/SKILL.md",
  "core/task-loop/SKILL.md",
  "core/checkpoint/SKILL.md",
  "core/resume/SKILL.md",
  "core/quickfix/SKILL.md",
  "memory/graph/build.py",
  "memory/graph/query.py",
];

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function writeHashes(dir, hashes) {
  fs.mkdirSync(path.join(dir, "_harness"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "_harness/.harness-hashes.json"),
    JSON.stringify(hashes, null, 2)
  );
}

function loadHashes(dir) {
  const p = path.join(dir, "_harness/.harness-hashes.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── sha256 ────────────────────────────────────────────────────────────────────

test("sha256: produces 16-char hex string", () => {
  const h = sha256("hello");
  assert.equal(h.length, 16);
  assert.match(h, /^[0-9a-f]+$/);
});

test("sha256: is deterministic", () => {
  assert.equal(sha256("same"), sha256("same"));
});

test("sha256: differs for different content", () => {
  assert.notEqual(sha256("content a"), sha256("content b"));
});

// ── hash decision logic ───────────────────────────────────────────────────────

test("hash logic: unchanged file has matching hash", () => {
  const content = "original content";
  assert.equal(sha256(content), sha256(content));
});

test("hash logic: detects user-customized file", () => {
  assert.notEqual(sha256("original"), sha256("user modified"));
});

test("hash logic: update needed when file unchanged but source differs", () => {
  const oldContent = "version 1";
  const newContent = "version 2";
  const stored = sha256(oldContent);
  const current = sha256(oldContent); // user hasn't modified
  const sourceHash = sha256(newContent);
  assert.equal(current, stored, "unchanged file matches stored");
  assert.notEqual(sourceHash, current, "source differs → update needed");
});

// ── source file integrity ─────────────────────────────────────────────────────

test("source files: all managed files exist in harness root", () => {
  for (const src of MANAGED_SOURCES) {
    const fullPath = path.join(HARNESS_ROOT, src);
    assert.ok(fs.existsSync(fullPath), `Missing: ${src}`);
  }
});

test("source files: all managed files are non-empty", () => {
  for (const src of MANAGED_SOURCES) {
    const content = fs.readFileSync(path.join(HARNESS_ROOT, src), "utf-8");
    assert.ok(content.trim().length > 0, `Empty: ${src}`);
  }
});

test("source files: each file has unique hash (no accidental duplicates)", () => {
  const hashes = MANAGED_SOURCES.map((src) =>
    sha256(fs.readFileSync(path.join(HARNESS_ROOT, src), "utf-8"))
  );
  assert.equal(new Set(hashes).size, hashes.length, "Duplicate hash detected");
});

// ── hash registry I/O ─────────────────────────────────────────────────────────

test("hash registry: writes and reads correctly", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-hash-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const hashes = {
    "_harness/a.md": sha256("content a"),
    "_harness/b.md": sha256("content b"),
  };
  writeHashes(tmpDir, hashes);
  assert.deepEqual(loadHashes(tmpDir), hashes);
});

test("hash registry: returns empty object when file missing", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-hash-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.deepEqual(loadHashes(tmpDir), {});
});

// ── Integration: update() ─────────────────────────────────────────────────────
// Note: @clack/prompts output goes to stdout — TAP parser ignores non-TAP lines.

test("update: restores a missing managed file", { concurrency: 1 }, async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-upd-"));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  t.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  fs.mkdirSync("_harness", { recursive: true });
  fs.writeFileSync("_harness/SKILL.md", "# skill");
  writeHashes(tmpDir, { "_harness/progress-protocol.md": "oldhash" });

  const { update } = await import("../../tools/cli/update.js");
  await update();

  assert.ok(
    fs.existsSync("_harness/progress-protocol.md"),
    "Missing file should be restored"
  );
  const content = fs.readFileSync("_harness/progress-protocol.md", "utf-8");
  assert.ok(content.length > 0, "Restored file should not be empty");
});

test("update: preserves user-customized file", { concurrency: 1 }, async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-upd2-"));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  t.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  fs.mkdirSync("_harness", { recursive: true });
  fs.writeFileSync("_harness/SKILL.md", "# skill");
  const userContent = "# I customized this file — do not overwrite";
  fs.writeFileSync("_harness/progress-protocol.md", userContent);
  writeHashes(tmpDir, {
    "_harness/progress-protocol.md": sha256("original harness content"),
  });

  const { update } = await import("../../tools/cli/update.js");
  await update();

  const after = fs.readFileSync("_harness/progress-protocol.md", "utf-8");
  assert.equal(after, userContent, "User customization must be preserved");
});
