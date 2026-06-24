/* ═══════════════════════════════════════════════════════════════
   admin.js — Editorial Wedding Admin
   ═══════════════════════════════════════════════════════════════ */

let currentApplicants = [];
let currentTab = "applicants";
let currentContentTab = "studios";
let contentDraft = null;  // working copy of EXPO_DATA
let sectionsDraft = null; // working copy of section toggles

/* ─── Boot ──────────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initLogin();
  onAdminAuthChange(user => {
    if (user) showAdmin(user);
    else      showLogin();
  });
});

/* ────────────────────────────────────────────────────────────
   Login
──────────────────────────────────────────────────────────── */
function initLogin() {
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pw    = document.getElementById("login-password").value;
    const err   = document.getElementById("login-error");
    err.classList.remove("is-shown");
    try {
      await adminLogin(email, pw);
      // demo mode flag
      if (email === "demo") localStorage.setItem("demo_admin_logged_in", "true");
      // onAdminAuthChange's demo listener fires only once, so call directly
      showAdmin({ email });
    } catch (e) {
      err.textContent = e.message || "로그인 실패";
      err.classList.add("is-shown");
    }
  });
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await adminLogout();
    location.reload();
  });
}

let adminShellInited = false;

function showLogin() {
  document.getElementById("login-screen").hidden = false;
  document.getElementById("admin-shell").hidden  = true;
}
function showAdmin(user) {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("admin-shell").hidden  = false;
  document.getElementById("who").textContent = user.email || "admin";
  if (adminShellInited) return;
  adminShellInited = true;
  initTabs();
  initApplicants();
  initSections();
  initContent();
  initSettings();
  initMedia();
}

/* ────────────────────────────────────────────────────────────
   Tabs
──────────────────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll(".nav-item").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = a.dataset.tab;
      switchTab(tab);
    });
  });
  // Initial from hash
  const hash = location.hash.slice(1);
  if (hash && document.querySelector(`[data-tab="${hash}"]`)) {
    switchTab(hash);
  }
}
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".nav-item").forEach(a => {
    a.classList.toggle("is-active", a.dataset.tab === tab);
  });
  document.querySelectorAll(".tab").forEach(s => {
    s.classList.toggle("is-active", s.dataset.tab === tab);
  });
  location.hash = tab;
}

/* ────────────────────────────────────────────────────────────
   Applicants
──────────────────────────────────────────────────────────── */
async function initApplicants() {
  document.getElementById("refresh-applicants").addEventListener("click", loadApplicants);
  document.getElementById("export-csv").addEventListener("click", exportCSV);
  document.getElementById("applicant-search").addEventListener("input", renderApplicants);
  await loadApplicants();
}

async function loadApplicants() {
  try {
    currentApplicants = await getAllApplicants();
  } catch (e) {
    console.error(e);
    currentApplicants = [];
  }
  updateStats();
  renderApplicants();
}

function updateStats() {
  const total = currentApplicants.length;
  const now = new Date();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const parse = a => { const t = a.createdAt ? new Date(a.createdAt) : null; return (t && !isNaN(t.getTime())) ? t : null; };
  const week = currentApplicants.filter(a => { const t = parse(a); return t && t.getTime() >= weekAgo; }).length;
  const month = currentApplicants.filter(a => { const t = parse(a); return t && t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth(); }).length;
  const prize = currentApplicants.filter(a => a.prize && a.prize !== "해당없음").length;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-sat").textContent   = week;
  document.getElementById("stat-sun").textContent   = month;
  document.getElementById("stat-prize").textContent = prize;
}

