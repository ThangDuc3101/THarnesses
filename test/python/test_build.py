import sqlite3
import time
from pathlib import Path

import pytest

from build import (
    SCHEMA,
    build,
    collect_files,
    file_hash,
    index_file,
    parse_generic,
    parse_go,
    parse_js_ts,
    parse_python,
)


# ── parse_python ──────────────────────────────────────────────────────────────

class TestParsePython:
    def test_detects_function(self):
        syms, _ = parse_python("def hello():\n    pass\n")
        assert ("function", "hello", 1) in syms

    def test_detects_async_function(self):
        syms, _ = parse_python("async def fetch():\n    pass\n")
        assert ("function", "fetch", 1) in syms

    def test_detects_class(self):
        syms, _ = parse_python("class MyService:\n    pass\n")
        assert ("class", "MyService", 1) in syms

    def test_detects_from_import(self):
        _, imps = parse_python("from os.path import join\n")
        assert any("os/path" in i for i in imps)

    def test_detects_plain_import(self):
        _, imps = parse_python("import sys\n")
        assert any("sys" in i for i in imps)

    def test_multiple_symbols_in_file(self):
        content = "class Foo:\n    pass\n\ndef bar():\n    pass\n"
        syms, _ = parse_python(content)
        names = {s[1] for s in syms}
        assert "Foo" in names
        assert "bar" in names

    def test_line_numbers_are_correct(self):
        content = "\n\ndef third_line():\n    pass\n"
        syms, _ = parse_python(content)
        func = next(s for s in syms if s[1] == "third_line")
        assert func[2] == 3

    def test_empty_content_returns_empty(self):
        syms, imps = parse_python("")
        assert syms == []
        assert imps == []


# ── parse_js_ts ───────────────────────────────────────────────────────────────

class TestParseJsTs:
    def test_detects_named_function(self):
        syms, _ = parse_js_ts("function greet(name) { return name; }\n")
        assert any(s[1] == "greet" for s in syms)

    def test_detects_arrow_function_const(self):
        syms, _ = parse_js_ts("const fetchUser = async (id) => { };\n")
        assert any(s[1] == "fetchUser" for s in syms)

    def test_detects_class(self):
        syms, _ = parse_js_ts("class UserService { }\n")
        kinds = {s[1]: s[0] for s in syms}
        assert kinds.get("UserService") == "class"

    def test_detects_es_import(self):
        _, imps = parse_js_ts("import { useState } from 'react';\n")
        assert any("react" in i for i in imps)

    def test_detects_require(self):
        _, imps = parse_js_ts("const fs = require('fs');\n")
        assert any("fs" in i for i in imps)

    def test_export_function(self):
        syms, _ = parse_js_ts("export function save(data) { }\n")
        assert any(s[1] == "save" for s in syms)

    def test_empty_content_returns_empty(self):
        syms, imps = parse_js_ts("")
        assert syms == []
        assert imps == []


# ── parse_go ──────────────────────────────────────────────────────────────────

class TestParseGo:
    def test_detects_function(self):
        syms, _ = parse_go("func HelloWorld() {\n}\n")
        assert any(s[1] == "HelloWorld" for s in syms)

    def test_detects_method_on_receiver(self):
        syms, _ = parse_go("func (s *Server) Start() {\n}\n")
        assert any(s[1] == "Start" for s in syms)

    def test_detects_struct(self):
        syms, _ = parse_go("type UserRepo struct {\n}\n")
        kinds = {s[1]: s[0] for s in syms}
        assert kinds.get("UserRepo") == "class"

    def test_empty_content_returns_empty(self):
        syms, imps = parse_go("")
        assert syms == []
        assert imps == []


# ── parse_generic ─────────────────────────────────────────────────────────────

class TestParseGeneric:
    def test_always_returns_empty(self):
        syms, imps = parse_generic("anything at all")
        assert syms == []
        assert imps == []


# ── file_hash ─────────────────────────────────────────────────────────────────

class TestFileHash:
    def test_is_deterministic(self, tmp_path):
        f = tmp_path / "a.py"
        f.write_bytes(b"hello")
        assert file_hash(f) == file_hash(f)

    def test_changes_when_content_changes(self, tmp_path):
        f = tmp_path / "a.py"
        f.write_bytes(b"version 1")
        h1 = file_hash(f)
        f.write_bytes(b"version 2")
        h2 = file_hash(f)
        assert h1 != h2

    def test_returns_16_char_hex(self, tmp_path):
        f = tmp_path / "a.py"
        f.write_bytes(b"x")
        h = file_hash(f)
        assert len(h) == 16
        assert all(c in "0123456789abcdef" for c in h)


