/* ═══════════════════════════════════════════════════════════════
   config.js — 2026 창원 프리미엄 웨딩박람회 사이트 설정 파일
   이 파일만 수정하면 사이트의 모든 내용이 바뀝니다.
   ═══════════════════════════════════════════════════════════════ */

/* ─── 1. Firebase 설정 ───────────────────────────────────────
   https://console.firebase.google.com 에서 프로젝트 생성 후
   아래 값들을 교체하세요. 값이 "YOUR_"로 시작하면 데모모드로 작동합니다. */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCXLyC88G2Ro5Cbd2MeFIwnajfAEWBQtKY",
  authDomain:        "andthird-wedding.firebaseapp.com",
  projectId:         "andthird-wedding",
  storageBucket:     "andthird-wedding.firebasestorage.app",
  messagingSenderId: "851102488068",
  appId:             "1:851102488068:web:80dd042c708324e58c0751",
  measurementId:     "G-T85W3SHN3N"
};

/* ─── 2. 어드민 계정 ────────────────────────────────────────
   Firebase Authentication에서 이 이메일로 계정을 만들어두세요. */
const ADMIN_EMAIL = "admin@andthird.kr";

/* ─── 3. 네이버지도 설정 ──────────────────────────────────────
   네이버 클라우드 플랫폼(NCP) 콘솔 > Maps > Application 에서
   Web Dynamic Map 용 Client ID(ncpKeyId)를 발급받아 입력하세요.
   https://www.ncloud.com/product/applicationService/maps
   값이 "YOUR_"로 시작하면 지도 대신 안내 카드가 표시됩니다. */
const NAVER_MAP_CLIENT_ID = "8st8mvutmb";

/* 행사장 위치 — 주소/좌표는 네이버지도에서 확인 후 입력하세요.
   lat/lng 는 창원 창이대로719번길 부근 임시 좌표이며,
   정확한 핀 위치는 발급 후 좌표만 교체하면 됩니다. */
const VENUE_CONFIG = {
  name:    "앤써드웨딩",
  address: "경상남도 창원시 창이대로719번길 4-8 1층",
  phone:   "010-2407-4629",
  lat:     35.2538,
  lng:     128.6390,
  zoom:    16
};

/* ─── 4. 카운트다운 타이머 설정 ─────────────────────────────── */
/* ─── 4. 카운트다운 타이머 설정 ───────────────────────────────
   카운트다운은 "월별 이벤트 마감" 용도입니다.
   기본값은 이번 달 말일(자정)으로 자동 설정되어 매달 갱신됩니다.
   특정 날짜로 고정하려면 어드민(이벤트 & 타이머)에서 날짜를 지정하세요. */
function endOfThisMonthISO() {
  const now = new Date();
  // 이번 달 마지막 날 23:59:59 (로컬/KST)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return end.toISOString();
}
const TIMER_CONFIG = {
  targetDate:   endOfThisMonthISO(),
  label:        "이달의 무료 입장권 이벤트 · 마감까지",
  expiredLabel: "이달의 이벤트가 마감되었습니다 · 다음 달 혜택을 기대해 주세요!"
};

/* ─── 5. 룰렛 설정 ──────────────────────────────────────────
   isActive: false로 바꾸면 룰렛 팝업이 나타나지 않습니다.
   weight 합계는 반드시 100이어야 합니다. */
const ROULETTE_CONFIG = {
  isActive: true,
  prizes: [
    { name: "스튜디오 상품권 10만원",   weight: 50 },
    { name: "예복 상품권 10만원",       weight:  0 },
    { name: "부모님 한복 상품권 10만원", weight: 50 },
    { name: "드레스 상품권 10만원",     weight:  0 },
    { name: "예물 상품권 10만원",       weight:  0 },
    { name: "신혼여행 상품권 10만원",   weight:  0 }
  ]
};

/* ─── 6. 섹션 On/Off 기본값 ──────────────────────────────────
   어드민에서 토글하면 이 값이 저장되어 사이트에 반영됩니다. */
const SECTION_DEFAULTS = {
  "section-studio":     true,
  "section-hall":       true,
  "section-dresses":    true,
  "section-jewelry":    true,
  "section-hanbok":     true,
  "section-travel":     true,
  "section-appliance":  false,
  "section-directions": true
};

