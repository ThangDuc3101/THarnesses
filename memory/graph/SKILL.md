# SKILL: Code Graph

## Trigger
Dùng Code Graph trước mọi task có liên quan đến code:
- Khi cần biết file nào phụ thuộc vào file đang sửa
- Khi cần tìm nơi một symbol được định nghĩa / dùng
- Khi cần load context cho một task (chỉ load đúng file cần thiết)
- Khi cần ước tính blast radius của một thay đổi

---

## Setup

```bash
# Lần đầu — build graph từ codebase hiện tại
python memory/graph/build.py --root .

# Sau mỗi lần thay đổi lớn — incremental update theo git diff
python memory/graph/build.py --root . --incremental

# Kiểm tra graph đã build chưa
python memory/graph/query.py summary
```

Graph được lưu tại `.graph/code.db` trong project (SQLite).

---

## Cách dùng

### 1. Tìm file liên quan trước khi bắt đầu task

```bash
# Những file nào ảnh hưởng nếu tôi sửa file này?
python memory/graph/query.py blast_radius src/auth/login.py

# File này phụ thuộc vào những file nào?
python memory/graph/query.py deps src/auth/login.py
```

Chỉ đọc các file trong kết quả — không đọc toàn bộ codebase.

### 2. Tìm định nghĩa và usage của symbol

```bash
python memory/graph/query.py search UserService
python memory/graph/query.py search validate_token
```

### 3. Tổng quan codebase

```bash
python memory/graph/query.py summary
```

---

## Nguyên tắc

```
Sai:  đọc toàn bộ codebase → tự tìm file liên quan
Đúng: query graph → chỉ đọc file trong kết quả
```

Nếu graph chưa được build (`code.db` chưa tồn tại):
→ Chạy `build.py` trước, sau đó mới query.

Nếu graph cũ (> 1 ngày hoặc sau nhiều commit):
→ Chạy `build.py --incremental` để cập nhật.

---

## Khi graph không có thông tin cần

Một số file (config, binary, template) không parse được hoặc không có dependency rõ ràng.
Trong trường hợp đó: đọc trực tiếp file đó, nhưng vẫn ưu tiên dùng graph cho phần còn lại.
