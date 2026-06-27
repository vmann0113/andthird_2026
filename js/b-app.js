/* ═══════════════════════════════════════════════════════════════
   b-app.js — Variant B renderer
   • EXPO_DATA / firebase.js / media.js / roulette.js 를 그대로 재사용.
   • 이미지는 루트의 /images 폴더를 공유 (IMG_BASE = "../images/").
   ═══════════════════════════════════════════════════════════════ */

const IMG_BASE = "images/";

window.addEventListener("DOMContentLoaded", async () => {
  initFirebase();
  await loadMediaOverridesInto();
  loadHeroImage();
  await loadContentOverrides();
  renderBenefits();
  renderPartners();
  renderGallery();
  initBenefitFX();
  await initRoulette();
  await initTimer();
  initForm();
  initFloatingBar();
  initNaverMap();
  initScrollReveal();
});

/* ════════════════════════════════════════════════════════════
   Imagery helpers (mirror app.js, but rooted at ../images/)
════════════════════════════════════════════════════════════ */
function bxPicsum(keywords, seed, w, h) {
  const tag = String(keywords).replace(/[^a-z0-9]/gi, "").slice(0, 8) || "img";
  return "https://picsum.photos/seed/" + tag + seed + "/" + w + "/" + h;
}
function imgTag(keywords, seed, w, h, cls) {
  const base = (typeof mediaFilename === "function")
    ? mediaFilename(keywords, seed, w, h)
    : (String(keywords).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "_" + seed + "_" + w + "x" + h + ".jpg");
  const stock = IMG_BASE + base;
  const ov = (window.MEDIA_OVERRIDES || {})[base];
  const fb = ov ? stock : bxPicsum(keywords, seed, w, h);
  return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + (ov || stock) + '"' +
    ' data-slot="' + base + '" data-fb="' + fb + '" alt=""' +
    " onload=\"this.classList.add('is-loaded')\"" +
    ' onerror="window.__imgFb&&window.__imgFb(this)">';
}
window.__imgFb = function (img) {
  if (img.dataset.fb) { const f = img.dataset.fb; img.removeAttribute("data-fb"); img.src = f; }
  else { img.style.display = "none"; }
};
function applyImg(img, keywords, seed, w, h) {
  if (!img) return;
  const base = (typeof mediaFilename === "function")
    ? mediaFilename(keywords, seed, w, h)
    : (String(keywords).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "_" + seed + "_" + w + "x" + h + ".jpg");
  const ov = (window.MEDIA_OVERRIDES || {})[base];
  const fb = ov ? (IMG_BASE + base) : bxPicsum(keywords, seed, w, h);
  img.onerror = function () {
    if (this.dataset.fb) { this.src = this.dataset.fb; this.removeAttribute("data-fb"); }
    else { this.style.display = "none"; }
  };
  img.onload = function () { this.classList.add("is-loaded"); };
  img.dataset.slot = base;
  img.dataset.fb = fb;
  img.src = ov || (IMG_BASE + base);
}
function loadHeroImage() {
  applyImg(document.querySelector(".bx-hero-img"), "wedding,couple,romantic", 41, 1920, 1080);
  applyImg(document.querySelector(".bx-why-img"), "wedding,couple", 701, 900, 620);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

/* ════════════════════════════════════════════════════════════
   Content overrides (same as app.js — Firestore content/{cat})
════════════════════════════════════════════════════════════ */
async function loadContentOverrides() {
  try {
    const raw = localStorage.getItem("demo_content");
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(key => { if (Array.isArray(parsed[key])) EXPO_DATA[key] = parsed[key]; });
    }
  } catch (e) {}
  try {
    if (typeof db !== "undefined" && db) {
      const cats = ["studios", "halls", "dresses", "jewelry", "hanboks", "travel", "appliances"];
      const snaps = await Promise.all(cats.map(c => db.doc(`content/${c}`).get()));
      snaps.forEach((s, i) => {
        if (s.exists) { const data = s.data(); if (data && Array.isArray(data.items)) EXPO_DATA[cats[i]] = data.items; }
      });
    }
  } catch (e) {}
}

