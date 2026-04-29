import re
import logging
from urllib.parse import urlparse

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_NOISE_TAGS = ["script", "style", "nav", "header", "footer", "aside",
               "form", "button", "noscript", "iframe", "figure"]

_NOISE_PATTERNS = re.compile(
    r"(menu|nav|sidebar|footer|header|cookie|banner|ad-|advert|promo|"
    r"social|share|related|comment|subscribe|newsletter|popup|modal)",
    re.IGNORECASE,
)


class ArticleExtractor:

    def extract_text(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        self._strip_noise(soup)
        article_body = self._find_article_body(soup)
        target = article_body if article_body else (soup.body or soup)

        paragraphs = []
        for tag in target.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li"]):
            text = tag.get_text(separator=" ", strip=True)
            if len(text.split()) >= 5:
                paragraphs.append(text)

        combined = " ".join(paragraphs)
        return re.sub(r"\s+", " ", combined).strip()

    def extract_title(self, html: str, original_url: str = "") -> str:
        soup = BeautifulSoup(html, "html.parser")

        og = soup.find("meta", property="og:title")
        if og and og.get("content"):
            return og["content"].strip()

        tw = soup.find("meta", attrs={"name": "twitter:title"})
        if tw and tw.get("content"):
            return tw["content"].strip()

        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            if original_url:
                site = urlparse(original_url).netloc.replace("www.", "").split(".")[0].capitalize()
                title_text = re.sub(rf"\s*[|\-–—]\s*{re.escape(site)}.*$", "", title_text)
            return title_text.strip()

        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)

        return "Article"

    def _strip_noise(self, soup: BeautifulSoup) -> None:
        # Remove known noise tags
        for tag in soup.find_all(_NOISE_TAGS):
            tag.decompose()

        # Remove elements with noisy class/id names.
        # Wrapped in try/except because some BS4 node types (NavigableString,
        # ProcessingInstruction, etc.) have attrs=None and will crash on .get()
        for tag in soup.find_all(True):
            try:
                attrs = tag.attrs
                if not attrs:
                    continue
                classes = " ".join(attrs.get("class") or [])
                tag_id  = attrs.get("id") or ""
                if _NOISE_PATTERNS.search(classes) or _NOISE_PATTERNS.search(tag_id):
                    tag.decompose()
            except Exception:
                continue

    def _find_article_body(self, soup: BeautifulSoup):
        article = soup.find("article")
        if article:
            return article

        for selector in [
            "[class*='article-body']", "[class*='article-content']",
            "[class*='post-content']", "[class*='entry-content']",
            "[class*='story-body']",   "[itemprop='articleBody']",
            "main",
        ]:
            found = soup.select_one(selector)
            if found:
                return found

        return None
