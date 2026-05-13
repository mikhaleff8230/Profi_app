"""
Проверка импортов перед запуском uvicorn.
Запуск из каталога backend:
  python check_imports.py
  .\\.venv\\Scripts\\python.exe check_imports.py
"""
from __future__ import annotations

import sys
import traceback


def _try(name: str, fn) -> bool:
    try:
        fn()
        print(f"[OK] {name}")
        return True
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        traceback.print_exc()
        return False


def main() -> int:
    ok = True
    ok &= _try("db", lambda: __import__("db"))
    ok &= _try("models", lambda: __import__("models"))
    ok &= _try("seed", lambda: __import__("seed"))
    ok &= _try("server", lambda: __import__("server"))
    if ok:
        app = __import__("server").app
        print(f"[OK] FastAPI app: {app.title!r}")
        print("Все импорты успешны. Запуск: uvicorn server:app --reload --host 127.0.0.1 --port 8001")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
