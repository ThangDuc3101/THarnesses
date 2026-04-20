# SKILL: {{PROJECT_NAME}}

## Project
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

## Stack
- Ngôn ngữ: {{STACK}}
- Môi trường: {{ENVIRONMENT}}
- Build: {{BUILD_TOOL}}

## Data & I/O
- Input: {{DATA_SOURCES}}
- Output: {{OUTPUT}}

---

## Conventions

### Code style
{{CONVENTIONS}}

### Naming
- File: snake_case
- Biến / hàm: snake_case
- Class: PascalCase
- Hằng số: UPPER_SNAKE_CASE

### Commit message
```
feat: thêm tính năng mới
fix: sửa bug
chore: task không ảnh hưởng logic (update deps, config...)
docs: cập nhật tài liệu
refactor: tái cấu trúc không thay đổi behavior
```

### Test
{{TEST_APPROACH}}

---

## Constraints
{{CONSTRAINTS}}

---

## Workflow

### Trước khi bắt đầu task
1. Đọc progress.md — nắm rõ đang ở đâu, lỗi cũ là gì
2. Xác định file liên quan — không đọc toàn bộ codebase
3. Confirm scope với user nếu task mơ hồ

### Khi implement
1. Làm task nhỏ nhất có thể trước — verify rồi mới mở rộng
2. Commit sau mỗi unit hoàn chỉnh — không để thay đổi lớn chưa commit
3. Chạy test sau mỗi thay đổi logic quan trọng

### Cuối session
1. Ghi progress.md — đủ 4 mục, "Errors & Fixes" phải có detail
2. Commit progress.md
3. Tóm tắt ngắn cho user: xong gì, tiếp theo là gì

---

## Không làm

```
✗  Xóa hoặc overwrite file mà không có confirm từ user
✗  Push to remote mà không hỏi
✗  Cài package mới mà không thông báo
✗  Đọc file ngoài scope task hiện tại
```
