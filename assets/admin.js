/* 관리자 페이지: 구글 시트(Apps Script API)에 작품 추가·수정·삭제 */
(function () {
  const CFG = window.SITE_CONFIG || {};
  const { CATS, loadApps, normalizeRow, el, esc, toast, makeQR } = window.AppData;
  const FIELDS = ["id", "category", "title", "subtitle", "url", "purpose", "math", "description", "howto", "maker", "tags", "visible", "order"];
  const form = document.getElementById("app-form");
  const list = document.getElementById("row-list");
  const msg = document.getElementById("form-msg");
  const keyInput = document.getElementById("admin-key");
  const status = document.getElementById("api-status");
  let rows = [], editingId = null, source = "none";

  keyInput.value = sessionStorage.getItem("ADMIN_KEY") || "";
  keyInput.addEventListener("input", () => sessionStorage.setItem("ADMIN_KEY", keyInput.value));

  /* ── 비밀번호 게이트 ──
   * Apps Script가 연결돼 있으면 서버의 ADMIN_KEY로 검증한다(정확한 검증).
   * 연결 전에는 config.js의 adminPasswordHash(SHA-256)와 비교한다(간이 보호).
   */
  const gate = document.getElementById("gate");
  const gateForm = document.getElementById("gate-form");
  const gateMsg = document.getElementById("gate-msg");
  const adminMain = document.getElementById("admin-main");
  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function verifyKey(key) {
    if (CFG.apiUrl) {
      const res = await fetch(CFG.apiUrl, { method: "POST", body: JSON.stringify({ action: "verify", key }) });
      const data = await res.json();
      // 구버전 스크립트는 'unknown action: verify'를 돌려주는데, 키 검사를 통과한 뒤에만 나오므로 성공으로 본다.
      if (data.ok) return true;
      if (/unknown action/i.test(data.error || "")) return true;
      return false;
    }
    if (CFG.adminPasswordHash) return (await sha256(key)) === CFG.adminPasswordHash.toLowerCase();
    return true; // 아무 설정도 없으면 막지 않는다(시트 미연결 상태).
  }
  function unlock() { gate.hidden = true; adminMain.hidden = false; }
  gateForm.addEventListener("submit", async e => {
    e.preventDefault();
    const pw = document.getElementById("gate-pw").value.trim();
    const btn = document.getElementById("gate-btn"); btn.disabled = true; gateMsg.textContent = "확인 중…"; gateMsg.style.color = "";
    try {
      if (await verifyKey(pw)) {
        sessionStorage.setItem("ADMIN_OK", "1"); sessionStorage.setItem("ADMIN_KEY", pw); keyInput.value = pw;
        unlock(); refresh().then(() => fill(null));
      } else {
        gateMsg.style.color = "#d2452a"; gateMsg.textContent = "비밀번호가 올바르지 않습니다.";
        gateForm.classList.remove("shake"); void gateForm.offsetWidth; gateForm.classList.add("shake");
      }
    } catch (err) { gateMsg.style.color = "#d2452a"; gateMsg.textContent = "확인 실패: " + err.message; }
    btn.disabled = false;
  });
  const alreadyIn = sessionStorage.getItem("ADMIN_OK") === "1";
  if (alreadyIn) unlock();

  const openSheet = document.getElementById("open-sheet");
  if (CFG.sheetEditUrl) openSheet.href = CFG.sheetEditUrl; else openSheet.remove();
  document.querySelectorAll("[data-cfg]").forEach(n => { if (CFG[n.dataset.cfg]) n.textContent = CFG[n.dataset.cfg]; });

  function setStatus(kind, text) { status.className = "status " + kind; status.innerHTML = "<span>" + esc(text) + "</span>"; }

  async function refresh() {
    list.innerHTML = '<div class="muted small">불러오는 중…</div>';
    const r = await loadApps();
    rows = r.rows; source = r.source;
    if (source === "sheet") setStatus("ok", "✅ 구글 시트(Apps Script) 연결됨 — 저장하면 시트에 바로 반영됩니다.");
    else if (!CFG.apiUrl) setStatus("warn", "⚠ config.js의 apiUrl이 비어 있습니다. 아래 '처음 연결하는 방법'을 따라 연결하거나, 'data/apps.json 내려받기'로 수동 관리하세요.");
    else if (source === "csv") setStatus("warn", "⚠ 시트를 읽고는 있지만 Apps Script API가 비어 있거나 실패해 저장은 되지 않습니다. Code.gs의 SPREADSHEET_ID와 배포(새 버전)를 확인하세요.\n" + (r.errors || []).join(" / "));
    else setStatus("warn", "⚠ API 연결 실패 — 기본 데이터를 표시 중입니다. 배포 URL과 '모든 사용자' 액세스 설정을 확인하세요.\n" + (r.errors || []).join(" / "));
    document.getElementById("save-btn").textContent = source === "sheet" ? "시트에 저장" : "목록에 반영(로컬)";
    renderList();
  }

  function renderList() {
    list.innerHTML = "";
    document.getElementById("row-count").textContent = rows.length + "개";
    rows.slice().sort((a, b) => a.order - b.order).forEach(r => {
      const item = el("div", { class: "row-item" + (r.visible ? "" : " hidden-row") });
      item.innerHTML = '<span class="chip ' + r.category + '">' + esc(CATS[r.category].short) + '</span><span class="t" title="' + esc(r.title) + '">' + esc(r.title) + "</span>";
      const b = el("button", { type: "button" }, ["편집"]); b.onclick = () => fill(r); item.append(b);
      list.append(item);
    });
    if (!rows.length) list.innerHTML = '<div class="muted small">등록된 작품이 없습니다.</div>';
  }

  function fill(r) {
    editingId = r ? r.id : null;
    document.getElementById("form-title").textContent = r ? "작품 편집: " + r.title : "새 작품 추가";
    document.getElementById("delete-btn").hidden = !r;
    FIELDS.forEach(f => {
      const n = form.elements[f]; if (!n) return;
      let v = r ? r[f] : (f === "order" ? 100 : f === "visible" ? "Y" : f === "category" ? "hybrid" : "");
      if (f === "visible" && r) v = r.visible ? "Y" : "N";
      n.value = v == null ? "" : v;
    });
    form.elements.id.readOnly = !!r;
    msg.textContent = "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function collect() {
    const o = {};
    FIELDS.forEach(f => { const n = form.elements[f]; if (n) o[f] = n.value.trim(); });
    return o;
  }

  async function post(payload) {
    if (!CFG.apiUrl) throw new Error("apiUrl 미설정");
    const res = await fetch(CFG.apiUrl, { method: "POST", body: JSON.stringify(payload) }); // text/plain → CORS 사전요청 없음
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "저장 실패");
    return data;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const row = collect();
    if (!row.id || !row.title) { msg.textContent = "ID와 제목은 필수입니다."; return; }
    const btn = document.getElementById("save-btn"); btn.disabled = true; msg.textContent = "저장 중…";
    try {
      if (source === "sheet") {
        const key = keyInput.value.trim();
        if (!key) throw new Error("관리자 키를 입력하세요.");
        const data = await post({ action: "upsert", key, row });
        rows = data.rows.map(normalizeRow);
        toast("시트에 저장했습니다");
      } else {
        const n = normalizeRow(row);
        const i = rows.findIndex(x => x.id === n.id);
        if (i >= 0) rows[i] = n; else rows.push(n);
        toast("목록에 반영했습니다 (시트 미연결: JSON 내려받기로 저장하세요)");
      }
      renderList(); fill(rows.find(x => x.id === row.id));
      msg.textContent = "저장 완료 · " + new Date().toLocaleTimeString("ko-KR");
    } catch (err) { msg.textContent = "오류: " + err.message; }
    btn.disabled = false;
  });

  document.getElementById("delete-btn").addEventListener("click", async () => {
    if (!editingId) return;
    if (!confirm("'" + editingId + "' 작품을 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      if (source === "sheet") {
        const data = await post({ action: "delete", key: keyInput.value.trim(), id: editingId });
        rows = data.rows.map(normalizeRow);
      } else rows = rows.filter(x => x.id !== editingId);
      toast("삭제했습니다"); renderList(); fill(null);
    } catch (err) { msg.textContent = "오류: " + err.message; }
  });

  document.getElementById("new-row").addEventListener("click", () => fill(null));
  document.getElementById("reload").addEventListener("click", refresh);

  document.getElementById("download-json").addEventListener("click", () => {
    const out = rows.slice().sort((a, b) => a.order - b.order).map(r => {
      const o = {}; FIELDS.forEach(f => o[f] = f === "visible" ? (r.visible ? "Y" : "N") : (f === "order" ? Number(r.order) : (r[f] || ""))); return o;
    });
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "apps.json" }); document.body.append(a); a.click(); a.remove();
  });

  // 미리보기: 메인과 같은 모달
  document.getElementById("preview-btn").addEventListener("click", () => {
    const r = normalizeRow(collect()); const cat = CATS[r.category];
    const modal = document.getElementById("app-modal");
    modal.querySelector(".dialog").innerHTML =
      '<button class="close" aria-label="닫기">×</button>' +
      '<div class="top"><div><span class="chip ' + r.category + '">' + esc(cat.label) + '</span><h2>' + esc(r.title || "(제목)") + '</h2><p class="sub">' + esc(r.subtitle) + "</p>" +
      '<div class="actions">' + (r.url ? '<a class="btn primary" href="' + esc(r.url) + '" target="_blank" rel="noopener">지금 체험하기 ↗</a>' : '<span class="btn" disabled>체험 링크 준비 중</span>') + "</div></div>" +
      '<div class="qr-box"><div class="qr" id="pv-qr"></div>휴대폰으로 스캔</div></div>' +
      '<div class="detail-grid">' +
      ["🎯 목적|purpose", "∑ 수학적 내용|math", "🧩 프로그램 설명|description", "🛠 만드는 방법|howto"].map(s => { const [t, k] = s.split("|"); return '<section class="detail"><h4>' + t + '</h4><div class="body">' + esc(r[k]) + "</div></section>"; }).join("") +
      "</div>";
    makeQR(modal.querySelector("#pv-qr"), r.url, 134);
    modal.querySelector(".close").onclick = () => { modal.hidden = true; };
    modal.onclick = e => { if (e.target === modal) modal.hidden = true; };
    modal.hidden = false;
  });

  if (alreadyIn) refresh().then(() => fill(null));
})();
