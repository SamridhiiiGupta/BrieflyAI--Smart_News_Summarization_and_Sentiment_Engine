"use strict";

/* ════════════════════════════════════════════════════════════════════════════
   BrieflyAI — Premium Interaction System
   Every interaction is coordinated through this single file.
════════════════════════════════════════════════════════════════════════════ */


/* ── 1. STARFIELD ─────────────────────────────────────────────────────────── */
(function buildStarfield() {
    const scene = document.createElement("div");
    scene.className = "starfield";
    for (let i = 0; i < 120; i++) {
        const s = document.createElement("div");
        const size = Math.random() * 1.8 + 0.3;
        Object.assign(s.style, {
            position:        "absolute",
            left:            `${Math.random() * 100}%`,
            top:             `${Math.random() * 100}%`,
            width:           `${size}px`,
            height:          `${size}px`,
            background:      "rgba(255,255,255,0.8)",
            borderRadius:    "50%",
            animation:       `twinkle ${4 + Math.random() * 8}s ease-in-out ${Math.random() * 6}s infinite`,
        });
        if (Math.random() > 0.6) s.style.boxShadow = "0 0 3px rgba(255,255,255,0.6)";
        scene.appendChild(s);
    }
    document.body.appendChild(scene);
})();


/* ── 2. RIPPLE on .ripple-btn ─────────────────────────────────────────────── */
document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".ripple-btn");
    if (!btn) return;
    const rect  = btn.getBoundingClientRect();
    const size  = Math.max(rect.width, rect.height) * 1.6;
    const wave  = document.createElement("span");
    wave.className = "ripple-wave";
    Object.assign(wave.style, {
        width:  `${size}px`,
        height: `${size}px`,
        left:   `${e.clientX - rect.left - size / 2}px`,
        top:    `${e.clientY - rect.top  - size / 2}px`,
    });
    btn.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove(), { once: true });
});


/* ── 3. MAGNETIC BUTTON (primary CTA only) ────────────────────────────────── */
(function initMagnetic() {
    const btn = document.getElementById("submit-btn");
    if (!btn) return;

    btn.addEventListener("mousemove", (e) => {
        const rect   = btn.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) * 0.28;
        const dy     = (e.clientY - cy) * 0.28;
        btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
    });

    btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
    });
})();


/* ── 4. 3-D CARD TILT ─────────────────────────────────────────────────────── */
function initTilt(el) {
    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) / (rect.width  / 2);   // -1 … 1
        const dy   = (e.clientY - cy) / (rect.height / 2);   // -1 … 1
        const tiltX = dy * -5;   // degrees
        const tiltY = dx *  5;
        el.style.transform =
            `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale(1.01)`;
        el.style.boxShadow =
            `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(123,104,238,0.3)`;
    });

    el.addEventListener("mouseleave", () => {
        el.style.transform = "";
        el.style.boxShadow = "";
    });
}

document.querySelectorAll(".tilt-card").forEach(initTilt);


/* ── 5. SCROLL PARALLAX for background particles ─────────────────────────── */
(function initParallax() {
    const particles = document.querySelectorAll(".bg-particle");
    const speeds    = [0.04, 0.07, 0.05, 0.06];

    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            particles.forEach((p, i) => {
                p.style.transform = `translateY(${y * speeds[i]}px)`;
            });
            ticking = false;
        });
    }, { passive: true });
})();


/* ── 6. DOM REFS ──────────────────────────────────────────────────────────── */
const form          = document.getElementById("article-form");
const urlInput      = document.getElementById("article-url");
const submitBtn     = document.getElementById("submit-btn");
const loader        = document.getElementById("loader");
const results       = document.getElementById("results");
const errorBox      = document.getElementById("error-message");

const articleTitle  = document.getElementById("article-title");
const sourceBadge   = document.getElementById("source-badge");
const readingTime   = document.getElementById("reading-time");
const summaryEl     = document.getElementById("summary");
const keyPointsEl   = document.getElementById("key-points");
const sourceInfo    = document.getElementById("source-info");
const sourceMsg     = document.getElementById("source-message");
const originalLink  = document.getElementById("original-article");

const sentimentLabel  = document.getElementById("sentiment-label");
const compoundScore   = document.getElementById("compound-score");
const positiveScore   = document.getElementById("positive-score");
const negativeScore   = document.getElementById("negative-score");
const neutralScore    = document.getElementById("neutral-score");
const positiveMeter   = document.getElementById("positive-meter");
const negativeMeter   = document.getElementById("negative-meter");

