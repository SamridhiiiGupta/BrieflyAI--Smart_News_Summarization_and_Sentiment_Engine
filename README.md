# Smart Article Summarizer

A production-quality, fully free news article summarizer with a dark animated UI.

No paid APIs. No GPU. No 1 GB model downloads.

---

## Features

| Feature | Details |
|---|---|
| **Summary** | Extractive TF-IDF summarization — top sentences in reading order |
| **Key Points** | 5 most important sentences, scored by relevance + position |
| **Sentiment** | VADER (positive / negative / neutral + scores) |
| **Paywall fallback** | Tries `archive.is` automatically if the direct fetch fails |
| **Clean UI** | Dark animated theme with starfield, served by Flask |

---

## Folder structure

```
news-summarizer/
├── app/
│   ├── __init__.py          ← Flask app factory
│   ├── config.py            ← All tuneable settings in one place
│   ├── routes/
│   │   ├── api.py           ← POST /api/summarize  (validated, error-handled)
│   │   └── views.py         ← GET  /  (serves the frontend)
│   └── services/
│       ├── fetcher.py       ← HTTP fetch + paywall detection + archive fallback
│       ├── extractor.py     ← BeautifulSoup text & title extraction
│       └── nlp.py           ← TF-IDF summarizer + key points + VADER sentiment
├── templates/
│   └── index.html           ← Jinja2 template (dark UI)
├── static/
│   ├── css/style.css
│   └── js/main.js
├── requirements.txt         ← Minimal: Flask, requests, bs4, lxml, nltk
└── run.py                   ← Single entry point
```

---

## Quick start

### 1 — Create a virtual environment (recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 2 — Install dependencies

```bash
pip install -r requirements.txt
```

This installs only **6 packages** (Flask, flask-cors, requests, beautifulsoup4, lxml, nltk).
NLTK data files (~2 MB total) are downloaded automatically on first run.

### 3 — Run

```bash
python run.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## Configuration

All settings live in `app/config.py`. Common tweaks:

| Setting | Default | Description |
|---|---|---|
| `SUMMARY_SENTENCE_COUNT` | 4 | Sentences in the summary |
| `KEY_POINTS_COUNT` | 5 | Number of key-point bullets |
| `REQUEST_TIMEOUT` | 10 s | Timeout for direct article fetch |
| `MAX_TEXT_LENGTH` | 50 000 | Max characters processed per article |

---

## How the summarizer works

1. **Fetch** — requests the URL with a browser User-Agent; falls back to `archive.is` on paywall detection.
2. **Extract** — BeautifulSoup strips noise (navs, footers, ads, scripts) and returns clean paragraph text, preferring `<article>` / Open-Graph metadata.
3. **Score** — Each sentence gets a weighted score:
   - **TF-IDF** (40 %) — words important to this document
   - **Position** (25 %) — earlier sentences usually carry the lede
   - **Length** (15 %) — penalises sentence fragments and run-ons
   - **Importance words** (10 %) — "announced", "significant", "confirmed" …
   - **Named entity proxy** (10 %) — capitalised non-stop-words
4. **Select** — top N sentences, restored to reading order.
5. **Sentiment** — NLTK VADER lexicon on the first 5 000 characters.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Port 5000 already in use` | Change the port in `run.py` or kill the other process |
| `ModuleNotFoundError` | Make sure your venv is active and `pip install -r requirements.txt` was run |
| Article returns "not enough content" | The site uses JavaScript rendering (try a different URL) |
| Slow first response | NLTK data is downloading; subsequent requests are fast |
