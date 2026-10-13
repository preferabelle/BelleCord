// Motion: how BelleCord moves. Off, Smooth (the default) or Ultra, picked in App > Animations.
// How each one looks is in shell.css ("motion"). This file does the parts that need code: sliding the sides in from
// the right direction, the dashboard's entrance, and Ultra's extras (osu!-style triangles drifting up the dashboard
// banner, cards that tilt toward the mouse, ripples where you click). Nothing here runs when it isn't on screen, and
// only Ultra draws anything every frame.
(function () {
  "use strict";
  const body = document.body;
  const $ = (id) => document.getElementById(id);
  const level = () => body.dataset.motion || "smooth";
  const slide = () => parseFloat(getComputedStyle(body).getPropertyValue("--slide")) || 14;

  // ---------------- switching sides ----------------
  // the side coming in starts just off to one side (or below, for the dashboard) and the one going out heads the
  // other way, so it feels like moving along a row: Fluxer, Discord, with the dashboard underneath
  const prime = (el, vars) => { if (!el) return; el.style.transition = "none"; for (const k in vars) el.style.setProperty(k, vars[k]); void el.offsetWidth; el.style.transition = ""; };
  const aim = (el, vars) => { if (!el) return; for (const k in vars) el.style.setProperty(k, vars[k]); };
  const panesOf = (m) => (m === "both" ? ["fluxer", "discord"] : [m]);
  const order = (m) => { const first = body.hasAttribute("data-flip") ? "discord" : "fluxer"; return m === "dash" ? 0 : m === "both" ? 1.5 : m === first ? 1 : 2; };
  function beforeMode(from, to) {
    if (level() === "off" || !from || from === to) return;
    const d = slide(), into = panesOf(to), out = panesOf(from).filter((p) => !into.includes(p));
    let a, b; // (where the incoming side starts, and where the outgoing one goes)
    if (to === "dash") { a = { "--px": "0px", "--py": d + "px", "--ps": "1" }; b = { "--px": "0px", "--py": "0px", "--ps": ".97" }; }
    else if (from === "dash") { a = { "--px": "0px", "--py": "0px", "--ps": ".97" }; b = { "--px": "0px", "--py": d + "px", "--ps": "1" }; }
    else if (to === "both" || from === "both") { a = b = { "--px": "0px", "--py": "0px", "--ps": ".985" }; }
    else { const dir = order(to) > order(from) ? 1 : -1; a = { "--px": dir * d + "px", "--py": "0px", "--ps": "1" }; b = { "--px": -dir * d + "px", "--py": "0px", "--ps": "1" }; }
    for (const p of into) prime($(p), a);
    for (const p of out) aim($(p), b);
  }
  // the dashboard: its sections float up one after another
  let playT = 0;
  function afterMode(to) {
    if (to !== "dash" || level() === "off") return;
    const dash = $("dash"); if (!dash) return;
    dash.querySelectorAll(".wrap>.sec").forEach((s, i) => s.style.setProperty("--i", String(Math.min(i, 8))));
    dash.classList.remove("play"); void dash.offsetWidth; dash.classList.add("play");
    clearTimeout(playT); playT = setTimeout(() => dash.classList.remove("play"), 1800);
    wakeTriangles();
  }

  // the option you just picked does a little bounce (the list is drawn again on every pick, so it's found again first)
  document.addEventListener("click", (e) => {
    if (level() === "off") return;
    const el = e.target.closest && e.target.closest("[data-cat][data-k],.tpl[data-i],.tpl[data-id]");
    if (!el) return;
    const sel = el.dataset.cat ? '[data-cat="' + el.dataset.cat + '"][data-k="' + el.dataset.k + '"]' : el.dataset.i != null ? '.tpl[data-i="' + el.dataset.i + '"]' : '.tpl[data-id="' + el.dataset.id + '"]';
    requestAnimationFrame(() => { const now = document.querySelector(sel); if (now) { now.classList.remove("bc-pick"); void now.offsetWidth; now.classList.add("bc-pick"); setTimeout(() => now.classList.remove("bc-pick"), 900); } });
  }, true);

  // ---------------- Ultra: triangles drifting up the dashboard banner (like osu!'s menus) ----------------
  const tri = { canvas: null, ctx: null, list: [], raf: 0, last: 0, colors: [], colorsAt: 0 };
  const showing = () => level() === "ultra" && body.dataset.mode === "dash" && !document.hidden && !!$("hero");
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const pick = (n, d) => (cs.getPropertyValue(n) || "").trim() || d;
    tri.colors = [pick("--fx", "#5865f2"), pick("--dc", "#5865f2"), pick("--accent", "#5865f2"), pick("--strong", "#ffffff")];
    tri.colorsAt = performance.now();
  }
  function spawn(w, h, anywhere) {
    const s = 14 + Math.pow(Math.random(), 2.2) * 70; // (mostly small, a few big)
    return { x: Math.random() * w, y: anywhere ? Math.random() * (h + s) : h + s, s, v: 9 + (90 - s) * 0.22 + Math.random() * 10, c: Math.floor(Math.random() * 3), a: 0.07 + Math.random() * 0.13, r: (Math.random() - 0.5) * 0.25 };
  }
  function frame(now) {
    tri.raf = 0;
    if (!showing()) { if (level() !== "ultra") stopTriangles(); return; } // (picked up again when the dashboard comes back)
    const hero = $("hero"), c = tri.canvas, ctx = tri.ctx;
    const w = hero.clientWidth, h = hero.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    if (now - tri.colorsAt > 2000) colors();
    const dt = Math.min(0.05, (now - (tri.last || now)) / 1000); tri.last = now;
    const want = Math.max(12, Math.min(70, Math.round(w / 24)));
    while (tri.list.length < want) tri.list.push(spawn(w, h, false));
    if (tri.list.length > want) tri.list.length = want;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < tri.list.length; i++) {
      const t = tri.list[i];
      t.y -= t.v * dt;
      if (t.y + t.s < 0) { tri.list[i] = spawn(w, h, false); continue; }
      const fade = Math.min(1, (h - t.y + t.s) / (h * 0.35)); // (they fade in as they come up from the bottom)
      ctx.globalAlpha = t.a * Math.max(0, fade);
      ctx.fillStyle = tri.colors[t.c];
      const k = t.s * 0.866;
      ctx.beginPath();
      ctx.moveTo(t.x + t.r * t.s, t.y - k / 2);
      ctx.lineTo(t.x - t.s / 2, t.y + k / 2);
      ctx.lineTo(t.x + t.s / 2, t.y + k / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    tri.raf = requestAnimationFrame(frame);
  }
  function wakeTriangles() {
    if (!showing() || tri.raf) return;
    const hero = $("hero");
    if (!tri.canvas || !tri.canvas.isConnected) { tri.canvas = document.createElement("canvas"); tri.canvas.className = "tri"; tri.canvas.setAttribute("aria-hidden", "true"); hero.prepend(tri.canvas); tri.ctx = tri.canvas.getContext("2d"); tri.list = []; }
    tri.last = 0; colors();
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!tri.list.length) for (let i = 0; i < Math.max(12, Math.min(70, Math.round(w / 24))); i++) tri.list.push(spawn(w, h, true));
    tri.raf = requestAnimationFrame(frame);
  }
  function stopTriangles() { if (tri.raf) cancelAnimationFrame(tri.raf); tri.raf = 0; if (tri.canvas) tri.canvas.remove(); tri.canvas = null; tri.list = []; }
  document.addEventListener("visibilitychange", wakeTriangles);
  setInterval(wakeTriangles, 1000);

  // ---------------- Ultra: cards lean toward the mouse, the banner follows it a little ----------------
  let tiltEl = null, tiltX = 0, tiltY = 0, tiltRaf = 0, heroEl = null;
  const TILT = ".vcard,.skin,.tpl,.gbgames button";
  function untilt() { if (tiltEl) { tiltEl.classList.remove("tilt"); tiltEl.style.removeProperty("--rx"); tiltEl.style.removeProperty("--ry"); } tiltEl = null; }
  function onMove(e) {
    tiltX = e.clientX; tiltY = e.clientY;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
      tiltRaf = 0;
      const t = e.target && e.target.closest ? e.target.closest(TILT) : null;
      if (t !== tiltEl) untilt();
      if (t) {
        const r = t.getBoundingClientRect();
        t.style.setProperty("--rx", (((tiltY - r.top) / r.height - 0.5) * -7).toFixed(2) + "deg");
        t.style.setProperty("--ry", (((tiltX - r.left) / r.width - 0.5) * 7).toFixed(2) + "deg");
        if (!t.classList.contains("tilt")) t.classList.add("tilt");
        tiltEl = t;
      }
      const hero = $("hero");
      if (hero && body.dataset.mode === "dash") {
        const r = hero.getBoundingClientRect(), inside = tiltY >= r.top && tiltY <= r.bottom;
        hero.style.setProperty("--hx", inside ? (((tiltX - r.left) / r.width - 0.5) * 16).toFixed(1) + "px" : "0px");
        hero.style.setProperty("--hy", inside ? (((tiltY - r.top) / r.height - 0.5) * 10).toFixed(1) + "px" : "0px");
        heroEl = hero;
      }
    });
  }
  function onLeave() { untilt(); if (heroEl) { heroEl.style.setProperty("--hx", "0px"); heroEl.style.setProperty("--hy", "0px"); } }

  // ---------------- Ultra: a ripple where you click a button ----------------
  function onDown(e) {
    const b = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!b || b.disabled || b.classList.contains("ri") || b.closest("#bar") || b.offsetWidth < 24) return;
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.3;
    const box = document.createElement("span");
    box.style.cssText = "position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none";
    const dot = document.createElement("span");
    dot.className = "rip";
    dot.style.cssText = "left:" + (e.clientX - r.left) + "px;top:" + (e.clientY - r.top) + "px;width:" + d + "px;height:" + d + "px";
    box.appendChild(dot); b.appendChild(box);
    setTimeout(() => box.remove(), 600);
  }

  // ---------------- the setting ----------------
  let extras = false;
  function set(l) {
    l = l === "off" || l === "ultra" ? l : "smooth";
    body.dataset.motion = l;
    const want = l === "ultra";
    if (want && !extras) { document.addEventListener("pointermove", onMove, { passive: true }); document.addEventListener("pointerleave", onLeave); window.addEventListener("blur", onLeave); document.addEventListener("pointerdown", onDown, true); extras = true; }
    if (!want && extras) { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave); window.removeEventListener("blur", onLeave); document.removeEventListener("pointerdown", onDown, true); onLeave(); extras = false; }
    if (want) wakeTriangles(); else stopTriangles();
  }
  window.bcMotion = { set, level, beforeMode, afterMode };
})();
