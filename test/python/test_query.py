import sqlite3
from pathlib import Path

import pytest

from build import SCHEMA
from query import blast_radius, deps, search, summary


@pytest.fixture
def db(tmp_path):
    """Fixture DB với cấu trúc dependency đã biết:

        main.py  →  auth.py  →  utils.py
        api.js   (độc lập)
    """
    db_dir = tmp_path / ".graph"
    db_dir.mkdir()
    conn = sqlite3.connect(db_dir / "code.db")
    conn.executescript(SCHEMA)
    conn.row_factory = sqlite3.Row

    conn.executemany(
        "INSERT INTO files (id, path, lang, hash) VALUES (?, ?, ?, ?)",
        [
            (1, "src/auth.py",  "python",     "aaa"),
            (2, "src/utils.py", "python",     "bbb"),
            (3, "src/main.py",  "python",     "ccc"),
            (4, "src/api.js",   "javascript", "ddd"),
        ],
    )
    conn.executemany(
        "INSERT INTO symbols (file_id, name, kind, line) VALUES (?, ?, ?, ?)",
        [
            (1, "AuthService", "class",    1),
            (1, "login",       "function", 10),
            (2, "validate",    "function",  5),
            (3, "main",        "function",  1),
            (4, "fetchUser",   "function",  3),
        ],
    )
    conn.executemany(
        "INSERT INTO dependencies (from_file, to_path) VALUES (?, ?)",
        [
            (3, "src/auth"),   # main.py → auth.py
            (1, "src/utils"),  # auth.py → utils.py
        ],
    )
    conn.commit()

    original_db_path = Path("query").parent  # unused — we pass conn directly
    yield conn, tmp_path
    conn.close()


# ── blast_radius ──────────────────────────────────────────────────────────────

class TestBlastRadius:
    def test_direct_dependent(self, db):
        conn, root = db
        result = blast_radius(conn, "src/utils.py")
        assert "src/auth.py" in result

    def test_transitive_dependent(self, db):
        conn, root = db
        result = blast_radius(conn, "src/utils.py")
        assert "src/main.py" in result

    def test_does_not_include_target_itself(self, db):
        conn, root = db
        result = blast_radius(conn, "src/utils.py")
        assert "src/utils.py" not in result

    def test_no_dependents_returns_empty(self, db):
        conn, root = db
        result = blast_radius(conn, "src/api.js")
        assert result == []

    def test_returns_sorted_list(self, db):
        conn, root = db
        result = blast_radius(conn, "src/utils.py")
        assert result == sorted(result)


# ── deps ──────────────────────────────────────────────────────────────────────

class TestDeps:
    def test_direct_dependency(self, db):
        conn, root = db
        result = deps(conn, "src/main.py")
        assert any("auth" in r for r in result)

    def test_file_not_in_graph_returns_empty(self, db):
        conn, root = db
        result = deps(conn, "nonexistent.py")
        assert result == []

    def test_file_with_no_imports_returns_empty(self, db):
        conn, root = db
        result = deps(conn, "src/api.js")
        assert result == []

    def test_returns_sorted_list(self, db):
        conn, root = db
        result = deps(conn, "src/main.py")
        assert result == sorted(result)


# ── search ────────────────────────────────────────────────────────────────────

class TestSearch:
    def test_finds_exact_symbol(self, db):
        conn, root = db
        result = search(conn, "login")
        defs = result["definitions"]
        assert any(d["name"] == "login" for d in defs)

    def test_finds_partial_match(self, db):
        conn, root = db
        result = search(conn, "Service")
        defs = result["definitions"]
        assert any("Service" in d["name"] for d in defs)

    def test_returns_file_path(self, db):
        conn, root = db
        result = search(conn, "login")
        defs = result["definitions"]
        assert any(d["path"] == "src/auth.py" for d in defs)

    def test_returns_line_number(self, db):
        conn, root = db
        result = search(conn, "login")
        defs = result["definitions"]
        login_def = next(d for d in defs if d["name"] == "login")
        assert login_def["line"] == 10

    def test_no_match_returns_empty_definitions(self, db):
        conn, root = db
        result = search(conn, "nonexistent_symbol_xyz")
        assert result["definitions"] == []

    def test_result_has_definitions_and_usages_keys(self, db):
        conn, root = db
        result = search(conn, "login")
        assert "definitions" in result
        assert "usages" in result


# ── summary ───────────────────────────────────────────────────────────────────

class TestSummary:
    def test_prints_without_error(self, db, capsys):
        conn, root = db
        summary(conn)
        captured = capsys.readouterr()
        assert "Files:" in captured.out

    def test_correct_file_count(self, db, capsys):
        conn, root = db
        summary(conn)
        captured = capsys.readouterr()
        assert "4" in captured.out

    def test_shows_language_breakdown(self, db, capsys):
        conn, root = db
        summary(conn)
        captured = capsys.readouterr()
        assert "python" in captured.out
        assert "javascript" in captured.out
