"""
NLP processing — 100 % free, runs offline, no model downloads.

Techniques used:
  • Summarization  – TF-IDF sentence scoring (pure Python, no sklearn)
                     + position weighting + length normalisation
  • Key points     – same scoring with a higher importance-indicator bonus
  • Sentiment      – NLTK VADER (tiny lexicon-based analyser, ships with nltk)
"""

import logging
import math
import re
import string
from collections import Counter
from typing import Dict, List

import nltk

logger = logging.getLogger(__name__)

# ── Built-in fallback stopwords (used if NLTK corpus unavailable) ─────────────
_FALLBACK_STOPWORDS = frozenset([
    "a","about","above","after","again","against","all","am","an","and","any",
    "are","aren't","as","at","be","because","been","before","being","below",
    "between","both","but","by","can't","cannot","could","couldn't","did",
    "didn't","do","does","doesn't","doing","don't","down","during","each",
    "few","for","from","further","get","got","had","hadn't","has","hasn't",
    "have","haven't","having","he","he'd","he'll","he's","her","here",
    "here's","hers","herself","him","himself","his","how","how's","i","i'd",
    "i'll","i'm","i've","if","in","into","is","isn't","it","it's","its",
    "itself","let's","me","more","most","mustn't","my","myself","no","nor",
    "not","of","off","on","once","only","or","other","ought","our","ours",
    "ourselves","out","over","own","same","shan't","she","she'd","she'll",
    "she's","should","shouldn't","so","some","such","than","that","that's",
    "the","their","theirs","them","themselves","then","there","there's",
    "these","they","they'd","they'll","they're","they've","this","those",
    "through","to","too","under","until","up","very","was","wasn't","we",
    "we'd","we'll","we're","we've","were","weren't","what","what's","when",
    "when's","where","where's","which","while","who","who's","whom","why",
    "why's","will","with","won't","would","wouldn't","you","you'd","you'll",
    "you're","you've","your","yours","yourself","yourselves",
])

# ── NLTK bootstrap — graceful, never fatal ────────────────────────────────────
_NLTK_RESOURCES = [
    ("tokenizers/punkt",        "punkt"),
    ("tokenizers/punkt_tab",    "punkt_tab"),
    ("corpora/stopwords",       "stopwords"),
    ("sentiment/vader_lexicon", "vader_lexicon"),
]

def _ensure_nltk_resources() -> None:
    for path, pkg in _NLTK_RESOURCES:
        try:
            nltk.data.find(path)
        except (LookupError, OSError):
            try:
                logger.info("Downloading NLTK resource: %s", pkg)
                nltk.download(pkg, quiet=True)
            except Exception as exc:
                logger.warning("Could not download NLTK resource %s: %s", pkg, exc)

_ensure_nltk_resources()

# ── Stopwords: prefer NLTK corpus, fall back to built-in set ─────────────────
try:
    from nltk.corpus import stopwords as _sw_corpus
    _STOPWORDS: frozenset = frozenset(_sw_corpus.words("english"))
except Exception:
    logger.warning("NLTK stopwords unavailable — using built-in fallback set.")
    _STOPWORDS = _FALLBACK_STOPWORDS

# ── Sentence tokenizer: prefer NLTK punkt, fall back to regex ────────────────
try:
    from nltk.tokenize import sent_tokenize as _nltk_sent_tokenize
    _NLTK_SENT_AVAILABLE = True
except ImportError:
    _NLTK_SENT_AVAILABLE = False


def _sent_tokenize(text: str) -> List[str]:
    """Use NLTK punkt if data is present, otherwise fall back to regex."""
    if _NLTK_SENT_AVAILABLE:
        try:
            return _nltk_sent_tokenize(text)
        except LookupError:
            logger.warning("NLTK punkt data missing — falling back to regex splitter.")
    return re.split(r'(?<=[.!?])\s+', text)


# ── VADER sentiment ───────────────────────────────────────────────────────────
try:
    from nltk.sentiment import SentimentIntensityAnalyzer as _SIA
    _SIA_CLASS = _SIA
except ImportError:
    _SIA_CLASS = None  # type: ignore[assignment]

# High-importance trigger words that boost a sentence's key-point score
_IMPORTANCE_WORDS = frozenset([
    "important", "significant", "key", "major", "crucial", "essential",
    "critical", "vital", "main", "primary", "central", "fundamental",
    "announced", "revealed", "discovered", "confirmed", "warned",
    "according", "report", "study", "research", "found", "shows",
])


# ── Helper functions ──────────────────────────────────────────────────────────

def _tokenize_words(text: str) -> List[str]:
    """Lower-cased, punctuation-stripped word tokens."""
    return [
        w.strip(string.punctuation)
        for w in text.lower().split()
        if w.strip(string.punctuation) and w.strip(string.punctuation) not in _STOPWORDS
    ]


