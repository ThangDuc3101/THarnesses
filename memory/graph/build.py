"""
Code Graph Builder

Build hoặc update SQLite graph từ codebase.
Dùng tree-sitter nếu có, fallback về regex cho common patterns.

Usage:
    python build.py --root .
    python build.py --root . --incremental
    python build.py --root /path/to/project --exclude node_modules .venv
"""

import argparse
import hashlib
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

DB_PATH = ".graph/code.db"

IGNORE_DIRS = {
    ".git", ".graph", "__pycache__", "node_modules", ".venv", "venv",
    ".env", "dist", "build", ".next", "target", "out", ".cache",
}

LANG_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".java": "java",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
}


# ── Schema ────────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    id       INTEGER PRIMARY KEY,
    path     TEXT UNIQUE NOT NULL,
    lang     TEXT,
    hash     TEXT,
    indexed  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS symbols (
    id      INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    kind    TEXT NOT NULL,  -- function | class | method | variable | constant
    line    INTEGER
);

CREATE TABLE IF NOT EXISTS dependencies (
    id          INTEGER PRIMARY KEY,
    from_file   INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    to_path     TEXT NOT NULL,  -- raw import string (resolved best-effort)
    kind        TEXT DEFAULT 'import'
);

CREATE INDEX IF NOT EXISTS idx_symbols_name   ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_deps_from      ON dependencies(from_file);
CREATE INDEX IF NOT EXISTS idx_deps_to        ON dependencies(to_path);
"""


# ── Regex-based parsers ───────────────────────────────────────────────────────

def parse_python(content: str) -> tuple[list, list]:
    symbols, imports = [], []

    for m in re.finditer(r'^(?:async\s+)?def\s+(\w+)', content, re.MULTILINE):
        line = content[:m.start()].count('\n') + 1
        symbols.append(("function", m.group(1), line))

    for m in re.finditer(r'^class\s+(\w+)', content, re.MULTILINE):
        line = content[:m.start()].count('\n') + 1
        symbols.append(("class", m.group(1), line))

    for m in re.finditer(r'^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))', content, re.MULTILINE):
        mod = m.group(1) or m.group(2).split(',')[0].strip()
        imports.append(mod.replace('.', '/'))

    return symbols, imports


def parse_js_ts(content: str) -> tuple[list, list]:
    symbols, imports = [], []

    patterns = [
        r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
        r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(',
        r'(?:export\s+)?class\s+(\w+)',
    ]
    for pat in patterns:
        kind = "class" if "class" in pat else "function"
        for m in re.finditer(pat, content, re.MULTILINE):
            line = content[:m.start()].count('\n') + 1
            symbols.append((kind, m.group(1), line))

    # ES6: import 'mod' or import { x } from 'mod' or import x from "mod"
    for m in re.finditer(r"""import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]""", content):
        imports.append(m.group(1))
    # CommonJS: require('mod') or require("mod")
    for m in re.finditer(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""", content):
        imports.append(m.group(1))

    return symbols, imports


def parse_go(content: str) -> tuple[list, list]:
    symbols, imports = [], []

    for m in re.finditer(r'^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)', content, re.MULTILINE):
        line = content[:m.start()].count('\n') + 1
        symbols.append(("function", m.group(1), line))

    for m in re.finditer(r'^type\s+(\w+)\s+struct', content, re.MULTILINE):
        line = content[:m.start()].count('\n') + 1
        symbols.append(("class", m.group(1), line))

    for m in re.finditer(r'"([^"]+)"', content):
        if '/' in m.group(1):
            imports.append(m.group(1))

    return symbols, imports


def parse_generic(content: str) -> tuple[list, list]:
    return [], []


PARSERS = {
    "python": parse_python,
    "javascript": parse_js_ts,
    "typescript": parse_js_ts,
    "go": parse_go,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def collect_files(root: Path, extra_ignore: set[str]) -> list[Path]:
    ignore = IGNORE_DIRS | extra_ignore
    result = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix in LANG_MAP:
            if not any(part in ignore for part in p.parts):
                result.append(p)
    return result


def get_changed_files(root: Path) -> set[str]:
    try:
        out = subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=root, stderr=subprocess.DEVNULL, text=True
        )
        out += subprocess.check_output(
            ["git", "ls-files", "--others", "--exclude-standard"],
            cwd=root, stderr=subprocess.DEVNULL, text=True
        )
        return {str(root / line.strip()) for line in out.splitlines() if line.strip()}
    except Exception:
        return set()


# ── Core indexing ─────────────────────────────────────────────────────────────

def index_file(db: sqlite3.Connection, path: Path, root: Path):
    rel = str(path.relative_to(root))
    lang = LANG_MAP.get(path.suffix, "")
    h = file_hash(path)

    row = db.execute("SELECT id, hash FROM files WHERE path = ?", (rel,)).fetchone()
    if row and row[1] == h:
        return  # unchanged

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return

    parser = PARSERS.get(lang, parse_generic)
    symbols, imports = parser(content)

    if row:
        file_id = row[0]
        db.execute("DELETE FROM symbols WHERE file_id = ?", (file_id,))
        db.execute("DELETE FROM dependencies WHERE from_file = ?", (file_id,))
        db.execute("UPDATE files SET hash = ?, lang = ?, indexed = strftime('%s','now') WHERE id = ?",
                   (h, lang, file_id))
    else:
        cur = db.execute("INSERT INTO files (path, lang, hash) VALUES (?, ?, ?)", (rel, lang, h))
        file_id = cur.lastrowid

    db.executemany(
        "INSERT INTO symbols (file_id, name, kind, line) VALUES (?, ?, ?, ?)",
        [(file_id, name, kind, line) for kind, name, line in symbols]
    )
    db.executemany(
        "INSERT INTO dependencies (from_file, to_path) VALUES (?, ?)",
        [(file_id, imp) for imp in imports]
    )


def build(root: Path, incremental: bool, extra_ignore: set[str]):
    db_path = root / DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)

    db = sqlite3.connect(db_path)
    db.executescript(SCHEMA)

    files = collect_files(root, extra_ignore)

    if incremental:
        changed = get_changed_files(root)
        files = [f for f in files if str(f) in changed or
                 not db.execute("SELECT 1 FROM files WHERE path = ?",
                                (str(f.relative_to(root)),)).fetchone()]

    total = len(files)
    for i, f in enumerate(files, 1):
        index_file(db, f, root)
        if i % 50 == 0 or i == total:
            print(f"  [{i}/{total}] indexed", end="\r")

    db.commit()
    db.close()

    stats = sqlite3.connect(root / DB_PATH)
    n_files = stats.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    n_sym   = stats.execute("SELECT COUNT(*) FROM symbols").fetchone()[0]
    n_deps  = stats.execute("SELECT COUNT(*) FROM dependencies").fetchone()[0]
    stats.close()

    mode = "incremental" if incremental else "full"
    print(f"\nGraph built ({mode}): {n_files} files · {n_sym} symbols · {n_deps} dependencies")
    print(f"Saved to {db_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Build code graph for a project")
    ap.add_argument("--root", default=".", help="Project root directory")
    ap.add_argument("--incremental", action="store_true",
                    help="Only re-index changed/new files")
    ap.add_argument("--exclude", nargs="*", default=[],
                    help="Additional directory names to exclude")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"Error: {root} is not a directory", file=sys.stderr)
        sys.exit(1)

    print(f"Building graph for {root} ...")
    build(root, args.incremental, set(args.exclude))


if __name__ == "__main__":
    main()
