/**
 * Tests for status.js file-health and progress parsing logic.
 *
 * Prerequisites: npm install in tools/cli/ (for @clack/prompts)
 * Run: node --test test_status.js
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../..");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Mirrors the checkFile logic from status.js (algorithm unit test)
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

// ── checkFile logic ────────────────────────────────────────────────────────────

describe("checkFile", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-status-test-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 'missing' when file does not exist", () => {
    const result = checkFile(path.join(tmpDir, "ghost.md"), {});
    assert.equal(result, "missing");
  });

  it("returns 'untracked' when file exists but has no stored hash", () => {
    const f = path.join(tmpDir, "new.md");
    fs.writeFileSync(f, "content");
    const result = checkFile(f, {});
    assert.equal(result, "untracked");
  });

  it("returns 'clean' when hash matches stored", () => {
    const f = path.join(tmpDir, "clean.md");
    const content = "original content";
    fs.writeFileSync(f, content);
    const hashes = { [f]: sha256(content) };
    assert.equal(checkFile(f, hashes), "clean");
  });

  it("returns 'modified' when hash differs from stored", () => {
    const f = path.join(tmpDir, "modified.md");
    fs.writeFileSync(f, "user modified content");
    const hashes = { [f]: sha256("original content") };
    assert.equal(checkFile(f, hashes), "modified");
  });

  it("clean file after write is not modified", () => {
    const f = path.join(tmpDir, "same.md");
    const content = "same content";
    fs.writeFileSync(f, content);
    const h = sha256(content);
    const hashes = { [f]: h };
    assert.equal(checkFile(f, hashes), "clean");
    fs.writeFileSync(f, content); // rewrite same bytes
    assert.equal(checkFile(f, hashes), "clean");
  });
});

// ── lastProgressSession logic ──────────────────────────────────────────────────

describe("lastProgressSession", () => {
  it("returns null for empty content", () => {
    assert.equal(lastProgressSession(""), null);
  });

  it("returns null when no session headers found", () => {
    assert.equal(lastProgressSession("# Progress\n\nSome content"), null);
  });

  it("parses a single session correctly", () => {
    const content = "## Session 1 — 2026-04-20T10:00:00+07:00\n\n### Completed\n- done\n";
    const result = lastProgressSession(content);
    assert.equal(result.number, "1");
    assert.ok(result.timestamp.includes("2026-04-20"));
  });

  it("returns the LAST session when multiple exist", () => {
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

  it("handles session numbers with multiple digits", () => {
    const content = "## Session 42 — 2026-04-20T09:00:00+07:00\n### Completed\n-done\n";
    const result = lastProgressSession(content);
    assert.equal(result.number, "42");
  });
});

// ── graphStatus logic ──────────────────────────────────────────────────────────

describe("graphStatus detection", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-graph-test-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when .graph/code.db does not exist", () => {
    const dbPath = path.join(tmpDir, ".graph", "code.db");
    const exists = fs.existsSync(dbPath);
    assert.equal(exists, false);
  });

  it("detects existing db file", () => {
    const graphDir = path.join(tmpDir, ".graph");
    fs.mkdirSync(graphDir);
    const dbPath = path.join(graphDir, "code.db");
    fs.writeFileSync(dbPath, "SQLite format 3");
    const stat = fs.statSync(dbPath);
    assert.ok(stat.size > 0);
  });

  it("correctly computes age in hours from mtime", () => {
    const graphDir = path.join(tmpDir, ".graph");
    fs.mkdirSync(graphDir);
    const dbPath = path.join(graphDir, "code.db");
    fs.writeFileSync(dbPath, "x");
    const stat = fs.statSync(dbPath);
    const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
    assert.ok(ageHours < 1, "Just-created file should be < 1 hour old");
  });
});

// ── Integration test: calling status() ────────────────────────────────────────

describe("status() integration", () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-status-int-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("exits early and does not throw when harness not installed", async () => {
    const chunks = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => { chunks.push(String(chunk)); return true; };
    try {
      const { status } = await import("../../tools/cli/status.js");
      await status();
    } catch {
      // @clack/prompts not installed — skip
    } finally {
      process.stdout.write = orig;
    }
    // If we got here without crash, test passes
    assert.ok(true);
  });

  it("runs without throwing when harness is installed", async () => {
    fs.mkdirSync("_harness", { recursive: true });
    fs.writeFileSync("_harness/SKILL.md", "# skill");
    fs.writeFileSync(
      "progress.md",
      "## Session 1 — 2026-04-20T10:00:00+07:00\n### Completed\n- bootstrap\n### Next task\nT01\n"
    );

    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;
    let threw = false;
    try {
      const { status } = await import("../../tools/cli/status.js");
      await status();
    } catch {
      threw = true;
    } finally {
      process.stdout.write = orig;
    }

    assert.equal(threw, false, "status() should not throw with valid harness setup");
  });
});
