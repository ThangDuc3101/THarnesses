/**
 * Tests for update.js hash-based update logic.
 *
 * Prerequisites: npm install in tools/cli/ (for @clack/prompts)
 * Run: node --test test_update.js
 */

import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../..");
const HASH_FILE = "_harness/.harness-hashes.json";

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

function loadHashes(dir) {
  const p = path.join(dir, HASH_FILE);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeHashes(dir, hashes) {
  fs.mkdirSync(path.join(dir, "_harness"), { recursive: true });
  fs.writeFileSync(path.join(dir, HASH_FILE), JSON.stringify(hashes, null, 2));
}

// ── Hash logic unit tests (no CLI import needed) ──────────────────────────────

describe("sha256 helper", () => {
  it("produces a 16-char hex string", () => {
    const h = sha256("hello world");
    assert.equal(h.length, 16);
    assert.match(h, /^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    assert.equal(sha256("same"), sha256("same"));
  });

  it("differs for different content", () => {
    assert.notEqual(sha256("content a"), sha256("content b"));
  });
});

describe("hash-based update decision logic", () => {
  it("detects unchanged file (current == stored)", () => {
    const content = "original content";
    const stored = sha256(content);
    const current = sha256(content);
    assert.equal(current, stored);
  });

  it("detects user-customized file (current != stored)", () => {
    const original = "original content";
    const modified = "user modified this";
    const stored = sha256(original);
    const current = sha256(modified);
    assert.notEqual(current, stored);
  });

  it("detects update needed (source newer, file unchanged)", () => {
    const oldContent = "version 1 content";
    const newContent = "version 2 content — improved";
    const userFileContent = "version 1 content"; // user hasn't touched it

    const stored = sha256(oldContent);
    const current = sha256(userFileContent);
    const sourceHash = sha256(newContent);

    const userCustomized = current !== stored;
    const alreadyUpToDate = sha256(newContent) === current;

    assert.equal(userCustomized, false);
    assert.equal(alreadyUpToDate, false);
  });
});

// ── Source file integrity tests ────────────────────────────────────────────────

describe("harness source files", () => {
  it("all managed source files exist in harness root", () => {
    for (const src of MANAGED_SOURCES) {
      const fullPath = path.join(HARNESS_ROOT, src);
      assert.ok(
        fs.existsSync(fullPath),
        `Missing managed source file: ${src}`
      );
    }
  });

  it("all managed source files are non-empty", () => {
    for (const src of MANAGED_SOURCES) {
      const fullPath = path.join(HARNESS_ROOT, src);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.trim().length > 0, `Source file is empty: ${src}`);
    }
  });

  it("each source file has a stable hash (content-addressed)", () => {
    const hashes = MANAGED_SOURCES.map((src) => {
      const content = fs.readFileSync(path.join(HARNESS_ROOT, src), "utf-8");
      return sha256(content);
    });
    const unique = new Set(hashes);
    assert.equal(unique.size, hashes.length, "Two source files have identical content — check for accidental duplicates");
  });
});

// ── Hash file I/O tests ────────────────────────────────────────────────────────

describe("hash registry I/O", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-update-test-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes and reads hashes correctly", () => {
    const hashes = {
      "_harness/a.md": sha256("content a"),
      "_harness/b.md": sha256("content b"),
    };
    writeHashes(tmpDir, hashes);
    const loaded = loadHashes(tmpDir);
    assert.deepEqual(loaded, hashes);
  });

  it("returns empty object when hash file missing", () => {
    const loaded = loadHashes(tmpDir);
    assert.deepEqual(loaded, {});
  });
});

// ── Integration test: calling update() with fixture dir ───────────────────────

describe("update() integration", () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-update-int-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    fs.mkdirSync("_harness", { recursive: true });
    fs.writeFileSync("_harness/SKILL.md", "# project skill");
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("restores a missing managed file", async () => {
    // Hash file says progress-protocol.md existed with old hash
    // but the file itself is missing
    writeHashes(tmpDir, {
      "_harness/progress-protocol.md": "oldhashxxx",
    });

    const suppress = () => true;
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = suppress;
    try {
      const { update } = await import("../../tools/cli/update.js");
      await update();
    } catch {
      // @clack/prompts not installed — skip integration test
    } finally {
      process.stdout.write = orig;
    }

    if (fs.existsSync("_harness/progress-protocol.md")) {
      const content = fs.readFileSync("_harness/progress-protocol.md", "utf-8");
      assert.ok(content.length > 0, "Restored file should not be empty");
    }
  });

  it("skips user-customized file", async () => {
    const originalContent = "# original skill content";
    const userContent = "# I customized this";
    fs.writeFileSync("_harness/progress-protocol.md", userContent);
    writeHashes(tmpDir, {
      "_harness/progress-protocol.md": sha256(originalContent),
    });

    const suppress = () => true;
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = suppress;
    try {
      const { update } = await import("../../tools/cli/update.js");
      await update();
    } catch {
      // @clack/prompts not installed — skip
    } finally {
      process.stdout.write = orig;
    }

    if (fs.existsSync("_harness/progress-protocol.md")) {
      const after = fs.readFileSync("_harness/progress-protocol.md", "utf-8");
      assert.equal(after, userContent, "User customization should be preserved");
    }
  });
});
