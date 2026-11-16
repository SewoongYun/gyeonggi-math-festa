/**
 * 경기 페스타 부스 사이트 ─ 구글 시트 연동 API (Google Apps Script)
 *
 * 설치 순서
 *  1. 구글 시트 → [확장 프로그램 → Apps Script] → 이 파일 내용을 Code.gs에 붙여 넣고 저장
 *  2. 왼쪽 톱니(프로젝트 설정) → 스크립트 속성 추가:  ADMIN_KEY = (관리자 비밀번호)
 *  3. 위 함수 목록에서 setup 선택 → 실행 (권한 허용). '작품목록' 시트와 헤더가 만들어집니다.
 *     (처음이라면 importSeed 를 실행해 사이트의 data/apps.json 을 시트로 가져올 수 있습니다)
 *  4. [배포 → 새 배포 → 웹 앱]  실행: 나 / 액세스: 모든 사용자 → 배포 → URL 복사
 *  5. 사이트의 config.js 에서 apiUrl 에 URL을 붙여 넣습니다.
 *  ※ 코드를 고친 뒤에는 [배포 → 배포 관리 → 연필 → 새 버전] 으로 다시 배포해야 반영됩니다.
 */

// 작품 데이터가 있는 스프레드시트 ID (주소창의 /d/ 와 /edit 사이 값).
// 이 값이 있으면 스크립트가 어느 시트에 붙어 있든 항상 이 시트를 읽고 씁니다.
const SPREADSHEET_ID = '1Za1qTX3PCyx6UhR_yaELus6qeQpiHFf06iAfwpfEaOg';
const SHEET_NAME = '작품목록';
const HEADERS = ['ID', '구분', '제목', '한줄소개', '체험링크', '목적', '수학적 내용', '프로그램 설명', '만드는 방법', '제작자', '태그', '공개', '순서', '수정일시'];
const KEY_TO_HEADER = {
  id: 'ID', category: '구분', title: '제목', subtitle: '한줄소개', url: '체험링크', purpose: '목적', math: '수학적 내용',
  description: '프로그램 설명', howto: '만드는 방법', maker: '제작자', tags: '태그', visible: '공개', order: '순서', updated: '수정일시'
};
// 사이트에 배포된 기본 데이터 주소 (importSeed 용). GitHub Pages 주소로 바꿔 쓰세요.
const SITE_JSON_URL = 'https://sewoongyun.github.io/gyeonggi-math-festa/data/apps.json';

/* ───────── 웹앱 진입점 ───────── */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'list';
  if (action === 'list') return json_({ ok: true, rows: readRows_(), updatedAt: new Date().toISOString() });
  if (action === 'ping') return json_({ ok: true, sheet: SHEET_NAME });
  return json_({ ok: false, error: 'unknown action: ' + action });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkKey_(body.key)) return json_({ ok: false, error: '관리자 키가 올바르지 않습니다.' });
    if (body.action === 'upsert') upsert_(body.row || {});
    else if (body.action === 'delete') remove_(body.id);
    else return json_({ ok: false, error: 'unknown action: ' + body.action });
    return json_({ ok: true, rows: readRows_() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ───────── 설정 ───────── */
function setup() {
  const sh = getSheet_();
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#e4ecff');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, HEADERS.length, 160);
    [6, 7, 8, 9].forEach(c => sh.setColumnWidth(c, 320));
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    const key = Utilities.getUuid().slice(0, 8);
    props.setProperty('ADMIN_KEY', key);
    Logger.log('ADMIN_KEY 가 없어 자동 생성했습니다: ' + key + '  (프로젝트 설정 → 스크립트 속성에서 바꿀 수 있습니다)');
  }
  Logger.log('설정 완료: 시트 "' + SHEET_NAME + '" 준비됨');
}

/** 사이트의 data/apps.json 을 시트로 가져오기 (ID가 같은 행은 덮어씀) */
function importSeed(url) {
  const src = url || SITE_JSON_URL;
  const res = UrlFetchApp.fetch(src, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('JSON을 가져오지 못했습니다: ' + res.getResponseCode());
  const list = JSON.parse(res.getContentText());
  list.forEach(row => upsert_(row));
  Logger.log(list.length + '개 작품을 가져왔습니다.');
}

/* ───────── 내부 함수 ───────── */
function getSheet_() {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  return sh;
}
function headerIndex_(sh) {
  const header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const idx = {}; header.forEach((h, i) => { if (h.trim()) idx[h.trim()] = i; });
  return { header, idx };
}
function readRows_() {
  const sh = getSheet_();
  if (sh.getLastRow() < 2) return [];
  const { header } = headerIndex_(sh);
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, header.length).getValues();
  return values
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => { const o = {}; header.forEach((h, i) => { if (h.trim()) o[h.trim()] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return o; });
}
function upsert_(row) {
  const sh = getSheet_();
  if (sh.getLastRow() === 0) setup();
  const { header, idx } = headerIndex_(sh);
  // 누락된 헤더는 자동 추가
  HEADERS.forEach(h => { if (!(h in idx)) { sh.getRange(1, header.length + 1).setValue(h); header.push(h); idx[h] = header.length - 1; } });
  const id = String(row.id || row.ID || '').trim();
  if (!id) throw new Error('ID가 비어 있습니다.');
  const out = new Array(header.length).fill('');
  Object.keys(row).forEach(k => {
    const h = KEY_TO_HEADER[k] || k;
    if (h in idx) out[idx[h]] = row[k] == null ? '' : row[k];
  });
  out[idx['ID']] = id;
  out[idx['수정일시']] = new Date();
  if (!out[idx['공개']]) out[idx['공개']] = 'Y';
  const found = findRow_(sh, idx['ID'], id);
  if (found) {
    // 빈 값으로 덮어쓰지 않도록 기존 값 유지(명시적으로 보낸 키만 갱신)
    const cur = sh.getRange(found, 1, 1, header.length).getValues()[0];
    header.forEach((h, i) => { if (!(h in reverse_(KEY_TO_HEADER, row)) && h !== '수정일시') out[i] = cur[i]; });
    sh.getRange(found, 1, 1, header.length).setValues([out]);
  } else {
    sh.appendRow(out);
  }
}
function reverse_(map, row) { // row 가 보낸 키들을 헤더 이름 집합으로
  const set = {}; Object.keys(row).forEach(k => { set[map[k] || k] = true; }); return set;
}
function remove_(id) {
  const sh = getSheet_();
  const { idx } = headerIndex_(sh);
  const r = findRow_(sh, idx['ID'], String(id || '').trim());
  if (!r) throw new Error('해당 ID를 찾을 수 없습니다: ' + id);
  sh.deleteRow(r);
}
function findRow_(sh, col, id) {
  if (sh.getLastRow() < 2) return 0;
  const ids = sh.getRange(2, col + 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) return i + 2;
  return 0;
}
function checkKey_(key) {
  const saved = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return !!saved && String(key || '') === saved;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