/* ════════════════════════════════════════════════════════════
   Benefits (café-style private consult)
════════════════════════════════════════════════════════════ */
const BX_BENEFITS = [
  { ttl: ["스드메 ", "인기 웨딩스튜디오"], desc: "부산·경남 인기 웨딩스튜디오 샘플과 가격 정보를 한 자리에서 보실 수 있습니다. 추가로 10만원 할인권도 증정해 드립니다.", tag: "₩100,000 상당" },
  { ttl: ["결혼 ", "체크리스트 무료"], desc: "무엇부터 준비할지 막막할 때 — 결혼 준비 체크리스트를 무료 증정합니다.", tag: "무료 증정" },
  { ttl: ["커피·다과 ", "세트 증정"], desc: "1시간 1커플 카페형 상담. 차 한 잔과 다과를 즐기며 편안하게 진행합니다.", tag: "카페형 상담" },
  { ttl: ["부모님 한복 ", "10만원 상품권"], desc: "양가 부모님 한복 대여에 사용 가능한 10만원 상품권을 드립니다.", tag: "₩100,000 상당" },
  { ttl: ["창원 ", "본식스냅 정보"], desc: "본식스냅 업체 정보를 한 자리에서 보실 수 있습니다.", tag: "정보 안내" },
  { ttl: ["창원 ", "웨딩홀 정보"], desc: "창원 웨딩홀의 가격·위치·장단점 정보를 한 자리에서 보실 수 있습니다.", tag: "정보 안내" }
];
/* fun pointer-tilt + spotlight on benefit cards (fine pointers only) */
function initBenefitFX() {
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const MAX = 7; // deg
  document.querySelectorAll(".bx-benefit-card").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--rx", ((px - 0.5) * MAX).toFixed(2) + "deg");
      card.style.setProperty("--ry", (-(py - 0.5) * MAX).toFixed(2) + "deg");
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      card.style.setProperty("--lift", "-5px");
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--lift", "0px");
    });
  });
}

function renderBenefits() {
  const el = document.getElementById("bx-benefit-grid");
  if (!el) return;
  el.innerHTML = BX_BENEFITS.map((b, i) => `
    <article class="bx-benefit-card" style="--delay:${i * 0.06}s">
      <span class="bx-benefit-no">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="bx-benefit-ttl">${escapeHtml(b.ttl[0])}<span class="hl">${escapeHtml(b.ttl[1])}</span></h3>
      <p class="bx-benefit-desc">${escapeHtml(b.desc)}</p>
      <span class="bx-benefit-tag">${escapeHtml(b.tag)}</span>
    </article>`).join("");
}

/* ════════════════════════════════════════════════════════════
   Partners — tabs + panels (compact directory)
════════════════════════════════════════════════════════════ */
const BX_CATS = [
  { key: "studios", n: "I",   en: "Studios",       kr: "웨딩 스튜디오", kw: "wedding,bride", photos: [[100,1200,800],[102,800,1200],[105,1200,800],[103,800,1200],[101,1200,800],[106,1200,800],[104,800,1200]] },
  { key: "halls",   n: "II",  en: "Wedding Halls", kr: "웨딩홀",       kw: "wedding,hall",  photos: [[200,800,800],[201,800,800],[202,800,800],[203,800,800],[204,800,800],[205,800,800],[206,800,800]] },
  { key: "dresses", n: "III", en: "Dress & Suits", kr: "드레스 · 예복", kw: "wedding,dress", photos: [[800,1200,800],[802,800,1200],[805,1200,800],[803,800,1200],[801,1200,800],[806,1200,800],[804,800,1200]] },
  { key: "jewelry", n: "IV",  en: "Jewelry",       kr: "예물",         kw: "diamond,ring",  photos: [[400,800,1000],[401,800,1000],[402,800,1000],[403,800,1000]] },
  { key: "hanboks", n: "V",   en: "Hanbok",        kr: "한복",         kw: "hanbok",        photos: [[300,1200,800],[302,800,1200],[305,1200,800],[303,800,1200],[301,1200,800],[306,1200,800],[304,800,1200]] },
  { key: "travel",  n: "VI",  en: "Honeymoon",     kr: "신혼여행",      kw: "travel",        photos: null }
];

