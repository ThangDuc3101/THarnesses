# SKILL: Resume

## Trigger
Chạy khi bắt đầu session mới trên project đã có `progress.md`.
Mục tiêu: đưa agent về đúng trạng thái của session cuối — không hỏi lại những gì đã biết.

---

## Flow resume

```
Bước 1  Đọc progress.md — toàn bộ, từ đầu đến cuối
Bước 2  Xác định trạng thái hiện tại
Bước 3  Tóm tắt ngắn cho user
Bước 4  Đề xuất tiếp theo, chờ confirm
```

---

## Bước 1 — Đọc progress.md

Đọc từ session cuối ngược lên. Ưu tiên theo thứ tự:

1. **"Next task"** của session cuối → đây là việc cần làm tiếp
2. **"Errors & Fixes"** → những lỗi đã gặp, cần tránh lặp lại
3. **"Context discovered"** → thông tin ẩn về codebase / domain
4. **"Completed"** của các session → hiểu đã làm đến đâu

---

## Bước 2 — Xác định trạng thái

Có 3 khả năng:

**A. Task rõ ràng** — "Next task" đủ cụ thể để bắt đầu ngay.
→ Đề xuất bắt đầu task đó.

**B. Task không rõ** — "Next task" là "TBD" hoặc quá mơ hồ.
→ Đề xuất dựa trên "Completed" gần nhất + task list ban đầu.
→ Hỏi user confirm.

**C. Task bị block** — "Next task" có ghi "BLOCKED:" kèm lý do.
→ Báo user: task bị block vì gì.
→ Đề xuất workaround hoặc skip sang task khác.

---

## Bước 3 — Tóm tắt cho user

Format ngắn gọn:

```
Session [N] — [timestamp]
Đã làm: [1-3 bullet từ Completed]
Lỗi đã biết: [nếu có Errors quan trọng]
Tiếp theo: [Next task cụ thể]
```

Không dài hơn 10 dòng. User cần đọc trong 10 giây.

---

## Bước 4 — Chờ confirm

Sau khi tóm tắt, hỏi:
> "Tiếp tục với [Next task] không, hay có task khác ưu tiên hơn?"

Không bắt đầu làm gì cho đến khi user respond.

---

## Trường hợp đặc biệt

### progress.md tồn tại nhưng rỗng / corrupt
→ Báo user, hỏi có muốn reset về Session 1 không.

### Session cuối bị cắt giữa chừng (không có "Next task")
→ Đọc "Completed" của session đó → task cuối cùng chưa xong.
→ Báo: "Session [N] bị dừng giữa chừng tại [task]. Tiếp tục từ đó không?"

### Nhiều file progress.md (project có nhiều module)
→ Hỏi user muốn resume module nào.

---

## KHÔNG làm

```
✗  Bắt đầu code trước khi đọc progress.md
✗  Hỏi user những thông tin đã có trong progress.md
✗  Tóm tắt dài hơn 10 dòng
✗  Bỏ qua "Errors & Fixes" — dễ lặp lại lỗi cũ
```
