# SKILL: Quick Fix

## Trigger
Dùng thay cho Task Loop khi task có đủ 3 đặc điểm:
1. Scope nhỏ — ảnh hưởng <= 3 file
2. Rõ ràng — không cần planning hay breakdown
3. Không destructive — không xóa, không deploy, không thay đổi API

Ví dụ: sửa typo, fix bug rõ nguyên nhân, thêm 1 field vào struct, update config.

---

## Flow (nhanh, không ceremony)

```
1. Đọc file liên quan
2. Hiểu đủ để sửa
3. Sửa
4. Verify nhanh
5. Commit
6. Ghi 1 dòng vào progress.md nếu cần (tùy)
```

Không cần: checkpoint C1, không cần breakdown, không cần task list.

---

## Verify nhanh

Không cần checklist đầy đủ như Task Loop. Chỉ cần:

```
□  Thay đổi đúng chỗ?
□  Không break syntax?
□  Không vô tình sửa file khác?
```

---

## Commit

```bash
git add <file đã sửa>
git commit -m "fix: [mô tả ngắn gọn — 1 dòng]"
```

Không cần update progress.md cho quick fix nhỏ.
Nếu fix phát hiện bug lớn hơn → ghi vào progress.md "Context discovered".

---

## Khi nào KHÔNG dùng Quick Fix

```
Task cần đọc > 3 file           → dùng Task Loop
Chưa rõ nguyên nhân bug         → dùng Task Loop (debug phase)
Thay đổi ảnh hưởng API / schema → dùng Task Loop + C4 checkpoint
User chưa mô tả rõ muốn gì      → hỏi trước, đừng đoán
```

---

## Tự nhận biết scope

Nếu sau khi đọc file mà thấy cần đọc thêm file khác → scope lớn hơn tưởng.
Báo user và chuyển sang Task Loop thay vì cố làm bằng Quick Fix.
