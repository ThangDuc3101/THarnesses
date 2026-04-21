# THarnesses — Personal Agent Harness for Claude Code

Một lớp infrastructure chạy trên **Claude Code**, biến LLM từ "model trả lời" thành "agent làm việc được" qua nhiều sessions mà không mất context.

---

## Vấn đề đang giải quyết

| Vấn đề | Giải pháp |
|---|---|
| Agent mất context khi tắt máy | 3-tier memory: Code Graph + SKILL.md + Progress.md |
| Reliability giảm dần (`0.95^20 = 36%`) | 4 checkpoint chiến lược |
| Over-engineering từ đầu | Triết lý "grow with the project" |
| Lặp lại lỗi cũ ở session sau | `Errors & Fixes` bắt buộc trong progress.md |

---

## Kiến trúc

```
LAYER 3 — TASK INTERFACE
  User mô tả task bằng ngôn ngữ tự nhiên

LAYER 2 — HARNESS CORE
  Initializer │ Task Loop │ Checkpoints │ Resume │ Quick Fix

LAYER 1 — MEMORY (3 tầng)
  Code Graph (structure) │ SKILL.md (behavior) │ Progress.md (state)

LAYER 0 — TOOLS
  git · bash · file system · MCP (thêm khi cần)

              ↕
        Claude Code (OS) + LLM (CPU)
```

---

## Cài đặt nhanh

```bash
# Cài vào project của bạn
npx my-harness install

# Cập nhật harness (giữ nguyên file đã customize)
npx my-harness update

# Kiểm tra trạng thái
npx my-harness status
```

> **Yêu cầu:** Node.js >= 18, Python >= 3.10 (cho code graph)

---

## Cấu trúc repo

```
THarnesses/
├── bootstrap/              Phase 1 — khởi động project mới
│   ├── SKILL.md            8-step bootstrap flow
│   ├── questions.md        Bộ câu hỏi chuẩn hỏi user
│   └── templates/
│       ├── skill-base.md   Template generic
│       ├── skill-web.md    Template web app
│       ├── skill-data.md   Template data/automation
│       └── skill-embedded.md  Template embedded/hardware
│
├── memory/                 Phase 2 — 3-tier memory system
│   ├── progress/
│   │   ├── SKILL.md        Protocol đọc/ghi progress.md
│   │   └── template.md     Format chuẩn của 1 session entry
│   ├── graph/
│   │   ├── build.py        Build SQLite code graph (Python)
│   │   ├── query.py        Query API: blast_radius, deps, search
│   │   └── SKILL.md        Hướng dẫn agent dùng graph
│   └── skills/
│       └── SKILL.md        Hướng dẫn maintain SKILL.md
│
├── core/                   Phase 3 — task loop + checkpoints
│   ├── task-loop/SKILL.md  Pick→Context→Execute→Validate→Commit
│   ├── checkpoint/SKILL.md 4 trigger conditions + question templates
│   ├── resume/SKILL.md     Đọc progress → tiếp tục đúng chỗ
│   └── quickfix/SKILL.md   Fast path cho task nhỏ
│
├── tools/                  Phase 4 — CLI + tooling
│   ├── cli/
│   │   ├── index.js        Entry point (`harness` command)
│   │   ├── install.js      Bootstrap wizard (@clack/prompts)
│   │   ├── update.js       Hash-based smart update
│   │   ├── status.js       Installation health check
│   │   └── package.json
│   ├── mcp-setup/SKILL.md  MCP server recommendations by stack
│   └── situation-detect/SKILL.md  Auto-detect 4 tình huống
│
└── test/
    ├── python/             55 pytest tests (build.py + query.py)
    └── node/               28 node:test tests (update.js + status.js)
```

---

## 4 Tình huống sử dụng

Harness tự nhận biết đang ở tình huống nào — user không cần chỉ định.

```
Tình huống 4 — Bootstrap     project mới, chưa có gì
Tình huống 1 — New Task      có memory, task mới hoàn toàn
Tình huống 2 — Resume        tiếp tục session dở dang
Tình huống 3 — Quick Fix     scope nhỏ, skip ceremony
```

---

## Code Graph

Build graph để agent query thay vì đọc file mù:

```bash
# Build lần đầu
python memory/graph/build.py --root /path/to/project

# Incremental update sau khi có thay đổi
python memory/graph/build.py --root . --incremental

# Query
python memory/graph/query.py blast_radius src/auth/login.py
python memory/graph/query.py deps src/api/routes.py
python memory/graph/query.py search UserService
python memory/graph/query.py summary
```

Hỗ trợ: Python, JavaScript, TypeScript, Go. Lưu vào `.graph/code.db` (SQLite).

---

## 4 Checkpoint chiến lược

```
C1  Sau Bootstrap/Planning     → "Plan đúng hướng chưa?"
C2  Fail >= 2 lần liên tiếp    → "Bị kẹt, làm gì tiếp?"
C3  Mỗi 5 tasks hoàn thành     → "Tiến độ OK, tiếp tục không?"
C4  Trước destructive action   → "Xác nhận trước khi không thể undo"
```

---

## Progress.md format

File được agent tự động cập nhật cuối mỗi session:

```markdown
## Session N — 2026-04-21T10:00:00+07:00

### Completed
- [task đã xong]

### Errors & Fixes
- **[Tên lỗi]**
  - Nguyên nhân: ...
  - Fix: ...

### Context discovered
- [thông tin không hiển nhiên về codebase/domain]

### Next task
[Mô tả cụ thể — đủ để agent session sau bắt đầu ngay]
```

---

## Chạy tests

```bash
# Python
cd test/python
pip install pytest
pytest -v

# Node.js
cd tools/cli && npm install
cd ../../test/node
node --test test_update.js test_status.js
```

**Kết quả hiện tại:** 55 Python + 28 Node.js = **83 tests, tất cả pass.**

---

## Triết lý thiết kế

> **"Grow with the project — không over-engineer từ đầu."**

- **SKILL.md** viết từ yêu cầu thực tế của project, thay đổi khi project thay đổi
- **MCP** chỉ cài core (filesystem + git), thêm khi task thực sự cần
- **Code Graph** bắt đầu trống, tích lũy dần theo code thực tế
- **Harness nhân năng lực, không tạo ra năng lực từ đầu**

---

## Definition of Done

- [x] `npx my-harness install` → project setup trong < 5 phút
- [x] Agent tự resume đúng chỗ sau khi tắt máy
- [x] Cùng một lỗi không lặp lại ở session sau
- [x] Không có destructive action nào không có confirm
- [ ] User chỉ can thiệp 3-5 lần cho 1 feature hoàn chỉnh *(in progress)*

---

## License

MIT
