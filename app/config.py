import os


class Config:
    """Central configuration for the application."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    # Request settings
    REQUEST_TIMEOUT = 10          # seconds for HTTP requests
    ARCHIVE_TIMEOUT = 15          # seconds for archive.is fallback

    # Summarization settings
    SUMMARY_SENTENCE_COUNT = 4    # sentences in the final summary
    KEY_POINTS_COUNT = 5          # bullet points to extract
    MIN_SENTENCE_WORDS = 8        # ignore very short sentences
    MAX_TEXT_LENGTH = 50_000      # characters — cap before processing

    # Paywall detection
    MIN_PARAGRAPH_COUNT = 3       # fewer paragraphs → likely paywall

    # HTTP headers to mimic a real browser
    SCRAPER_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