const copySummaryBtn   = document.getElementById("copy-summary");
const copyKeyPointsBtn = document.getElementById("copy-key-points");


/* ── 7. FORM SUBMIT ───────────────────────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return;

    hideError();
    results.style.display = "none";
    loader.style.display  = "block";
    submitBtn.disabled    = true;

    try {
        const response = await fetch("/api/summarize", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ url }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to analyse the article.");

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


/* ── 8. RENDER RESULTS ────────────────────────────────────────────────────── */
function renderResults(data, url) {
    // Basic fields
    articleTitle.textContent = data.title || "Article";
    originalLink.href        = url;

    sourceBadge.textContent = data.source === "direct" ? "Direct Source" : "Archive.is";
    sourceBadge.className   = `source-badge source-${data.source}`;

    if (data.source !== "direct") {
        sourceMsg.textContent = "Retrieved from an archived copy — the original may have a paywall.";
        sourceInfo.style.display = "block";
    } else {
        sourceInfo.style.display = "none";
    }

    const wordCount = (data.summary || "").split(/\s+/).length;
    readingTime.textContent = `${Math.max(1, Math.ceil(wordCount / 200))} min`;

    summaryEl.textContent = data.summary || "No summary available.";

    // Key points with staggered animation
    keyPointsEl.innerHTML = "";
    (data.key_points || []).forEach((point, i) => {
        const div = document.createElement("div");
        div.className = "key-point";
        div.innerHTML = `<span class="count-badge" aria-hidden="true">${i + 1}</span><span>${escapeHtml(point)}</span>`;
        keyPointsEl.appendChild(div);

        // Stagger the slide-in
        setTimeout(() => {
            div.classList.add("visible");
        }, i * 90);
    });

    renderSentiment(data.sentiment);

    // Reveal results panel
    results.style.display = "block";
    // Re-attach tilt to the newly visible card
    document.querySelectorAll(".results-card").forEach(initTilt);

    setTimeout(() => {
        results.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
}


/* ── 9. SENTIMENT ─────────────────────────────────────────────────────────── */
function renderSentiment(sentiment) {
    if (!sentiment) return;
    const label  = sentiment.overall || "Neutral";
    const scores = sentiment.scores  || {};

    sentimentLabel.textContent = label;
    sentimentLabel.className   = `sentiment-${label.toLowerCase()}`;

    compoundScore.textContent = (scores.compound ?? 0).toFixed(2);
    positiveScore.textContent = (scores.pos      ?? 0).toFixed(2);
    negativeScore.textContent = (scores.neg      ?? 0).toFixed(2);
    neutralScore.textContent  = (scores.neu      ?? 0).toFixed(2);

    // Animate bars (CSS transition picks this up)
    requestAnimationFrame(() => {
        positiveMeter.style.width = `${(scores.pos ?? 0) * 50}%`;
        negativeMeter.style.width = `${(scores.neg ?? 0) * 50}%`;
    });
}


/* ── 10. COPY BUTTONS ─────────────────────────────────────────────────────── */
copySummaryBtn.addEventListener("click", () =>
    copyText(summaryEl.textContent, copySummaryBtn)
);

copyKeyPointsBtn.addEventListener("click", () => {
    const text = [...keyPointsEl.querySelectorAll(".key-point span:last-child")]
        .map((el, i) => `${i + 1}. ${el.textContent}`)
        .join("\n");
    copyText(text, copyKeyPointsBtn);
});

async function copyText(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add("copied");
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove("copied"); }, 1600);
    } catch { /* silent */ }
}


/* ── 11. ERROR HELPERS ────────────────────────────────────────────────────── */
function showError(msg) {
    errorBox.innerHTML     = `<i class="fas fa-exclamation-triangle me-2"></i>${escapeHtml(msg)}`;
    errorBox.style.display = "block";
    // Re-trigger shake animation
    errorBox.style.animation = "none";
    void errorBox.offsetWidth;
    errorBox.style.animation = "";
}

function hideError() {
    errorBox.style.display = "none";
    errorBox.innerHTML     = "";
}


/* ── 12. UTILITY ──────────────────────────────────────────────────────────── */
function escapeHtml(str) {
    const m = { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" };
    return String(str).replace(/[&<>"']/g, c => m[c]);
}


/* ── 13. BOOTSTRAP TOOLTIPS ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el);
    });
});
