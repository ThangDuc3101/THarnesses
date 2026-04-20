import * as p from "@clack/prompts";
import { createHash } from "crypto";
import { execSync } from "child_process";
import fs from "fs";

const HASH_FILE = "_harness/.harness-hashes.json";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function loadHashes() {
  if (!fs.existsSync(HASH_FILE)) return {};
  return JSON.parse(fs.readFileSync(HASH_FILE, "utf-8"));
}

function checkFile(filePath, storedHashes) {
  if (!fs.existsSync(filePath)) return "missing";
  const content = fs.readFileSync(filePath, "utf-8");
  const current = sha256(content);
  const stored = storedHashes[filePath];
  if (!stored) return "untracked";
  return current === stored ? "clean" : "modified";
}

function graphStatus() {
  const dbPath = ".graph/code.db";
  if (!fs.existsSync(dbPath)) return null;
  const stat = fs.statSync(dbPath);
  const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
  return { ageHours: Math.round(ageHours), size: Math.round(stat.size / 1024) };
}

function lastProgressSession() {
  if (!fs.existsSync("progress.md")) return null;
  const content = fs.readFileSync("progress.md", "utf-8");
  const matches = content.match(/## Session (\d+) — (.+)/g);
  if (!matches) return null;
  const last = matches[matches.length - 1];
  const m = last.match(/## Session (\d+) — (.+)/);
  return { number: m[1], timestamp: m[2] };
}

function gitStatus() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    const dirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    return { initialized: true, branch, dirty: dirty.length > 0 };
  } catch {
    return { initialized: false };
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const STATUS_ICON = {
  clean:     "✓",
  modified:  "~",
  missing:   "✗",
  untracked: "?",
};

export async function status() {
  p.intro("Harness Status");

  // Installation check
  if (!fs.existsSync("_harness/SKILL.md")) {
    p.log.error("Harness chưa được cài trong thư mục này.");
    p.log.info("Chạy: npx my-harness install");
    p.outro("");
    return;
  }

  const storedHashes = loadHashes();

  // ── Files ─────────────────────────────────────────────────────────────────
  console.log("\nHarness files:");
  const files = [
    "_harness/SKILL.md",
    "_harness/progress-protocol.md",
    "_harness/task-loop.md",
    "_harness/checkpoint.md",
    "_harness/resume.md",
    "_harness/quickfix.md",
    "_harness/graph/build.py",
    "_harness/graph/query.py",
  ];

  for (const f of files) {
    const s = checkFile(f, storedHashes);
    const icon = STATUS_ICON[s];
    const note = s === "modified" ? " (customized)" : s === "missing" ? " (missing!)" : "";
    console.log(`  ${icon}  ${f}${note}`);
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  console.log("\nProgress:");
  const prog = lastProgressSession();
  if (prog) {
    console.log(`  Session ${prog.number} — ${prog.timestamp}`);
  } else {
    console.log("  progress.md not found or empty");
  }

  // ── Code Graph ────────────────────────────────────────────────────────────
  console.log("\nCode Graph:");
  const graph = graphStatus();
  if (graph) {
    const fresh = graph.ageHours < 24 ? "fresh" : "stale — run build.py --incremental";
    console.log(`  ${graph.ageHours}h old · ${graph.size}KB · ${fresh}`);
  } else {
    console.log("  Not built. Run: python _harness/graph/build.py --root .");
  }

  // ── Git ───────────────────────────────────────────────────────────────────
  console.log("\nGit:");
  const git = gitStatus();
  if (git.initialized) {
    const dirtyNote = git.dirty ? " (uncommitted changes)" : "";
    console.log(`  branch: ${git.branch}${dirtyNote}`);
  } else {
    console.log("  Not a git repo — run `git init`");
  }

  p.outro("Run `harness update` to get latest harness files.");
}
