"""
Code Graph Query API

Usage:
    python query.py summary
    python query.py blast_radius src/auth/login.py
    python query.py deps src/auth/login.py
    python query.py search UserService
    python query.py search validate_token
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = ".graph/code.db"


def get_db(root: Path = Path(".")) -> sqlite3.Connection:
    db_file = root / DB_PATH
    if not db_file.exists():
        print(f"Graph not found at {db_file}. Run build.py first.", file=sys.stderr)
        sys.exit(1)
    db = sqlite3.connect(db_file)
    db.row_factory = sqlite3.Row
    return db


# ── Queries ───────────────────────────────────────────────────────────────────

def summary(db: sqlite3.Connection):
    """High-level overview of the codebase."""
    n_files = db.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    n_sym   = db.execute("SELECT COUNT(*) FROM symbols").fetchone()[0]
    n_deps  = db.execute("SELECT COUNT(*) FROM dependencies").fetchone()[0]

    print(f"Files:       {n_files}")
    print(f"Symbols:     {n_sym}")
    print(f"Imports:     {n_deps}")

    print("\nBy language:")
    for row in db.execute("SELECT lang, COUNT(*) as n FROM files GROUP BY lang ORDER BY n DESC"):
        print(f"  {row['lang'] or 'unknown':12s}  {row['n']} files")

    print("\nMost connected files (most dependencies):")
    rows = db.execute("""
        SELECT f.path, COUNT(d.id) as n
        FROM files f
        LEFT JOIN dependencies d ON d.from_file = f.id
        GROUP BY f.id ORDER BY n DESC LIMIT 10
    """).fetchall()
    for row in rows:
        print(f"  {row['n']:4d}  {row['path']}")


def blast_radius(db: sqlite3.Connection, target: str) -> list[str]:
    """Files that import or depend on target (directly or transitively)."""
    visited = set()
    queue = [target]

    while queue:
        current = queue.pop()
        if current in visited:
            continue
        visited.add(current)

        rows = db.execute("""
            SELECT f.path
            FROM dependencies d
            JOIN files f ON f.id = d.from_file
            WHERE d.to_path LIKE ?
        """, (f"%{Path(current).stem}%",)).fetchall()

        for row in rows:
            if row["path"] not in visited:
                queue.append(row["path"])

    visited.discard(target)
    return sorted(visited)


def deps(db: sqlite3.Connection, target: str) -> list[str]:
    """Files that target directly imports."""
    file_row = db.execute("SELECT id FROM files WHERE path = ?", (target,)).fetchone()
    if not file_row:
        print(f"File not found in graph: {target}")
        return []

    rows = db.execute("""
        SELECT to_path FROM dependencies WHERE from_file = ?
    """, (file_row["id"],)).fetchall()

    results = []
    for row in rows:
        match = db.execute(
            "SELECT path FROM files WHERE path LIKE ?",
            (f"%{row['to_path'].split('/')[-1]}%",)
        ).fetchone()
        results.append(match["path"] if match else row["to_path"] + " (external)")

    return sorted(set(results))


def search(db: sqlite3.Connection, symbol: str) -> list[dict]:
    """Find where a symbol is defined and which files use it."""
    defs = db.execute("""
        SELECT f.path, s.kind, s.line, s.name
        FROM symbols s
        JOIN files f ON f.id = s.file_id
        WHERE s.name LIKE ?
        ORDER BY s.name
    """, (f"%{symbol}%",)).fetchall()

    usages = db.execute("""
        SELECT DISTINCT f.path
        FROM files f
        JOIN dependencies d ON d.from_file = f.id
        WHERE d.to_path LIKE ?
    """, (f"%{symbol.lower()}%",)).fetchall()

    return {"definitions": list(defs), "usages": [r["path"] for r in usages]}


# ── Formatting ────────────────────────────────────────────────────────────────

def print_blast_radius(target: str, files: list[str]):
    if not files:
        print(f"No files depend on '{target}'.")
        return
    print(f"Blast radius for '{target}' ({len(files)} files):")
    for f in files:
        print(f"  {f}")


def print_deps(target: str, files: list[str]):
    if not files:
        print(f"'{target}' has no indexed dependencies.")
        return
    print(f"Dependencies of '{target}' ({len(files)}):")
    for f in files:
        print(f"  {f}")


def print_search(symbol: str, result: dict):
    defs = result["definitions"]
    usages = result["usages"]

    if not defs:
        print(f"No definitions found for '{symbol}'.")
    else:
        print(f"Definitions of '{symbol}':")
        for d in defs:
            print(f"  {d['path']}:{d['line']}  [{d['kind']}] {d['name']}")

    if usages:
        print(f"\nFiles that may use '{symbol}':")
        for f in usages:
            print(f"  {f}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1]
    db = get_db()

    if cmd == "summary":
        summary(db)

    elif cmd == "blast_radius":
        if len(sys.argv) < 3:
            print("Usage: query.py blast_radius <file>")
            sys.exit(1)
        result = blast_radius(db, sys.argv[2])
        print_blast_radius(sys.argv[2], result)

    elif cmd == "deps":
        if len(sys.argv) < 3:
            print("Usage: query.py deps <file>")
            sys.exit(1)
        result = deps(db, sys.argv[2])
        print_deps(sys.argv[2], result)

    elif cmd == "search":
        if len(sys.argv) < 3:
            print("Usage: query.py search <symbol>")
            sys.exit(1)
        result = search(db, sys.argv[2])
        print_search(sys.argv[2], result)

    else:
        print(f"Unknown command: {cmd}")
        print("Commands: summary | blast_radius | deps | search")
        sys.exit(1)

    db.close()


if __name__ == "__main__":
    main()
