# SKILL: MCP Setup

## Trigger
Dùng khi cần cài MCP server cho project mới.
Triết lý: chỉ cài core, thêm khi task thực sự cần — không cài trước.

---

## Core MCP (cài cho mọi project)

```bash
# File system — đọc/ghi file trong project
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .

# Git — git log, diff, blame, status
claude mcp add git -- npx -y @modelcontextprotocol/server-git .
```

Hai server này đủ cho > 80% task thông thường.

---

## MCP theo stack — chỉ cài khi cần

### Web / fullstack

```bash
# Browser automation (test UI, scraping)
claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer

# Fetch URL (đọc docs, API response)
claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch
```

### Database

```bash
# PostgreSQL
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres \
  postgresql://localhost/mydb

# SQLite
claude mcp add sqlite -- npx -y @modelcontextprotocol/server-sqlite ./data.db
```

### Data / automation

```bash
# Fetch (đọc API, download file)
claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch
```

### Collaboration / issue tracking

```bash
# GitHub — issues, PRs, code search
claude mcp add github -- npx -y @modelcontextprotocol/server-github
# Cần: GITHUB_PERSONAL_ACCESS_TOKEN trong env

# Slack — đọc message, gửi notification
claude mcp add slack -- npx -y @modelcontextprotocol/server-slack
# Cần: SLACK_BOT_TOKEN trong env
```

---

## Khi nào gợi ý cài MCP mới

| Task agent đang làm | MCP cần thêm |
|---|---|
| Test UI, fill form trên web | puppeteer |
| Đọc API docs từ URL | fetch |
| Query / migrate database | postgres hoặc sqlite |
| Tạo PR, comment issue | github |
| Gửi notification | slack |
| Embedded — đọc serial port | (custom, hỏi user) |

---

## Quy trình khi phát hiện cần MCP mới

```
1. Nhận ra task không làm được với tool hiện có
2. Xác định MCP phù hợp từ bảng trên
3. Báo user: "Task này cần [MCP]. Cài không?"
4. Chờ user confirm — KHÔNG tự cài
5. User confirm → hướng dẫn lệnh cài cụ thể
6. Sau khi cài → thêm vào _harness/SKILL.md phần "MCP installed"
```

---

## KHÔNG làm

```
✗  Cài MCP mà không hỏi user
✗  Cài nhiều MCP "phòng xa" khi mới setup
✗  Để credentials (token, password) trong lệnh mcp add
   → dùng env var, không hardcode
```
