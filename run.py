"""
BrieflyAI — entry point
Run with:  python run.py
"""
import logging
import sys
import threading
import time
import webbrowser

from app import create_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

HOST = "127.0.0.1"
PORT = 5000
URL  = f"http://{HOST}:{PORT}"


def _open_browser():
    """Wait briefly for Flask to bind, then open the browser."""
    time.sleep(1.2)
    webbrowser.open(URL)


app = create_app()

if __name__ == "__main__":
    print("\n" + "=" * 62)
    print("  ✦  BrieflyAI — Smart News Summarization & Sentiment Engine")
    print(f"  ✦  Running at  {URL}")
    print("  ✦  Press  Ctrl+C  to stop")
    print("=" * 62 + "\n")

    # Launch browser in background thread — doesn't block Flask startup
    threading.Thread(target=_open_browser, daemon=True).start()

    try:
        app.run(host=HOST, port=PORT, debug=False)
    except OSError as exc:
        if "Address already in use" in str(exc):
            print(f"\n[ERROR] Port {PORT} is already in use.")
            print("  Stop the other process or change PORT in run.py\n")
        else:
            raise
        sys.exit(1)
