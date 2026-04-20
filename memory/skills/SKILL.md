# SKILL: Maintain SKILL.md

## Trigger
Đọc file này khi:
- User yêu cầu cập nhật conventions, workflow, hoặc rules của project
- Sau khi phát hiện pattern lặp lại (lỗi cùng loại, câu hỏi cùng loại)
- Khi project thay đổi stack, tool, hoặc phương pháp làm việc

---

## Nguyên tắc viết SKILL.md tốt

### 1. Viết cho LLM, không phải người đọc

```
Kém:  "Nên dùng snake_case cho tên biến"
Tốt:  "Dùng snake_case cho mọi tên biến và hàm. PascalCase chỉ cho class."
```

Imperative, rõ ràng, không mơ hồ.

### 2. Trigger → Action

Mỗi rule phải có trigger rõ ràng:

```
Kém:  "Handle error properly"
Tốt:  "Khi gọi external API → bắt HTTPError riêng, log status code, raise lại với context"
```

### 3. Ví dụ > Mô tả

```
Kém:  "Commit message phải có ý nghĩa"
Tốt:  "Commit: 'feat: add JWT auth middleware'  ✓
       Commit: 'fix stuff'                      ✗"
```

### 4. Anti-patterns quan trọng như rules

Liệt kê rõ những gì KHÔNG làm — tránh lặp lỗi đã biết.

---

## Khi nào cập nhật SKILL.md

### Cập nhật ngay (trong session):
- Phát hiện convention mới mà team đang dùng
- User chỉnh sửa cách agent làm việc và xác nhận đó là preferred approach
- Tìm ra workaround cho bug/constraint của project

### Cập nhật cuối session:
- Tổng hợp "Context discovered" từ progress.md vào SKILL.md nếu đủ general
- Refine rule đã có cho rõ hơn dựa trên thực tế

### KHÔNG cập nhật:
- Thông tin chỉ đúng cho 1 task cụ thể → ghi vào progress.md thôi
- Convention chưa được user confirm
- Thứ đã có trong code rõ ràng (không cần ghi vào SKILL.md)

---

## Cấu trúc SKILL.md chuẩn

```markdown
# SKILL: [Tên project / domain]

## [Section 1: Stack & Setup]
## [Section 2: Conventions]
## [Section 3: Workflow]
## [Section 4: Domain-specific rules]
## Không làm
```

Giữ file dưới 200 dòng. Nếu dài hơn → tách thành nhiều SKILL.md theo domain.

---

## Cách commit thay đổi SKILL.md

```bash
git add _harness/SKILL.md
git commit -m "skill: [mô tả ngắn thay đổi gì và tại sao]"
```

Ví dụ: `skill: add rule for async error handling after incident in Session 5`
