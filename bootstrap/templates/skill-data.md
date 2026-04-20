# SKILL: {{PROJECT_NAME}} — Data / Automation

## Project
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

## Stack
- Ngôn ngữ: {{STACK}}
- Framework / lib chính: {{FRAMEWORK}}
- Môi trường chạy: {{ENVIRONMENT}}

## Data & I/O
- Input: {{DATA_SOURCES}}
- Output: {{OUTPUT}}
- Volume ước tính: {{DATA_VOLUME}}

---

## Conventions

### Code style
{{CONVENTIONS}}

### File structure
```
src/
├── ingest/       đọc dữ liệu từ source
├── transform/    xử lý, clean, transform
├── load/         ghi ra output / DB / file
├── models/       ML model training / inference (nếu có)
├── utils/        helper functions
└── config/       env, constants, schema
data/
├── raw/          dữ liệu gốc — không sửa
├── processed/    dữ liệu đã xử lý
└── output/       kết quả cuối
```

### Naming
- File / module: snake_case
- Hàm: snake_case, động từ rõ ràng (load_csv, transform_date, save_parquet)
- Biến chứa DataFrame: `df_` prefix (df_raw, df_clean)
- Pipeline step: số thứ tự prefix (01_ingest.py, 02_transform.py)

### Data handling
- Raw data KHÔNG bao giờ bị overwrite
- Mỗi bước transform → output file mới, có timestamp hoặc version
- Log số record đầu/cuối mỗi bước — detect data loss sớm
- Validate schema trước khi chạy pipeline

### Commit message
```
feat: thêm pipeline / feature mới
fix: sửa bug xử lý dữ liệu
data: thay đổi data schema hoặc format
model: thay đổi ML model / hyperparameter
perf: tối ưu performance / memory
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
2. Kiểm tra data/raw/ — có dữ liệu sample chưa?
3. Xác định step trong pipeline bị ảnh hưởng

### Khi implement
1. Test với sample nhỏ trước — sau đó mới chạy full dataset
2. In shape / count sau mỗi transform step quan trọng
3. Không load toàn bộ dataset vào RAM nếu có thể stream

### Trước khi chạy pipeline đầy đủ
```
□  Đã test với sample (1% data)?
□  Có checkpoint để resume nếu fail giữa chừng?
□  Output path đã đúng chưa?
□  Disk space đủ không?
```

### Cuối session
1. Ghi progress.md — đặc biệt ghi rõ data shape, anomaly gặp
2. Commit code (không commit raw data lớn)
3. Tóm tắt: bước nào đã validate, con số quan trọng

---

## Không làm

```
✗  Overwrite raw data
✗  Chạy toàn bộ pipeline mà không test sample trước
✗  Commit file data lớn (> 10MB) vào git
✗  Hardcode path — dùng config file
✗  Bỏ qua schema validation vì "data trông ổn"
```