# ── collect_files ─────────────────────────────────────────────────────────────

class TestCollectFiles:
    def test_finds_python_files(self, tmp_path):
        (tmp_path / "main.py").write_text("pass")
        files = collect_files(tmp_path, set())
        assert any(f.name == "main.py" for f in files)

    def test_finds_js_files(self, tmp_path):
        (tmp_path / "app.js").write_text("// js")
        files = collect_files(tmp_path, set())
        assert any(f.name == "app.js" for f in files)

    def test_ignores_node_modules(self, tmp_path):
        nm = tmp_path / "node_modules"
        nm.mkdir()
        (nm / "lib.js").write_text("// lib")
        files = collect_files(tmp_path, set())
        assert not any("node_modules" in str(f) for f in files)

    def test_ignores_git_dir(self, tmp_path):
        git = tmp_path / ".git"
        git.mkdir()
        (git / "config").write_text("[core]")
        files = collect_files(tmp_path, set())
        assert not any(".git" in str(f) for f in files)

    def test_ignores_pycache(self, tmp_path):
        pc = tmp_path / "__pycache__"
        pc.mkdir()
        (pc / "mod.py").write_text("pass")
        files = collect_files(tmp_path, set())
        assert not any("__pycache__" in str(f) for f in files)

    def test_respects_extra_ignore(self, tmp_path):
        custom = tmp_path / "vendor"
        custom.mkdir()
        (custom / "lib.py").write_text("pass")
        files = collect_files(tmp_path, {"vendor"})
        assert not any("vendor" in str(f) for f in files)

    def test_skips_unknown_extensions(self, tmp_path):
        (tmp_path / "data.csv").write_text("a,b,c")
        (tmp_path / "image.png").write_bytes(b"\x89PNG")
        files = collect_files(tmp_path, set())
        assert not any(f.suffix in {".csv", ".png"} for f in files)


# ── build (integration) ───────────────────────────────────────────────────────

class TestBuildIntegration:
    def test_creates_sqlite_db(self, tmp_path):
        (tmp_path / "main.py").write_text("def hello(): pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())
        assert (tmp_path / ".graph" / "code.db").exists()

    def test_indexes_functions(self, tmp_path):
        (tmp_path / "main.py").write_text("def greet(): pass\ndef farewell(): pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())
        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        names = {row[0] for row in db.execute("SELECT name FROM symbols")}
        db.close()
        assert "greet" in names
        assert "farewell" in names

    def test_indexes_classes(self, tmp_path):
        (tmp_path / "svc.py").write_text("class AuthService: pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())
        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        row = db.execute("SELECT name, kind FROM symbols WHERE name='AuthService'").fetchone()
        db.close()
        assert row is not None
        assert row[1] == "class"

    def test_indexes_imports_as_dependencies(self, tmp_path):
        (tmp_path / "main.py").write_text("from utils import helper\n")
        build(tmp_path, incremental=False, extra_ignore=set())
        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        deps = db.execute("SELECT to_path FROM dependencies").fetchall()
        db.close()
        assert len(deps) > 0

    def test_multiple_files_indexed(self, tmp_path):
        (tmp_path / "a.py").write_text("def foo(): pass\n")
        (tmp_path / "b.py").write_text("def bar(): pass\n")
        (tmp_path / "c.js").write_text("function baz() { }\n")
        build(tmp_path, incremental=False, extra_ignore=set())
        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        n_files = db.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        db.close()
        assert n_files == 3

    def test_incremental_skips_already_indexed_file(self, tmp_path):
        f = tmp_path / "main.py"
        f.write_text("def foo(): pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())

        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        ts1 = db.execute("SELECT indexed FROM files WHERE path='main.py'").fetchone()[0]
        db.close()

        time.sleep(0.05)
        build(tmp_path, incremental=True, extra_ignore=set())

        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        ts2 = db.execute("SELECT indexed FROM files WHERE path='main.py'").fetchone()[0]
        db.close()

        assert ts1 == ts2

    def test_rebuild_updates_changed_file(self, tmp_path):
        f = tmp_path / "main.py"
        f.write_text("def foo(): pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())

        f.write_text("def foo(): pass\ndef bar(): pass\n")
        build(tmp_path, incremental=False, extra_ignore=set())

        db = sqlite3.connect(tmp_path / ".graph" / "code.db")
        names = {r[0] for r in db.execute("SELECT name FROM symbols")}
        db.close()
        assert "bar" in names
