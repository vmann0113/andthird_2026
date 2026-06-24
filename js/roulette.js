/* ═══════════════════════════════════════════════════════════════
   roulette.js — Editorial Wedding · Event mode
   SVG wheel + bulbs + marquee + confetti + CTA
   ═══════════════════════════════════════════════════════════════ */

let isSpinning = false;
let currentPrizes = [];
let currentRotation = 0;
let triggerArmed = false;

/* ─── Init ───────────────────────────────────────────────────── */
async function initRoulette() {
  const overlay = document.getElementById("roulette-overlay");
  if (!overlay) return;

  // dev/admin reset — add ?resetRoulette (or #resetRoulette) to the URL to clear the
  // one-time play record and force the wheel to show again.
  const _q = (location.search + " " + location.hash).toLowerCase();
  if (_q.includes("resetroulette")) {
    localStorage.removeItem("weddingExpo_played");
    localStorage.removeItem("weddingExpo_prize");
    // strip the param so a normal refresh afterwards behaves as usual
    try {
      const url = new URL(location.href);
      url.searchParams.delete("resetRoulette");
      url.hash = url.hash.replace(/#?resetRoulette/i, "");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  // load config
  try {
    const settings = await getSiteSettings();
    const cfg = settings.roulette || ROULETTE_CONFIG;
    currentPrizes = cfg.prizes || ROULETTE_CONFIG.prizes;
    if (!cfg.isActive) { return; }
  } catch (e) {
    currentPrizes = ROULETTE_CONFIG.prizes;
  }

  // already played?
  if (localStorage.getItem("weddingExpo_played") === "true") {
    const prize = localStorage.getItem("weddingExpo_prize");
    if (prize) insertPrizeToForm(prize);
    return;
  }

  // draw wheel, bulbs, marquee
  drawWheel(currentPrizes);
  drawBulbs(24);
  drawMarquee(currentPrizes);
  setupConfetti();

  // arm triggers — delay OR scroll, whichever first
  armTriggers();
}

function armTriggers() {
  triggerArmed = true;
  const TRIGGER_DELAY_MS = 8000;
  const TRIGGER_SCROLL_PCT = 0.30;

  const trigger = () => {
    if (!triggerArmed) return;
    triggerArmed = false;
    openRoulette();
    window.removeEventListener("scroll", onScroll, { passive: true });
  };

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const pct = window.scrollY / max;
    if (pct >= TRIGGER_SCROLL_PCT) trigger();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  setTimeout(trigger, TRIGGER_DELAY_MS);
}

function openRoulette() {
  const overlay = document.getElementById("roulette-overlay");
  if (!overlay) return;
  overlay.classList.add("is-open");
}

/* ─── Bulbs around wheel ─────────────────────────────────────── */
function drawBulbs(count) {
  const svg = document.querySelector(".roulette-bulbs");
  if (!svg) return;
  const cx = 180, cy = 180, r = 168;
  let html = "";
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    // alternate bulbs delay so they shimmer rather than blink together
    const delay = ((i % 4) * 0.4).toFixed(2);
    html += `<circle class="bulb" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.4" style="animation-delay:${delay}s"/>`;
  }
  svg.innerHTML = html;
}

/* ─── Marquee of prize names ─────────────────────────────────── */
function drawMarquee(prizes) {
  const track = document.getElementById("roulette-marquee-track");
  if (!track) return;
  // duplicate the list once for seamless looping
  const labels = prizes.map(p => p.name || "").filter(Boolean);
  const html = labels.map(n => `<span class="m-item">${escapeXml(n)}</span>`).join("");
  track.innerHTML = html + html;
}

/* split a prize name into up to 2 balanced lines so it fits a wedge */
function splitWheelLabel(name) {
  const words = String(name).split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [name.length > 9 ? name.slice(0, 8) + "…" : name];
  }
  let bestIdx = 1, bestDiff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" ").length;
    const b = words.slice(k).join(" ").length;
    const d = Math.abs(a - b);
    if (d < bestDiff) { bestDiff = d; bestIdx = k; }
  }
  let l1 = words.slice(0, bestIdx).join(" ");
  let l2 = words.slice(bestIdx).join(" ");
  if (l1.length > 10) l1 = l1.slice(0, 9) + "…";
  if (l2.length > 10) l2 = l2.slice(0, 9) + "…";
  return [l1, l2];
}

