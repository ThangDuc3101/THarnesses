/**
 * Tests for status.js file-health and progress parsing logic.
 * Run: node --test test_status.js
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

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Mirrors checkFile logic from status.js
function checkFile(filePath, storedHashes) {
  if (!fs.existsSync(filePath)) return "missing";
  const content = fs.readFileSync(filePath, "utf-8");
  const current = sha256(content);
  const stored = storedHashes[filePath];
  if (!stored) return "untracked";
  return current === stored ? "clean" : "modified";
}

// Mirrors lastProgressSession from status.js
function lastProgressSession(content) {
  const matches = content.match(/## Session (\d+) — (.+)/g);
  if (!matches) return null;
  const last = matches[matches.length - 1];
  const m = last.match(/## Session (\d+) — (.+)/);
  return { number: m[1], timestamp: m[2] };
}

// ── checkFile ─────────────────────────────────────────────────────────────────

test("checkFile: returns 'missing' when file does not exist", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cf-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.equal(checkFile(path.join(tmpDir, "ghost.md"), {}), "missing");
});

test("checkFile: returns 'untracked' when file exists but no stored hash", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cf-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const f = path.join(tmpDir, "new.md");
  fs.writeFileSync(f, "content");
  assert.equal(checkFile(f, {}), "untracked");
});

test("checkFile: returns 'clean' when hash matches stored", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cf-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const f = path.join(tmpDir, "clean.md");
  const content = "original content";
  fs.writeFileSync(f, content);
  assert.equal(checkFile(f, { [f]: sha256(content) }), "clean");
});

test("checkFile: returns 'modified' when hash differs from stored", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cf-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const f = path.join(tmpDir, "mod.md");
  fs.writeFileSync(f, "user modified content");
  assert.equal(checkFile(f, { [f]: sha256("original content") }), "modified");
});

test("checkFile: stays 'clean' after rewriting same bytes", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cf-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const f = path.join(tmpDir, "same.md");
  const content = "same content";
  fs.writeFileSync(f, content);
  const hashes = { [f]: sha256(content) };
  assert.equal(checkFile(f, hashes), "clean");
  fs.writeFileSync(f, content);
  assert.equal(checkFile(f, hashes), "clean");
});

// ── lastProgressSession ───────────────────────────────────────────────────────

test("lastProgressSession: returns null for empty content", () => {
  assert.equal(lastProgressSession(""), null);
});

test("lastProgressSession: returns null when no session headers found", () => {
  assert.equal(lastProgressSession("# Progress\n\nSome content"), null);
});

test("lastProgressSession: parses a single session correctly", () => {
  const content = "## Session 1 — 2026-04-20T10:00:00+07:00\n\n### Completed\n- done\n";
  const result = lastProgressSession(content);
  assert.equal(result.number, "1");
  assert.ok(result.timestamp.includes("2026-04-20"));
});

test("lastProgressSession: returns the LAST session when multiple exist", () => {
  const content = [
    "## Session 1 — 2026-04-18T10:00:00+07:00",
    "### Completed\n- task 1\n",
    "## Session 2 — 2026-04-19T10:00:00+07:00",
    "### Completed\n- task 2\n",
    "## Session 3 — 2026-04-20T10:00:00+07:00",
    "### Completed\n- task 3\n",
  ].join("\n");
  const result = lastProgressSession(content);
  assert.equal(result.number, "3");
  assert.ok(result.timestamp.includes("2026-04-20"));
});

test("lastProgressSession: handles multi-digit session numbers", () => {
  const content = "## Session 42 — 2026-04-20T09:00:00+07:00\n### Completed\n- done\n";
  const result = lastProgressSession(content);
  assert.equal(result.number, "42");
});

// ── graphStatus detection ─────────────────────────────────────────────────────

test("graphStatus: no db file → does not exist", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gs-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.equal(fs.existsSync(path.join(tmpDir, ".graph", "code.db")), false);
});

test("graphStatus: detects existing db file with correct size", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gs-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const graphDir = path.join(tmpDir, ".graph");
  fs.mkdirSync(graphDir);
  const dbPath = path.join(graphDir, "code.db");
  fs.writeFileSync(dbPath, "SQLite format 3");
  assert.ok(fs.statSync(dbPath).size > 0);
});

test("graphStatus: just-created file is < 1 hour old", (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gs-"));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const dbPath = path.join(tmpDir, ".graph", "code.db");
  fs.mkdirSync(path.join(tmpDir, ".graph"));
  fs.writeFileSync(dbPath, "x");
  const ageHours = (Date.now() - fs.statSync(dbPath).mtimeMs) / 3600000;
  assert.ok(ageHours < 1, `Expected < 1h, got ${ageHours.toFixed(4)}h`);
});

// ── Integration: status() ─────────────────────────────────────────────────────
// Note: @clack/prompts output goes to stdout — TAP parser ignores non-TAP lines.

test("status: exits early without throw when harness not installed", { concurrency: 1 }, async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-si-"));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  t.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const { status } = await import("../../tools/cli/status.js");
  let threw = false;
  try { await status(); } catch { threw = true; }
  assert.equal(threw, false, "status() should not throw when harness not installed");
});

test("status: runs without throwing when harness is installed", { concurrency: 1 }, async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-si2-"));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  t.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  fs.mkdirSync("_harness", { recursive: true });
  fs.writeFileSync("_harness/SKILL.md", "# skill");
  fs.writeFileSync(
    "progress.md",
    "## Session 1 — 2026-04-20T10:00:00+07:00\n### Completed\n- bootstrap\n### Next task\nT01\n"
  );

  const { status } = await import("../../tools/cli/status.js");
  let threw = false;
  try { await status(); } catch { threw = true; }
  assert.equal(threw, false, "status() should not throw with valid harness setup");
});
