# SKILL: {{PROJECT_NAME}} — Web

## Project
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

## Stack
- Frontend: {{FRONTEND_STACK}}
- Backend: {{BACKEND_STACK}}
- Database: {{DATABASE}}
- Môi trường: {{ENVIRONMENT}}

## Data & I/O
- API / Data source: {{DATA_SOURCES}}
- Output: {{OUTPUT}}

---

## Conventions

### Code style
{{CONVENTIONS}}

### File structure
```
src/
├── components/    UI components (nếu có frontend)
├── pages/         route-level components
├── api/           API routes / controllers
├── services/      business logic — không dính HTTP
├── models/        data models / schema
├── utils/         helper functions thuần túy
└── config/        env, constants
```

### Naming
- File: kebab-case (web standard)
- Component: PascalCase
- Hàm / biến: camelCase
- CSS class: kebab-case
- API endpoint: /kebab-case/{id}

### API design
- RESTful: GET/POST/PUT/DELETE rõ ràng
- Response format nhất quán: `{ data, error, meta }`
- Status code đúng: 200/201/400/401/403/404/500
- Không để business logic trong route handler

### Commit message
```
feat: thêm tính năng mới
fix: sửa bug
style: thay đổi UI không ảnh hưởng logic
api: thay đổi API interface
db: thay đổi schema / migration
```

### Test
{{TEST_APPROACH}}

---

## Constraints
{{CONSTRAINTS}}

---

## Workflow

### Trước khi bắt đầu task
1. Đọc progress.md
2. Xác định layer bị ảnh hưởng: UI / API / service / DB
3. Không thay đổi API interface mà không thông báo

### Khi implement
1. Backend trước, frontend sau — contract API rõ ràng trước khi build UI
2. Không hardcode URL, secret, hay config — dùng env var
3. Validate input ở boundary (API layer) — không trust frontend

### Security checklist (trước mỗi feature có auth/data)
```
□  Input validation
□  SQL injection / injection attack
□  Auth check đúng chỗ
□  Không log sensitive data
□  CORS config đúng
```

### Cuối session
1. Ghi progress.md
2. Commit progress.md
3. Tóm tắt: endpoint nào đã xong, UI nào cần test

---

## Không làm

```
✗  Để secret / API key trong code
✗  Bỏ qua validation ở server side vì "frontend đã check rồi"
✗  Thay đổi DB schema mà không có migration file
✗  Deploy mà không hỏi user
```