function bxBrandName(item) {
  return item.nameKr || item.brand || item.dest || "";
}
function bxBrandEn(item) {
  return item.nameEn || item.destEn || "";
}

function renderPartners() {
  const tabsEl = document.getElementById("bx-tabs");
  const panelsEl = document.getElementById("bx-panels");
  if (!tabsEl || !panelsEl) return;

  const cats = BX_CATS.filter(c => (EXPO_DATA[c.key] || []).length);

  tabsEl.innerHTML = cats.map((c, i) => `
    <button class="bx-tab${i === 0 ? " is-active" : ""}" role="tab" data-tab="${c.key}">
      <span class="bx-tab-n">${c.n}</span>${escapeHtml(c.kr)}
    </button>`).join("");

  panelsEl.innerHTML = cats.map((c, i) => {
    const items = EXPO_DATA[c.key] || [];

    // representative photos (real baked filenames)
    let photoSpecs;
    if (c.key === "travel") {
      photoSpecs = items.slice(0, 7).map((it, k) => {
        const kw = (it.destEn || it.dest || "travel").toLowerCase().replace(/\s+/g, "");
        return [kw, 600 + k, 800, 800];
      });
    } else {
      photoSpecs = (c.photos || []).map(([seed, w, h]) => [c.kw, seed, w, h]);
    }
    const feature = photoSpecs[0] ? imgTag(photoSpecs[0][0], photoSpecs[0][1], photoSpecs[0][2], photoSpecs[0][3]) : "";
    const thumbs = photoSpecs.slice(1, 7).map(p => `<figure class="bx-pf-thumb">${imgTag(p[0], p[1], p[2], p[3])}</figure>`).join("");

    // elegant numbered brand list
    let listBlock;
    if (c.key === "travel") {
      // 16곳 — 짧은 여행지 칩 그리드로 압축
      const cells = items.map(it => {
        const nm = it.dest || it.destEn || "";
        const en = it.destEn || "";
        return `<span class="bx-dest"><span class="bx-dest-kr">${escapeHtml(nm)}</span><span class="bx-dest-en">${escapeHtml(en)}</span></span>`;
      }).join("");
      listBlock = `<div class="bx-dest-grid">${cells}</div>`;
    } else {
      const list = items.map((it, k) => {
        const nm = bxBrandName(it), en = bxBrandEn(it), bd = it.badge || it.tag || "";
        return `<li class="bx-bl-row">
          <span class="bx-bl-no">${String(k + 1).padStart(2, "0")}</span>
          <span class="bx-bl-name">
            <span class="bx-bl-kr">${escapeHtml(nm)}</span>
            ${en ? `<span class="bx-bl-en">${escapeHtml(en)}</span>` : ""}
          </span>
          ${bd ? `<span class="bx-bl-bd">${escapeHtml(bd)}</span>` : ""}
        </li>`;
      }).join("");
      listBlock = `<ol class="bx-brand-list">${list}</ol>`;
    }

    return `
    <div class="bx-panel${i === 0 ? " is-active" : ""}" data-panel="${c.key}">
      <div class="bx-panel-layout">
        <div class="bx-panel-feature">
          <div class="bx-pf-main">
            ${feature}
            <span class="bx-pf-frame" aria-hidden="true"></span>
            <div class="bx-pf-cap">
              <span class="bx-pf-cat">${escapeHtml(c.en)}</span>
              <span class="bx-pf-kr">${escapeHtml(c.kr)}</span>
            </div>
          </div>
          <div class="bx-pf-thumbs">${thumbs}</div>
        </div>
        <div class="bx-panel-info">
          <p class="bx-panel-count"><b>${items.length}</b> Partners · 제휴 브랜드</p>
          ${listBlock}
        </div>
      </div>
    </div>`;
  }).join("");

  // tab switching
  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".bx-tab");
    if (!btn) return;
    const key = btn.dataset.tab;
    tabsEl.querySelectorAll(".bx-tab").forEach(b => b.classList.toggle("is-active", b === btn));
    panelsEl.querySelectorAll(".bx-panel").forEach(p => p.classList.toggle("is-active", p.dataset.panel === key));
  });
}