function renderApplicants() {
  const q = document.getElementById("applicant-search").value.trim().toLowerCase();
  const list = q
    ? currentApplicants.filter(a =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.phone || "").includes(q))
    : currentApplicants;

  const tbody = document.getElementById("applicants-tbody");
  const empty = document.getElementById("applicants-empty");
  if (!list.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = list.map((a, i) => `
    <tr>
      <td class="col-num cell-mono">${String(i + 1).padStart(2, "0")}</td>
      <td>${escapeHtml(a.name || "")}</td>
      <td class="cell-mono">${escapeHtml(a.phone || "")}</td>
      <td>${escapeHtml(a.date || "")}</td>
      <td>${a.prize && a.prize !== "해당없음" ? escapeHtml(a.prize) : "<span style='color:var(--t-on-dark-muted)'>—</span>"}</td>
      <td class="cell-mono">${formatDate(a.createdAt)}</td>
      <td>
        <button class="btn-danger" data-del-id="${a.id || i}">삭제</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-del-id]").forEach(btn => {
    btn.addEventListener("click", () => deleteRow(btn.dataset.delId));
  });
}

async function deleteRow(id) {
  if (!confirm("이 신청자를 삭제하시겠습니까?")) return;
  await deleteApplicant(id);
  await loadApplicants();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function exportCSV() {
  const headers = ["성함", "연락처", "방문일", "경품", "신청일시"];
  const rows = currentApplicants.map(a => [
    a.name || "",
    a.phone || "",
    a.date || "",
    a.prize || "",
    a.createdAt || ""
  ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(","));
  const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `applicants_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/* ────────────────────────────────────────────────────────────
   Sections on/off
──────────────────────────────────────────────────────────── */
const SECTION_META = [
  { id: "section-studio",     roman: "I",    nameEn: "Studios",         nameKr: "스튜디오" },
  { id: "section-hall",       roman: "II",   nameEn: "Wedding Halls",   nameKr: "웨딩홀" },
  { id: "section-dresses",    roman: "III",  nameEn: "Dress & Suits",   nameKr: "드레스 & 예복" },
  { id: "section-jewelry",    roman: "IV",   nameEn: "Jewelry",         nameKr: "예물 이벤트" },
  { id: "section-hanbok",     roman: "V",    nameEn: "Hanbok",          nameKr: "한복" },
  { id: "section-travel",     roman: "VI",   nameEn: "Honeymoon",       nameKr: "신혼여행" },
  { id: "section-appliance",  roman: "VII",  nameEn: "Home & Living",   nameKr: "혼수 가전 & 가구" },
  { id: "section-directions", roman: "VIII", nameEn: "Location",        nameKr: "찾아오시는 길" }
];

async function initSections() {
  let settings;
  try { settings = await getSiteSettings(); } catch(e) { settings = {}; }
  sectionsDraft = { ...(typeof SECTION_DEFAULTS !== "undefined" ? SECTION_DEFAULTS : {}), ...((settings && settings.sections) || {}) };
  renderSections();
  document.getElementById("save-sections").addEventListener("click", saveSections);
}

function renderSections() {
  const wrap = document.getElementById("section-toggles");
  wrap.innerHTML = SECTION_META.map(s => {
    const on = sectionsDraft[s.id] !== false;
    return `
      <div class="section-toggle ${on ? "" : "is-off"}" data-section-id="${s.id}">
        <div class="st-info">
          <span class="st-roman">${s.roman}</span>
          <span class="st-name-en">${s.nameEn}</span>
          <span class="st-name">${s.nameKr}</span>
        </div>
        <label class="switch">
          <input type="checkbox" ${on ? "checked" : ""} data-section-toggle="${s.id}">
          <span class="switch-track"><span class="switch-thumb"></span></span>
          <span class="switch-label">${on ? "ON" : "OFF"}</span>
        </label>
      </div>
    `;
  }).join("");
  wrap.querySelectorAll("[data-section-toggle]").forEach(input => {
    input.addEventListener("change", (e) => {
      const id = e.target.dataset.sectionToggle;
      sectionsDraft[id] = e.target.checked;
      renderSections(); // refresh visual state
    });
  });
}

async function saveSections() {
  const settings = await getSiteSettings();
  settings.sections = sectionsDraft;
  await saveSiteSettings(settings);
  flashSaved("sections-saved");
}

/* ────────────────────────────────────────────────────────────
   Content management
──────────────────────────────────────────────────────────── */
const CONTENT_SCHEMAS = {
  studios: {
    label: "스튜디오",
    fields: [
      { key: "badge",   label: "배지 (썸네일에 표시)", type: "text" },
      { key: "nameEn",  label: "영문명 (대문자 권장)", type: "text" },
      { key: "nameKr",  label: "한글명",              type: "text" },
      { key: "mainImg", label: "대표 이미지 경로",    type: "text", full: true },
      { key: "subImgs", label: "서브 이미지 경로 (한 줄에 하나씩)", type: "textarea", full: true, isArray: true }
    ]
  },
  halls: {
    label: "웨딩홀",
    fields: [
      { key: "badge",   label: "배지",                type: "text" },
      { key: "nameEn",  label: "영문명",              type: "text" },
      { key: "nameKr",  label: "한글명",              type: "text" },
      { key: "mainImg", label: "대표 이미지 경로",    type: "text", full: true },
      { key: "subImgs", label: "서브 이미지 경로 (한 줄에 하나씩)", type: "textarea", full: true, isArray: true }
    ]
  },
  dresses: {
    label: "드레스 & 예복",
    fields: [
      { key: "badge",   label: "배지 (드레스 / 예복)", type: "text" },
      { key: "nameEn",  label: "영문명",              type: "text" },
      { key: "nameKr",  label: "한글명",              type: "text" },
      { key: "mainImg", label: "대표 이미지 경로",    type: "text", full: true },
      { key: "subImgs", label: "서브 이미지 경로 (한 줄에 하나씩)", type: "textarea", full: true, isArray: true }
    ]
  },
  jewelry: {
    label: "예물",
    fields: [
      { key: "brand",    label: "브랜드/상품명",       type: "text" },
      { key: "tag",      label: "태그",                type: "text" },
      { key: "desc",     label: "설명",                type: "text", full: true },
      { key: "discount", label: "할인율 (숫자)",       type: "number" },
      { key: "img",      label: "이미지 경로",         type: "text", full: true }
    ]
  },
  hanboks: {
    label: "한복",
    fields: [
      { key: "badge",   label: "배지",                type: "text" },
      { key: "nameEn",  label: "영문명",              type: "text" },
      { key: "nameKr",  label: "한글명",              type: "text" },
      { key: "mainImg", label: "대표 이미지 경로",    type: "text", full: true },
      { key: "subImgs", label: "서브 이미지 경로 (한 줄에 하나씩)", type: "textarea", full: true, isArray: true }
    ]
  },
  travel: {
    label: "신혼여행",
    fields: [
      { key: "destEn", label: "영문 지명",       type: "text" },
      { key: "dest",   label: "한글 지명",       type: "text" },
      { key: "desc",   label: "설명",            type: "text", full: true },
      { key: "img",    label: "이미지 경로",     type: "text", full: true }
    ]
  },
  appliances: {
    label: "가전·가구",
    fields: [
      { key: "brand",    label: "브랜드/상품명",       type: "text" },
      { key: "tag",      label: "태그",                type: "text" },
      { key: "desc",     label: "설명",                type: "text", full: true },
      { key: "discount", label: "할인율 (숫자)",       type: "number" },
      { key: "img",      label: "이미지 경로",         type: "text", full: true }
    ]
  }
};

function initContent() {
  // load draft from localStorage override, fallback to EXPO_DATA
  const saved = localStorage.getItem("demo_content");
  if (saved) {
    try { contentDraft = JSON.parse(saved); } catch (e) { contentDraft = null; }
  }
  if (!contentDraft) contentDraft = JSON.parse(JSON.stringify(EXPO_DATA));

  document.querySelectorAll(".ct-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ct-tab").forEach(b => b.classList.toggle("is-active", b === btn));
      currentContentTab = btn.dataset.ct;
      renderContentEditor();
    });
  });

  document.getElementById("save-content").addEventListener("click", saveContent);
  document.getElementById("reset-content").addEventListener("click", resetContent);
  renderContentEditor();
}

