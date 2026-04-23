import * as p from "@clack/prompts";
import { execSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../..");
const HASH_FILE = "_harness/.harness-hashes.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function copyWithHash(src, dest, hashes) {
  const content = fs.readFileSync(src, "utf-8");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  hashes[dest] = sha256(content);
}

function saveHashes(hashes) {
  fs.mkdirSync("_harness", { recursive: true });
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

function ensureGitignore(entries) {
  const gitignorePath = ".gitignore";
  let content = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";
  const missing = entries.filter((e) => !content.includes(e));
  if (missing.length > 0) {
    content += (content.endsWith("\n") ? "" : "\n") + missing.join("\n") + "\n";
    fs.writeFileSync(gitignorePath, content);
  }
}

function gitInit() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
  } catch {
    execSync("git init", { stdio: "inherit" });
  }
}

function gitCommit(message) {
  try {
    execSync("git add -A", { stdio: "ignore" });
    execSync(`git commit -m "${message}"`, { stdio: "ignore" });
  } catch {
    // not fatal — user can commit manually
  }
}

// ── Template selection ────────────────────────────────────────────────────────

const TEMPLATE_MAP = {
  web: "skill-web.md",
  data: "skill-data.md",
  embedded: "skill-embedded.md",
  other: "skill-base.md",
};

function selectTemplate(projectType) {
  return TEMPLATE_MAP[projectType] ?? "skill-base.md";
}

function fillTemplate(templatePath, vars) {
  let content = fs.readFileSync(templatePath, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value || "—");
  }
  return content;
}

// ── Progress.md creation ──────────────────────────────────────────────────────

function createProgress(projectName) {
  const now = new Date().toISOString();
  return `# Progress — ${projectName}

<!-- File này được agent tự động cập nhật cuối mỗi session. Không xóa entries cũ. -->

---

## Session 1 — ${now}

### Completed
- Bootstrap: harness installed, SKILL.md generated

### Errors & Fixes
- (không có)

### Context discovered
- (chưa có)

### Next task
Bắt đầu implement: xem task list trong _harness/tasks.md
`;
}

// ── Main install flow ─────────────────────────────────────────────────────────

