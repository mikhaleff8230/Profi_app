"""Verify main.py (Expo MVP) imports. Run: python check_mvp.py"""
import sys
import traceback

try:
    import main  # noqa: F401

    print("[OK] main")
    print("[OK] app:", main.app.title)
    sys.exit(0)
except Exception as e:
    print("[FAIL]", e)
    traceback.print_exc()
    sys.exit(1)