function renderContentEditor() {
  const schema = CONTENT_SCHEMAS[currentContentTab];
  const items  = contentDraft[currentContentTab] || [];
  const root   = document.getElementById("content-editor");

  root.innerHTML = `
    <div class="editor-rows">
      ${items.map((item, i) => renderEditorRow(item, i, schema)).join("")}
    </div>
    <div class="editor-add-row">
      <button class="btn-ghost" id="add-item-btn">+ ${schema.label} 추가</button>
    </div>
  `;

  // wire up
  root.querySelectorAll(".editor-row").forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);

    row.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        const f = schema.fields.find(x => x.key === field);
        let v = e.target.value;
        if (f.isArray)      v = v.split("\n").map(s => s.trim()).filter(Boolean);
        else if (f.type === "number") v = v === "" ? 0 : Number(v);
        contentDraft[currentContentTab][idx][field] = v;
      });
    });

    row.querySelector("[data-action='up']")?.addEventListener("click", () => moveItem(idx, -1));
    row.querySelector("[data-action='down']")?.addEventListener("click", () => moveItem(idx, +1));
    row.querySelector("[data-action='delete']")?.addEventListener("click", () => deleteItem(idx));
  });

  document.getElementById("add-item-btn").addEventListener("click", () => addItem(schema));
}

