/* ═══════════════════════════════════════════════════════════════
   firebase.js — DB 연동 함수 모음
   Firebase 미설정 시 localStorage 데모모드로 자동 전환됩니다.
   ═══════════════════════════════════════════════════════════════ */

const IS_DEMO = !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith("YOUR_");

let db = null, auth = null, storage = null;

/* ─── Firebase 초기화 ─────────────────────────────────────── */
function initFirebase() {
  if (IS_DEMO) {
    console.warn("⚠️  데모모드 실행 중 — js/config.js에 Firebase 설정을 입력하면 실제 DB와 연결됩니다.");
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db      = firebase.firestore();
    auth    = firebase.auth();
    storage = firebase.storage();
    console.log("✅ Firebase 연결 완료");
  } catch (e) {
    console.error("Firebase 초기화 실패:", e);
  }
}

/* ─── 신청자 저장 ──────────────────────────────────────────── */
async function saveApplicant(data) {
  const record = { ...data, createdAt: new Date().toISOString() };
  if (IS_DEMO || !db) {
    const list = JSON.parse(localStorage.getItem("demo_applicants") || "[]");
    list.push(record);
    localStorage.setItem("demo_applicants", JSON.stringify(list));
    return { id: "demo_" + Date.now() };
  }
  return await db.collection("applicants").add({
    ...record,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ─── 중복 전화번호 체크 ────────────────────────────────────── */
async function checkDuplicate(phone) {
  if (IS_DEMO || !db) {
    const list = JSON.parse(localStorage.getItem("demo_applicants") || "[]");
    return list.some(a => a.phone === phone);
  }
  const snap = await db.collection("applicants")
    .where("phone", "==", phone).limit(1).get();
  return !snap.empty;
}

/* ─── 전체 신청자 조회 (어드민용) ──────────────────────────── */
async function getAllApplicants() {
  if (IS_DEMO || !db) {
    return JSON.parse(localStorage.getItem("demo_applicants") || "[]")
      .reverse();
  }
  const snap = await db.collection("applicants")
    .orderBy("createdAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ─── 사이트 설정 불러오기 ──────────────────────────────────── */
async function getSiteSettings() {
  if (IS_DEMO || !db) {
    const saved = localStorage.getItem("demo_settings");
    return saved ? JSON.parse(saved) : {
      roulette: { isActive: ROULETTE_CONFIG.isActive, prizes: ROULETTE_CONFIG.prizes },
      timer:    { targetDate: TIMER_CONFIG.targetDate, label: TIMER_CONFIG.label, expiredLabel: TIMER_CONFIG.expiredLabel },
      sections: (typeof SECTION_DEFAULTS !== "undefined" ? SECTION_DEFAULTS : {})
    };
  }
  const [rSnap, tSnap, sSnap] = await Promise.all([
    db.doc("settings/roulette").get(),
    db.doc("settings/timer").get(),
    db.doc("settings/sections").get()
  ]);
  return {
    roulette: rSnap.exists ? rSnap.data() : ROULETTE_CONFIG,
    timer:    tSnap.exists ? tSnap.data() : TIMER_CONFIG,
    sections: sSnap.exists ? sSnap.data() : (typeof SECTION_DEFAULTS !== "undefined" ? SECTION_DEFAULTS : {})
  };
}

/* ─── 사이트 설정 저장 (어드민용) ───────────────────────────── */
async function saveSiteSettings(settings) {
  if (IS_DEMO || !db) {
    localStorage.setItem("demo_settings", JSON.stringify(settings));
    return;
  }
  const batch = db.batch();
  if (settings.roulette) batch.set(db.doc("settings/roulette"), settings.roulette);
  if (settings.timer)    batch.set(db.doc("settings/timer"),    settings.timer);
  if (settings.sections) batch.set(db.doc("settings/sections"), settings.sections);
  await batch.commit();
}

/* ─── 사진 교체(미디어 오버라이드) ──────────────────────────────
   slotId = 기본 파일명. Firebase 설정 시 Storage 업로드 + Firestore 저장,
   미설정 시 localStorage(브라우저)에 dataURL로 저장(미리보기용). */
async function getMediaOverrides() {
  let remote = {};
  if (!(IS_DEMO || !db)) {
    try { const s = await db.doc("settings/media").get(); if (s.exists) remote = s.data() || {}; }
    catch (e) { /* ignore */ }
  }
  let local = {};
  try { local = JSON.parse(localStorage.getItem("weddingExpo_media") || "{}"); } catch (e) {}
  return { ...remote, ...local };  // 로컬 미리보기가 원격 위에 덮임
}

async function uploadMedia(slotId, file) {
  // 다운스케일(있으면)
  let blob = file;
  if (typeof downscaleImageFile === "function") {
    try { blob = await downscaleImageFile(file, IS_DEMO ? 1100 : 1500, 0.82); } catch (e) {}
  }
  if (IS_DEMO || !storage || !db) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
    });
    const map = JSON.parse(localStorage.getItem("weddingExpo_media") || "{}");
    map[slotId] = dataUrl;
    try { localStorage.setItem("weddingExpo_media", JSON.stringify(map)); }
    catch (e) { throw new Error("브라우저 저장공간이 가득 찼습니다. Firebase를 연결하면 용량 제한 없이 저장됩니다."); }
    return { url: dataUrl, mode: "local" };
  }
  const ref = storage.ref().child("media/" + slotId);
  await ref.put(blob, { contentType: "image/jpeg" });
  const url = await ref.getDownloadURL();
  await db.doc("settings/media").set({ [slotId]: url }, { merge: true });
  return { url, mode: "firebase" };
}

async function removeMediaOverride(slotId) {
  const map = JSON.parse(localStorage.getItem("weddingExpo_media") || "{}");
  delete map[slotId];
  localStorage.setItem("weddingExpo_media", JSON.stringify(map));
  if (!(IS_DEMO || !db)) {
    try {
      await db.doc("settings/media").set(
        { [slotId]: firebase.firestore.FieldValue.delete() }, { merge: true });
      if (storage) { try { await storage.ref().child("media/" + slotId).delete(); } catch (e) {} }
    } catch (e) {}
  }
}

/* ─── 신청자 삭제 (어드민용) ─────────────────────────────────── */
async function deleteApplicant(id) {
  if (IS_DEMO || !db) {
    let list = JSON.parse(localStorage.getItem("demo_applicants") || "[]");
    list = list.filter((_, i) => String(i) !== String(id));
    localStorage.setItem("demo_applicants", JSON.stringify(list));
    return;
  }
  await db.collection("applicants").doc(id).delete();
}

/* ─── Firebase Auth ─────────────────────────────────────────── */
async function adminLogin(email, password) {
  if (IS_DEMO || !auth) {
    // 데모모드: 이메일/비밀번호 모두 "demo"면 로그인 허용
    if (email === "demo" && password === "demo") return true;
    throw new Error("데모모드: 이메일 'demo', 비밀번호 'demo'로 입력하세요.");
  }
  await auth.signInWithEmailAndPassword(email, password);
  return true;
}

async function adminLogout() {
  if (IS_DEMO || !auth) {
    localStorage.removeItem("demo_admin_logged_in");
    return;
  }
  await auth.signOut();
}

function onAdminAuthChange(callback) {
  if (IS_DEMO || !auth) {
    const isLoggedIn = localStorage.getItem("demo_admin_logged_in") === "true";
    setTimeout(() => callback(isLoggedIn ? { email: "demo" } : null), 100);
    return;
  }
  return auth.onAuthStateChanged(callback);
}
