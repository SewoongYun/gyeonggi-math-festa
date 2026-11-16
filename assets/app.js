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
    vibe:     { label: "바이브 코딩 작업물", short: "바이브 코딩" }
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
      return { rows, source: "local", note: attempts.length ? "시트 연결 실패 → 기본 데이터 표시" : "기본 데이터(data/apps.json)", errors: attempts };
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

  const state = { rows: [], filter: "all", query: "" };
  const tabsEl = document.getElementById("tabs");
  const searchEl = document.getElementById("search");
  const badge = document.getElementById("source-badge");
  const modal = document.getElementById("app-modal");
  const PANELS = ["cases", "howto", "about", "booth"];

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

  /* 갤러리 */
  function visibleRows() {
    return state.rows.filter(r => r.visible)
      .filter(r => state.filter === "all" || r.category === state.filter)
      .filter(r => { if (!state.query) return true; const q = state.query.toLowerCase(); return [r.title, r.subtitle, r.tags, r.math, r.purpose, r.maker].join(" ").toLowerCase().includes(q); })
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ko"));
  }
  function renderTabs() {
    const counts = { all: 0 };
    state.rows.filter(r => r.visible).forEach(r => { counts.all++; counts[r.category] = (counts[r.category] || 0) + 1; });
    tabsEl.innerHTML = "";
    [["all", "전체"]].concat(Object.keys(CATS).map(k => [k, CATS[k].label])).forEach(([key, label]) => {
      const b = el("button", { class: "filter", role: "tab", "aria-selected": String(state.filter === key), onclick: () => { state.filter = key; renderTabs(); renderGrid(); } });
      b.innerHTML = esc(label) + '<span class="count">' + (counts[key] || 0) + "</span>";
      tabsEl.append(b);
    });
  }
  function renderGrid() {
    const rows = visibleRows();
    grid.innerHTML = "";
    if (!rows.length) { grid.append(el("div", { class: "empty" }, ["표시할 작품이 없습니다."])); return; }
    rows.forEach((r, i) => {
      const cat = CATS[r.category];
      const card = el("button", { class: "card " + r.category, type: "button", "aria-label": r.title + " 자세히 보기", onclick: () => openModal(r.id) });
      card.innerHTML =
        '<span class="num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<div><span class="chip ' + r.category + '">' + esc(cat.short) + "</span></div>" +
        "<h3>" + esc(r.title) + "</h3>" +
        '<p class="sub">' + esc(r.subtitle) + "</p>" +
        (r.tagList.length ? '<div class="tags">' + r.tagList.slice(0, 4).map(t => "<span>" + esc(t) + "</span>").join("") + "</div>" : "") +
        '<div class="foot">' + (r.url ? '<span class="go">바로 체험 →</span>' : '<span class="nolink">부스에서 시연</span>') + '<span class="more">자세히 보기</span></div>';
      grid.append(card);
    });
  }

  /* 상세 모달 */
  function openModal(id) {
    const r = state.rows.find(x => x.id === id);
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
      (r.url ? '<a class="btn" href="' + esc(r.url) + '" target="_blank" rel="noopener">지금 체험하기 ↗</a><button class="btn outline copy-link">링크 복사</button>' : '<span class="btn" disabled>체험 링크 준비 중</span>') +
      '<button class="btn outline copy-share">이 페이지 공유</button>' +
      "</div></div>" +
      '<div class="qr-box"><div class="qr" id="modal-qr"></div>휴대폰으로 스캔</div></div>' +
      '<div class="dtabs" role="tablist">' +
      '<button class="dtab" role="tab" data-dtab="case" aria-selected="true">🧪 사례 소개</button>' +
      '<button class="dtab" role="tab" data-dtab="howto" aria-selected="false">🛠 만드는 방법</button>' +
      "</div>" +
      '<div class="dpanel" data-dpanel="case">' + detail("🎯 목적", r.purpose) + detail("∑ 수학적 내용", r.math) + detail("🧩 프로그램 설명", r.description, true) + "</div>" +
      '<div class="dpanel" data-dpanel="howto" hidden>' + detail("🛠 만드는 방법 (단계별)", r.howto, true) +
      (r.category === "vibe" ? '<p class="small muted wide">※ 프롬프트 전문과 설치 표는 「만드는 방법」 탭에서 복사할 수 있습니다. <a href="#howto" class="goto-howto"><u>만드는 방법 탭으로 →</u></a></p>' : "") +
      "</div>" +
      '<div class="meta">' + (r.maker ? "<span>제작 · " + esc(r.maker) + "</span>" : "") + (r.tagList.length ? "<span>태그 · " + esc(r.tagList.join(", ")) + "</span>" : "") + "</div>" +
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
    if (location.hash.startsWith("#app=")) history.replaceState(null, "", location.pathname + location.search + "#cases");
  }
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  function openFromHash() {
    const h = location.hash;
    if (!h.startsWith("#app=") && !modal.hidden) { modal.hidden = true; document.body.style.overflow = ""; }
    if (PANELS.includes(h.slice(1))) { showTab(h.slice(1)); return; }
    const m = h.match(/^#app=(.+)$/);
    if (m) { showTab("cases"); openModal(decodeURIComponent(m[1])); }
  }
  window.addEventListener("hashchange", openFromHash);
  if (PANELS.includes(location.hash.slice(1))) showTab(location.hash.slice(1));

  searchEl && searchEl.addEventListener("input", () => { state.query = searchEl.value.trim(); renderGrid(); });

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
    renderTabs(); renderGrid(); openFromHash();
    if (badge) {
      badge.className = "source-badge " + (result.source === "sheet" || result.source === "csv" ? "live" : (result.errors && result.errors.length ? "warn" : ""));
      badge.innerHTML = '<span class="dot"></span>' + esc(result.note);
      if (result.errors && result.errors.length) badge.title = result.errors.join("\n");
    }
  });
})();
