import logging
from typing import Tuple

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Terms that reliably indicate a paywall or login gate
_PAYWALL_TERMS = frozenset([
    "subscribe to continue",
    "subscribe to read",
    "subscription required",
    "premium article",
    "to continue reading",
    "create an account to continue",
    "sign up to read more",
    "subscribe for full access",
    "paid subscribers only",
    "this article is for subscribers",
    "already a subscriber? sign in",
])


class ArticleFetcher:
    """
    Fetches raw HTML for a given URL.

    Strategy (in order):
      1. Direct HTTP GET with a browser-like User-Agent.
      2. Archive.is cached copy (if direct fails or paywall detected).

    Returns a tuple of (html_string, method_label).
    Raises RuntimeError if all strategies fail.
    """

    def __init__(
        self,
        headers: dict,
        request_timeout: int = 10,
        archive_timeout: int = 15,
        min_paragraph_count: int = 3,
    ) -> None:
        self._headers = headers
        self._req_timeout = request_timeout
        self._arc_timeout = archive_timeout
        self._min_paragraphs = min_paragraph_count

    # ── Public ────────────────────────────────────────────────────────────────

    def fetch(self, url: str) -> Tuple[str, str]:
        """Return (html, method) or raise RuntimeError."""
        # 1 — Direct fetch
        try:
            html = self._direct_fetch(url)
            if not self._is_paywall(html):
                logger.info("Fetched %s via direct request.", url)
                return html, "direct"
            logger.info("Paywall detected at %s. Trying archive…", url)
        except Exception as exc:
            logger.warning("Direct fetch failed for %s: %s", url, exc)

        # 2 — Archive.is fallback
        try:
            html = self._archive_fetch(url)
            logger.info("Fetched %s via archive.is.", url)
            return html, "archive"
        except Exception as exc:
            logger.warning("Archive fetch failed for %s: %s", url, exc)

        raise RuntimeError(
            "Could not retrieve the article. "
            "The site may have a strict paywall or bot protection."
        )

    # ── Private ───────────────────────────────────────────────────────────────

    def _direct_fetch(self, url: str) -> str:
        response = requests.get(
            url, headers=self._headers, timeout=self._req_timeout
        )
        response.raise_for_status()
        return response.text

    def _archive_fetch(self, url: str) -> str:
        archive_url = f"https://archive.is/newest/{url}"
        response = requests.get(
            archive_url, headers=self._headers, timeout=self._arc_timeout
        )
        response.raise_for_status()
        return response.text

    def _is_paywall(self, html: str) -> bool:
        """Heuristic: returns True if the page looks like a login / paywall gate."""
        soup = BeautifulSoup(html, "html.parser")
        body_text = soup.get_text(separator=" ").lower()

        # Keyword check
        if any(term in body_text for term in _PAYWALL_TERMS):
            return True

        # Very few paragraphs → probably a stub page
        paragraphs = [p for p in soup.find_all("p") if len(p.get_text(strip=True)) > 40]
        return len(paragraphs) < self._min_paragraphs
