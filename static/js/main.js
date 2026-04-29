"use strict";

/* ════════════════════════════════════════════════════════════════════════
   BrieflyAI — Premium Interaction System
════════════════════════════════════════════════════════════════════════ */


/* ── 1. CANVAS STARFIELD ─────────────────────────────────────────────── */
(function initStarfield() {
    const canvas = document.createElement("canvas");
    canvas.id = "starfield-canvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let W, H, stars = [], shootingStars = [];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function makeStar() {
        return {
            x:       Math.random() * W,
            y:       Math.random() * H,
            r:       Math.random() * 1.4 + 0.2,
            alpha:   Math.random(),
            dAlpha:  (Math.random() * 0.006 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
            color:   Math.random() > 0.85
                         ? `hsl(${200 + Math.random()*80},80%,85%)`  // blue-purple tint
                         : "rgba(255,255,255,1)",
        };
    }

    function makeShootingStar() {
        const angle = (Math.random() * 30 + 10) * Math.PI / 180;
        return {
            x:    Math.random() * W * 0.7,
            y:    Math.random() * H * 0.4,
            len:  Math.random() * 180 + 80,
            speed: Math.random() * 12 + 8,
            alpha: 1,
            angle,
            vx: Math.cos(angle),
            vy: Math.sin(angle),
            tail: [],
            life:  1,
        };
    }

    function initStars() {
        stars = Array.from({ length: 160 }, makeStar);
    }

    function spawnShootingStar() {
        if (shootingStars.length < 2 && Math.random() < 0.004) {
            shootingStars.push(makeShootingStar());
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Stars
        stars.forEach(s => {
            s.alpha += s.dAlpha;
            if (s.alpha <= 0 || s.alpha >= 1) s.dAlpha *= -1;
            s.alpha = Math.max(0.05, Math.min(1, s.alpha));

            ctx.save();
            ctx.globalAlpha = s.alpha * 0.9;
            ctx.fillStyle = s.color;
            ctx.shadowBlur  = s.r > 1 ? 6 : 0;
            ctx.shadowColor = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Shooting stars
        shootingStars = shootingStars.filter(ss => ss.life > 0);
        shootingStars.forEach(ss => {
            ss.x += ss.vx * ss.speed;
            ss.y += ss.vy * ss.speed;
            ss.life -= 0.018;

            const grad = ctx.createLinearGradient(
                ss.x, ss.y,
                ss.x - ss.vx * ss.len, ss.y - ss.vy * ss.len
            );
            grad.addColorStop(0, `rgba(200,190,255,${ss.life})`);
            grad.addColorStop(1, "rgba(200,190,255,0)");

            ctx.save();
            ctx.globalAlpha = ss.life;
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(ss.x - ss.vx * ss.len, ss.y - ss.vy * ss.len);
            ctx.stroke();
            ctx.restore();
        });

        spawnShootingStar();
        requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();
    window.addEventListener("resize", () => { resize(); initStars(); });
})();


/* ── 2. RIPPLE ────────────────────────────────────────────────────────── */
document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".ripple-btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    Object.assign(wave.style, {
        width:  `${size}px`, height: `${size}px`,
        left:   `${e.clientX - rect.left  - size / 2}px`,
        top:    `${e.clientY - rect.top   - size / 2}px`,
    });
    btn.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove(), { once: true });
});


