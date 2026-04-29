"use strict";

/* ── Starfield ──────────────────────────────────────────────────────────── */
(function createStarfield() {
    const scene = document.createElement("div");
    scene.className = "animated-bg";

    for (let i = 0; i < 110; i++) {
        const star = document.createElement("div");
        const size = Math.random() * 1.8 + 0.4;

        Object.assign(star.style, {
            position:        "absolute",
            left:            `${Math.random() * 100}%`,
            top:             `${Math.random() * 100}%`,
            width:           `${size}px`,
            height:          `${size}px`,
            backgroundColor: "rgba(255,255,255,0.75)",
            borderRadius:    "50%",
            animation:       `twinkle ${3 + Math.random() * 7}s ease-in-out ${Math.random() * 5}s infinite`,
        });

        if (Math.random() > 0.65) {
            star.style.boxShadow = "0 0 3px rgba(255,255,255,0.7)";
        }

        scene.appendChild(star);
    }

    document.body.appendChild(scene);
})();


/* ── DOM references ─────────────────────────────────────────────────────── */
const form          = document.getElementById("article-form");
const urlInput      = document.getElementById("article-url");
const submitBtn     = document.getElementById("submit-btn");
const loader        = document.getElementById("loader");
const results       = document.getElementById("results");
const errorBox      = document.getElementById("error-message");

// Result fields
const articleTitle  = document.getElementById("article-title");
const sourceBadge   = document.getElementById("source-badge");
const readingTime   = document.getElementById("reading-time");
const summaryEl     = document.getElementById("summary");
const keyPointsEl   = document.getElementById("key-points");
const sourceInfo    = document.getElementById("source-info");
const sourceMsg     = document.getElementById("source-message");
const originalLink  = document.getElementById("original-article");

// Sentiment
const sentimentLabel    = document.getElementById("sentiment-label");
const compoundScore     = document.getElementById("compound-score");
const positiveScore     = document.getElementById("positive-score");
const negativeScore     = document.getElementById("negative-score");
const neutralScore      = document.getElementById("neutral-score");
const positiveMeter     = document.getElementById("positive-meter");
const negativeMeter     = document.getElementById("negative-meter");

// Copy buttons
const copySummaryBtn    = document.getElementById("copy-summary");
const copyKeyPointsBtn  = document.getElementById("copy-key-points");


/* ── Form submit ────────────────────────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return;

    // Reset UI
    hideError();
    results.style.display   = "none";
    loader.style.display    = "block";
    submitBtn.disabled      = true;

    try {
        const response = await fetch("/api/summarize", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to analyse the article.");
        }

        renderResults(data, url);

    } catch (err) {
        showError(
            err.message.startsWith("Failed to fetch")
                ? "Could not connect to the server. Make sure it is running."
                : err.message
        );
    } finally {
        loader.style.display = "none";
        submitBtn.disabled   = false;
    }
});


/* ── Render results ─────────────────────────────────────────────────────── */
function renderResults(data, url) {

    // Title & link
    articleTitle.textContent = data.title || "Article";
    originalLink.href        = url;

    // Source badge
    sourceBadge.textContent = data.source === "direct" ? "Direct Source" : "Archive.is";
    sourceBadge.className   = `source-badge source-${data.source}`;

    // Source info alert
    if (data.source !== "direct") {
        sourceMsg.textContent =
            "This article was retrieved from an archived version — the original may have a paywall.";
        sourceInfo.style.display = "block";
    } else {
        sourceInfo.style.display = "none";
    }

    // Reading time (based on summary word count — proxy)
    const wordCount = (data.summary || "").split(/\s+/).length;
    readingTime.textContent = `${Math.max(1, Math.ceil(wordCount / 200))} min`;

    // Summary
    summaryEl.textContent = data.summary || "No summary available.";

    // Key points
    keyPointsEl.innerHTML = "";
    (data.key_points || []).forEach((point, i) => {
        const div = document.createElement("div");
        div.className = "key-point d-flex align-items-start";
        div.innerHTML = `<span class="count-badge" aria-hidden="true">${i + 1}</span><span>${escapeHtml(point)}</span>`;
        keyPointsEl.appendChild(div);
    });

    // Sentiment
    renderSentiment(data.sentiment);

    // Show results + scroll
    results.style.display = "block";
    results.scrollIntoView({ behavior: "smooth", block: "start" });
}


function renderSentiment(sentiment) {
    if (!sentiment) return;

    const label  = sentiment.overall  || "Neutral";
    const scores = sentiment.scores   || {};

    sentimentLabel.textContent = label;
    sentimentLabel.className   = "";   // clear old classes
    sentimentLabel.classList.add(`sentiment-${label.toLowerCase()}`);

    compoundScore.textContent  = (scores.compound ?? 0).toFixed(2);
    positiveScore.textContent  = (scores.pos      ?? 0).toFixed(2);
    negativeScore.textContent  = (scores.neg      ?? 0).toFixed(2);
    neutralScore.textContent   = (scores.neu      ?? 0).toFixed(2);

    // Meter bars: each side is max 50 % of the full bar
    positiveMeter.style.width = `${(scores.pos ?? 0) * 50}%`;
    negativeMeter.style.width = `${(scores.neg ?? 0) * 50}%`;
}


/* ── Copy buttons ───────────────────────────────────────────────────────── */
copySummaryBtn.addEventListener("click", () => {
    copyText(summaryEl.textContent, copySummaryBtn);
});

copyKeyPointsBtn.addEventListener("click", () => {
    const points = [...keyPointsEl.querySelectorAll(".key-point span:last-child")]
        .map((el, i) => `${i + 1}. ${el.textContent}`)
        .join("\n");
    copyText(points, copyKeyPointsBtn);
});


async function copyText(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const original = btn.innerHTML;
        btn.innerHTML  = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = original; }, 1500);
    } catch {
        /* Clipboard API unavailable — silent fail */
    }
}


/* ── Error helpers ──────────────────────────────────────────────────────── */
function showError(msg) {
    errorBox.innerHTML     = `<i class="fas fa-exclamation-triangle me-2"></i>${escapeHtml(msg)}`;
    errorBox.style.display = "block";
}

function hideError() {
    errorBox.style.display = "none";
    errorBox.innerHTML     = "";
}


/* ── Utilities ──────────────────────────────────────────────────────────── */
function escapeHtml(str) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
}


/* ── Bootstrap tooltips init ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        new bootstrap.Tooltip(el);
    });
});