function renderEditorRow(item, idx, schema) {
  const fields = schema.fields.map(f => {
    let v = item[f.key];
    if (f.isArray) v = (Array.isArray(v) ? v : []).join("\n");
    else if (v == null) v = "";
    const fullCls = f.full ? "full" : "";
    if (f.type === "textarea") {
      return `<div class="${fullCls}">
        <label>${escapeHtml(f.label)}</label>
        <textarea data-field="${f.key}" rows="3">${escapeHtml(v)}</textarea>
      </div>`;
    }
    const inputType = f.type === "number" ? "number" : "text";
    return `<div class="${fullCls}">
      <label>${escapeHtml(f.label)}</label>
      <input type="${inputType}" data-field="${f.key}" value="${escapeHtml(v)}">
    </div>`;
  }).join("");

  return `
    <div class="editor-row" data-idx="${idx}">
      <div class="editor-row-head">
        <span class="editor-row-num">${String(idx + 1).padStart(2, "0")} / ${schema.label}</span>
        <div class="editor-row-actions">
          <button class="icon-btn" data-action="up" title="위로">↑</button>
          <button class="icon-btn" data-action="down" title="아래로">↓</button>
          <button class="icon-btn is-danger" data-action="delete" title="삭제">✕</button>
        </div>
      </div>
      <div class="editor-fields">
        ${fields}
      </div>
    </div>
  `;
}

function moveItem(idx, dir) {
  const arr = contentDraft[currentContentTab];
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  const [removed] = arr.splice(idx, 1);
  arr.splice(newIdx, 0, removed);
  renderContentEditor();
}
function deleteItem(idx) {
  if (!confirm("이 항목을 삭제할까요?")) return;
  contentDraft[currentContentTab].splice(idx, 1);
  renderContentEditor();
}
function addItem(schema) {
  const item = {};
  schema.fields.forEach(f => {
    item[f.key] = f.isArray ? [] : (f.type === "number" ? 0 : "");
  });
  contentDraft[currentContentTab].push(item);
  renderContentEditor();
}

async function saveContent() {
  // For demo mode: store in localStorage as override
  localStorage.setItem("demo_content", JSON.stringify(contentDraft));
  // For real Firebase: also save to a document
  try {
    if (typeof db !== "undefined" && db) {
      const batch = db.batch();
      Object.keys(contentDraft).forEach(key => {
        batch.set(db.doc(`content/${key}`), { items: contentDraft[key] });
      });
      await batch.commit();
    }
  } catch (e) { console.error(e); }
  flashSaved("content-saved");
}

function resetContent() {
  if (!confirm("config.js의 기본값으로 되돌리시겠습니까? 저장된 수정 사항이 모두 사라집니다.")) return;
  localStorage.removeItem("demo_content");
  contentDraft = JSON.parse(JSON.stringify(EXPO_DATA));
  renderContentEditor();
  flashSaved("content-saved");
}

/* ────────────────────────────────────────────────────────────
   Settings (timer + roulette)
──────────────────────────────────────────────────────────── */
let settingsDraft = null;

async function initSettings() {
  try { settingsDraft = await getSiteSettings(); }
  catch (e) { settingsDraft = { timer: TIMER_CONFIG, roulette: ROULETTE_CONFIG }; }

  // Hydrate timer
  const t = settingsDraft.timer || TIMER_CONFIG;
  document.getElementById("timer-date").value    = isoToLocal(t.targetDate || TIMER_CONFIG.targetDate);
  document.getElementById("timer-label").value   = t.label   || TIMER_CONFIG.label;
  document.getElementById("timer-expired").value = t.expiredLabel || TIMER_CONFIG.expiredLabel;

  // Hydrate roulette
  const r = settingsDraft.roulette || ROULETTE_CONFIG;
  document.getElementById("roulette-active").checked = !!r.isActive;
  renderPrizes(r.prizes || []);

  document.getElementById("add-prize").addEventListener("click", () => {
    const rows = readPrizes();
    rows.push({ name: "새 경품", weight: 0 });
    renderPrizes(rows);
  });
  document.getElementById("save-settings").addEventListener("click", saveSettings);
}

function isoToLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderPrizes(prizes) {
  const wrap = document.getElementById("prize-rows");
  wrap.innerHTML = prizes.map((p, i) => `
    <div class="prize-row">
      <input type="text"   data-prize-name  data-i="${i}" value="${escapeHtml(p.name || "")}" placeholder="경품명">
      <input type="number" data-prize-weight data-i="${i}" value="${p.weight ?? 0}" min="0" max="100">
      <button class="icon-btn is-danger" data-del-prize="${i}">✕</button>
    </div>
  `).join("");
  wrap.querySelectorAll("[data-del-prize]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.delPrize, 10);
      const rows = readPrizes();
      rows.splice(i, 1);
      renderPrizes(rows);
    });
  });
  validatePrizes();
  wrap.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", validatePrizes);
  });
}

function readPrizes() {
  const rows = [];
  const wrap = document.getElementById("prize-rows");
  wrap.querySelectorAll(".prize-row").forEach(row => {
    rows.push({
      name:   row.querySelector("[data-prize-name]").value.trim(),
      weight: Number(row.querySelector("[data-prize-weight]").value) || 0
    });
  });
  return rows;
}

function validatePrizes() {
  const sum = readPrizes().reduce((s, p) => s + p.weight, 0);
  const warn = document.getElementById("prize-warn");
  if (sum !== 100) {
    warn.textContent = `weight 합계가 ${sum} 입니다. 100이 되도록 조정하세요.`;
    warn.classList.add("is-shown");
  } else {
    warn.classList.remove("is-shown");
  }
}

async function saveSettings() {
  // Timer
  const dateLocal = document.getElementById("timer-date").value;
  const isoDate   = dateLocal ? new Date(dateLocal).toISOString() : TIMER_CONFIG.targetDate;
  settingsDraft.timer = {
    targetDate:   isoDate,
    label:        document.getElementById("timer-label").value.trim(),
    expiredLabel: document.getElementById("timer-expired").value.trim()
  };
  // Roulette
  settingsDraft.roulette = {
    isActive: document.getElementById("roulette-active").checked,
    prizes:   readPrizes()
  };
  await saveSiteSettings(settingsDraft);
  flashSaved("settings-saved");
}

/* ────────────────────────────────────────────────────────────
   Media manager (사진 관리 · 드래그&드롭 교체)
──────────────────────────────────────────────────────────── */
let mediaOverridesDraft = {};

async function initMedia() {
  try { mediaOverridesDraft = (typeof getMediaOverrides === "function") ? await getMediaOverrides() : {}; }
  catch (e) { mediaOverridesDraft = {}; }
  window.MEDIA_OVERRIDES = mediaOverridesDraft;
  renderMediaManager();
}

function mediaModeLabel() {
  const demo = (typeof IS_DEMO !== "undefined" && IS_DEMO);
  return demo
    ? "<span class='media-mode media-mode--demo'>데모모드</span> 업로드한 사진은 <b>이 브라우저에서만</b> 미리보기로 보입니다. js/config.js에 Firebase를 입력하면 방문자에게도 반영됩니다."
    : "<span class='media-mode media-mode--live'>Firebase 연결됨</span> 업로드한 사진이 실제 사이트(방문자)에 바로 반영됩니다.";
}

function renderMediaManager() {
  const wrap = document.getElementById("media-manager");
  const statusEl = document.getElementById("media-status");
  if (!wrap) return;
  if (statusEl) statusEl.innerHTML = mediaModeLabel();
  const groups = (typeof buildMediaManifest === "function") ? buildMediaManifest() : [];
  wrap.innerHTML = groups.map(g => `
    <div class="media-group">
      <div class="media-group-head">
        <h3>${escapeHtml(g.title)}</h3>
        <span class="media-group-note">${escapeHtml(g.note || "")}</span>
      </div>
      <div class="media-grid" style="--cols:${g.cols || 4}">
        ${g.slots.map(s => mediaSlotHTML(s)).join("")}
      </div>
    </div>
  `).join("");
  wireMediaSlots();
}

