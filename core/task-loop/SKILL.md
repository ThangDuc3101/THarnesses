# SKILL: Task Loop

## Trigger
Chạy khi có task cần thực hiện và project đã có `progress.md` + `_harness/SKILL.md`.
Đây là vòng lặp chính của harness — chạy lặp đến khi task xong hoặc user dừng.

---

## Vòng lặp: Pick → Context → Execute → Validate → Commit

```
┌─────────────────────────────────────────────┐
│  PICK        Chọn task ưu tiên cao nhất      │
│  CONTEXT     Load đúng file cần thiết        │
│  EXECUTE     Implement task                  │
│  VALIDATE    Kiểm tra kết quả               │
│  COMMIT      Ghi nhận, cập nhật memory      │
└─────────────────────────────────────────────┘
        ↓ lặp lại cho task tiếp theo
```

---

## Bước 1 — PICK: Chọn task

Đọc `progress.md` → lấy "Next task" của session cuối cùng.

Nếu "Next task" không rõ hoặc trống:
1. Hỏi user: "Task tiếp theo là gì?"
2. Hoặc đề xuất task từ task list ban đầu (trong progress Session 1)

Không tự chọn task mà không có cơ sở.

---

## Bước 2 — CONTEXT: Load đúng file

```
Có Code Graph?
  → query blast_radius / deps / search
  → chỉ đọc file trong kết quả

Không có Code Graph?
  → đọc SKILL.md của project
  → hỏi user: "File nào liên quan đến task này?"
  → đọc chỉ những file đó
```

Giới hạn context: đọc tối đa 10 file mỗi task. Nếu cần hơn → task quá lớn, cần chia nhỏ.

---

## Bước 3 — EXECUTE: Implement

Làm theo thứ tự nhỏ nhất có thể:

```
1. Viết code cho phần nhỏ nhất của task
2. Verify nó chạy đúng (đọc lại, trace logic, chạy test nếu có)
3. Mở rộng dần
```

Nếu gặp lỗi lần 1 → tự debug, fix, thử lại.
Nếu gặp lỗi lần 2 → **Checkpoint C2** (xem checkpoint/SKILL.md).

---

## Bước 4 — VALIDATE: Kiểm tra

Trước khi commit, tự kiểm tra:

```
□  Code chạy đúng với input cơ bản?
□  Edge case quan trọng đã xử lý?
□  Không phá vỡ functionality cũ? (check file liên quan)
□  Không có secret / hardcode path trong code?
□  Test pass (nếu project có test)?
```

Nếu fail checklist → fix trước khi tiếp tục. Không commit code biết là sai.

---

## Bước 5 — COMMIT: Ghi nhận

```bash
# 1. Commit code
git add <files thay đổi>
git commit -m "feat/fix/chore: [mô tả ngắn gọn]"

# 2. Cập nhật progress.md
# Thêm vào session hiện tại: completed task, errors gặp, context mới
git add progress.md
git commit -m "chore: update progress [Session N]"
```

Sau commit → quay lại Bước 1 với task tiếp theo.

---

## Checkpoint triggers trong Task Loop

| Tình huống | Action |
|---|---|
| Fail >= 2 lần liên tiếp | Dừng → Checkpoint C2 |
| Đã xong 5 tasks | Dừng → Checkpoint C3 |
| Task sắp làm là destructive | Dừng → Checkpoint C4 |
| Context window gần đầy | Ghi progress.md → báo user bắt đầu session mới |

---

## Khi task quá lớn

Dấu hiệu: cần đọc > 10 file, hoặc mô tả task có nhiều hơn 3 deliverable rõ ràng.

```
1. Báo user: "Task này lớn hơn 1 iteration — cần chia nhỏ"
2. Đề xuất breakdown cụ thể
3. User confirm → bắt đầu với sub-task đầu tiên
```

Không tự chia task mà không báo user.
