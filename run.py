"""
Entry point — run with:  python run.py
"""
import logging
import sys

from app import create_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

app = create_app()

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  Smart Article Summarizer — starting…")
    print("  Open: http://127.0.0.1:5000")
    print("=" * 60 + "\n")

    try:
        app.run(host="127.0.0.1", port=5000, debug=False)
    except OSError as exc:
        if "Address already in use" in str(exc):
            print("\n[ERROR] Port 5000 is already in use.")
            print("  Stop the other process or change the port in run.py\n")
        else:
            raise
        sys.exit(1)
