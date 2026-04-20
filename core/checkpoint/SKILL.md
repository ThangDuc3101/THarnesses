# SKILL: Checkpoints

## Trigger
Dừng task loop và chạy checkpoint khi gặp một trong 4 điều kiện dưới đây.
KHÔNG bỏ qua checkpoint dù task đang chạy tốt.

---

## 4 Checkpoint triggers

### C1 — Sau Initializer / Bootstrap

**Khi nào:** Vừa hoàn thành bootstrap hoặc planning cho task mới lớn.

**Câu hỏi hỏi user:**
> "Đây là plan tôi hiểu được:
> [tóm tắt 3-5 bullet: mục tiêu, approach, task đầu tiên]
>
> Plan đúng hướng chưa? Có gì cần điều chỉnh trước khi bắt đầu không?"

**Không tiếp tục** cho đến khi user confirm hoặc chỉnh sửa xong.

---

### C2 — Fail >= 2 lần liên tiếp

**Khi nào:** Cùng một task hoặc cùng một loại lỗi thất bại 2 lần liên tiếp.

**Câu hỏi hỏi user:**
> "Tôi đã thử [approach 1] và [approach 2], cả hai đều thất bại vì [lý do].
>
> Bạn muốn:
> A) Thử approach khác — [đề xuất cụ thể]
> B) Skip task này, làm task khác trước
> C) Cung cấp thêm context / file để tôi hiểu rõ hơn"

**Ghi vào progress.md** trước khi hỏi: lỗi là gì, đã thử gì, tại sao không được.

---

### C3 — Mỗi 5 tasks hoàn thành

**Khi nào:** Task counter đạt bội số của 5 (task 5, 10, 15...).

**Câu hỏi hỏi user:**
> "Đã hoàn thành [N] tasks. Tóm tắt nhanh:
> ✓ [task 1, 2, 3, 4, 5]
>
> Tiến độ so với mục tiêu: [đánh giá ngắn]
> Task tiếp theo theo plan: [tên task]
>
> Tiếp tục không, hay có gì cần điều chỉnh?"

Đây là cơ hội để user redirect nếu priority thay đổi.

---

### C4 — Trước destructive operation

**Khi nào:** Sắp thực hiện bất kỳ action nào trong danh sách sau:

```
Destructive operations cần confirm:
  - Xóa file hoặc thư mục
  - Overwrite file có nội dung (không phải tạo mới)
  - Drop / truncate database table
  - git reset --hard, git push --force
  - rm -rf
  - Deploy lên production / staging
  - Gửi request POST/PUT/DELETE đến external API thật
  - Cài / gỡ package ảnh hưởng toàn bộ project
```

**Câu hỏi hỏi user:**
> "Sắp thực hiện: [mô tả action cụ thể]
> Ảnh hưởng: [những gì sẽ thay đổi / mất]
> Có thể undo không: [có / không / khó]
>
> Xác nhận tiến hành?"

**KHÔNG thực hiện** cho đến khi có "yes", "oke", "confirm", hoặc tương đương rõ ràng.

---

## Sau checkpoint

Khi user respond:
- **Confirm / tiếp tục** → resume task loop từ đúng chỗ dừng
- **Chỉnh sửa** → áp dụng chỉnh sửa, confirm lại nếu thay đổi lớn
- **Dừng lại** → ghi progress.md, tóm tắt trạng thái, chờ user

---

## Anti-patterns — KHÔNG làm

```
✗  Bỏ qua C4 vì "action này chắc user muốn"
✗  Hỏi checkpoint sau khi đã thực hiện action
✗  Hỏi checkpoint quá nhiều lần cho cùng 1 task (chỉ hỏi 1 lần)
✗  Checkpoint C3 nhưng không đưa ra summary thực sự
✗  Tiếp tục sau C2 mà không có hướng mới từ user
```