/* ─── 7. 섹션별 콘텐츠 데이터 ───────────────────────────────── */
const EXPO_DATA = {

  /* 스튜디오 */
  studios: [
    { nameKr: "부산 고스튜디오",    nameEn: "GO STUDIO",       badge: "부산" },
    { nameKr: "창원 벨리바이 GO",   nameEn: "BELLY BY GO",     badge: "창원" },
    { nameKr: "노우드스튜디오",     nameEn: "NORWOOD STUDIO",  badge: "" },
    { nameKr: "어반스튜디오",       nameEn: "URBAN STUDIO",    badge: "" },
    { nameKr: "히뉴스튜디오",       nameEn: "HINEW STUDIO",    badge: "" },
    { nameKr: "블랑드윈느",         nameEn: "BLANC DE WINNE",  badge: "" },
    { nameKr: "세이망스튜디오",     nameEn: "SEIMANG STUDIO",  badge: "" }
  ],

  /* 웨딩홀 */
  halls: [
    { nameKr: "GL웨딩홀",        nameEn: "GL WEDDING HALL",     badge: "" },
    { nameKr: "인터내셔널호텔",   nameEn: "INTERNATIONAL HOTEL", badge: "" },
    { nameKr: "리베라웨딩컨벤션", nameEn: "RIVERA CONVENTION",   badge: "" },
    { nameKr: "마산 힐스카이",    nameEn: "HILL SKY",            badge: "마산" },
    { nameKr: "웨딩의전당",       nameEn: "THE WEDDING HALL",    badge: "" },
    { nameKr: "진해 JK웨딩홀",    nameEn: "JK WEDDING HALL",     badge: "진해" },
    { nameKr: "JW웨딩홀",         nameEn: "JW WEDDING HALL",     badge: "" },
    { nameKr: "마산 스카이뷰",    nameEn: "SKY VIEW",            badge: "마산" }
  ],

  /* 드레스 & 예복 */
  dresses: [
    { nameKr: "부산 루아브라이드 아이테오", nameEn: "LUA BRIDE ITEO", badge: "드레스" },
    { nameKr: "보다이승진",        nameEn: "BODAI SEUNGJIN",  badge: "드레스" },
    { nameKr: "부산 더리움",       nameEn: "THE LIUM",        badge: "드레스" },
    { nameKr: "브라이덜수",        nameEn: "BRIDAL SOO",      badge: "드레스" },
    { nameKr: "창원 루아브라이드", nameEn: "LUA BRIDE",       badge: "드레스" },
    { nameKr: "커민테일러",        nameEn: "COMMIN TAILOR",   badge: "예복" },
    { nameKr: "아바테일러",        nameEn: "ABA TAILOR",      badge: "예복" },
    { nameKr: "살로토",            nameEn: "SALOTTO",         badge: "예복" }
  ],

  /* 예물 — 제휴 주얼리 (공통 태그만) */
  jewelry: [
    { brand: "라애주얼리",     desc: "", tag: "박람회 특가" },
    { brand: "백자바이피렌체", desc: "", tag: "박람회 특가" },
    { brand: "릴리다이아몬드", desc: "", tag: "박람회 특가" },
    { brand: "부산데이아",     desc: "", tag: "박람회 특가" }
  ],

  /* 한복 */
  hanboks: [
    { nameKr: "한빔한복",   nameEn: "HANBIM HANBOK",  badge: "" },
    { nameKr: "은하수한복", nameEn: "EUNHASU HANBOK", badge: "" }
  ],

  /* 신혼여행지 — 정사각 그리드 (이름 표시) */
  travel: [
    { dest: "몰디브",      destEn: "MALDIVES",     img: "images/travel/t1.jpg" },
    { dest: "발리",        destEn: "BALI",         img: "images/travel/t2.jpg" },
    { dest: "푸켓",        destEn: "PHUKET",       img: "images/travel/t3.jpg" },
    { dest: "세부",        destEn: "CEBU",         img: "images/travel/t4.jpg" },
    { dest: "다낭",        destEn: "DA NANG",      img: "images/travel/t5.jpg" },
    { dest: "보라카이",    destEn: "BORACAY",      img: "images/travel/t6.jpg" },
    { dest: "하와이",      destEn: "HAWAII",       img: "images/travel/t7.jpg" },
    { dest: "칸쿤",        destEn: "CANCUN",       img: "images/travel/t8.jpg" },
    { dest: "사이판",      destEn: "SAIPAN",       img: "images/travel/t9.jpg" },
    { dest: "모리셔스",    destEn: "MAURITIUS",    img: "images/travel/t10.jpg" },
    { dest: "산토리니",    destEn: "SANTORINI",    img: "images/travel/t11.jpg" },
    { dest: "파리",        destEn: "PARIS",        img: "images/travel/t12.jpg" },
    { dest: "로마",        destEn: "ROME",         img: "images/travel/t13.jpg" },
    { dest: "프라하",      destEn: "PRAGUE",       img: "images/travel/t14.jpg" },
    { dest: "스위스",      destEn: "SWITZERLAND",  img: "images/travel/t15.jpg" },
    { dest: "두바이",      destEn: "DUBAI",        img: "images/travel/t16.jpg" }
  ],

  /* 혼수 가전 */
  appliances: [
    { brand: "삼성 냉장고",    desc: "비스포크 4도어 냉장고",     discount: 20, tag: "특별 사은품", img: "images/appliance/a1.jpg" },
    { brand: "LG 세탁기",     desc: "트롬 스팀+건조기 세트",      discount: 15, tag: "무이자 할부",  img: "images/appliance/a2.jpg" },
    { brand: "삼성 에어컨",   desc: "비스포크 무풍에어컨",         discount: 18, tag: "박람회 특가", img: "images/appliance/a3.jpg" },
    { brand: "LG 건조기",     desc: "듀얼인버터 히트펌프",         discount: 12, tag: "설치비 무료",  img: "images/appliance/a4.jpg" },
    { brand: "삼성 식기세척기",desc: "비스포크 빌트인",            discount: 22, tag: "한정 수량",   img: "images/appliance/a5.jpg" },
    { brand: "LG 공기청정기", desc: "퓨리케어 360° 필터",          discount: 10, tag: "스페셜 세트", img: "images/appliance/a6.jpg" },
    { brand: "갤버트 가구",   desc: "프리미엄 혼수 가구 컬렉션",     tag: "박람회 특가", img: "images/appliance/a7.jpg" }
  ]
};