export async function install() {
  p.intro("Harness Install");

  // Guard: already installed?
  if (fs.existsSync("_harness/SKILL.md")) {
    p.log.warn("Harness đã được cài. Dùng `harness update` để cập nhật.");
    p.outro("Không có thay đổi.");
    return;
  }

  p.log.info("Trả lời vài câu hỏi để setup harness (~3 phút)\n");

  // ── Nhóm 1: Identity ──────────────────────────────────────────────────────
  const projectName = await p.text({
    message: "Tên project?",
    placeholder: "my-project",
    validate: (v) => (v.trim() ? undefined : "Không được để trống"),
  });
  if (p.isCancel(projectName)) { p.cancel("Hủy."); process.exit(0); }

  const projectDesc = await p.text({
    message: "Mô tả ngắn (1-2 câu)?",
    placeholder: "Tool làm gì...",
  });
  if (p.isCancel(projectDesc)) { p.cancel("Hủy."); process.exit(0); }

  const projectType = await p.select({
    message: "Project type?",
    options: [
      { value: "web",      label: "Web app (frontend / backend / fullstack)" },
      { value: "data",     label: "Data / automation / ML / ETL" },
      { value: "embedded", label: "Embedded / firmware / hardware" },
      { value: "other",    label: "Khác / CLI tool / script" },
    ],
  });
  if (p.isCancel(projectType)) { p.cancel("Hủy."); process.exit(0); }

  // ── Nhóm 2: Stack ─────────────────────────────────────────────────────────
  const stack = await p.text({
    message: "Ngôn ngữ + framework chính?",
    placeholder: "Python + FastAPI  |  TypeScript + React  |  C++ + ROS2",
    validate: (v) => (v.trim() ? undefined : "Không được để trống"),
  });
  if (p.isCancel(stack)) { p.cancel("Hủy."); process.exit(0); }

  const environment = await p.text({
    message: "Môi trường chạy?",
    placeholder: "Linux server  |  Windows desktop  |  Raspberry Pi  |  browser",
  });
  if (p.isCancel(environment)) { p.cancel("Hủy."); process.exit(0); }

  // ── Nhóm 3: Data & I/O ───────────────────────────────────────────────────
  const dataSources = await p.text({
    message: "Nguồn dữ liệu đầu vào?",
    placeholder: "REST API  |  PostgreSQL  |  file CSV  |  serial port",
  });
  if (p.isCancel(dataSources)) { p.cancel("Hủy."); process.exit(0); }

  const output = await p.text({
    message: "Output / deliverable cuối cùng?",
    placeholder: "web dashboard  |  trained model  |  PDF report  |  binary firmware",
  });
  if (p.isCancel(output)) { p.cancel("Hủy."); process.exit(0); }

  // ── Nhóm 4: Constraints ───────────────────────────────────────────────────
  const constraints = await p.text({
    message: "Constraint quan trọng? (Enter để bỏ qua)",
    placeholder: "phải chạy offline  |  latency < 100ms  |  MIT license only",
  });
  if (p.isCancel(constraints)) { p.cancel("Hủy."); process.exit(0); }

  const testApproach = await p.select({
    message: "Test approach?",
    options: [
      { value: "unit",        label: "Unit test bắt buộc" },
      { value: "integration", label: "Integration test thôi" },
      { value: "none",        label: "Không test (prototype)" },
    ],
  });
  if (p.isCancel(testApproach)) { p.cancel("Hủy."); process.exit(0); }

  // ── Nhóm 5: MVP ───────────────────────────────────────────────────────────
  const mvp = await p.text({
    message: "MVP là gì? (tính năng tối thiểu để gọi là 'chạy được')",
    placeholder: "User có thể login và xem dashboard",
    validate: (v) => (v.trim() ? undefined : "Không được để trống"),
  });
  if (p.isCancel(mvp)) { p.cancel("Hủy."); process.exit(0); }

  // ── Confirm ───────────────────────────────────────────────────────────────
  p.log.step("\nTóm tắt plan:");
  console.log(`  Project: ${String(projectName)} (${projectType})`);
  console.log(`  Stack:   ${String(stack)}`);
  console.log(`  MVP:     ${String(mvp)}`);

  const confirmed = await p.confirm({
    message: "Plan đúng hướng? Tiến hành setup không?",
    initialValue: true,
  });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Hủy. Chạy lại `harness install` khi sẵn sàng.");
    process.exit(0);
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  const spinner = p.spinner();
  spinner.start("Đang setup...");

  const hashes = {};
  const templateFile = selectTemplate(String(projectType));
  const templatePath = path.join(HARNESS_ROOT, "bootstrap/templates", templateFile);

  const vars = {
    PROJECT_NAME: String(projectName),
    PROJECT_DESCRIPTION: String(projectDesc),
    STACK: String(stack),
    ENVIRONMENT: String(environment),
    BUILD_TOOL: "—",
    DATA_SOURCES: String(dataSources),
    OUTPUT: String(output),
    CONSTRAINTS: String(constraints) || "Không có constraint đặc biệt",
    CONVENTIONS: "PEP8 / Google style / theo chuẩn của stack",
    TEST_APPROACH: String(testApproach),
    FRONTEND_STACK: String(stack),
    BACKEND_STACK: "—",
    DATABASE: "—",
    FRAMEWORK: String(stack),
    HARDWARE: String(environment),
    PROTOCOL: "—",
    DATA_VOLUME: "—",
  };

  // _harness/SKILL.md từ template
  const skillContent = fillTemplate(templatePath, vars);
  fs.mkdirSync("_harness", { recursive: true });
  fs.writeFileSync("_harness/SKILL.md", skillContent);
  hashes["_harness/SKILL.md"] = sha256(skillContent);

  // Core SKILL files
  const coreToCopy = [
    ["memory/progress/SKILL.md",    "_harness/progress-protocol.md"],
    ["core/task-loop/SKILL.md",      "_harness/task-loop.md"],
    ["core/checkpoint/SKILL.md",     "_harness/checkpoint.md"],
    ["core/resume/SKILL.md",         "_harness/resume.md"],
    ["core/quickfix/SKILL.md",       "_harness/quickfix.md"],
    ["core/caveman/SKILL.md",        "_harness/caveman.md"],
  ];
  for (const [src, dest] of coreToCopy) {
    copyWithHash(path.join(HARNESS_ROOT, src), dest, hashes);
  }

  // Code graph scripts
  fs.mkdirSync("_harness/graph", { recursive: true });
  copyWithHash(path.join(HARNESS_ROOT, "memory/graph/build.py"),  "_harness/graph/build.py",  hashes);
  copyWithHash(path.join(HARNESS_ROOT, "memory/graph/query.py"),  "_harness/graph/query.py",  hashes);

  // progress.md
  const progressContent = createProgress(String(projectName));
  fs.writeFileSync("progress.md", progressContent);
  hashes["progress.md"] = sha256(progressContent);

  // CLAUDE.md — entry point cho Claude Code, import toàn bộ harness
  const claudeMdContent = `# ${String(projectName)}

${String(projectDesc)}

---

<!-- Harness core — Claude Code tự đọc khi mở project -->
@_harness/SKILL.md
@_harness/caveman.md
@_harness/task-loop.md
@_harness/checkpoint.md
@_harness/resume.md
@_harness/quickfix.md
@_harness/progress-protocol.md
`;
  fs.writeFileSync("CLAUDE.md", claudeMdContent);
  hashes["CLAUDE.md"] = sha256(claudeMdContent);

  // Hash registry
  saveHashes(hashes);

  // .gitignore
  ensureGitignore([".graph/", "_harness/.harness-hashes.json"]);

  // Git
  gitInit();

  spinner.stop("Setup hoàn tất!");

  // ── Summary ───────────────────────────────────────────────────────────────
  p.log.success("Harness đã sẵn sàng:");
  console.log("  CLAUDE.md                  entry point — Claude Code tự đọc");
  console.log("  _harness/SKILL.md          project conventions");
  console.log("  _harness/task-loop.md      how agent works");
  console.log("  _harness/checkpoint.md     when agent stops to ask");
  console.log("  _harness/caveman.md        terse Vietnamese responses");
  console.log("  _harness/graph/            code graph scripts");
  console.log("  progress.md                session memory");

  p.log.info("Bước tiếp theo:");
  console.log("  1. Mở Claude Code trong thư mục này");
  console.log("  2. Agent sẽ tự đọc _harness/ và bắt đầu");
  console.log(`  3. Nói với agent: \"Implement MVP: ${String(mvp)}\"`);
  console.log("  4. Sau khi có code: python _harness/graph/build.py --root .");

  gitCommit(`chore: harness install for ${String(projectName)}`);
  p.outro("Done. Happy coding!");
}
