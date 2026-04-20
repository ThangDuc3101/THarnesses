# SKILL: {{PROJECT_NAME}} — Embedded / Hardware

## Project
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

## Stack
- Ngôn ngữ: {{STACK}}
- Platform / hardware: {{HARDWARE}}
- Build system: {{BUILD_TOOL}}
- Communication protocol: {{PROTOCOL}}

## Data & I/O
- Sensor / actuator: {{DATA_SOURCES}}
- Output / behavior: {{OUTPUT}}

---

## Conventions

### Code style
{{CONVENTIONS}}

### File structure
```
src/
├── drivers/      hardware abstraction layer
├── modules/      business logic / feature modules
├── comm/         communication (serial, CAN, UDP...)
├── config/       params, constants, build config
└── utils/        helpers không phụ thuộc hardware
tests/
├── unit/         test logic thuần túy
└── sim/          test với simulator (nếu có)
```

### Naming
- File: snake_case.c / snake_case.h hoặc theo project convention
- Macro / constant: UPPER_SNAKE_CASE
- Hàm: module_action (ví dụ: imu_read, motor_set_speed)
- Biến global: g_ prefix
- Biến static: s_ prefix

### Hardware safety rules
- Không viết giá trị ra actuator mà không có bounds check
- Arm/disarm state machine phải explicit — không dùng flag đơn
- Watchdog / timeout bắt buộc cho mọi communication loop
- Fail-safe behavior phải định nghĩa rõ trước khi implement

### Commit message
```
feat: thêm module / tính năng mới
fix: sửa bug
driver: thay đổi hardware driver
param: thay đổi params / config
sim: thay đổi simulation / test
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
2. Xác định hardware bị ảnh hưởng và risk level
3. Nếu thay đổi driver hoặc safety-critical code → báo user trước

### Khi implement
1. Implement + test trong simulator trước (nếu có)
2. Test trên hardware với safety precaution
3. Log đủ để debug ngoài field — không debug bằng cách đoán

### Trước khi flash / deploy lên hardware
```
□  Build thành công không warning?
□  Đã test trong sim?
□  Bounds check cho mọi actuator output?
□  Fail-safe behavior đã verify?
□  Backup firmware cũ?
```

### Cuối session
1. Ghi progress.md — ghi rõ hardware state, bug phần cứng phát hiện
2. Commit code + config
3. Tóm tắt: test pass trên gì (sim / hardware), hardware state hiện tại

---

## Không làm

```
✗  Flash hardware mà không backup firmware cũ
✗  Thay đổi safety-critical module mà không có checkpoint với user
✗  Bỏ qua bounds check vì "giá trị trông hợp lý"
✗  Commit binary / build artifact vào git
✗  Debug bằng cách thay đổi nhiều thứ cùng lúc
```
