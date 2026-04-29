"""
Production WSGI entry point.
Render/gunicorn calls this — NOT run.py (which is for local dev only).
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