def _compute_tfidf(sentences: List[str]) -> List[Dict[str, float]]:
    """
    Compute per-sentence TF-IDF without any external library.
    Returns a list of {word: tfidf_score} dicts — one per sentence.
    """
    n = len(sentences)
    tokenised = [_tokenize_words(s) for s in sentences]

    # Document frequency: how many sentences contain each word
    df: Counter = Counter()
    for tokens in tokenised:
        df.update(set(tokens))

    tfidf_list = []
    for tokens in tokenised:
        tf = Counter(tokens)
        total = len(tokens) or 1
        scores = {
            word: (tf[word] / total) * math.log((n + 1) / (df[word] + 1))
            for word in tf
        }
        tfidf_list.append(scores)

    return tfidf_list


def _score_sentences(
    sentences: List[str],
    importance_bonus: float = 0.3,
) -> List[float]:
    """
    Score each sentence using a weighted combination of:
      • TF-IDF sum        — captures topic-relevant content
      • Position          — earlier sentences usually matter more (news pyramid)
      • Length            — penalise very short or very long sentences
      • Importance words  — bonus for sentences with explicit importance signals
    """
    tfidf_list = _compute_tfidf(sentences)
    n = len(sentences)
    scores = []

    for i, (sentence, tfidf) in enumerate(zip(sentences, tfidf_list)):
        # TF-IDF score (normalised)
        tfidf_score = sum(tfidf.values()) / (len(tfidf) or 1)

        # Position score: 1 for first sentence, decays with index
        position_score = 1.0 / math.log(i + 2)   # log(2)=0.69 for i=0

        # Length score: ideal 15-40 words
        word_count = len(sentence.split())
        if word_count < 8:
            length_score = 0.2
        elif word_count <= 40:
            length_score = min(1.0, word_count / 20.0)
        else:
            length_score = max(0.5, 1.0 - (word_count - 40) / 100.0)

        # Importance-word bonus
        words_lower = sentence.lower().split()
        imp_score = sum(1 for w in words_lower if w in _IMPORTANCE_WORDS) * importance_bonus

        # Named-entity proxy: count non-stop capitalised words
        caps = sum(
            1 for w in sentence.split()
            if w and w[0].isupper() and w.lower() not in _STOPWORDS
        )
        named_entity_score = min(1.0, caps / 5.0)

        total = (
            tfidf_score      * 0.40
            + position_score * 0.25
            + length_score   * 0.15
            + imp_score      * 0.10
            + named_entity_score * 0.10
        )
        scores.append(total)

    return scores


def _split_sentences(text: str) -> List[str]:
    """Split into sentences and filter out junk."""
    raw = _sent_tokenize(text)
    return [
        s.strip()
        for s in raw
        if len(s.split()) >= 6 and not s.strip().startswith("http")
    ]


# ── NLPProcessor ─────────────────────────────────────────────────────────────

class NLPProcessor:
    """Stateless NLP helper — one instance per request is fine."""

    def __init__(self) -> None:
        self._sia = None
        if _SIA_CLASS is not None:
            try:
                self._sia = _SIA_CLASS()
            except (LookupError, Exception) as exc:
                logger.warning("VADER unavailable (data missing?): %s", exc)

    # ── Public API ────────────────────────────────────────────────────────────

    def summarize(self, text: str, n_sentences: int = 4) -> str:
        """
        Return a coherent, extractive summary consisting of the top-scored
        sentences, preserved in their original reading order.
        """
        sentences = _split_sentences(text)
        if not sentences:
            return text[:500]

        if len(sentences) <= n_sentences:
            return " ".join(sentences)

        scores = _score_sentences(sentences)
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        top_indices = sorted(idx for idx, _ in indexed[:n_sentences])
        return " ".join(sentences[i] for i in top_indices)

    def extract_key_points(self, text: str, n_points: int = 5) -> List[str]:
        """
        Return a list of key-point sentences.
        Uses a slightly higher importance_bonus so this set tends to contain
        sentences with explicit signal words — distinct from the summary.
        """
        sentences = _split_sentences(text)
        if not sentences:
            return []

        if len(sentences) <= n_points:
            return sentences

        scores = _score_sentences(sentences, importance_bonus=0.5)
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        top_indices = sorted(idx for idx, _ in indexed[:n_points])
        return [sentences[i] for i in top_indices]

    def analyze_sentiment(self, text: str) -> dict:
        """Return VADER sentiment scores plus a human-readable label."""
        if self._sia is None:
            return {
                "overall": "Neutral",
                "scores": {"compound": 0.0, "pos": 0.0, "neg": 0.0, "neu": 1.0},
            }

        try:
            # VADER works on shorter chunks — analyse first 5 000 chars
            scores = self._sia.polarity_scores(text[:5_000])
            compound = scores["compound"]

            if compound >= 0.05:
                label = "Positive"
            elif compound <= -0.05:
                label = "Negative"
            else:
                label = "Neutral"

            return {"overall": label, "scores": scores}

        except Exception as exc:
            logger.error("Sentiment analysis failed: %s", exc)
            return {
                "overall": "Neutral",
                "scores": {"compound": 0.0, "pos": 0.0, "neg": 0.0, "neu": 1.0},
            }
