/* ─────────────────────────────────────────────────────────────
 *  공통 데이터 로더 + 메인 페이지(탭·갤러리·모달) 동작
 *  - 데이터 우선순위: Apps Script API → 구글 시트 CSV → data/apps.json
 * ───────────────────────────────────────────────────────────── */
(function () {
  const CFG = window.SITE_CONFIG || {};

  // 구분(카테고리) ─ 시트에는 한글로 적어도 됩니다.
  const CATS = {
    hybrid:   { label: "Hybrid 체험수학 2.0", short: "체험수학 2.0" },
    feedback: { label: "평가 피드백 자동화", short: "평가 피드백" },
    vibe:     { label: "바이브 코딩 작업물", short: "바이브 코딩" },
    integrated: { label: "통합설계 사례 나눔", short: "체험2 통합설계" },
    regional:   { label: "지역연계 체험 수학", short: "체험3 지역연계" }
  };
  // 부스의 체험 1·2·3 ─ planned 카드는 제목이 match 에 맞는 작품이 시트에 올라오면 사라진다
  const SESSIONS = {
    exp1: {
      name: "체험1", title: "AI 활용 Hybrid 체험수학 2.0 및 평가 피드백 자동화 실습", cats: ["hybrid", "feedback", "vibe"],
      extra: ["웹 공유 프로그램 제작 방법"], planned: []
    },
    exp2: {
      name: "체험2", title: "통합설계 사례 나눔", cats: ["integrated"],
      extra: ["체험수학 수업 연계 자료 8종(아래 ①~⑧ 탭)"],
      planned: [{ title: "통합설계 실습", match: /통합\s*설계/ }],
      // 탭을 누르면 저장소의 PDF를 바로 보여 준다. 전체 자료는 공유 드라이브에도 있다.
      materials: {
        main: "통합설계 실습",
        drive: "https://drive.google.com/drive/folders/15g-ga4lkSPLpJl53UJ8urBNRC_FLyG1R?usp=drive_link",
        items: [
          { tab: "① 지오데식 돔", title: "① 건축 속 수학 찾기: 지오데식 돔의 수열", files: [["PDF", "materials/exp2/01-geodesic-dome.pdf"]] },
          { tab: "② 삼수선 정리", title: "② 삼수선 정리(기하)", files: [["PDF", "materials/exp2/02-three-perpendiculars.pdf"]] },
          { tab: "③ 과자 많이 담아가기", title: "③ 과자 많이 담아가기(수학2 미적분 활용)", files: [["PDF", "materials/exp2/03-snack-box-calculus.pdf"]] },
          { tab: "④ 정적분과 급수", title: "④ 컴퓨터 프로그램으로 발견하는 정적분과 급수의 관계", files: [["PDF", "materials/exp2/04-integral-and-series.pdf"]] },
          { tab: "⑤ 카발리에리의 원리", title: "⑤ 잘라서 비교하면 부피가 보인다! 카발리에리의 원리", files: [["PDF", "materials/exp2/05-cavalieri.pdf"]] },
          { tab: "⑥ 레고 확률 실험", title: "⑥ 레고 스파이크 프라임을 활용한 수학적 확률과 통계적 확률의 이해", files: [["발표 자료", "materials/exp2/06-lego-spike-slides.pdf"], ["활동지", "materials/exp2/06-lego-spike-worksheet.pdf"]] },
          { tab: "⑦ 주사위 실험", title: "⑦ 주사위실험(확률과 통계 큰수의 법칙)", files: [["PDF", "materials/exp2/07-dice-law-of-large-numbers.pdf"]] },
          { tab: "⑧ 이항분포기", title: "⑧ 이항분포기로 배우는 확률과 통계", files: [["PDF", "materials/exp2/08-binomial-board.pdf"]] }
        ]
      }
    },
    exp3: {
      name: "체험3", title: "지역연계 체험 수학", cats: ["regional"],
      extra: ["안성·김포·프랑스 지역 연계 사례", "경기형 AI 교수학습 플랫폼 수업콘텐츠 개발 자료"],
      planned: [{ title: "지역연계 체험 수학", match: /./ }]
    }
  };
  // 체험2·3은 먼저 가려낸다. 아래 별칭의 '체험', '평가'에 걸리기 때문 ('체험수학 2.0'은 여기에 안 걸림)
  const CAT_PATTERNS = {
    integrated: /^integrated$|체험\s*2(?![.\d])|통합\s*설계/,
    regional: /^regional$|체험\s*3(?![.\d])|지역\s*연계/
  };
  const CAT_ALIASES = {
    hybrid: ["hybrid", "체험수학", "체험수학 2.0", "체험", "실습1"],
    feedback: ["feedback", "평가", "피드백", "평가 피드백", "평가 피드백 자동화", "실습2"],
    vibe: ["vibe", "바이브", "바이브 코딩", "바이브코딩", "우리"]
  };

  // 시트 헤더(한글) → 내부 키
  const HEADER_MAP = {
    "id": "id", "ID": "id", "아이디": "id",
    "구분": "category", "카테고리": "category", "category": "category",
    "제목": "title", "title": "title",
    "한줄소개": "subtitle", "한 줄 소개": "subtitle", "부제": "subtitle", "subtitle": "subtitle",
    "체험링크": "url", "체험 링크": "url", "링크": "url", "url": "url", "URL": "url",
    "목적": "purpose", "purpose": "purpose",
    "수학적 내용": "math", "수학적내용": "math", "math": "math",
    "프로그램 설명": "description", "프로그램설명": "description", "설명": "description", "description": "description",
    "만드는 방법": "howto", "만드는방법": "howto", "제작 방법": "howto", "howto": "howto",
    "제작자": "maker", "maker": "maker",
    "태그": "tags", "tags": "tags",
    "공개": "visible", "visible": "visible",
    "순서": "order", "order": "order",
    "수정일시": "updated", "updated": "updated"
  };

  function normalizeCategory(v) {
    const s = String(v || "").trim().toLowerCase();
    for (const key of Object.keys(CAT_PATTERNS)) if (CAT_PATTERNS[key].test(s)) return key;
    for (const key of Object.keys(CAT_ALIASES)) {
      if (CAT_ALIASES[key].some(a => s === a.toLowerCase() || s.includes(a.toLowerCase()))) return key;
    }
    return "hybrid";
  }
  function slug(s) { return String(s || "item").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "") || "item"; }
  function normalizeRow(raw) {
    const row = {};
    Object.keys(raw).forEach(k => {
      const key = HEADER_MAP[String(k).trim()] || String(k).trim();
      row[key] = raw[k] == null ? "" : String(raw[k]).trim();
    });
    row.id = row.id || slug(row.title);
    row.category = normalizeCategory(row.category);
    row.order = Number(row.order) || 999;
    row.visible = !/^(n|no|false|0|아니오|비공개)$/i.test(row.visible || "Y");
    row.tagList = (row.tags || "").split(/[,，/]/).map(s => s.trim()).filter(Boolean);
    return row;
  }

  // CSV 파서 (따옴표·줄바꿈 처리)
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (q) { if (c === '"' && n === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && n === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    const header = (rows.shift() || []).map(h => h.trim());
    return rows.filter(r => r.some(v => v && v.trim())).map(r => { const o = {}; header.forEach((h, i) => o[h] = r[i] == null ? "" : r[i]); return o; });
  }
  async function fetchJSON(url) { const res = await fetch(url, { cache: "no-store" }); if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); }

  /** 데이터 불러오기 → {rows, source, note, errors} */
  async function loadApps() {
    const attempts = [];
    if (CFG.apiUrl) {
      try {
        const sep = CFG.apiUrl.includes("?") ? "&" : "?";
        const data = await fetchJSON(CFG.apiUrl + sep + "action=list&_=" + Date.now());
        if (data && data.ok && Array.isArray(data.rows) && data.rows.length) return { rows: data.rows.map(normalizeRow), source: "sheet", note: "구글 시트 연동 중 (실시간)" };
        attempts.push(data && data.ok ? "API: 행 0개(스크립트가 다른 시트를 보고 있음)" : "API 응답 형식 오류");
      } catch (e) { attempts.push("API: " + e.message); }
    }
    if (CFG.csvUrl) {
      try {
        const res = await fetch(CFG.csvUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        if (/^\s*</.test(text)) throw new Error("시트가 공개(링크가 있는 모든 사용자)로 공유되지 않았습니다");
        const rows = parseCSV(text).map(normalizeRow);
        if (!rows.length) throw new Error("빈 시트");
        return { rows, source: "csv", note: "구글 시트 연동 중" };
      } catch (e) { attempts.push("CSV: " + e.message); }
    }
    try {
      const rows = (await fetchJSON("data/apps.json")).map(normalizeRow);
      return { rows, source: "local", note: attempts.length ? "시트 연결 실패, 기본 데이터 표시" : "기본 데이터(data/apps.json)", errors: attempts };
    } catch (e) {
      return { rows: [], source: "none", note: "데이터를 불러오지 못했습니다", errors: attempts.concat(e.message) };
    }
  }

  // 공용 유틸
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    });
    (children || []).forEach(c => node.append(c));
    return node;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = el("div", { class: "toast", role: "status" }); document.body.append(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  async function copyText(text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = el("textarea", { style: "position:fixed;opacity:0" }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand("copy"); } catch (_) { } ta.remove(); }
    toast(msg || "복사했습니다");
  }
  function makeQR(container, text, size) {
    container.innerHTML = "";
    if (!text) { container.textContent = "링크 없음"; return; }
    if (window.QRCode) { try { new QRCode(container, { text, width: size || 134, height: size || 134, correctLevel: QRCode.CorrectLevel.M }); return; } catch (_) { } }
    container.textContent = "QR 생성 불가";
  }
  window.AppData = { CATS, loadApps, normalizeRow, parseCSV, el, esc, toast, copyText, makeQR, slug };

  /* ───────────── 메인 페이지 ───────────── */
  const grid = document.getElementById("app-grid");
  if (!grid) return;

  const state = { rows: [], loaded: false, session: "exp1", sub: -1, file: 0, filter: "all", query: "" };
  const sessionsEl = document.getElementById("sessions");
  const extraEl = document.getElementById("session-extra");
  const toolbarEl = document.getElementById("toolbar");
  const noteEl = document.getElementById("cases-note");
  const tabsEl = document.getElementById("tabs");
  const searchEl = document.getElementById("search");
  const badge = document.getElementById("source-badge");
  const modal = document.getElementById("app-modal");
  const PANELS = ["about", "booth", "cases", "howto"];

  /* 메인 탭 */
  function showTab(name) {
    if (!PANELS.includes(name)) return;
    document.querySelectorAll(".tab-panel").forEach(p => p.hidden = p.id !== name);
    document.querySelectorAll(".main-tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    document.querySelectorAll("[data-tab-link]").forEach(a => a.classList.toggle("active", a.dataset.tabLink === name));
  }
  document.querySelectorAll(".main-tab").forEach(b => b.addEventListener("click", () => {
    showTab(b.dataset.tab);
    history.replaceState(null, "", "#" + b.dataset.tab);
    const bar = document.querySelector(".layout");
    const y = bar.getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" });
  }));
  document.querySelectorAll("[data-tab-link]").forEach(a => a.addEventListener("click", () => showTab(a.dataset.tabLink)));

  /* 체험 1·2·3 선택 */
  // 체험 링크가 없는 작품은 사이트에 내보이지 않는다 (시트에 링크를 넣으면 다시 나타남)
  function shown(r) { return r.visible && !!r.url; }
  function sessionRows(key) { return state.rows.filter(r => shown(r) && SESSIONS[key].cats.includes(r.category)); }
  function sessionOf(category) { return Object.keys(SESSIONS).find(k => SESSIONS[k].cats.includes(category)); }
  function selectSession(key) {
    if (key !== state.session) {
      state.filter = "all"; state.query = ""; state.sub = -1; state.file = 0;
      if (searchEl) searchEl.value = "";
    }
    state.session = key;
    renderSessions();
    if (state.loaded) { renderTabs(); renderGrid(); }
  }
  function renderSessions() {
    sessionsEl.querySelectorAll(".session").forEach(b => {
      const n = sessionRows(b.dataset.session).length;
      b.setAttribute("aria-selected", String(b.dataset.session === state.session));
      b.querySelector(".state").textContent = !state.loaded ? "" : n ? n + "개" : "준비 중";
    });
    extraEl.innerHTML = "<b>추가 안내</b>" + SESSIONS[state.session].extra.map(x => "<span>" + esc(x) + "</span>").join("");
    const first = state.session === "exp1";
    tabsEl.hidden = !first;
    noteEl.hidden = !first;
    toolbarEl.hidden = !first && !sessionRows(state.session).length;
    renderMaterials();
  }

  /* 체험 안의 자료 탭 (체험2: 통합설계 실습 + 수업 연계 PDF) */
  const subEl = el("div", { class: "subtabs", role: "tablist", "aria-label": "체험 자료", hidden: true });
  const matEl = el("section", { class: "material", hidden: true });
  extraEl.after(subEl);
  grid.after(matEl);
  function renderMaterials() {
    const m = SESSIONS[state.session].materials;
    subEl.hidden = !m;
    if (!m) { matEl.hidden = true; grid.hidden = false; return; }
    subEl.innerHTML = "";
    [m.main].concat(m.items.map(x => x.tab)).forEach((label, i) => {
      const idx = i - 1;
      subEl.append(el("button", { class: "subtab", type: "button", role: "tab", "aria-selected": String(state.sub === idx), onclick: () => { state.sub = idx; state.file = 0; renderSessions(); showViewer(); } }, [label]));
    });
    subEl.append(el("a", { class: "drive", href: m.drive, target: "_blank", rel: "noopener" }, ["공유 드라이브에서 전체 자료 보기"]));
    const item = m.items[state.sub];
    grid.hidden = !!item;
    matEl.hidden = !item;
    if (!item) return;
    toolbarEl.hidden = true;
    const [, href] = item.files[state.file] || item.files[0];
    matEl.innerHTML =
      '<div class="mat-head"><h3>' + esc(item.title) + '</h3><div class="mat-actions">' +
      item.files.map(([label, h]) => '<a class="btn sm outline" href="' + esc(h) + '" target="_blank" rel="noopener">' + esc(label) + " 새 창으로 열기</a>").join("") +
      "</div></div>" +
      (item.files.length > 1 ? '<div class="mat-files" role="tablist" aria-label="파일 고르기">' + item.files.map(([label], i) => '<button type="button" class="subtab" role="tab" data-file="' + i + '" aria-selected="' + (i === state.file) + '">' + esc(label) + "</button>").join("") + "</div>" : "") +
      '<div class="pdf-viewer" aria-label="' + esc(item.title) + '"></div>';
    matEl.querySelectorAll("[data-file]").forEach(b => b.onclick = () => { state.file = Number(b.dataset.file); renderMaterials(); });
    renderPdf(matEl.querySelector(".pdf-viewer"), href);
  }

  /* PDF를 브라우저 뷰어에 맡기지 않고 PDF.js로 직접 그린다.
   * 휴대폰(삼성 인터넷 포함)은 iframe 속 PDF를 보여 주지 못하고 내려받기로 넘기기 때문.
   * 한 화면에 한 쪽씩 보여 주고 넘긴다. 보는 쪽과 다음 쪽만 그려 이미지로 바꿔 메모리를 아낀다. */
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  let pdfjsReady = null, pdfToken = 0, pdfGo = null;
  function loadPdfjs() {
    if (!pdfjsReady) pdfjsReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS + "pdf.min.js";
      s.onload = () => {
        // 다른 도메인의 워커는 바로 띄울 수 없어 blob 주소로 감싼다
        const blob = new Blob(['importScripts("' + PDFJS + 'pdf.worker.min.js");'], { type: "text/javascript" });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        resolve(window.pdfjsLib);
      };
      s.onerror = () => { pdfjsReady = null; reject(new Error("pdf.js")); };
      document.head.append(s);
    });
    return pdfjsReady;
  }
  async function renderPdf(box, href) {
    const token = ++pdfToken;
    pdfGo = null;
    box.innerHTML =
      '<div class="pdf-stage"><p class="pdf-status">PDF를 불러오는 중입니다…</p></div>' +
      '<div class="pdf-nav"><button type="button" class="btn sm outline" data-go="-1" disabled>이전</button>' +
      '<span class="pdf-count" aria-live="polite"></span>' +
      '<button type="button" class="btn sm outline" data-go="1" disabled>다음</button></div>';
    const stage = box.querySelector(".pdf-stage"), count = box.querySelector(".pdf-count");
    const [prev, next] = box.querySelectorAll("[data-go]");
    try {
      const lib = await loadPdfjs();
      const doc = await lib.getDocument(href).promise;
      if (token !== pdfToken) return;
      // 가로형 자료가 휴대폰에서 위아래로 비지 않게, 쪽 화면을 자료 비율만큼만 높게 둔다
      const v1 = (await doc.getPage(1)).getViewport({ scale: 1 });
      const pad = parseFloat(getComputedStyle(stage).paddingTop) * 2 + 2;
      stage.style.maxHeight = Math.round((stage.clientWidth - pad) * v1.height / v1.width + pad) + "px";
      const cache = new Map();
      const draw = n => {
        if (!cache.has(n)) cache.set(n, (async () => {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          // 휴대폰에서 두 손가락으로 확대해도 읽히도록 최소 1000px, 최대 1600px 너비로 그린다
          const px = Math.min(Math.max(stage.clientWidth * Math.min(window.devicePixelRatio || 1, 3), 1000), 1600);
          const vp = page.getViewport({ scale: px / base.width });
          const c = document.createElement("canvas");
          c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
          return new Promise(r => c.toBlob(b => r(URL.createObjectURL(b)), "image/jpeg", 0.9));
        })());
        return cache.get(n);
      };
      let cur = 1;
      const show = async n => {
        const target = Math.min(Math.max(n, 1), doc.numPages);
        cur = target;
        count.textContent = target + " / " + doc.numPages;
        prev.disabled = target === 1;
        next.disabled = target === doc.numPages;
        const url = await draw(target);
        if (token !== pdfToken || cur !== target) return;
        const img = new Image();
        img.src = url; img.alt = target + "쪽";
        stage.replaceChildren(img);
        if (target < doc.numPages) draw(target + 1);
      };
      pdfGo = d => show(cur + d);
      prev.onclick = () => show(cur - 1);
      next.onclick = () => show(cur + 1);
      // 쪽의 왼쪽·오른쪽 절반을 누르거나, 휴대폰에서 옆으로 밀어도 넘어간다
      stage.onclick = e => { const r = stage.getBoundingClientRect(); show(cur + (e.clientX < r.left + r.width / 2 ? -1 : 1)); };
      let x0 = null;
      stage.addEventListener("touchstart", e => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
      stage.addEventListener("touchend", e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
      }, { passive: true });
      await show(1);
    } catch (e) {
      if (token === pdfToken) stage.innerHTML = '<p class="pdf-status">PDF를 화면에 띄우지 못했습니다. 위의 <b>새 창으로 열기</b>를 눌러 주세요.</p>';
    }
  }
  // 자료 탭을 누르면 자료 제목부터 뷰어까지 한 화면에 들어오게 내린다 (휴대폰은 위쪽 탭 막대만큼 더 비킨다)
  function showViewer() {
    if (matEl.hidden) return;
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    window.scrollTo({ top: matEl.getBoundingClientRect().top + window.scrollY - (wide ? 80 : 136), behavior: "smooth" });
  }
  // PC 키보드 ←·→ 로도 넘긴다 (입력 중이거나 작품 창이 열려 있을 때는 제외)
  document.addEventListener("keydown", e => {
    if (!pdfGo || matEl.hidden || !modal.hidden || /input|textarea|select/i.test((e.target.tagName || ""))) return;
    if (e.key === "ArrowLeft") { pdfGo(-1); e.preventDefault(); }
    if (e.key === "ArrowRight") { pdfGo(1); e.preventDefault(); }
  });
  Object.entries(SESSIONS).forEach(([key, s]) => {
    const b = el("button", { class: "session", type: "button", role: "tab", "data-session": key, onclick: () => { selectSession(key); history.replaceState(null, "", "#" + key); } });
    b.innerHTML = '<span class="name">' + esc(s.name) + '<span class="state"></span></span><span class="title">' + esc(s.title) + "</span>";
    sessionsEl.append(b);
  });

  /* 갤러리 */
  function visibleRows() {
    return sessionRows(state.session)
      .filter(r => state.filter === "all" || r.category === state.filter)
      .filter(r => { if (!state.query) return true; const q = state.query.toLowerCase(); return [r.title, r.subtitle, r.tags, r.math, r.purpose, r.maker].join(" ").toLowerCase().includes(q); })
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ko"));
  }
  function renderTabs() {
    const counts = { all: 0 };
    sessionRows(state.session).forEach(r => { counts.all++; counts[r.category] = (counts[r.category] || 0) + 1; });
    tabsEl.innerHTML = "";
    [["all", "전체"]].concat(SESSIONS[state.session].cats.map(k => [k, CATS[k].label])).forEach(([key, label]) => {
      const b = el("button", { class: "filter", role: "tab", "aria-selected": String(state.filter === key), onclick: () => { state.filter = key; renderTabs(); renderGrid(); } });
      b.innerHTML = esc(label) + '<span class="count">' + (counts[key] || 0) + "</span>";
      tabsEl.append(b);
    });
  }
  function renderGrid() {
    const rows = visibleRows();
    grid.innerHTML = "";
    const all = sessionRows(state.session);
    const planned = state.query ? [] : SESSIONS[state.session].planned.filter(p => !all.some(r => p.match.test(r.title)));
    if (!rows.length && !planned.length) { grid.append(el("div", { class: "empty" }, ["표시할 작품이 없습니다."])); return; }
    rows.forEach((r, i) => {
      const cat = CATS[r.category];
      const card = el("button", { class: "card " + r.category, type: "button", "aria-label": r.title + " 자세히 보기", onclick: () => openModal(r.id) });
      card.innerHTML =
        '<div><span class="chip ' + r.category + '">' + esc(cat.short) + "</span></div>" +
        "<h3>" + esc(r.title) + "</h3>" +
        '<p class="sub">' + esc(r.subtitle) + "</p>" +
        (r.tagList.length ? '<div class="tags">' + r.tagList.slice(0, 4).map(t => "<span>" + esc(t) + "</span>").join("") + "</div>" : "") +
        '<div class="foot">' + (r.url ? '<span class="go">바로 열어 보기</span>' : '<span class="nolink">부스에서 시연</span>') + '<span class="more">자세히</span></div>';
      grid.append(card);
    });
    planned.forEach(p => {
      const card = el("div", { class: "card planned" });
      card.innerHTML = "<h3>" + esc(p.title) + '</h3><p class="sub">담당 선생님의 자료를 받는 대로 체험 링크와 설명을 올립니다.</p><div class="foot"><span class="nolink">자료 준비 중</span></div>';
      grid.append(card);
    });
  }

  /* 상세 모달 */
  function openModal(id) {
    const r = state.rows.find(x => x.id === id && shown(x));
    if (!r) return;
    const cat = CATS[r.category];
    const detail = (title, body, wide) => '<section class="detail' + (wide ? " wide" : "") + '"><h4>' + title + '</h4><div class="body">' + esc(body) + "</div></section>";
    modal.querySelector(".dialog").innerHTML =
      '<button class="close" aria-label="닫기">×</button>' +
      '<div class="top"><div>' +
      '<span class="chip ' + r.category + '">' + esc(cat.label) + "</span>" +
      "<h2>" + esc(r.title) + "</h2>" +
      '<p class="sub">' + esc(r.subtitle) + "</p>" +
      '<div class="actions">' +
      (r.url ? '<a class="btn" href="' + esc(r.url) + '" target="_blank" rel="noopener">열어 보기</a><button class="btn outline copy-link">링크 복사</button>' : '<span class="btn" disabled>체험 링크 준비 중</span>') +
      '<button class="btn outline copy-share">이 페이지 공유</button>' +
      "</div></div>" +
      '<div class="qr-box"><div class="qr" id="modal-qr"></div>휴대폰으로 스캔</div></div>' +
      '<div class="dtabs" role="tablist">' +
      '<button class="dtab" role="tab" data-dtab="case" aria-selected="true">사례 소개</button>' +
      '<button class="dtab" role="tab" data-dtab="howto" aria-selected="false">만드는 방법</button>' +
      "</div>" +
      '<div class="dpanel" data-dpanel="case">' + detail("목적", r.purpose) + detail("수학적 내용", r.math) + detail("프로그램 설명", r.description, true) + "</div>" +
      '<div class="dpanel" data-dpanel="howto" hidden>' + detail("만드는 방법", r.howto, true) +
      (r.category === "vibe" ? '<p class="small muted wide">※ 프롬프트 전문과 설치 표는 「만드는 방법」 탭에서 복사할 수 있습니다. <a href="#howto" class="goto-howto"><u>만드는 방법 탭으로 가기</u></a></p>' : "") +
      "</div>" +
      '<div class="meta">' + (r.maker ? "<span>제작: " + esc(r.maker) + "</span>" : "") + (r.tagList.length ? "<span>태그: " + esc(r.tagList.join(", ")) + "</span>" : "") + "</div>" +
      (CFG.sheetEditUrl ? '<div class="edit-hint">✎ 이 내용은 <a href="' + esc(CFG.sheetEditUrl) + '" target="_blank" rel="noopener"><u>구글 시트</u></a>에서 수정합니다. (ID: ' + esc(r.id) + ")</div>" : "");
    makeQR(modal.querySelector("#modal-qr"), r.url, 134);
    modal.querySelector(".close").onclick = closeModal;
    const cl = modal.querySelector(".copy-link"); if (cl) cl.onclick = () => copyText(r.url, "체험 링크를 복사했습니다");
    modal.querySelector(".copy-share").onclick = () => copyText(location.href.split("#")[0] + "#app=" + encodeURIComponent(r.id), "이 작품 소개 페이지 주소를 복사했습니다");
    modal.querySelectorAll(".dtab").forEach(b => b.onclick = () => {
      modal.querySelectorAll(".dtab").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      modal.querySelectorAll(".dpanel").forEach(p => p.hidden = p.dataset.dpanel !== b.dataset.dtab);
    });
    const gh = modal.querySelector(".goto-howto"); if (gh) gh.onclick = () => { closeModal(); showTab("howto"); };
    modal.hidden = false; document.body.style.overflow = "hidden";
    if (location.hash !== "#app=" + encodeURIComponent(r.id)) history.replaceState(null, "", "#app=" + encodeURIComponent(r.id));
    modal.querySelector(".close").focus();
  }
  function closeModal() {
    modal.hidden = true; document.body.style.overflow = "";
    if (location.hash.startsWith("#app=")) history.replaceState(null, "", location.pathname + location.search + "#" + state.session);
  }
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  function openFromHash() {
    const h = location.hash;
    if (!h.startsWith("#app=") && !modal.hidden) { modal.hidden = true; document.body.style.overflow = ""; }
    if (PANELS.includes(h.slice(1))) { showTab(h.slice(1)); return; }
    // #exp2 처럼 체험별 주소로 들어오면 해당 체험을 바로 보여 준다 (통합 사이트·홍보물 QR용)
    if (SESSIONS.hasOwnProperty(h.slice(1))) {
      showTab("cases"); selectSession(h.slice(1));
      window.scrollTo({ top: document.querySelector(".layout").getBoundingClientRect().top + window.scrollY - 70, behavior: "instant" });
      return;
    }
    const m = h.match(/^#app=(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]), r = state.rows.find(x => x.id === id);
      showTab("cases");
      if (r) selectSession(sessionOf(r.category));
      openModal(id);
    }
  }
  window.addEventListener("hashchange", openFromHash);
  if (PANELS.includes(location.hash.slice(1))) showTab(location.hash.slice(1)); else if (SESSIONS.hasOwnProperty(location.hash.slice(1))) { showTab("cases"); state.session = location.hash.slice(1); } else if (!location.hash.startsWith("#app=")) showTab("about");
  renderSessions();


  searchEl && searchEl.addEventListener("input", () => { state.query = searchEl.value.trim(); renderGrid(); });

  // 실습 순서 링크: 「만드는 방법」 탭에서 해당 실습을 펼쳐 보여 준다
  document.querySelectorAll("[data-practice]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const cards = document.querySelectorAll("#howto .practice-card");
    const card = cards[Number(a.dataset.practice) - 1];
    showTab("howto");
    history.replaceState(null, "", "#howto");
    cards.forEach(c => { c.open = c === card; });
    // PC는 머리글만, 휴대폰은 머리글 아래 탭 막대까지 비켜서 멈춘다
    const gap = window.matchMedia("(min-width: 1024px)").matches ? 90 : 150;
    if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - gap, behavior: "smooth" });
  }));

  // 프롬프트 복사 버튼
  document.querySelectorAll(".prompt").forEach(p => {
    const b = el("button", { class: "copy", type: "button" }, ["복사"]);
    b.onclick = () => { const c = p.cloneNode(true); c.querySelectorAll(".copy,.label").forEach(x => x.remove()); copyText(c.textContent.trim(), "프롬프트를 복사했습니다"); };
    p.prepend(b);
  });

  // 설정값 치환
  document.querySelectorAll("[data-cfg]").forEach(n => { const v = CFG[n.dataset.cfg]; if (v) n.textContent = v; });
  const rb = document.getElementById("record-book-link");
  if (rb) { if (CFG.recordBookUrl) rb.href = CFG.recordBookUrl; else rb.remove(); }

  loadApps().then(result => {
    state.rows = result.rows;
    state.loaded = true;
    renderSessions(); renderTabs(); renderGrid(); openFromHash();
    if (badge) {
      badge.className = "source-badge " + (result.source === "sheet" || result.source === "csv" ? "live" : (result.errors && result.errors.length ? "warn" : ""));
      badge.innerHTML = '<span class="dot"></span>' + esc(result.note);
      if (result.errors && result.errors.length) badge.title = result.errors.join("\n");
    }
  });
})();
