import * as p from "@clack/prompts";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../..");
const HASH_FILE = "_harness/.harness-hashes.json";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function loadHashes() {
  if (!fs.existsSync(HASH_FILE)) return {};
  return JSON.parse(fs.readFileSync(HASH_FILE, "utf-8"));
}

function saveHashes(hashes) {
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

// Files harness manages — maps source (in harness repo) → dest (in user project)
// SKILL.md is excluded: user owns it after install
const MANAGED_FILES = [
  ["memory/progress/SKILL.md",   "_harness/progress-protocol.md"],
  ["core/task-loop/SKILL.md",    "_harness/task-loop.md"],
  ["core/checkpoint/SKILL.md",   "_harness/checkpoint.md"],
  ["core/resume/SKILL.md",       "_harness/resume.md"],
  ["core/quickfix/SKILL.md",     "_harness/quickfix.md"],
  ["memory/graph/build.py",      "_harness/graph/build.py"],
  ["memory/graph/query.py",      "_harness/graph/query.py"],
];

export async function update() {
  p.intro("Harness Update");

  if (!fs.existsSync("_harness/SKILL.md")) {
    p.log.error("Harness chưa được cài. Chạy `harness install` trước.");
    process.exit(1);
  }

  const storedHashes = loadHashes();
  const newHashes = { ...storedHashes };

  let updated = 0;
  let skipped = 0;
  const skippedFiles = [];

  for (const [src, dest] of MANAGED_FILES) {
    const srcPath = path.join(HARNESS_ROOT, src);
    if (!fs.existsSync(srcPath)) continue;

    const newContent = fs.readFileSync(srcPath, "utf-8");
    const newHash = sha256(newContent);

    if (!fs.existsSync(dest)) {
      // File missing in project — restore it
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, newContent);
      newHashes[dest] = newHash;
      p.log.success(`Restored: ${dest}`);
      updated++;
      continue;
    }

    const currentContent = fs.readFileSync(dest, "utf-8");
    const currentHash = sha256(currentContent);
    const storedHash = storedHashes[dest];

    if (currentHash !== storedHash) {
      // User has customized this file — skip
      skipped++;
      skippedFiles.push(dest);
      continue;
    }

    if (newHash === currentHash) {
      // Already up to date
      newHashes[dest] = newHash;
      continue;
    }

    // Safe to update
    fs.writeFileSync(dest, newContent);
    newHashes[dest] = newHash;
    p.log.success(`Updated: ${dest}`);
    updated++;
  }

  saveHashes(newHashes);

  if (skippedFiles.length > 0) {
    p.log.warn(`Skipped (customized by you):`);
    skippedFiles.forEach((f) => console.log(`  ${f}`));
    console.log("  → Merge thủ công nếu muốn nhận update cho các file này.");
  }

  if (updated === 0 && skipped === 0) {
    p.log.info("Tất cả files đã up to date.");
  } else {
    p.log.info(`${updated} updated · ${skipped} skipped (customized)`);
  }

  p.outro("Update hoàn tất.");
}