/* ── 3. MAGNETIC CTA ──────────────────────────────────────────────────── */
(function initMagnetic() {
    const btn = document.getElementById("submit-btn");
    if (!btn) return;
    btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) * 0.28;
        const dy = (e.clientY - (r.top  + r.height / 2)) * 0.28;
        btn.style.transform = `translate(${dx}px,${dy}px) scale(1.03)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
})();


/* ── 4. 3-D CARD TILT ────────────────────────────────────────────────── */
function initTilt(el) {
    el.addEventListener("mousemove", (e) => {
        const r  = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
        const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
        el.style.transform = `perspective(900px) rotateX(${dy * -5}deg) rotateY(${dx * 5}deg) translateY(-4px) scale(1.01)`;
        el.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(123,104,238,0.25)";
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; el.style.boxShadow = ""; });
}
document.querySelectorAll(".tilt-card").forEach(initTilt);


/* ── 5. PARALLAX on background orbs ─────────────────────────────────── */
(function initParallax() {
    const particles = document.querySelectorAll(".bg-particle");
    const speeds    = [0.03, 0.06, 0.045, 0.055];
    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            particles.forEach((p, i) => { p.style.transform = `translateY(${y * speeds[i]}px)`; });
            ticking = false;
        });
    }, { passive: true });
})();


/* ── 6. CURSOR GLOW ──────────────────────────────────────────────────── */
(function initCursorGlow() {
    const glow = document.createElement("div");
    Object.assign(glow.style, {
        position:      "fixed",
        width:         "320px",
        height:        "320px",
        borderRadius:  "50%",
        background:    "radial-gradient(circle, rgba(123,104,238,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex:        "2",
        transform:     "translate(-50%,-50%)",
        transition:    "left 0.12s ease, top 0.12s ease",
    });
    document.body.appendChild(glow);
    window.addEventListener("mousemove", (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top  = `${e.clientY}px`;
    }, { passive: true });
})();


/* ── 7. DOM REFS ─────────────────────────────────────────────────────── */
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


/* ── 8. FORM SUBMIT ──────────────────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    hideError();
    results.style.display = "none";
    loader.style.display  = "block";
    submitBtn.disabled    = true;

    try {
        const res  = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to analyse the article.");
        renderResults(data, url);
    } catch (err) {
        showError(err.message.startsWith("Failed to fetch")
            ? "Could not connect to the server."
            : err.message);
    } finally {
        loader.style.display = "none";
        submitBtn.disabled   = false;
    }
});


/* ── 9. RENDER RESULTS ───────────────────────────────────────────────── */
function renderResults(data, url) {
    articleTitle.textContent = data.title || "Article";
    originalLink.href        = url;

    sourceBadge.textContent = data.source === "direct" ? "Direct Source" : "Archive.is";
    sourceBadge.className   = `source-badge source-${data.source}`;

    if (data.source !== "direct") {
        sourceMsg.textContent    = "Retrieved from an archived copy — the original may have a paywall.";
        sourceInfo.style.display = "block";
    } else {
        sourceInfo.style.display = "none";
    }

    const wc = (data.summary || "").split(/\s+/).length;
    readingTime.textContent = `${Math.max(1, Math.ceil(wc / 200))} min`;
    summaryEl.textContent   = data.summary || "No summary available.";

    // Staggered key points
    keyPointsEl.innerHTML = "";
    (data.key_points || []).forEach((point, i) => {
        const div = document.createElement("div");
        div.className = "key-point";
        div.innerHTML = `<span class="count-badge">${i + 1}</span><span>${escapeHtml(point)}</span>`;
        keyPointsEl.appendChild(div);
        setTimeout(() => div.classList.add("visible"), i * 100);
    });

    renderSentiment(data.sentiment);
    results.style.display = "block";
    document.querySelectorAll(".results-card").forEach(initTilt);
    setTimeout(() => results.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
}


/* ── 10. SENTIMENT ───────────────────────────────────────────────────── */
function renderSentiment(s) {
    if (!s) return;
    const scores = s.scores || {};
    sentimentLabel.textContent = s.overall || "Neutral";
    sentimentLabel.className   = `sentiment-${(s.overall || "neutral").toLowerCase()}`;
    compoundScore.textContent  = (scores.compound ?? 0).toFixed(2);
    positiveScore.textContent  = (scores.pos ?? 0).toFixed(2);
    negativeScore.textContent  = (scores.neg ?? 0).toFixed(2);
    neutralScore.textContent   = (scores.neu ?? 0).toFixed(2);
    requestAnimationFrame(() => {
        positiveMeter.style.width = `${(scores.pos ?? 0) * 50}%`;
        negativeMeter.style.width = `${(scores.neg ?? 0) * 50}%`;
    });
}


/* ── 11. COPY ────────────────────────────────────────────────────────── */
copySummaryBtn.addEventListener("click", () => copyText(summaryEl.textContent, copySummaryBtn));
copyKeyPointsBtn.addEventListener("click", () => {
    const text = [...keyPointsEl.querySelectorAll(".key-point span:last-child")]
        .map((el, i) => `${i + 1}. ${el.textContent}`).join("\n");
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


/* ── 12. ERROR ───────────────────────────────────────────────────────── */
function showError(msg) {
    errorBox.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${escapeHtml(msg)}`;
    errorBox.style.display = "block";
    errorBox.style.animation = "none";
    void errorBox.offsetWidth;
    errorBox.style.animation = "";
}
function hideError() {
    errorBox.style.display = "none";
    errorBox.innerHTML = "";
}


/* ── 13. UTILS ───────────────────────────────────────────────────────── */
function escapeHtml(str) {
    const m = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
    return String(str).replace(/[&<>"']/g, c => m[c]);
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
});