function mediaSlotHTML(s) {
  const ov = mediaOverridesDraft[s.id];
  const src = ov || ("images/" + s.id);
  const isOv = !!ov;
  return `
    <div class="media-slot ${isOv ? "is-custom" : ""}" data-slot="${escapeHtml(s.id)}">
      <div class="media-thumb" style="aspect-ratio:${s.w}/${s.h}">
        <img src="${src}" alt="" loading="lazy" onerror="this.classList.add('is-broken')">
        <div class="media-drop-hint"><span>＋ 끌어놓기 / 클릭</span></div>
        <span class="media-badge">교체됨</span>
      </div>
      <div class="media-slot-foot">
        <span class="media-slot-label">${escapeHtml(s.label || "")}</span>
        <button class="media-reset" type="button" ${isOv ? "" : "hidden"}>되돌리기</button>
      </div>
      <code class="media-filename" title="${escapeHtml(s.id)}">${escapeHtml(s.id)}</code>
      <input type="file" accept="image/*" hidden>
    </div>`;
}

function wireMediaSlots() {
  document.querySelectorAll(".media-slot").forEach(slot => {
    const id = slot.dataset.slot;
    const input = slot.querySelector("input[type=file]");
    const thumb = slot.querySelector(".media-thumb");
    thumb.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { if (input.files[0]) handleMediaUpload(id, input.files[0], slot); input.value = ""; });
    ["dragenter", "dragover"].forEach(ev => thumb.addEventListener(ev, e => { e.preventDefault(); slot.classList.add("is-drag"); }));
    ["dragleave", "dragend"].forEach(ev => thumb.addEventListener(ev, e => { e.preventDefault(); slot.classList.remove("is-drag"); }));
    thumb.addEventListener("drop", e => {
      e.preventDefault(); slot.classList.remove("is-drag");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) handleMediaUpload(id, f, slot);
    });
    slot.querySelector(".media-reset").addEventListener("click", () => handleMediaReset(id, slot));
  });
}

async function handleMediaUpload(id, file, slot) {
  if (!file.type.startsWith("image/")) { flashMediaStatus("이미지 파일만 업로드할 수 있습니다.", true); return; }
  slot.classList.add("is-uploading");
  try {
    const res = await uploadMedia(id, file);
    mediaOverridesDraft[id] = res.url;
    window.MEDIA_OVERRIDES = window.MEDIA_OVERRIDES || {};
    window.MEDIA_OVERRIDES[id] = res.url;
    const img = slot.querySelector(".media-thumb img");
    img.classList.remove("is-broken"); img.src = res.url;
    slot.classList.add("is-custom");
    slot.querySelector(".media-reset").hidden = false;
    flashMediaStatus(res.mode === "firebase"
      ? "업로드 완료 — 사이트에 반영되었습니다."
      : "미리보기 저장됨 (데모: 이 브라우저에서만 보입니다).");
  } catch (e) {
    flashMediaStatus(e.message || "업로드에 실패했습니다.", true);
  } finally { slot.classList.remove("is-uploading"); }
}

async function handleMediaReset(id, slot) {
  try { await removeMediaOverride(id); } catch (e) {}
  delete mediaOverridesDraft[id];
  if (window.MEDIA_OVERRIDES) delete window.MEDIA_OVERRIDES[id];
  const img = slot.querySelector(".media-thumb img");
  img.classList.remove("is-broken"); img.src = "images/" + id + "?t=" + Date.now();
  slot.classList.remove("is-custom");
  slot.querySelector(".media-reset").hidden = true;
  flashMediaStatus("기본 사진으로 되돌렸습니다.");
}

let _mediaFlashTimer = null;
function flashMediaStatus(msg, isErr) {
  const el = document.getElementById("media-status");
  if (!el) return;
  el.innerHTML = `<span class="${isErr ? "media-flash-err" : "media-flash-ok"}">${escapeHtml(msg)}</span>`;
  clearTimeout(_mediaFlashTimer);
  _mediaFlashTimer = setTimeout(() => { el.innerHTML = mediaModeLabel(); }, 4000);
}

/* ─── utils ─────────────────────────────────────────────────── */
function flashSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = "✓ 저장되었습니다.";
  el.classList.add("is-shown");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => el.classList.remove("is-shown"), 2400);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
