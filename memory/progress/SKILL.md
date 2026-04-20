# SKILL: Progress Protocol

## Trigger
Đọc file này mỗi khi bắt đầu hoặc kết thúc một session làm việc trên bất kỳ project nào
có file `progress.md` trong thư mục gốc hoặc `_harness/progress.md`.

---

## Rule 1 — Đầu session: ĐỌC trước khi làm bất cứ điều gì

Khi user bắt đầu session mới (kể cả không nói gì), thực hiện theo thứ tự:

```
1. Tìm progress.md trong project
2. Đọc toàn bộ — đặc biệt chú ý mục "Errors & Fixes" và "Next task"
3. Tóm tắt ngắn cho user: đang ở đâu, làm gì tiếp
4. Hỏi: tiếp tục task đó hay có task mới?
```

Nếu chưa có progress.md → tạo file mới với Session 1, timestamp hiện tại.

---

## Rule 2 — Cuối session: GHI trước khi kết thúc

Khi user nói xong, task hoàn thành, hoặc context gần đầy, thêm entry mới vào progress.md:

```
1. Append entry mới — KHÔNG xóa entries cũ
2. Điền đủ 4 mục theo template
3. Commit file nếu project dùng git: git add progress.md && git commit -m "chore: update progress [Session N]"
```

---

## Rule 3 — "Errors & Fixes" là mục quan trọng nhất

Ghi lại MỌI lỗi đã gặp, dù nhỏ:

```
Ghi: triệu chứng + nguyên nhân gốc + cách fix
Không ghi: "có lỗi, đã fix"  ← vô nghĩa cho session sau
```

Mục đích: session sau đọc và KHÔNG lặp lại lỗi đó.

---

## Rule 4 — "Context discovered" là bộ nhớ dài hạn

Ghi lại những điều không hiển nhiên về codebase, domain, hoặc user preference
mà phải làm việc mới biết:

```
Ví dụ: "thư viện X không hỗ trợ Windows — dùng Y thay thế"
        "user muốn commit nhỏ, không bundle lớn"
        "file config ở _secret/, không commit"
```

---

## Rule 5 — Format bắt buộc

Dùng đúng format trong `template.md`. Không tự ý thêm section.
Session number tăng dần. Timestamp là ISO 8601 local time.

---

## Anti-patterns — KHÔNG làm

```
✗  Ghi progress.md sau một nửa task rồi bỏ qua phần còn lại
✗  Viết "completed: fixed bugs" — thiếu detail
✗  Xóa entries cũ để "clean up"
✗  Bỏ qua đọc progress.md vì "user đã giải thích rồi"
✗  Ghi "Next task: TBD" — phải cụ thể
```