/* ════════════════════════════════════════════════════════════
   Gallery strip
════════════════════════════════════════════════════════════ */
function renderGallery() {
  const el = document.getElementById("bx-gallery-track");
  if (!el) return;
  // 실제 상담·촬영 현장 사진 (variant-b/images/venue-*.jpg)
  const venue = [
    { src: "images/venue-1.jpg", cap: "상담 테이블" },
    { src: "images/venue-2.jpg", cap: "플라워 · 디테일" },
    { src: "images/venue-3.jpg", cap: "카페형 상담 공간" },
    { src: "images/venue-4.jpg", cap: "포트폴리오 월" }
  ];
  el.innerHTML = venue.map(v => `
    <figure class="bx-venue-card">
      <img src="${v.src}" alt="" loading="lazy"
           onload="this.classList.add('is-loaded')">
      <figcaption>${escapeHtml(v.cap)}</figcaption>
    </figure>`).join("");
}

/* ════════════════════════════════════════════════════════════
   Timer (monthly deadline) — header countdown
════════════════════════════════════════════════════════════ */
let bxTimerInterval = null;
async function initTimer() {
  let cfg = TIMER_CONFIG;
  try { const s = await getSiteSettings(); if (s.timer) cfg = s.timer; } catch (e) {}

  const labelEl = document.getElementById("bx-countdown-label");
  const timerEl = document.getElementById("bx-timer");
  if (!timerEl) return;

  const cleaned = (cfg.label || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✨🎊🎟️]/gu, "")
    .replace(/마감\s*임박/g, "").replace(/[!~]+/g, "")
    .replace(/^[\s—\-·|]+|[\s—\-·|]+$/g, "").trim();
  if (labelEl && cleaned) labelEl.textContent = cleaned;

  const target = new Date(cfg.targetDate || TIMER_CONFIG.targetDate).getTime();

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      const expired = (cfg.expiredLabel || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}🎊✨]/gu, "").trim()
        || "이달의 이벤트가 마감되었습니다";
      timerEl.classList.add("is-expired");
      timerEl.textContent = expired;
      clearInterval(bxTimerInterval);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const seg = (n, u) => `<span class="seg">${String(n).padStart(2, "0")}<span class="seg-unit">${u}</span></span>`;
    const colon = `<span class="seg-colon">:</span>`;
    timerEl.classList.remove("is-expired");
    timerEl.innerHTML = "마감까지 " + seg(d, "일") + colon + seg(h, "시") + colon + seg(m, "분") + colon + seg(s, "초");
  }
  tick();
  bxTimerInterval = setInterval(tick, 1000);
}

