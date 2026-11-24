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
  apiUrl: "",

  // ② (선택) Apps Script 없이 '웹에 게시'한 시트의 CSV 주소로만 읽기
  //    파일 → 공유 → 웹에 게시 → 시트 선택 → CSV → 게시 후 주소 붙여넣기
  //    apiUrl 이 비어 있을 때만 사용됩니다. (이 방식은 읽기 전용)
  csvUrl: "",

  // ③ 관리자 페이지에서 '시트 열기' 버튼에 쓸 구글 시트 편집 주소
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1Za1qTX3PCyx6UhR_yaELus6qeQpiHFf06iAfwpfEaOg/edit",

  // ④ 관리자 페이지 비밀번호
  //    apiUrl 이 있으면 Apps Script 의 ADMIN_KEY 로 검증하므로 여기는 비워 둡니다.
  //    Apps Script 없이 쓸 때만: 비밀번호의 SHA-256 해시를 넣으면 간이 보호가 됩니다.
  adminPasswordHash: "",

  // 활동기록집 등 참고 자료 링크(비워도 됩니다)
  recordBookUrl: ""
};

// ─── 보관본 표시 ───
// 이 폴더는 예전 버전 보관본입니다. 구글 시트 대신 이 폴더의 data/apps.json(당시 데이터)만 읽고,
// 화면 위에 최신 사이트로 가는 안내를 띄웁니다.
document.addEventListener("DOMContentLoaded", function () {
  var bar = document.createElement("p");
  bar.setAttribute("role", "note");
  bar.style.cssText = "margin:0;padding:10px 16px;background:#14171c;color:#f5f6f1;font:600 14px/1.5 'Pretendard Variable','Malgun Gothic',sans-serif;text-align:center;position:fixed;left:0;right:0;bottom:0;z-index:300";
  document.body.style.paddingBottom = "48px";
  bar.innerHTML = '예전 버전 보관본입니다. 체험 1·2·3 최신 안내는 <a href="../" style="color:#ffe27a;text-decoration:underline;text-underline-offset:3px">최신 사이트</a>에서 보세요.';
  document.body.insertBefore(bar, document.body.firstChild);
});
