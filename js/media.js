/* ═══════════════════════════════════════════════════════════════
   media.js — 사진 슬롯 / 교체(오버라이드) 공유 모듈
   • 사이트(index)와 어드민(admin) 양쪽에서 로드됩니다.
   • Firebase가 설정되어 있으면 업로드한 사진이 방문자에게도 반영되고,
     설정 전(데모모드)에는 브라우저(localStorage)에만 저장되어 미리보기로 동작합니다.
   ═══════════════════════════════════════════════════════════════ */

window.MEDIA_OVERRIDES = window.MEDIA_OVERRIDES || {};

/* 슬롯 ID = 기본(스톡) 파일명. themedSrc()와 100% 동일한 규칙으로 계산. */
function mediaFilename(keywords, seed, w, h) {
  const cleaned = String(keywords).split(",")
    .map(s => s.trim().replace(/\s+/g, "")).filter(Boolean).join(",");
  const tag = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return tag + "_" + seed + "_" + w + "x" + h + ".jpg";
}

/* 슬롯 ID에 대한 현재 표시 소스 (교체본 우선, 없으면 기본 파일) */
function mediaSrc(slotId) {
  return (window.MEDIA_OVERRIDES && window.MEDIA_OVERRIDES[slotId]) || ("images/" + slotId);
}

/* ─── 사이트 전 영역의 사진 슬롯 목록 (어드민 '사진 관리'에서 사용) ─── */
function buildMediaManifest() {
  const E = (typeof EXPO_DATA !== "undefined" && EXPO_DATA) || window.EXPO_DATA || {};
  const groups = [];

  // 갤러리 레이아웃 시드/사이즈 (app.js renderVendorList와 동일)
  const mixed = (seed) => [
    [seed, 1200, 800], [seed + 1, 1200, 800],
    [seed + 2, 800, 1200], [seed + 3, 800, 1200], [seed + 4, 800, 1200],
    [seed + 5, 1200, 800], [seed + 6, 1200, 800],
    [seed + 7, 800, 1200], [seed + 8, 800, 1200], [seed + 9, 800, 1200]
  ];
  const square = (seed) => Array.from({ length: 8 }, (_, i) => [seed + i, 800, 800]);
  const gallerySlots = (kw, tuples) => tuples.map(([s, w, h], i) =>
    ({ id: mediaFilename(kw, s, w, h), w, h, label: "사진 " + String(i + 1).padStart(2, "0") }));

  groups.push({
    key: "hero", title: "메인 히어로", note: "최상단 대형 배경 (가로형 권장)", cols: 1,
    slots: [{ id: mediaFilename("wedding,couple,romantic", 41, 1920, 1080), w: 1920, h: 1080, label: "히어로 배경" }]
  });

  groups.push({
    key: "credentials", title: "Why Us 카드", note: "상단 신뢰 카드 3장", cols: 3,
    slots: [
      { id: mediaFilename("wedding,bride", 700, 900, 620), w: 900, h: 620, label: "카드 01" },
      { id: mediaFilename("wedding,couple", 701, 900, 620), w: 900, h: 620, label: "카드 02" },
      { id: mediaFilename("wedding,flowers", 702, 900, 620), w: 900, h: 620, label: "카드 03" }
    ]
  });

  groups.push({ key: "studios",  title: "스튜디오 갤러리",  note: "I · 가로 2 + 세로 3 반복", cols: 5, slots: gallerySlots("wedding,bride", mixed(100)) });
  groups.push({ key: "halls",    title: "웨딩홀 갤러리",    note: "II · 정사각 8장", cols: 4, slots: gallerySlots("wedding,hall", square(200)) });
  groups.push({ key: "dresses",  title: "드레스·예복 갤러리", note: "III · 가로 2 + 세로 3 반복", cols: 5, slots: gallerySlots("wedding,dress", mixed(800)) });
  groups.push({ key: "hanboks",  title: "한복 갤러리",      note: "V · 가로 2 + 세로 3 반복", cols: 5, slots: gallerySlots("hanbok", mixed(300)) });

  groups.push({
    key: "jewelry", title: "예물 카드 사진", note: "IV · 업체별 1장 (세로형)", cols: 4,
    slots: (E.jewelry || []).map((it, i) =>
      ({ id: mediaFilename("diamond,ring", 400 + i, 800, 1000), w: 800, h: 1000, label: it.brand || ("예물 " + (i + 1)) }))
  });

  groups.push({
    key: "travel", title: "신혼여행 사진", note: "VI · 여행지 16장 (정사각)", cols: 8,
    slots: (E.travel || []).map((it, i) => {
      const kw = (it.destEn || it.dest || "travel").toLowerCase().replace(/\s+/g, "");
      return { id: mediaFilename(kw, 600 + i, 800, 800), w: 800, h: 800, label: it.dest || it.destEn || ("여행 " + (i + 1)) };
    })
  });

  groups.push({
    key: "appliances", title: "가전·가구 카드 사진", note: "VII · 품목별 1장 (세로형)", cols: 4,
    slots: (E.appliances || []).map((it, i) =>
      ({ id: mediaFilename("kitchen", 500 + i, 800, 1000), w: 800, h: 1000, label: it.brand || ("가전 " + (i + 1)) }))
  });

  return groups;
}

/* ─── 업로드 전 이미지 다운스케일 (용량 절약 · 빠른 로딩) ─── */
function downscaleImageFile(file, maxSide, quality) {
  maxSide = maxSide || 1400; quality = quality || 0.82;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const cw = Math.round(img.naturalWidth * scale), ch = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas"); c.width = cw; c.height = ch;
      c.getContext("2d").drawImage(img, 0, 0, cw, ch);
      c.toBlob((b) => resolve(b || file), "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

/* 사이트 init에서 호출 — 교체본을 불러와 MEDIA_OVERRIDES에 채움 */
async function loadMediaOverridesInto() {
  try {
    if (typeof getMediaOverrides === "function") {
      window.MEDIA_OVERRIDES = await getMediaOverrides();
    }
  } catch (e) { /* 무시하고 기본 이미지 사용 */ }
  return window.MEDIA_OVERRIDES;
}
