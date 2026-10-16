// Performance, on the dashboard: what BelleCord is using right now (each part: Fluxer, Discord, the app itself, the
// graphics card), one-click presets, and the switches behind them:
//   * pause the side you're not looking at (its animations, GIFs and videos stop while it's out of sight; messages
//     and notifications still come in)
//   * still sites (moving backgrounds and animations on Fluxer and Discord stop)
//   * no wallpaper blur (blur is the heaviest thing a theme does)
//   * star effects (effects.js)
//   * spellcheck
//   * use the graphics card (needs a restart)
//   * clean up (the sites' saved copies of pictures and files; you stay signed in) and refresh the hidden side
// Every switch works the moment it's clicked (only the graphics card waits for a restart, and says so). It also
// shows the top apps on your whole computer and how full its memory is.
// The usage numbers are only read while the section is on screen.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const P = (k, d) => { try { const v = window.bcPref ? window.bcPref(k) : undefined; return v === undefined ? d : v; } catch { return d; } };
  const save = (c) => { try { window.bcSavePref && window.bcSavePref(c); } catch {} };
  const toast = (t, ms) => { try { window.bcToast && window.bcToast(t, ms); } catch {} };
  const body = document.body;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------- the switches ----------------
  const OPTS = [
    { k: "pauseHidden", d: true, name: "Pause the side you're not looking at", note: "Its animations, GIFs and videos stop while it's out of sight. Messages and notifications still come in." },
    { k: "stillSites", d: false, name: "Still Fluxer and Discord", note: "Moving theme backgrounds and the sites' own animations stop." },
    { k: "noBlur", d: false, name: "No wallpaper blur", note: "Blur is the heaviest thing a theme does. The wallpaper stays, just sharp." },
    { k: "starFx", d: true, name: "Star effects", note: "Glowing, sparkling ⭐ reactions and the \"+1 → 💗\" tags." },
    { k: "spell", d: true, name: "Spellcheck", note: "The red underlines while you type." },
    { k: "gpu", d: true, name: "Use the graphics card", note: "Usually faster. Turn it off if BelleCord flickers, goes black or freezes. Needs a restart." },
  ];
  const PRESETS = [
    { id: "full", name: "✨ Full", note: "Everything on", set: { pauseHidden: false, stillSites: false, noBlur: false, starFx: true, spell: true, motion: "smooth" } },
    { id: "balanced", name: "⚖️ Balanced", note: "Best of both (I'd pick this)", set: { pauseHidden: true, stillSites: false, noBlur: false, starFx: true, spell: true, motion: "smooth" } },
    { id: "light", name: "🍃 Light", note: "For older computers", set: { pauseHidden: true, stillSites: false, noBlur: true, starFx: true, spell: true, motion: "off" } },
    { id: "saver", name: "🔋 Battery saver", note: "As light as it gets", set: { pauseHidden: true, stillSites: true, noBlur: true, starFx: false, spell: false, motion: "off" } },
  ];
  const opt = (k) => { const o = OPTS.find((x) => x.k === k); if (k === "gpu") return !P("noGpu", false); if (k === "spell") return !P("noSpell", false); return !!P("perf_" + k, o ? o.d : false); };
  async function setOpt(k, on, quiet) {
    if (k === "gpu") {
      save({ noGpu: !on || null });
      if (!quiet) said(k, on);
      return;
    }
    if (k === "spell") { save({ noSpell: !on || null }); try { await host.perfSpell(on); } catch {} }
    else save({ ["perf_" + k]: !!on });
    if (k === "noBlur") blur(on);
    apply();
    // (pausing happens right away too, for a side that's already out of sight)
    if (k === "pauseHidden") for (const side of ["fluxer", "discord"]) if (!seen(side)) run(side, on ? PAUSE : UNPAUSE);
    if (!quiet) said(k, on);
  }
  // a little "done" next to the switches, so it's clear it already happened
  let gpuWas = null;
  function said(k, on) {
    const m = $("pf-msg");
    if (!m) return;
    if (k === "gpu") {
      if (gpuWas === null) gpuWas = !on;
      if (on === gpuWas) { m.textContent = "Back how it was. No restart needed."; return; }
      m.innerHTML = 'The graphics card switch needs a restart. <button id="pf-restart">Restart now</button>';
      $("pf-restart").onclick = () => { if (host.restartApp) host.restartApp(); else m.textContent = "Close BelleCord and open it again."; };
      return;
    }
    const o = OPTS.find((x) => x.k === k);
    m.textContent = "✓ " + (o ? o.name : k) + (on ? " is on now." : " is off now.");
    clearTimeout(said.t); said.t = setTimeout(() => { if (m.textContent.startsWith("✓")) m.textContent = ""; }, 4000);
  }
  // no blur: the wallpaper's blur goes to 0 (and back to what it was)
  function blur(off) {
    const inp = $("w-blur");
    if (!inp) return;
    if (off) { const was = Number(inp.value) || 0; if (was) save({ perf_blurWas: was }); inp.value = 0; }
    else { const was = Number(P("perf_blurWas", 2)); inp.value = was || 2; }
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ---------------- what they do on the sites ----------------
  const PAUSE = "(function(){var s=document.getElementById('bc-pause');if(!s){s=document.createElement('style');s.id='bc-pause';s.textContent='*,*::before,*::after{animation-play-state:paused!important}';(document.head||document.documentElement).appendChild(s);}document.querySelectorAll('video').forEach(function(v){if(!v.paused&&!v.closest('[class*=\"voice\"],[class*=\"stream\"],[class*=\"call\"]')){v.dataset.bcPaused='1';try{v.pause()}catch(e){}}});return 1})()";
  const UNPAUSE = "(function(){var s=document.getElementById('bc-pause');if(s)s.remove();document.querySelectorAll('video[data-bc-paused]').forEach(function(v){delete v.dataset.bcPaused;try{v.play()}catch(e){}});return 1})()";
  // (animations are made instant, not removed: Fluxer and Discord wait for a menu's or a popup's animation to finish
  // before it works, so with them removed outright, lots of buttons stopped doing anything)
  const STILL_CSS = "*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important;scroll-behavior:auto!important}";
  const STILL = "(function(){var s=document.getElementById('bc-still');if(!s){s=document.createElement('style');s.id='bc-still';(document.head||document.documentElement).appendChild(s);}s.textContent=" + JSON.stringify(STILL_CSS) + ";return 1})()";
  const UNSTILL = "(function(){var s=document.getElementById('bc-still');if(s)s.remove();return 1})()";
  const run = (side, code) => { const w = $("wv-" + side); if (!w || !w.executeJavaScript) return; try { w.executeJavaScript(code).catch(() => {}); } catch {} };
  const seen = (side) => { const m = body.dataset.mode; return m === "both" || m === side; };
  const hiddenSince = { fluxer: 0, discord: 0 };
  function apply() {
    body.classList.toggle("perf-still", opt("stillSites"));
    for (const side of ["fluxer", "discord"]) {
      run(side, opt("stillSites") ? STILL : UNSTILL);
      // (a short wait first, so flicking between sides doesn't stop and start everything)
      if (seen(side)) { hiddenSince[side] = 0; run(side, UNPAUSE); }
      else if (!hiddenSince[side]) hiddenSince[side] = Date.now();
    }
  }
  setInterval(() => {
    for (const side of ["fluxer", "discord"]) {
      if (seen(side)) { if (hiddenSince[side]) { hiddenSince[side] = 0; run(side, UNPAUSE); } continue; }
      if (!hiddenSince[side]) hiddenSince[side] = Date.now();
      if (opt("pauseHidden") && Date.now() - hiddenSince[side] > 8000) run(side, PAUSE);
    }
  }, 2000);
  new MutationObserver(apply).observe(body, { attributes: true, attributeFilter: ["data-mode"] });
  for (const side of ["fluxer", "discord"]) { const w = $("wv-" + side); if (w) w.addEventListener("dom-ready", () => setTimeout(apply, 500)); }
  window.bcPerf = { opt, apply }; // (effects.js asks about star effects)

  // ---------------- the dashboard section ----------------
  const css = document.createElement("style");
  css.textContent = [
    "#s-perf .usage{display:grid;grid-template-columns:auto 1fr auto auto;gap:6px 12px;align-items:center;font-size:13px}",
    "#s-perf .usage .bar{height:8px;border-radius:4px;background:var(--bg);overflow:hidden}#s-perf .usage .bar i{display:block;height:100%;background:var(--accent);border-radius:4px;transition:width .6s}",
    "#s-perf .big{display:flex;gap:24px;align-items:baseline;margin-bottom:10px}#s-perf .big b{font-size:26px;color:var(--strong)}#s-perf .big span{color:var(--dim);font-size:12px;margin-left:4px}",
    "#s-perf .presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:10px 0}",
    "#s-perf .presets button{text-align:left;padding:10px 12px;display:flex;flex-direction:column;gap:2px}#s-perf .presets button small{color:var(--dim);font-size:11px}#s-perf .presets button.on{outline:2px solid var(--accent)}",
    "#s-perf .opts label{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line);cursor:pointer}#s-perf .opts label:first-child{border-top:0}",
    "#s-perf .opts input{margin-top:3px;width:16px;height:16px;flex:none}#s-perf .opts small{display:block;color:var(--dim);font-size:12px}",
    "#s-perf .usage .me{color:var(--accent);font-weight:600}#s-perf .ram{margin-bottom:10px;font-size:13px}#s-perf .ram .bar{height:10px;border-radius:5px;background:var(--bg);overflow:hidden;margin-top:4px}#s-perf .ram .bar i{display:block;height:100%;border-radius:5px;transition:width .6s}",
    "#s-perf .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}",
    "body.perf-still #dash *,body.perf-still #dash *::before,body.perf-still #dash *::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important}",
  ].join("\n");
  document.head.appendChild(css);

  const sec = document.createElement("section");
  sec.className = "sec"; sec.id = "s-perf";
  sec.innerHTML = '<h2>Performance</h2>' +
    '<div class="card"><div class="big"><div><b id="pf-cpu">-</b><span>CPU</span></div><div><b id="pf-mem">-</b><span>memory</span></div><div class="dim small" id="pf-gpu"></div></div><div class="usage" id="pf-parts"></div></div>' +
    '<h3 class="sub">On your computer</h3><div class="card"><div class="ram" id="pf-ram"></div><div class="usage" id="pf-top"><span class="dim">Looking...</span></div></div>' +
    '<h3 class="sub">Presets</h3><div class="presets" id="pf-presets"></div>' +
    '<div class="card opts" id="pf-opts"></div>' +
    '<div class="acts"><button id="pf-clean" title="The sites\' saved copies of pictures and files. You stay signed in.">🧹 Clean up</button><button id="pf-reload" title="Reloads the side you\'re not looking at, which frees what it built up over a long time">🔄 Refresh the hidden side</button><span class="dim small" id="pf-msg"></span></div>';
  const app = $("s-app");
  if (app && app.parentNode) app.parentNode.insertBefore(sec, app); else ($("dash") && $("dash").querySelector(".wrap") || document.body).appendChild(sec);

  function drawOpts() {
    $("pf-opts").innerHTML = OPTS.map((o) => '<label><input type="checkbox" data-pf="' + o.k + '"' + (opt(o.k) ? " checked" : "") + '><span><b>' + esc(o.name) + "</b><small>" + esc(o.note) + "</small></span></label>").join("");
    $("pf-opts").querySelectorAll("[data-pf]").forEach((c) => (c.onchange = async () => { await setOpt(c.dataset.pf, c.checked); drawPresets(); }));
    drawPresets();
  }
  const motion = () => (body.dataset.motion || "smooth");
  function current() {
    return PRESETS.find((p) => Object.entries(p.set).every(([k, v]) => (k === "motion" ? (v === "off") === (motion() === "off") : k === "spell" ? opt("spell") === v : opt(k) === v)));
  }
  function drawPresets() {
    const now = current();
    $("pf-presets").innerHTML = PRESETS.map((p) => '<button data-pre="' + p.id + '"' + (now && now.id === p.id ? ' class="on"' : "") + "><b>" + esc(p.name) + "</b><small>" + esc(p.note) + "</small></button>").join("");
    $("pf-presets").querySelectorAll("[data-pre]").forEach((b) => (b.onclick = async () => {
      const p = PRESETS.find((x) => x.id === b.dataset.pre);
      for (const [k, v] of Object.entries(p.set)) {
        if (k === "motion") { const sel = $("opt-motion"); if (sel && (v === "off") !== (motion() === "off")) { sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true })); } continue; }
        if (opt(k) !== v) await setOpt(k, v, true);
      }
      drawOpts();
      $("pf-msg").textContent = "✓ " + p.name.replace(/^\S+\s/, "") + " is on now.";
      toast(p.name.replace(/^\S+\s/, "") + " is on.");
    }));
  }

  // what it's using (only while you can see it)
  const LABEL = { fluxer: "Fluxer", discord: "Discord", app: "BelleCord itself", gpu: "Graphics", links: "Quick links" };
  const visible = () => { if (body.dataset.mode !== "dash") return false; const r = sec.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  async function usage() {
    if (!visible() || !host.perfUsage) return;
    let u; try { u = await host.perfUsage(); } catch { return; }
    if (!u) return;
    $("pf-cpu").textContent = u.total.cpu.toFixed(1) + "%";
    $("pf-mem").textContent = u.total.mem >= 1024 ? (u.total.mem / 1024).toFixed(1) + " GB" : Math.round(u.total.mem) + " MB";
    $("pf-gpu").textContent = u.gpu ? "" : "Graphics card: off";
    const max = Math.max(1, ...Object.values(u.parts).map((p) => p.mem));
    $("pf-parts").innerHTML = Object.entries(u.parts).filter(([k, p]) => p.mem > 1 || k === "fluxer" || k === "discord").sort((a, b) => b[1].mem - a[1].mem).map(([k, p]) =>
      "<span>" + esc(LABEL[k] || k) + '</span><div class="bar"><i style="width:' + Math.round((p.mem / max) * 100) + '%"></i></div><span class="dim">' + Math.round(p.mem) + " MB</span><span class=\"dim\">" + p.cpu.toFixed(1) + "%</span>").join("");
  }
  setInterval(usage, 3000);

  // the top apps on your whole computer (by memory), and how full its memory is
  const mb = (v) => (v >= 1024 ? (v / 1024).toFixed(1) + " GB" : Math.round(v) + " MB");
  const isMe = (n) => /^(bellecord|electron)$/i.test(n);
  async function top() {
    if (!visible() || !host.perfTop) return;
    let t; try { t = await host.perfTop(); } catch { return; }
    if (!t || !t.apps) return;
    const used = t.totalMem - t.freeMem, pct = Math.round((used / Math.max(1, t.totalMem)) * 100);
    const col = pct > 90 ? "#f23f43" : pct > 75 ? "#f0b232" : "#23a55a";
    $("pf-ram").innerHTML = "Memory in use: <b>" + mb(used) + "</b> of " + mb(t.totalMem) + " (" + pct + "%)" + (pct > 90 ? " - it's nearly full, closing something big will help" : "") + '<div class="bar"><i style="width:' + pct + "%;background:" + col + '"></i></div>';
    const max = Math.max(1, ...t.apps.map((a) => a.mem));
    $("pf-top").innerHTML = t.apps.length ? t.apps.map((a) =>
      '<span class="' + (isMe(a.name) ? "me" : "") + '">' + esc(a.name) + (a.count > 1 ? ' <small class="dim">x' + a.count + "</small>" : "") + (isMe(a.name) ? ' <small class="dim">(BelleCord)</small>' : "") + '</span><div class="bar"><i style="width:' + Math.round((a.mem / max) * 100) + '%"></i></div><span class="dim">' + mb(a.mem) + '</span><span class="dim">' + a.cpu.toFixed(1) + "% CPU</span>").join("") : '<span class="dim">Couldn\'t read that right now.</span>';
  }
  setInterval(top, 4000);

  $("pf-clean").onclick = async () => {
    $("pf-msg").textContent = "Cleaning...";
    try { const r = await host.perfClean(); $("pf-msg").textContent = r && r.mb ? "Freed " + r.mb + " MB. You're still signed in." : "All clean. You're still signed in."; } catch { $("pf-msg").textContent = "That didn't work this time."; }
  };
  $("pf-reload").onclick = () => {
    const m = body.dataset.mode;
    const sides = m === "fluxer" ? ["discord"] : m === "discord" ? ["fluxer"] : m === "dash" ? ["fluxer", "discord"] : [];
    if (!sides.length) return ($("pf-msg").textContent = "Both sides are on screen. Open just one first.");
    for (const s of sides) { try { $("wv-" + s).reload(); } catch {} }
    $("pf-msg").textContent = "Refreshed " + sides.map((s) => (s === "fluxer" ? "Fluxer" : "Discord")).join(" and ") + ".";
  };

  // start once the settings are read
  const wait = setInterval(() => { if (!window.bcPref || !window.bcPrefsReady) return; clearInterval(wait); drawOpts(); apply(); }, 200);
})();
