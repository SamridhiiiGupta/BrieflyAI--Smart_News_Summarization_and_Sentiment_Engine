import logging
from urllib.parse import urlparse

from flask import Blueprint, current_app, jsonify, request

from app.services.fetcher import ArticleFetcher
from app.services.extractor import ArticleExtractor
from app.services.nlp import NLPProcessor

logger = logging.getLogger(__name__)
api_bp = Blueprint("api", __name__)


def _is_valid_url(url: str) -> bool:
    """Return True only for http/https URLs with a recognisable hostname."""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


@api_bp.route("/summarize", methods=["POST"])
def summarize():
    """
    POST /api/summarize
    Body: { "url": "https://..." }
    Returns a JSON object with summary, key_points, sentiment, title, source.
    """
    # ── 1. Parse & validate input ────────────────────────────────────────────
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "The 'url' field is required."}), 400

    if not _is_valid_url(url):
        return jsonify({"error": "Please provide a valid http/https URL."}), 400

    cfg = current_app.config

    # ── 2. Fetch article HTML ────────────────────────────────────────────────
    try:
        fetcher = ArticleFetcher(
            headers=cfg["SCRAPER_HEADERS"],
            request_timeout=cfg["REQUEST_TIMEOUT"],
            archive_timeout=cfg["ARCHIVE_TIMEOUT"],
            min_paragraph_count=cfg["MIN_PARAGRAPH_COUNT"],
        )
        raw_html, fetch_method = fetcher.fetch(url)
    except Exception as exc:
        logger.warning("Fetch failed for %s: %s", url, exc)
        return jsonify({"error": str(exc)}), 502

    # ── 3. Extract text & title ──────────────────────────────────────────────
    extractor = ArticleExtractor()
    text = extractor.extract_text(raw_html)
    title = extractor.extract_title(raw_html, url)

    if not text or len(text.split()) < 30:
        return jsonify({
            "error": (
                "Not enough readable content was found. "
                "The page may be JavaScript-rendered or behind a paywall."
            )
        }), 422

    # Cap text length to avoid slow processing on huge pages
    text = text[: cfg["MAX_TEXT_LENGTH"]]

    # ── 4. NLP processing ────────────────────────────────────────────────────
    nlp = NLPProcessor()
    summary = nlp.summarize(text, n_sentences=cfg["SUMMARY_SENTENCE_COUNT"])
    key_points = nlp.extract_key_points(text, n_points=cfg["KEY_POINTS_COUNT"])
    sentiment = nlp.analyze_sentiment(text)

    # ── 5. Build & return response ───────────────────────────────────────────
    return jsonify({
        "title": title,
        "summary": summary,
        "key_points": key_points,
        "sentiment": sentiment,
        "url": url,
        "source": fetch_method,
    })


# ── Global error handlers ────────────────────────────────────────────────────

@api_bp.errorhandler(404)
def not_found(_err):
    return jsonify({"error": "Endpoint not found."}), 404


@api_bp.errorhandler(405)
def method_not_allowed(_err):
    return jsonify({"error": "Method not allowed."}), 405


@api_bp.errorhandler(500)
def internal_error(_err):
    return jsonify({"error": "An unexpected server error occurred."}), 500
