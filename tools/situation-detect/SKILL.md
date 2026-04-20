# SKILL: Situation Detection

## Trigger
Chạy tự động khi bắt đầu bất kỳ session nào.
Mục tiêu: xác định đang ở tình huống nào, chọn đúng flow.

---

## 4 Tình huống

```
Tình huống 4 — Bootstrap     project mới, chưa có harness
Tình huống 1 — New Task      có harness, task mới hoàn toàn
Tình huống 2 — Resume        có harness, tiếp tục session dở
Tình huống 3 — Quick Fix     có harness, thay đổi nhỏ, rõ ràng
```

---

## Detection flow

### Bước 1 — Kiểm tra harness

```
Không có _harness/SKILL.md VÀ không có progress.md
  → Tình huống 4 (Bootstrap)
  → Chạy bootstrap/SKILL.md

Có _harness/SKILL.md hoặc progress.md
  → Tiếp tục Bước 2
```

### Bước 2 — Phân tích progress.md

```
Đọc session cuối cùng trong progress.md:

  "Next task" rõ ràng VÀ session < 24h trước
    → Tình huống 2 (Resume)
    → Chạy core/resume/SKILL.md

  "Next task" rõ ràng VÀ session > 24h trước
    → Hỏi user: "Tiếp tục [Next task] hay có task mới?"
    → User confirm tiếp tục → Tình huống 2
    → User có task mới    → Tình huống 1

  progress.md rỗng / không có "Next task"
    → Tình huống 1 (New Task)
```

### Bước 3 — Đọc user message (nếu user đã nói gì)

```
User mô tả task:
  Thay đổi nhỏ, <= 3 file, rõ ràng, không destructive
    → Tình huống 3 (Quick Fix)
    → Chạy core/quickfix/SKILL.md

  Feature mới, task phức tạp, chưa có trong task list
    → Tình huống 1 (New Task)
    → Chạy core/task-loop/SKILL.md sau khi plan

  Chưa rõ
    → Hỏi: "Bạn muốn làm gì hôm nay?"
    → Phân loại lại sau khi nghe câu trả lời
```

---

## Dấu hiệu nhận biết nhanh

| Dấu hiệu | Tình huống |
|---|---|
| Không có gì trong thư mục | 4 — Bootstrap |
| "tiếp tục", "resume", "hôm qua làm dở" | 2 — Resume |
| "fix nhanh", "đổi tên", "thêm field" | 3 — Quick Fix |
| "thêm tính năng", "implement", "build" | 1 — New Task |

---

## Sau khi detect

Thông báo ngắn cho user biết agent đang ở tình huống nào:

```
→ Bootstrap: "Project chưa có harness. Bắt đầu setup nhé?"
→ Resume:    "Phiên [N] còn dở: [Next task]. Tiếp tục không?"
→ Quick Fix: "Quick fix mode — sẽ skip ceremony."
→ New Task:  "Task mới. Tôi sẽ đọc context rồi bắt đầu."
```

Không giải thích dài dòng. Một câu, chờ user confirm.

---

## KHÔNG làm

```
✗  Giả định tình huống mà không kiểm tra file
✗  Bỏ qua progress.md vì user đã giải thích rồi
✗  Dùng Quick Fix cho task mà chưa rõ scope
✗  Hỏi "Bạn muốn làm gì?" khi progress.md đã có "Next task" rõ ràng
```