/* ─── Draw SVG wheel ─────────────────────────────────────────── */
function drawWheel(prizes) {
  const svg = document.getElementById("roulette-img");
  if (!svg) return;

  const n = prizes.length;
  const cx = 160, cy = 160, r = 154;
  const slice = (Math.PI * 2) / n;

  // alternating wine / rose tones — boram palette
  const palette = ["#8a1c2b", "#6a1320"];        // wine wedges
  const altPal  = ["#d63a6a", "#f3c9d6"];        // rose / soft-pink wedges

  let wedges = "";
  let labels = "";

  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * slice;
    const a1 = a0 + slice;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = slice > Math.PI ? 1 : 0;

    // alternate between dark and brass for every other wedge
    const isAlt = i % 2 === 1;
    const fill = isAlt ? altPal[(i / 2) % altPal.length | 0] : palette[(i % palette.length)];

    wedges += `<path d="M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${fill}"/>`;

    // text on wedge — radial, wrapped to ≤2 lines and width-clamped so it never clips
    const midA = a0 + slice / 2;
    const tx = cx + r * 0.58 * Math.cos(midA);
    const ty = cy + r * 0.58 * Math.sin(midA);
    let rotDeg = (midA * 180) / Math.PI;
    // keep text upright on the left half (avoid fully upside-down labels)
    if (rotDeg > 90 && rotDeg < 270) rotDeg -= 180;
    const textColor = isAlt ? "#6a1320" : "#ffe1ea";
    const name = (prizes[i].name || "").trim();
    const lines = splitWheelLabel(name);
    const fs = 13;
    const maxW = 88;
    const tspans = lines.map((ln, li) => {
      const est = ln.length * fs * 0.92;
      const clamp = est > maxW ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : "";
      const dy = lines.length === 1 ? "0.32em" : (li === 0 ? "-0.32em" : "1.16em");
      return `<tspan x="${tx.toFixed(2)}" dy="${dy}"${clamp}>${escapeXml(ln)}</tspan>`;
    }).join("");
    labels += `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}"
                     transform="rotate(${rotDeg.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})"
                     fill="${textColor}"
                     font-family="'Gmarket Sans', 'Pretendard', sans-serif"
                     font-size="${fs}"
                     font-weight="700"
                     text-anchor="middle"
                     dominant-baseline="middle">${tspans}</text>`;
  }

  // hairlines between wedges
  let lines = "";
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * slice;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    lines += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>`;
  }

  svg.setAttribute("viewBox", "0 0 320 320");
  svg.innerHTML = `
    <defs>
      <radialGradient id="rim" cx="50%" cy="50%" r="50%">
        <stop offset="92%" stop-color="rgba(189,154,82,0)"/>
        <stop offset="98%" stop-color="rgba(189,154,82,0.8)"/>
        <stop offset="100%" stop-color="rgba(189,154,82,0.3)"/>
      </radialGradient>
    </defs>
    <g id="wheel-rotate">
      ${wedges}
      ${lines}
      ${labels}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#bd9a52" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.5"/>
    </g>
    <!-- center hub -->
    <circle cx="${cx}" cy="${cy}" r="26" fill="#ffffff" stroke="#d63a6a" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="none" stroke="rgba(214,58,106,0.35)" stroke-width="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="6"  fill="#d63a6a"/>
  `;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;","\"":"&quot;"}[c]));
}

/* ─── Spin ───────────────────────────────────────────────────── */
function spinRoulette() {
  if (isSpinning) return;
  const wheel = document.querySelector("#roulette-img #wheel-rotate");
  if (!wheel) return;

  isSpinning = true;

  // visual state
  const container = document.getElementById("canvas-container");
  if (container) container.classList.add("is-spinning");
  const btn = document.getElementById("spin-button");
  if (btn) btn.classList.add("is-spinning");

  // weighted pick
  const total = currentPrizes.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  let idx = 0;
  for (let i = 0; i < currentPrizes.length; i++) {
    rand -= currentPrizes[i].weight;
    if (rand <= 0) { idx = i; break; }
  }

  const slice = 360 / currentPrizes.length;
  const targetAngle = (360 - (idx * slice + slice / 2)) % 360;
  const jitter = (Math.random() - 0.5) * (slice * 0.4);
  const spins = 10 * 360;
  const finalAngle = currentRotation + spins + targetAngle + jitter;

  wheel.style.transformOrigin = "160px 160px";
  wheel.style.transition = "transform 4.6s cubic-bezier(0.17, 0.84, 0.22, 1)";
  wheel.style.transform = `rotate(${finalAngle}deg)`;
  currentRotation = finalAngle % 360;

  setTimeout(() => {
    const wonPrize = currentPrizes[idx].name;
    localStorage.setItem("weddingExpo_played", "true");
    localStorage.setItem("weddingExpo_prize",  wonPrize);
    showRouletteResult(wonPrize);
    if (container) container.classList.remove("is-spinning");
    burstConfetti();
    isSpinning = false;
  }, 4600);
}

/* ─── Result ─────────────────────────────────────────────────── */
function showRouletteResult(prizeName) {
  const overlay = document.getElementById("roulette-overlay");
  if (overlay) overlay.classList.add("is-result");

  const box = document.getElementById("roulette-result");
  if (box) {
    box.innerHTML = `
      <span class="label">Congratulations</span>
      <span class="prize-name">${escapeXml(prizeName)}</span>
      <span class="kr-note">신청 폼에 자동으로 입력됩니다</span>
    `;
    box.classList.add("is-shown");
  }

  setTimeout(() => {
    closeRoulette();
    insertPrizeToForm(prizeName);
    const apply = document.getElementById("apply");
    if (apply) {
      const top = apply.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, 2800);
}

function closeRoulette() {
  const overlay = document.getElementById("roulette-overlay");
  if (!overlay) return;
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.classList.remove("is-open");
    overlay.classList.remove("is-result");
    overlay.style.opacity = "";
  }, 400);
}

function insertPrizeToForm(prizeName) {
  if (!prizeName) return;
  const field = document.getElementById("wonPrizeField");
  const wrap  = document.getElementById("prize-wrap");
  if (field) field.value = prizeName;
  if (wrap)  wrap.style.display = "block";
}

/* ─── Confetti ───────────────────────────────────────────────── */
let confettiCtx = null;
let confettiParticles = [];
let confettiRaf = null;

function setupConfetti() {
  const canvas = document.getElementById("roulette-confetti");
  if (!canvas) return;
  const resize = () => {
    canvas.width  = window.innerWidth  * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
  };
  resize();
  window.addEventListener("resize", resize);
  confettiCtx = canvas.getContext("2d");
}

function burstConfetti() {
  if (!confettiCtx) return;
  const colors = ["#d63a6a", "#e85585", "#f3c9d6", "#ffffff", "#bd9a52"];
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  // burst from center-ish (~modal center)
  const ox = cw * 0.5;
  const oy = ch * 0.46;

  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    confettiParticles.push({
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      g: 0.18 + Math.random() * 0.1,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
      maxLife: 140 + Math.random() * 60,
      shape: Math.random() < 0.4 ? "rect" : (Math.random() < 0.6 ? "diamond" : "line"),
    });
  }

  if (!confettiRaf) loopConfetti();
}

function loopConfetti() {
  const ctx = confettiCtx;
  if (!ctx) return;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  const dpr = devicePixelRatio;
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life += 1;
    const fade = p.life > p.maxLife - 30
      ? Math.max(0, (p.maxLife - p.life) / 30)
      : 1;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p.x * dpr, p.y * dpr);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.w/2 * dpr, -p.h/2 * dpr, p.w * dpr, p.h * dpr);
    } else if (p.shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -p.h/2 * dpr);
      ctx.lineTo(p.w/2 * dpr, 0);
      ctx.lineTo(0, p.h/2 * dpr);
      ctx.lineTo(-p.w/2 * dpr, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(-p.h/2 * dpr, 0);
      ctx.lineTo(p.h/2 * dpr, 0);
      ctx.stroke();
    }
    ctx.restore();

    if (p.life >= p.maxLife || p.y > window.innerHeight + 60) {
      confettiParticles.splice(i, 1);
    }
  }

  if (confettiParticles.length > 0) {
    confettiRaf = requestAnimationFrame(loopConfetti);
  } else {
    confettiRaf = null;
    ctx.clearRect(0, 0, cw, ch);
  }
}

/* expose */
window.spinRoulette = spinRoulette;
window.closeRoulette = closeRoulette;
window.insertPrizeToForm = insertPrizeToForm;
