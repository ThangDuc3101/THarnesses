# SKILL: Bootstrap Wizard

## Trigger
Chạy khi phát hiện project mới — không có `progress.md` và không có `_harness/SKILL.md`
trong thư mục hiện tại. Cũng chạy khi user nói "bootstrap project mới" hoặc "setup harness".

---

## Flow tổng thể

```
Bước 1  Phát hiện tình huống
Bước 2  Hỏi user (từ questions.md) — hỏi từng câu, không dump hết
Bước 3  Chọn template phù hợp
Bước 4  Generate SKILL.md cho project
Bước 5  Propose kiến trúc + task list
Bước 6  Checkpoint C1 — user confirm
Bước 7  Tạo progress.md + cấu trúc thư mục
Bước 8  Chuyển sang Tình huống 1 (new task với memory)
```

---

## Bước 1 — Phát hiện tình huống Bootstrap

Kiểm tra theo thứ tự:

```
Có progress.md?          → KHÔNG phải bootstrap → đọc progress, dùng Resume flow
Có _harness/SKILL.md?    → KHÔNG phải bootstrap → đọc SKILL.md, hỏi task mới
Không có gì?             → Bootstrap → tiếp tục flow này
```

Nếu bootstrap, nói ngắn gọn với user:
> "Project chưa có harness. Tôi sẽ hỏi vài câu để setup — mất khoảng 3-5 phút."

---

## Bước 2 — Hỏi user

Hỏi lần lượt từng nhóm câu hỏi trong `questions.md`. KHÔNG hỏi hết một lúc.
Lắng nghe câu trả lời, đặt câu hỏi follow-up nếu cần làm rõ.

Ghi lại câu trả lời để dùng ở Bước 3-5.

---

## Bước 3 — Chọn template

Dựa vào câu trả lời về project type:

```
web / frontend / backend / API / fullstack  →  templates/skill-web.md
data / ML / automation / script / ETL       →  templates/skill-data.md
embedded / firmware / hardware / drone      →  templates/skill-embedded.md
không rõ / khác                            →  templates/skill-base.md
```

---

## Bước 4 — Generate SKILL.md cho project

Đọc template đã chọn. Điền vào các placeholder dựa trên câu trả lời của user:

```
{{PROJECT_NAME}}     tên project
{{STACK}}            ngôn ngữ + framework chính
{{DATA_SOURCES}}     nguồn dữ liệu / API / DB
{{OUTPUT}}           deliverable cuối cùng
{{CONSTRAINTS}}      giới hạn quan trọng (OS, license, perf...)
{{CONVENTIONS}}      coding style, naming, test approach
```

Tạo file `_harness/SKILL.md` trong project. Nếu chưa có thư mục `_harness/`, tạo luôn.

---

## Bước 5 — Propose kiến trúc + task list

Dựa trên thông tin đã thu thập, đề xuất:

**Kiến trúc:**
- Cấu trúc thư mục gợi ý
- Các module/layer chính
- Luồng dữ liệu / control flow

**Task list (ưu tiên cao → thấp):**
```
T01  [HIGH]   Setup project structure + dependencies
T02  [HIGH]   [Core feature 1]
T03  [HIGH]   [Core feature 2]
...
TXX  [LOW]    [Nice-to-have]
```

Trình bày rõ ràng, hỏi user có muốn điều chỉnh không trước khi confirm.

---

## Bước 6 — Checkpoint C1

Đây là Checkpoint bắt buộc. KHÔNG bỏ qua.

Hỏi user:
> "Plan trên đúng hướng chưa? Có gì cần điều chỉnh trước khi bắt đầu không?"

Chờ user confirm hoặc chỉnh sửa. Áp dụng chỉnh sửa rồi hỏi lại nếu thay đổi lớn.

---

## Bước 7 — Tạo cấu trúc ban đầu

Sau khi user confirm:

```
1. Tạo _harness/SKILL.md          (đã generate ở Bước 4)
2. Tạo progress.md                 (dùng template từ memory/progress/template.md)
   - Điền Session 1, timestamp hiện tại
   - Completed: "Bootstrap — project setup"
   - Next task: task đầu tiên trong task list
3. Tạo thư mục theo kiến trúc đề xuất (nếu user đồng ý)
4. Tạo .gitignore nếu chưa có
5. git init + initial commit nếu chưa có git
```

---

## Bước 8 — Chuyển sang Tình huống 1

Thông báo ngắn:
> "Setup xong. Bắt đầu với [T01 - tên task đầu tiên] nhé?"

Từ đây hoạt động theo Task Loop (xem `core/task-loop/SKILL.md`).

---

## Anti-patterns — KHÔNG làm

```
✗  Hỏi tất cả câu hỏi một lúc — overwhelming
✗  Bỏ qua Checkpoint C1 — user chưa confirm plan
✗  Generate SKILL.md quá generic — phải điền đủ placeholder
✗  Tạo cấu trúc thư mục phức tạp ngay từ đầu — grow with the project
✗  Bắt đầu code trước khi progress.md tồn tại
```
