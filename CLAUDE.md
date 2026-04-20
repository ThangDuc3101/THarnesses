# My Personal Harness

Đây là personal harness chạy trên Claude Code — một lớp cơ sở hạ tầng bao quanh LLM,
biến "model trả lời" thành "agent làm việc được" trên các project thực tế.

---

## Harness này là gì?

Một bộ SKILL.md + scripts + tools được thiết kế để:
- Handle long-running tasks đáng tin cậy qua nhiều sessions
- Không mất context khi tắt máy hay bắt đầu lại
- Hỏi đúng lúc, không làm gì destructive mà không có confirm
- Grow with the project — không over-engineer từ đầu

Chạy trên Claude Code. Không thay thế Claude Code — mở rộng nó.

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
  git · bash · file system · MCP (thêm khi cần, không cài trước)

              ↕
        Claude Code (OS) + LLM (CPU)
```

---

## 3 Triết lý cốt lõi

### 1. Code Graph là xương sống

Mọi agent action đều bắt đầu bằng query graph — không đọc file mù.
Graph cho biết chính xác file nào liên quan, module nào bị ảnh hưởng.
Giải quyết bài toán context degradation: agent chỉ load những gì thực sự cần.

```
Sai:  đọc toàn bộ codebase → chọn file liên quan
Đúng: query graph → chỉ load đúng files trong kết quả
```

### 2. Memory 3 tầng — mỗi tầng cập nhật theo nhịp riêng

```
Structural  Code Graph    incremental theo git diff
Behavioral  SKILL.md      manual khi conventions thay đổi
State       Progress.md   cuối mỗi session, tự động
```

Không có memory → mỗi session như bắt đầu lại từ đầu.
Memory tốt → agent không hỏi lại những gì đã biết, không lặp lỗi cũ.

### 3. Reliability by design — checkpoint chiến lược

```
0.95^20 = 36%   ← độ tin cậy hệ thống sau 20 bước nếu không có checkpoint
```

Checkpoint không phải sau mọi bước — mà tại 4 điểm chiến lược:

```
C1  Sau Initializer        "Plan đúng hướng chưa?"
C2  Fail >= 2 lần          "Agent bị kẹt, làm gì tiếp?"
C3  Mỗi 5 tasks            "Tiến độ OK, tiếp tục không?"
C4  Trước destructive op   "Xác nhận trước khi không thể undo"
```

---

## 4 Tình huống sử dụng

```
Tình huống 4 — Bootstrap     project mới, chưa có gì
Tình huống 1 — New task      có memory, task mới hoàn toàn
Tình huống 2 — Resume        tiếp tục session dở dang
Tình huống 3 — Quick fix     scope nhỏ, skip ceremony
```

Harness tự nhận biết đang ở tình huống nào. User không cần chỉ định.

---

## Triết lý "Grow with the project"

```
SKILL.md     viết từ yêu cầu của user khi bootstrap
             thay đổi khi project thay đổi

MCP          chỉ cài core: file system, git, bash
             thêm khi task thực sự cần, không cài trước

Tools        bổ sung trong quá trình làm
             pip install, npm add... khi cần

Code Graph   bắt đầu trống
             tích lũy dần theo code thực tế
```

Không setup đầy đủ rồi mới bắt đầu — bắt đầu ngay, bổ sung khi cần.

---

## Harness hỏi, User là domain expert

Harness không tự biết domain của bạn. Khi bootstrap project mới:

```
Harness hỏi đúng câu hỏi      (stack? data source? output?)
User cung cấp domain knowledge (thứ harness không thể tự có)
Harness structure hóa thành    SKILL.md + architecture + task list
User confirm                   rồi harness bắt đầu làm
```

> "Harness nhân năng lực, không tạo ra năng lực từ đầu."

---

## Cấu trúc repo

```
my_harnesses/
├── CLAUDE.md              file này
├── bootstrap/             Phase 1 — khởi động project mới
├── memory/                Phase 2 — 3-tier memory system
│   ├── progress/          progress.md protocol
│   ├── graph/             code graph builder + query API
│   └── skills/            hướng dẫn maintain SKILL.md
├── core/                  Phase 3 — task loop + checkpoints
│   ├── task-loop/
│   ├── checkpoint/
│   ├── resume/
│   └── quickfix/
└── tools/                 Phase 4 — CLI + MCP management
    ├── cli/               npx harness install/update/status
    ├── mcp-setup/
    └── situation-detect/
```

---

## Quan hệ với cc-skills

cc-skills là domain-specific layer chạy trên harness này:

```
my_harnesses (generic core)
  └── cc-skills (PX4 domain layer)
        ├── px4-dev, px4-sitl, px4-codebase-map
        └── px4-workflow → migrate vào core/ của harness này
```

Khi hoàn chỉnh: `npx harness install` setup core, `cc-setup` thêm domain layer.

---

## Definition of Done

Harness hoàn chỉnh khi:

1. `npx harness install` → project setup trong < 5 phút
2. Agent tự resume đúng chỗ sau khi tắt máy
3. Cùng một lỗi không lặp lại ở session sau
4. Không có action destructive nào xảy ra mà không có user confirm
5. User chỉ cần can thiệp 3-5 lần cho 1 feature hoàn chỉnh
