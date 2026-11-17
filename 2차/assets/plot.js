/* ─────────────────────────────────────────────────────────────
 *  첫 화면 배경 그래프 (2차)
 *  좌표평면 위에 y = sin x, y = cos x 를 은은하게 그리고,
 *  마우스를 올리면 그 위치의 x, sin x, cos x 값을 보여 준다.
 *  색은 style.css 의 --plot-* 토큰에서 읽는다.
 * ───────────────────────────────────────────────────────────── */
(function () {
  const hero = document.getElementById("hero");
  const cv = document.getElementById("plot");
  const ro = document.getElementById("readout");
  const btn = document.getElementById("calm-toggle");
  if (!hero || !cv || !cv.getContext) return;

  const ctx = cv.getContext("2d");
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let calm = reduce;
  try { if (localStorage.getItem("calm") === "1") calm = true; } catch (_) { }

  const C = {};
  function readTokens() {
    const cs = getComputedStyle(root);
    ["--plot-grid", "--plot-major", "--plot-axis", "--plot-sin", "--plot-cos", "--plot-label", "--font"].forEach(k => { C[k] = cs.getPropertyValue(k).trim(); });
  }

  let W = 0, H = 0, dpr = 1, mouse = null, t0 = performance.now(), raf = 0;
  const unitX = () => Math.max(48, Math.min(96, W / 16));   // x 1 = unitX px
  const unitY = () => unitX() * 1.5;                          // y 1 = unitY px
  const originX = () => W * 0.5;
  const originY = () => H * (W < 720 ? 0.34 : 0.5);

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }

  const PI = Math.PI;
  function piLabel(k) {            // k * π/2
    if (k === 0) return "";
    const sign = k < 0 ? "−" : "";
    const a = Math.abs(k);
    if (a % 2 === 0) { const n = a / 2; return sign + (n === 1 ? "" : n) + "π"; }
    return sign + (a === 1 ? "" : a) + "π/2";
  }

  function draw(now) {
    const ux = unitX(), uy = unitY(), X0 = originX(), Y0 = originY();
    const intro = calm ? 1 : Math.min(1, (now - t0) / 1600);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 모눈: x 는 π/8 간격(굵은 선은 π/2), y 는 0.25 간격(굵은 선은 1)
    ctx.lineWidth = 1;
    const sx = PI / 8 * ux;
    for (let k = -Math.ceil(X0 / sx); X0 + k * sx <= W; k++) {
      const x = Math.round(X0 + k * sx) + 0.5;
      ctx.strokeStyle = k % 4 ? C["--plot-grid"] : C["--plot-major"];
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    const sy = 0.25 * uy;
    for (let k = -Math.ceil(Y0 / sy); Y0 + k * sy <= H; k++) {
      const y = Math.round(Y0 + k * sy) + 0.5;
      ctx.strokeStyle = k % 4 ? C["--plot-grid"] : C["--plot-major"];
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 축과 눈금 이름
    ctx.strokeStyle = C["--plot-axis"];
    ctx.beginPath();
    ctx.moveTo(0, Math.round(Y0) + 0.5); ctx.lineTo(W, Math.round(Y0) + 0.5);
    ctx.moveTo(Math.round(X0) + 0.5, 0); ctx.lineTo(Math.round(X0) + 0.5, H);
    ctx.stroke();
    ctx.fillStyle = C["--plot-label"];
    ctx.font = "12px " + (C["--font"] || "sans-serif");
    for (let k = -12; k <= 12; k++) {
      const x = X0 + k * PI / 2 * ux;
      if (k && x > 10 && x < W - 30) ctx.fillText(piLabel(k), x + 4, Y0 + 16);
    }
    [1, -1].forEach(v => { const y = Y0 - v * uy; if (y > 70 && y < H - 10) ctx.fillText(v > 0 ? "1" : "−1", X0 + 6, y - 4); });
    ctx.fillText("O", X0 - 14, Y0 + 16);

    // 곡선 (처음 한 번만 왼쪽에서 오른쪽으로 그려짐)
    const xmin = -X0 / ux, xmax = (W - X0) / ux, xEnd = xmin + (xmax - xmin) * intro;
    [[Math.sin, C["--plot-sin"], 2.4], [Math.cos, C["--plot-cos"], 2.2]].forEach(([f, col, lw]) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.beginPath();
      for (let x = xmin; x <= xEnd; x += 2 / ux) {
        const px = X0 + x * ux, py = Y0 - f(x) * uy;
        x === xmin ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // 마우스 위치의 값
    if (mouse && ro) {
      const x = (mouse.x - X0) / ux, s = Math.sin(x), py = Y0 - s * uy;
      ctx.strokeStyle = C["--plot-sin"]; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mouse.x + 0.5, 0); ctx.lineTo(mouse.x + 0.5, H); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = C["--plot-sin"]; ctx.beginPath(); ctx.arc(mouse.x, py, 4.5, 0, 7); ctx.fill();
      ro.style.left = mouse.x + "px"; ro.style.top = py + "px";
      ro.textContent = "x = " + x.toFixed(3) + "\nsin x = " + s.toFixed(3) + "\ncos x = " + Math.cos(x).toFixed(3);
    }
    if (intro < 1) raf = requestAnimationFrame(draw);
  }

  function redraw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }

  readTokens(); size(); redraw();
  addEventListener("resize", () => { size(); redraw(); });
  hero.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    const b = hero.getBoundingClientRect(); mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
    hero.classList.add("probing"); redraw();
  });
  hero.addEventListener("pointerleave", () => { mouse = null; hero.classList.remove("probing"); redraw(); });

  // 배경 움직임 멈추기 (떠다니는 기호, 수식 띠, 곡선 그리기)
  function setCalm(on) {
    calm = on;
    root.classList.toggle("calm", on);
    if (btn) { btn.setAttribute("aria-pressed", String(on)); btn.textContent = on ? "배경 움직임 켜기" : "배경 움직임 멈추기"; }
    try { localStorage.setItem("calm", on ? "1" : "0"); } catch (_) { }
    redraw();
  }
  setCalm(calm);
  if (btn) btn.addEventListener("click", () => { if (!calm) t0 = performance.now(); setCalm(!calm); if (!calm) { t0 = performance.now(); redraw(); } });
})();
