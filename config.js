// ─────────────────────────────────────────────────────────────
//  사이트 설정  (이 파일만 고치면 됩니다)
// ─────────────────────────────────────────────────────────────
window.SITE_CONFIG = {
  // 기관·행사 이름
  orgName: "경기도수학교육연구회",
  eventName: "2026 경기 페스타",
  boothName: "AI·바이브 코딩 수학 수업 체험 부스",

  // ① 구글 시트 연동 (Apps Script 웹앱 URL)
  //    apps-script/Code.gs 를 배포한 뒤 나온 /exec 주소를 넣으세요.
  //    비워 두면 data/apps.json 의 기본 데이터를 사용합니다.
  apiUrl: "https://script.google.com/macros/s/AKfycbwj37mrKpxhfaVL6HthYOGmh_IToeWpR2x2FyNn5Df1QqRkteulFXN6ptRxy7AvDzUKXA/exec",

  // ② (선택) Apps Script 없이 '웹에 게시'한 시트의 CSV 주소로만 읽기
  //    파일 → 공유 → 웹에 게시 → 시트 선택 → CSV → 게시 후 주소 붙여넣기
  //    apiUrl 이 비어 있을 때만 사용됩니다. (이 방식은 읽기 전용)
  csvUrl: "https://docs.google.com/spreadsheets/d/1Za1qTX3PCyx6UhR_yaELus6qeQpiHFf06iAfwpfEaOg/gviz/tq?tqx=out:csv&sheet=%EC%9E%91%ED%92%88%EB%AA%A9%EB%A1%9D",

  // ③ 관리자 페이지에서 '시트 열기' 버튼에 쓸 구글 시트 편집 주소
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1Za1qTX3PCyx6UhR_yaELus6qeQpiHFf06iAfwpfEaOg/edit",

  // ④ 관리자 페이지 비밀번호
  //    apiUrl 이 있으면 Apps Script 의 ADMIN_KEY 로 검증하므로 여기는 비워 둡니다.
  //    Apps Script 없이 쓸 때만: 비밀번호의 SHA-256 해시를 넣으면 간이 보호가 됩니다.
  adminPasswordHash: "",

  // 활동기록집 등 참고 자료 링크(비워도 됩니다)
  recordBookUrl: ""
};
