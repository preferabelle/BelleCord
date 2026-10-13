// Streams follow you: if you're watching a stream on one side (Fluxer or Discord) and switch to the other side or
// the dashboard, it keeps playing in a small window in the corner. Drag it anywhere, resize it from its top-left
// corner, double-click it to go back, or close it. The small window is that side's real page, shrunk: inside it a
// copy of the stream's picture covers everything else (the same live video shown twice costs almost nothing).
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const KEY = "bcStreamMini"; // "0": streams stay where they are
  const on = () => get(KEY) !== "0";
  const SIDES = ["fluxer", "discord"];
  const name = (s) => (s === "fluxer" ? "Fluxer" : "Discord");
  const wv = (s) => $("wv-" + s);
  const run = async (v, code) => { try { return v && v.executeJavaScript ? await v.executeJavaScript(code) : null; } catch { return null; } };

  // ---- inside the side's own page: find someone else's live video, and show it alone ----
  const PAGE = "(" + function () {
    if (window.__bcMini) return 1;
    var remote = function (v) {
      try {
        var s = v.srcObject; if (!s || !s.getVideoTracks) return false;
        var t = s.getVideoTracks()[0]; if (!t || t.readyState !== "live") return false;
        var st = t.getSettings ? t.getSettings() : {};
        return !st.displaySurface && !st.groupId; // (your own screen share has displaySurface, your own camera a groupId)
      } catch (e) { return false; }
    };
    var best = function () {
      var vs = document.querySelectorAll("video"), pick = null, score = 0;
      for (var i = 0; i < vs.length; i++) {
        var v = vs[i];
        if (v.id === "bc-mini-video" || !v.videoWidth || !remote(v)) continue;
        var sc = v.videoWidth * v.videoHeight * (v.closest && v.closest('[data-source="screen_share"]') ? 4 : 1); // (a screen share beats a camera)
        if (sc > score) { score = sc; pick = v; }
      }
      return pick;
    };
    window.__bcStreamNow = function () { var v = best(); return v ? { w: v.videoWidth, h: v.videoHeight } : null; };
    var el = null, timer = 0;
    window.__bcMini = function (show) {
      if (!show) { clearInterval(timer); timer = 0; if (el) { try { el.srcObject = null; } catch (e) {} el.remove(); el = null; } return true; }
      var src = best(); if (!src) return false;
      if (!el) {
        el = document.createElement("video");
        el.id = "bc-mini-video"; el.muted = true; el.autoplay = true; el.playsInline = true; el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#000;z-index:2147483647;pointer-events:none;margin:0;padding:0;border:0";
        document.documentElement.appendChild(el);
      }
      var follow = function () { var s = best(); if (s && el && el.srcObject !== s.srcObject) { el.srcObject = s.srcObject; el.play().catch(function () {}); } };
      follow(); clearInterval(timer); timer = setInterval(follow, 1500);
      return { w: src.videoWidth, h: src.videoHeight };
    };
    return 1;
  }.toString() + ")()";

  const css = document.createElement("style");
  css.textContent = [
    ".pane.bcmini{visibility:visible!important;opacity:1!important;pointer-events:none!important;position:fixed!important;inset:auto!important;right:var(--mr,20px)!important;bottom:var(--mb,20px)!important;left:auto!important;top:auto!important;width:var(--mw,1280px)!important;height:var(--mh,720px)!important;transform:scale(var(--mk,.3))!important;transform-origin:100% 100%!important;z-index:40!important;overflow:hidden!important;border-radius:calc(12px / var(--mk,.3))!important;background:#000!important;box-shadow:0 calc(14px / var(--mk,.3)) calc(40px / var(--mk,.3)) rgba(0,0,0,.55)!important;transition:none!important;animation:none!important}",
    ".pane.bcmini > :not(webview){display:none!important}",
    "#bcmctl{position:fixed;z-index:41;border-radius:12px;cursor:grab;touch-action:none;user-select:none;-webkit-app-region:no-drag}",
    "#bcmctl.drag{cursor:grabbing}#bcmctl[hidden]{display:none}",
    "#bcmctl .bar{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:6px;padding:7px 8px;background:linear-gradient(180deg,rgba(0,0,0,.72),rgba(0,0,0,0));border-radius:12px 12px 0 0;opacity:0;transition:opacity .15s}",
    "#bcmctl:hover .bar,#bcmctl.drag .bar{opacity:1}",
    "#bcmctl .bar b{flex:1;min-width:0;font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.6)}",
    "#bcmctl .bar button{all:unset;cursor:pointer;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(255,255,255,.14);font-size:13px}",
    "#bcmctl .bar button:hover{background:rgba(255,255,255,.28)}",
    "#bcmctl .grip{position:absolute;left:0;top:0;width:18px;height:18px;cursor:nwse-resize;opacity:0;transition:opacity .15s}",
    "#bcmctl:hover .grip{opacity:1}#bcmctl .grip::before{content:'';position:absolute;left:5px;top:5px;width:9px;height:9px;border-left:2px solid #fff;border-top:2px solid #fff;border-radius:2px 0 0 0;opacity:.85}",
    "#bcstreambtn{display:none}#bcstreambtn.on{display:inline-flex;align-items:center}",
  ].join("\n");
  document.head.appendChild(css);

  // ---- the small window ----
  const mini = { side: null, W: 0, H: 0 };
  const geo = () => { let g = null; try { g = JSON.parse(get("bcMiniGeo") || "null"); } catch {} return g && g.vw ? g : { r: 20, b: 20, vw: 420 }; };
  const saveGeo = (g) => put("bcMiniGeo", JSON.stringify(g));
  let ctl = null;
  function place() {
    const p = mini.side && $(mini.side); if (!p || !ctl) return;
    const g = geo();
    const vw = Math.max(240, Math.min(Math.min(1000, innerWidth - 40), g.vw)), k = vw / mini.W, vh = Math.round(mini.H * k);
    const r = Math.max(4, Math.min(innerWidth - vw - 4, g.r)), b = Math.max(4, Math.min(innerHeight - vh - 4, g.b));
    const s = p.style;
    s.setProperty("--mw", mini.W + "px"); s.setProperty("--mh", mini.H + "px"); s.setProperty("--mk", String(k));
    s.setProperty("--mr", r + "px"); s.setProperty("--mb", b + "px");
    const box = p.getBoundingClientRect(); // (measured: the handle goes exactly where the window really is)
    Object.assign(ctl.style, box.width > 20 ? { left: box.left + "px", top: box.top + "px", width: box.width + "px", height: box.height + "px" } : { left: innerWidth - r - vw + "px", top: innerHeight - b - vh + "px", width: vw + "px", height: vh + "px" });
  }
  setInterval(() => { if (mini.side && ctl && !ctl.classList.contains("drag")) place(); }, 1000);
  function makeCtl() {
    if (ctl) return ctl;
    ctl = document.createElement("div");
    ctl.id = "bcmctl"; ctl.hidden = true;
    ctl.innerHTML = '<div class="grip" title="Drag to resize"></div><div class="bar"><b></b><button data-a="open" title="Watch it big">⤢</button><button data-a="close" title="Close the small window">✕</button></div>';
    body.appendChild(ctl);
    let drag = null;
    ctl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      drag = { x: e.clientX, y: e.clientY, g: { ...geo() }, grip: !!e.target.closest(".grip") };
      ctl.setPointerCapture(e.pointerId); ctl.classList.add("drag"); e.preventDefault();
    });
    ctl.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      saveGeo(drag.grip ? { ...drag.g, vw: drag.g.vw - dx } : { ...drag.g, r: drag.g.r - dx, b: drag.g.b - dy }); // (the grip is top-left: dragging out makes it bigger)
      place();
    });
    const end = () => { if (!drag) return; drag = null; ctl.classList.remove("drag"); };
    ctl.addEventListener("pointerup", end); ctl.addEventListener("pointercancel", end);
    ctl.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) openBig(); });
    ctl.querySelector('[data-a="open"]').onclick = () => openBig();
    ctl.querySelector('[data-a="close"]').onclick = () => closeMini();
    addEventListener("resize", place);
    return ctl;
  }
  async function showMini(side) {
    const p = $(side), v = wv(side), now = live[side];
    if (!p || !v || !now) return false;
    if (mini.side && mini.side !== side) closeMini();
    const W = Math.max(720, Math.min(1600, full[side].w)), H = Math.round(W * (now.h && now.w ? now.h / now.w : 9 / 16));
    mini.side = side; mini.W = W; mini.H = H;
    p.classList.add("bcmini");
    makeCtl().hidden = false;
    ctl.querySelector(".bar b").textContent = name(side) + " stream";
    place();
    if (!(await run(v, "window.__bcMini && window.__bcMini(true)"))) { closeMini(); return false; }
    button();
    return true;
  }
  function closeMini() {
    const side = mini.side; if (!side) return;
    const p = $(side);
    if (p) { p.classList.remove("bcmini"); ["--mw", "--mh", "--mk", "--mr", "--mb"].forEach((x) => p.style.removeProperty(x)); }
    if (ctl) ctl.hidden = true;
    mini.side = null;
    run(wv(side), "window.__bcMini && window.__bcMini(false)");
    button();
  }
  function openBig() { const side = mini.side; closeMini(); if (side && window.bcSetMode) window.bcSetMode(side); }

  // ---- watching both sides for a live stream (every 2 seconds, one quick look) ----
  const live = { fluxer: null, discord: null };
  const full = { fluxer: { w: 1280, h: 760 }, discord: { w: 1280, h: 760 } };
  const showing = (s) => { const m = body.dataset.mode; return m === s || m === "both"; };
  async function poll() {
    for (const s of SIDES) {
      const v = wv(s); if (!v) continue;
      if (showing(s) && mini.side !== s) { const p = $(s); if (p && p.clientWidth > 400 && p.clientHeight > 300) full[s] = { w: p.clientWidth, h: p.clientHeight }; }
      await run(v, PAGE);
      live[s] = await run(v, "window.__bcStreamNow ? window.__bcStreamNow() : null");
      if (mini.side === s && !live[s]) closeMini(); // (the stream ended)
    }
    button();
  }
  setInterval(poll, 2000); setTimeout(poll, 1500);

  // switching away from a side while its stream is playing: it goes small
  let lastMode = body.dataset.mode;
  new MutationObserver(() => {
    const m = body.dataset.mode;
    if (m === lastMode) return;
    const was = lastMode; lastMode = m;
    if (mini.side && showing(mini.side)) closeMini(); // (back on that side: it's big again)
    if ((was === "fluxer" || was === "discord") && !showing(was) && live[was] && on()) showMini(was);
    button();
  }).observe(body, { attributes: true, attributeFilter: ["data-mode"] });

  // a button in the top bar brings a stream back after you closed its small window
  function hiddenStream() { if (mini.side) return null; for (const s of SIDES) if (live[s] && !showing(s)) return s; return null; }
  function button() {
    const bar = $("bar"); if (!bar) return;
    let b = $("bcstreambtn");
    if (!b) {
      b = document.createElement("button");
      b.id = "bcstreambtn"; b.className = "tb"; b.setAttribute("aria-label", "Watch the stream in a small window");
      b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="17.5" cy="7.5" r="1.4" fill="#ed4245" stroke="none"/></svg>';
      b.onclick = () => { const s = hiddenStream(); if (s) showMini(s); };
      bar.insertBefore(b, $("clockline") || null);
    }
    const s = hiddenStream();
    b.classList.toggle("on", !!s);
    if (s) b.title = "Watch the " + name(s) + " stream in a small window";
  }

  // App > a switch for it
  function option() {
    const flip = $("opt-flip"), card = flip && flip.closest(".card");
    if (!card || $("opt-stream")) return;
    const l = document.createElement("label");
    l.className = "keep";
    l.innerHTML = '<input type="checkbox" id="opt-stream"> Keep a stream playing in a corner when I switch sides';
    (flip.closest("label") || flip).after(l);
    const c = $("opt-stream"); c.checked = on();
    c.onchange = () => { put(KEY, c.checked ? "1" : "0"); if (!c.checked) closeMini(); };
  }
  option(); setTimeout(option, 1000);
})();