/* ════════════════════════════════════════════════════════════
   Form (same logic + ids as app.js)
════════════════════════════════════════════════════════════ */
function initForm() {
  const form = document.getElementById("applyForm");
  if (!form) return;
  const dateInput = document.getElementById("user-date");
  if (dateInput && dateInput.type === "date") {
    const today = new Date();
    dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  const prize = localStorage.getItem("weddingExpo_prize");
  if (prize && typeof insertPrizeToForm === "function") insertPrizeToForm(prize);
  form.addEventListener("submit", handleFormSubmit);
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("user-name")?.value.trim();
  const phone = document.getElementById("user-phone")?.value.trim();
  const dateVal = document.getElementById("user-date")?.value;
  const prize = document.getElementById("wonPrizeField")?.value || "해당없음";
  const btn = document.querySelector(".btn-submit");

  if (!name || name.length < 2) return showFormError("성함을 2자 이상 입력해주세요.");
  if (!/^010-\d{4}-\d{4}$/.test(phone)) return showFormError("올바른 연락처를 입력해주세요. (예: 010-1234-5678)");
  if (!dateVal) return showFormError("방문 희망 일자를 선택해주세요.");

  btn.disabled = true; btn.textContent = "확인 중...";
  try {
    if (await checkDuplicate(phone)) {
      showFormError("이미 신청하신 연락처입니다.");
      btn.disabled = false; btn.textContent = "무료 입장권 신청하기";
      return;
    }
    btn.textContent = "전송 중...";
    await saveApplicant({ name, phone, date: dateVal, prize });
    document.getElementById("applyForm").style.display = "none";
    document.getElementById("completion-msg").style.display = "flex";
  } catch (err) {
    console.error(err);
    showFormError("일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    btn.disabled = false; btn.textContent = "무료 입장권 신청하기";
  }
}

function showFormError(msg) {
  const errEl = document.getElementById("form-error");
  if (!errEl) return false;
  errEl.textContent = msg; errEl.style.display = "block";
  clearTimeout(showFormError._t);
  showFormError._t = setTimeout(() => { errEl.style.display = "none"; }, 4000);
  return false;
}

function autoHyphen(el) {
  el.value = el.value.replace(/[^0-9]/g, "")
    .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")
    .replace(/^(\d{3})(\d{1,4})$/, "$1-$2")
    .replace(/^(\d{3}-\d{4})(\d{1,4})$/, "$1-$2");
}
window.autoHyphen = autoHyphen;

/* ════════════════════════════════════════════════════════════
   Floating bar
════════════════════════════════════════════════════════════ */
function initFloatingBar() {
  const bar = document.querySelector(".floating-bar");
  const hero = document.querySelector(".bx-hero");
  const apply = document.getElementById("apply");
  const foot = document.querySelector(".bx-foot");
  if (!bar || !hero) return;
  let pastHero = false, nearForm = false, nearEnd = false;
  const update = () => bar.classList.toggle("visible", pastHero && !nearForm && !nearEnd);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }, { threshold: 0 }).observe(hero);
  if (apply) new IntersectionObserver(([e]) => { nearForm = e.isIntersecting; update(); }, { threshold: 0.15 }).observe(apply);
  if (foot) new IntersectionObserver(([e]) => { nearEnd = e.isIntersecting; update(); }, { threshold: 0 }).observe(foot);
}

/* ════════════════════════════════════════════════════════════
   Naver Map (same as app.js)
════════════════════════════════════════════════════════════ */
function initNaverMap() {
  const mapEl = document.getElementById("naver-map");
  if (!mapEl) return;
  const venue = (typeof VENUE_CONFIG !== "undefined" && VENUE_CONFIG) || { name: "행사장", lat: 35.2538, lng: 128.6390, zoom: 16 };
  const keyId = (typeof NAVER_MAP_CLIENT_ID !== "undefined") ? NAVER_MAP_CLIENT_ID : "";
  if (!keyId || keyId.indexOf("YOUR_") === 0) { renderMapPlaceholder(mapEl, venue); return; }
  if (typeof naver !== "undefined" && naver.maps) { drawNaverMap(venue); return; }
  const s = document.createElement("script");
  s.src = "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=" + encodeURIComponent(keyId);
  s.async = true;
  s.onload = () => { if (typeof naver !== "undefined" && naver.maps) drawNaverMap(venue); else renderMapPlaceholder(mapEl, venue); };
  s.onerror = () => renderMapPlaceholder(mapEl, venue);
  document.head.appendChild(s);
}
function drawNaverMap(venue) {
  const pos = new naver.maps.LatLng(venue.lat, venue.lng);
  const map = new naver.maps.Map("naver-map", { center: pos, zoom: venue.zoom || 16, zoomControl: true, zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT }, mapDataControl: false, scaleControl: false });
  new naver.maps.Marker({ position: pos, map, title: venue.name || "" });
}
function renderMapPlaceholder(mapEl, venue) {
  const q = encodeURIComponent(venue.name || venue.address || "");
  mapEl.innerHTML = `
    <div class="map-placeholder">
      <span class="map-placeholder-mark">✦</span>
      <p class="map-placeholder-label">${escapeHtml(venue.name || "")} · ${escapeHtml(venue.address || "")}</p>
      <a href="https://map.naver.com/v5/search/${q}" target="_blank" rel="noopener" class="map-link-btn">네이버지도에서 열기</a>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   Scroll reveal
════════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        el.style.transitionDelay = el.style.getPropertyValue("--delay") || "0s";
        el.classList.add("visible");
        io.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -60px 0px" });
  function observeAll() { document.querySelectorAll(".reveal:not(.observed)").forEach(el => { el.classList.add("observed"); io.observe(el); }); }
  observeAll();
  new MutationObserver(observeAll).observe(document.body, { childList: true, subtree: true });
}
