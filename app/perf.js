// Performance, on the dashboard: what BelleCord is using right now (Fluxer, Discord, the app itself, the graphics
// card), everything else running on your computer, one-click presets, and the switches behind them:
//   * pause the side you're not looking at (its animations stop and its videos pause; messages still come in)
//   * let the hidden side sleep (after a minute out of sight it shuts down completely, and wakes when you go back)
//   * still sites (Fluxer's and Discord's animations and moving backgrounds stop)
//   * no wallpaper blur (blur is the heaviest thing a theme does)
//   * star effects (effects.js)
//   * spellcheck
//   * use the graphics card (the only one that needs a restart)
//   * clean up (the sites' saved copies of pictures and files; you stay signed in) and refresh the hidden side
// Every switch works the moment you flip it. "Still" never freezes anything halfway: every animation jumps to its
// end, so menus and settings always open. The numbers are only read while the section is on screen.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const P = (k, d) => { try { const v = window.bcPref ? window.bcPref(k) : undefined; return v === undefined ? d : v; } catch { return d; } };
  const save = (c) => { try { window.bcSavePref && window.bcSavePref(c); } catch {} };
  const toast = (t, ms) => { try { window.bcToast && window.bcToast(t, ms); } catch {} };
  const body = document.body;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SIDES = ["fluxer", "discord"];
  const NAME = { fluxer: "Fluxer", discord: "Discord" };

  // ---------------- the switches ----------------
  const OPTS = [
    { k: "pauseHidden", d: true, name: "Pause the side you're not looking at", note: "Its animations stop and its videos pause while it's out of sight. Messages and notifications still come in." },
    { k: "sleepHidden", d: false, name: "Let the hidden side sleep", note: "After a minute out of sight it shuts down completely and lets go of all its memory, and it wakes up when you go back (a few seconds). Never while you're in a call or watching a stream. Its notifications stop while it sleeps." },
    { k: "stillSites", d: false, name: "Still Fluxer and Discord", note: "Their animations and moving theme backgrounds stop. Everything still opens and works." },
    { k: "noBlur", d: false, name: "No wallpaper blur", note: "Blur is the heaviest thing a theme does. The wallpaper stays, just sharp." },
    { k: "starFx", d: true, name: "Star effects", note: "Glowing, sparkling ⭐ reactions and the \"+1 → 💗\" tags." },
    { k: "spell", d: true, name: "Spellcheck", note: "The red underlines while you type." },
    { k: "gpu", d: true, name: "Use the graphics card", note: "Usually faster. Turn it off if BelleCord flickers, goes black or freezes. This one needs a restart." },
  ];
  // Full: about what Fluxer and Discord use on their own, a little more for the extras.
  // Balanced: the side you're not looking at rests. Light: on top of that, nothing animates and nothing blurs.
  // Battery saver: the hidden side sleeps completely, so you're only running the one you're using.
  const PRESETS = [
    { id: "full", name: "✨ Full", note: "Everything on", set: { pauseHidden: false, sleepHidden: false, stillSites: false, noBlur: false, starFx: true, spell: true, motion: "smooth" } },
    { id: "balanced", name: "⚖️ Balanced", note: "Best of both (I'd pick this)", set: { pauseHidden: true, sleepHidden: false, stillSites: false, noBlur: false, starFx: true, spell: true, motion: "smooth" } },
    { id: "light", name: "🍃 Light", note: "For older computers", set: { pauseHidden: true, sleepHidden: false, stillSites: true, noBlur: true, starFx: true, spell: true, motion: "off" } },
    { id: "saver", name: "🔋 Battery saver", note: "As light as it gets", set: { pauseHidden: true, sleepHidden: true, stillSites: true, noBlur: true, starFx: false, spell: false, motion: "off" } },
  ];
  const opt = (k) => { const o = OPTS.find((x) => x.k === k); if (k === "gpu") return !P("noGpu", false); if (k === "spell") return !P("noSpell", false); return !!P("perf_" + k, o ? o.d : false); };
  let gpuStarted = null; // (the graphics card switch when BelleCord started)
  async function setOpt(k, on) {
    if (k === "gpu") save({ noGpu: !on || null });
    else if (k === "spell") { save({ noSpell: !on || null }); try { await host.perfSpell(on); } catch {} }
    else save({ ["perf_" + k]: !!on });
    if (k === "noBlur") blur(on);
    apply();
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
  // (the extra ":not(#...)" parts make it outrank the themes' moving backgrounds, which use the same trick to outrank
  //  the sites: before this, a theme's pattern kept moving no matter what)
  const B5 = ":root:not(#bcq1):not(#bcq2):not(#bcq3):not(#bcq4):not(#bcq5)";
  const CALM = B5 + " *," + B5 + " *::before," + B5 + " *::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important;scroll-behavior:auto!important}";
  const page = (fn, arg) => "(" + fn.toString() + ")(" + JSON.stringify(arg) + ")";
  function pageStyle(a) {
    // (the first version of this froze animations on their first frame, which left menus and settings invisible:
    //  its leftovers are cleared here)
    ["bc-pause", "bc-still"].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    var s = document.getElementById(a.id);
    if (a.on) {
      if (!s) { s = document.createElement("style"); s.id = a.id; (document.head || document.documentElement).appendChild(s); }
      if (s.textContent !== a.css) s.textContent = a.css;
    } else if (s) s.remove();
    // videos: live ones (calls, streams) are never touched
    var live = function (v) { return !!v.srcObject || !!(v.closest && v.closest('[class*="voice"],[class*="Voice"],[class*="stream"],[class*="Stream"],[class*="call"],[class*="Call"]')); };
    document.querySelectorAll("video").forEach(function (v) {
      if (a.on) { if (!v.paused && !live(v) && (!a.loopsOnly || (v.loop && v.muted))) { v.dataset[a.mark] = "1"; try { v.pause(); } catch (e) {} } }
      else if (v.dataset[a.mark]) { delete v.dataset[a.mark]; try { v.play(); } catch (e) {} }
    });
    return 1;
  }
  function busyCheck() {
    // in a call, or watching something live: a side like that never sleeps
    var live = [].some.call(document.querySelectorAll("video,audio"), function (v) { return !!v.srcObject && !v.paused; });
    var call = !!document.querySelector('[aria-label="Disconnect" i],[aria-label*="Leave call" i],[class*="rtcConnection"],[class*="voiceConnected"],[class*="VoiceConnection"]');
    return live || call;
  }
  const wv = (side) => $("wv-" + side);
  const run = (side, code) => { const w = wv(side); if (!w || !w.executeJavaScript) return Promise.resolve(null); try { return w.executeJavaScript(code).catch(() => null); } catch { return Promise.resolve(null); } };
  const st = { fluxer: { hid: null, still: null, since: 0, asleep: null, busy: false }, discord: { hid: null, still: null, since: 0, asleep: null, busy: false } };
  function setHidden(side, on) {
    on = !!on; const s = st[side]; if (s.hid === on) return; s.hid = on;
    run(side, page(pageStyle, { id: "bc-calm-hidden", css: CALM, on, mark: "bcPaused" })).then((r) => { if (r !== 1 && s.hid === on) s.hid = null; });
  }
  function setStill(side, on) {
    on = !!on; const s = st[side]; if (s.still === on) return; s.still = on;
    run(side, page(pageStyle, { id: "bc-calm-still", css: CALM, on, mark: "bcStill", loopsOnly: true })).then((r) => { if (r !== 1 && s.still === on) s.still = null; });
  }
  const seen = (side) => { const m = body.dataset.mode; return m === "both" || m === side; };
  const urlOf = (side) => { try { return wv(side).getURL() || ""; } catch { return ""; } };
  function wake(side) {
    const s = st[side]; if (!s.asleep) return;
    const url = s.asleep; s.asleep = null;
    if (body.dataset.only && body.dataset.only !== side) return; // ("Only Discord" / "Only Fluxer" keeps the other one empty)
    try { wv(side).loadURL(url); } catch { try { wv(side).setAttribute("src", url); } catch {} }
  }
  async function maybeSleep(side) {
    const s = st[side];
    if (s.asleep || s.busy || !opt("sleepHidden") || seen(side) || !s.since || Date.now() - s.since < 60000) return;
    if (!/^https?:/i.test(urlOf(side))) return;
    s.busy = true;
    const busy = await run(side, "(" + busyCheck.toString() + ")()");
    s.busy = false;
    if (busy || seen(side) || !opt("sleepHidden")) return;
    s.asleep = urlOf(side);
    if (!/^https?:/i.test(s.asleep)) { s.asleep = null; return; }
    const w = wv(side);
    try { w.stop(); } catch {}
    try { w.loadURL("about:blank"); } catch { try { w.setAttribute("src", "about:blank"); } catch {} }
  }
  function check() {
    for (const side of SIDES) {
      const s = st[side];
      if (s.still === null) setStill(side, opt("stillSites"));
      if (seen(side)) { if (s.asleep) wake(side); s.since = 0; setHidden(side, false); continue; }
      if (!s.since) s.since = Date.now();
      // (a short wait first, so flicking between sides doesn't stop and start everything)
      if (!opt("pauseHidden")) setHidden(side, false);
      else if (Date.now() - s.since > 3000) setHidden(side, true);
      maybeSleep(side);
    }
  }
  function apply() {
    body.classList.toggle("perf-still", opt("stillSites"));
    for (const side of SIDES) { setStill(side, opt("stillSites")); if (!opt("sleepHidden")) wake(side); }
    check();
    if ($("pf-opts")) drawOpts();
  }
  setInterval(check, 1000);
  new MutationObserver(check).observe(body, { attributes: true, attributeFilter: ["data-mode"] });
  for (const side of SIDES) {
    const w = wv(side);
    if (w) w.addEventListener("dom-ready", () => {
      if (!/^https?:/i.test(urlOf(side))) return;
      st[side].hid = null; st[side].still = null;
      setTimeout(check, 300);
    });
  }
  window.bcPerf = { opt, apply }; // (effects.js asks about star effects)

  // ---------------- the dashboard section ----------------
  const css = document.createElement("style");
  css.textContent = [
    "#s-perf .usage{display:grid;grid-template-columns:minmax(90px,auto) 1fr auto auto;gap:6px 12px;align-items:center;font-size:13px}",
    "#s-perf .usage .bar{height:8px;border-radius:4px;background:var(--bg);overflow:hidden}#s-perf .usage .bar i{display:block;height:100%;background:var(--accent);border-radius:4px;transition:width .6s}",
    "#s-perf .usage .num{color:var(--dim);text-align:right;font-variant-numeric:tabular-nums}#s-perf .usage .me{color:var(--accent);font-weight:700}",
    "#s-perf .usage .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}#s-perf .usage .nm small{color:var(--dim);margin-left:4px}",
    "#s-perf .big{display:flex;gap:24px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap}#s-perf .big b{font-size:26px;color:var(--strong)}#s-perf .big span{color:var(--dim);font-size:12px;margin-left:4px}",
    "#s-perf .big .sp{flex:1}#s-perf .sorts{display:flex;gap:6px;align-self:center}#s-perf .sorts button{padding:3px 10px;font-size:12px}#s-perf .sorts button.on{outline:2px solid var(--accent)}",
    "#pf-parts.all{max-height:340px;overflow:auto;padding-right:4px}#s-perf .usage .subl{grid-column:1/-1;color:var(--dim);font-size:11px;margin:-4px 0 2px 2px}",
    "#s-perf .presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:10px 0}",
    "#s-perf .presets button{text-align:left;padding:10px 12px;display:flex;flex-direction:column;gap:2px}#s-perf .presets button small{color:var(--dim);font-size:11px}#s-perf .presets button.on{outline:2px solid var(--accent)}",
    "#s-perf .opts label{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line);cursor:pointer}#s-perf .opts label:first-child{border-top:0}",
    "#s-perf .opts input{margin-top:3px;width:16px;height:16px;flex:none}#s-perf .opts small{display:block;color:var(--dim);font-size:12px}#s-perf .opts .rst{margin-top:6px;padding:4px 10px;font-size:12px}",
    "#s-perf .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}",
    // still: the dashboard's own animations jump to their end too (never frozen halfway)
    B5 + " body.perf-still *," + B5 + " body.perf-still *::before," + B5 + " body.perf-still *::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:1ms!important;transition-delay:0s!important}",
  ].join("\n");
  document.head.appendChild(css);

  const sec = document.createElement("section");
  sec.className = "sec"; sec.id = "s-perf";
  sec.innerHTML = '<h2>Performance</h2>' +
    '<div class="card"><div class="big"><div><b id="pf-cpu">-</b><span>CPU</span></div><div><b id="pf-mem">-</b><span>memory</span></div><div class="dim small" id="pf-gpu"></div><span class="sp"></span><span class="sorts"><button data-pfsort="mem" class="on" title="Most memory first">Memory</button><button data-pfsort="cpu" title="Most energy first (how hard each one makes the computer work; matters most on a laptop)">Energy use</button><button id="pf-all">Show all</button></span></div>' +
    '<div class="usage" id="pf-parts"></div><div class="dim small" id="pf-foot" style="margin-top:8px"></div></div>' +
    '<h3 class="sub">Presets</h3><div class="presets" id="pf-presets"></div>' +
    '<div class="card opts" id="pf-opts"></div>' +
    '<div class="acts"><button id="pf-clean" title="The sites\' saved copies of pictures and files. You stay signed in.">🧹 Clean up</button><button id="pf-reload" title="Reloads the side you\'re not looking at, which frees what it built up over a long time">🔄 Refresh the hidden side</button><span class="dim small" id="pf-msg"></span></div>';
  const appSec = $("s-app");
  if (appSec && appSec.parentNode) appSec.parentNode.insertBefore(sec, appSec); else ($("dash") && $("dash").querySelector(".wrap") || document.body).appendChild(sec);

  function drawOpts() {
    const changed = gpuStarted !== null && opt("gpu") !== gpuStarted;
    $("pf-opts").innerHTML = OPTS.map((o) => '<label><input type="checkbox" data-pf="' + o.k + '"' + (opt(o.k) ? " checked" : "") + '><span><b>' + esc(o.name) + "</b><small>" + esc(o.note) + "</small>" +
      (o.k === "gpu" && changed ? '<button class="rst" id="pf-restart">Restart now</button>' : "") + "</span></label>").join("");
    $("pf-opts").querySelectorAll("[data-pf]").forEach((c) => (c.onchange = () => setOpt(c.dataset.pf, c.checked)));
    const r = $("pf-restart"); if (r) r.onclick = (e) => { e.preventDefault(); e.stopPropagation(); host.restartApp && host.restartApp(); };
    drawPresets();
  }
  const motion = () => (body.dataset.motion || "smooth");
  function current() {
    return PRESETS.find((p) => Object.entries(p.set).every(([k, v]) => (k === "motion" ? (v === "off") === (motion() === "off") : opt(k) === v)));
  }
  function setMotion(v) {
    const sel = $("opt-motion");
    if (!sel || (v === "off") === (motion() === "off")) return;
    if (v === "off") save({ perf_motionWas: motion() }); else v = P("perf_motionWas", "smooth") === "ultra" ? "ultra" : "smooth"; // (Ultra comes back if you had it)
    sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function drawPresets() {
    const now = current();
    $("pf-presets").innerHTML = PRESETS.map((p) => '<button data-pre="' + p.id + '"' + (now && now.id === p.id ? ' class="on"' : "") + "><b>" + esc(p.name) + "</b><small>" + esc(p.note) + "</small></button>").join("");
    $("pf-presets").querySelectorAll("[data-pre]").forEach((b) => (b.onclick = async () => {
      const p = PRESETS.find((x) => x.id === b.dataset.pre);
      for (const [k, v] of Object.entries(p.set)) {
        if (k === "motion") { setMotion(v); continue; }
        if (opt(k) === v) continue;
        if (k === "spell") { save({ noSpell: !v || null }); try { await host.perfSpell(v); } catch {} }
        else { save({ ["perf_" + k]: !!v }); if (k === "noBlur") blur(v); }
      }
      apply();
      toast(p.name.replace(/^\S+\s/, "") + " is on.");
    }));
  }
  // (Animations changed by hand in the App section: the presets show it straight away)
  new MutationObserver(() => { if ($("pf-presets")) drawPresets(); }).observe(body, { attributes: true, attributeFilter: ["data-motion"] });

  // ---------------- the numbers (only while you can see them) ----------------
  // One list with bars: the 5 programs on the computer using the most memory (or energy), BelleCord always in it, and
  // the Fluxer and Discord apps too when they're open (to compare). Under BelleCord: what's inside it.
  // The big numbers at the top are BelleCord's own.
  const PART = { fluxer: "Fluxer inside it", discord: "Discord inside it", app: "its own parts", gpu: "drawing the screen", links: "quick links" };
  const TIP = { app: "The dashboard, the title bar and everything else BelleCord shows", gpu: "Drawing the screen: the part that draws BelleCord on your screen (with the graphics card, if it's on). Every app has one, Fluxer and Discord too.", links: "TikTok, Pinterest and X in the title bar" };
  const mb = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + " GB" : Math.round(n) + " MB");
  const visible = () => { if (body.dataset.mode !== "dash") return false; const r = sec.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  let sortBy = "mem", showAll = false, sysBusy = false, lastSys = null, lastUse = null, sysWhy = "", sysTries = 0;
  const smooth = new Map(); // (energy use, evened out over the last few looks so the list doesn't jump around)
  function settle(s) {
    const seen = new Set();
    for (const x of s.list) {
      const k = x.me ? "\u0000me" : x.name;
      seen.add(k);
      const was = smooth.get(k);
      x.e = s.cpuReady ? (was == null ? x.cpu : was * 0.6 + x.cpu * 0.4) : 0;
      if (s.cpuReady) smooth.set(k, x.e);
    }
    for (const k of [...smooth.keys()]) if (!seen.has(k)) smooth.delete(k);
    return s;
  }
  const row = (name, tip, cls, pct, mem, cpu) => '<span class="nm' + (cls ? " " + cls : "") + '" title="' + esc(tip || name) + '">' + name + '</span><div class="bar"><i style="width:' + Math.max(0, Math.min(100, Math.round(pct))) + '%"></i></div><span class="num">' + mb(mem) + '</span><span class="num">' + cpu + "</span>";
  function draw() {
    const u = lastUse, s = lastSys;
    const sleeping = SIDES.filter((x) => st[x].asleep);
    const inside = u ? Object.entries(u.parts).filter(([k, p]) => p.mem > 1 || k === "fluxer" || k === "discord").sort((a, b) => b[1].mem - a[1].mem).map(([k, p]) => '<span title="' + esc(TIP[k] || "") + '">' + esc(PART[k] || k) + " " + (sleeping.includes(k) ? "(asleep)" : mb(p.mem)) + "</span>").join(" · ") : "";
    const notes = [];
    if (s && s.list) {
      const val = (x) => (sortBy === "cpu" ? x.e : x.mem);
      const list = s.list.slice().sort((a, b) => val(b) - val(a) || b.mem - a.mem);
      const shown = showAll ? list.filter((x) => x.mem >= 1 || x.e > 0) : list.slice(0, 5);
      for (const x of list) if (!showAll && (x.me || /\b(fluxer|discord)\b/i.test(x.name)) && !shown.includes(x)) shown.push(x);
      const max = Math.max(0.1, ...shown.map(val));
      $("pf-parts").innerHTML = shown.map((x) => {
        let h = row(esc(x.name) + (x.count > 1 ? "<small>×" + x.count + "</small>" : ""), x.name + (x.count > 1 ? " (" + x.count + " parts)" : ""), x.me ? "me" : "", (val(x) / max) * 100, x.mem, s.cpuReady ? x.e.toFixed(1) + "%" : "-");
        if (x.me && inside) h += '<small class="subl">' + inside + "</small>";
        return h;
      }).join("");
      const fx = list.some((x) => !x.me && /\bfluxer\b/i.test(x.name)), dc = list.some((x) => !x.me && /\bdiscord\b/i.test(x.name));
      if (!fx || !dc) notes.push("To compare, open the " + (!fx && !dc ? "Fluxer or Discord app" : !fx ? "Fluxer app" : "Discord app") + " and it shows up here next to BelleCord.");
      if (!s.cpuReady && sortBy === "cpu") notes.push("Energy use can't be read right now, so this is by memory.");
      const bits = [];
      if (s.cpu != null) bits.push("CPU " + Math.round(s.cpu) + "%");
      if (s.mem) bits.push(mb(s.mem.used) + " of " + mb(s.mem.total) + " memory");
      if (bits.length) notes.push("Whole computer: " + bits.join(", ") + ".");
    } else if (u) {
      // (until the rest of the computer is read: BelleCord's own parts)
      const parts = Object.entries(u.parts).filter(([k, p]) => p.mem > 1 || k === "fluxer" || k === "discord").sort((a, b) => b[1].mem - a[1].mem);
      const max = Math.max(1, ...parts.map(([, p]) => p.mem));
      $("pf-parts").innerHTML = parts.map(([k, p]) => row(esc((PART[k] || k).replace(/^./, (c) => c.toUpperCase())) + (sleeping.includes(k) ? " (asleep)" : ""), TIP[k], "", (p.mem / max) * 100, p.mem, p.cpu.toFixed(1) + "%")).join("");
      notes.push(sysTries < 2 ? "Reading the rest of your computer..." : "Couldn't read the rest of your computer this time. It keeps trying.");
    }
    const whyNow = (s && s.list) ? (s.cpuReady ? "" : s.why || "") : sysTries >= 2 ? sysWhy : "";
    $("pf-foot").innerHTML = notes.map(esc).join(" ") + (whyNow && (!(s && s.list) || sortBy === "cpu") ? ' <span title="' + esc(whyNow) + '" style="text-decoration:underline dotted;cursor:help">Details</span>' : "");
  }
  async function usage() {
    if (!visible() || !host.perfUsage) return;
    let u; try { u = await host.perfUsage(); } catch { return; }
    if (!u) return;
    lastUse = u;
    $("pf-cpu").textContent = u.total.cpu.toFixed(1) + "%";
    $("pf-mem").textContent = mb(u.total.mem);
    $("pf-gpu").textContent = "BelleCord" + (u.gpu ? "" : " (graphics card: off)");
    draw();
  }
  async function system() {
    if (!visible() || sysBusy || !host.perfSystem) return;
    sysBusy = true;
    let s = null;
    try { s = await host.perfSystem(); } catch (e) { sysWhy = String((e && e.message) || e); }
    sysTries++;
    if (s && s.list) { lastSys = settle(s); sysWhy = ""; } else if (s && s.why) sysWhy = s.why;
    draw();
    sysBusy = false;
  }
  setInterval(usage, 2500);
  // Battery saver: every 5 minutes, the pictures the app keeps decoded in memory are let go (same as part of Clean up)
  setInterval(() => { const p = current(); if (p && p.id === "saver" && host.freeMemory) host.freeMemory(); }, 5 * 60000);
  setInterval(system, 3000);
  sec.querySelectorAll("[data-pfsort]").forEach((b) => (b.onclick = () => { sortBy = b.dataset.pfsort; sec.querySelectorAll("[data-pfsort]").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  $("pf-all").onclick = (e) => { showAll = !showAll; e.target.textContent = showAll ? "Top 5" : "Show all"; $("pf-parts").classList.toggle("all", showAll); draw(); };

  $("pf-clean").onclick = async () => {
    $("pf-msg").textContent = "Cleaning...";
    try { if (host.freeMemory) host.freeMemory(); const r = await host.perfClean(); $("pf-msg").textContent = r && r.mb ? "Freed " + r.mb + " MB. You're still signed in." : "All clean. You're still signed in."; } catch { $("pf-msg").textContent = "That didn't work this time."; }
  };
  $("pf-reload").onclick = () => {
    const m = body.dataset.mode;
    const sides = m === "fluxer" ? ["discord"] : m === "discord" ? ["fluxer"] : m === "dash" ? ["fluxer", "discord"] : [];
    if (!sides.length) return ($("pf-msg").textContent = "Both sides are on screen. Open just one first.");
    for (const s of sides) { if (st[s].asleep) continue; try { wv(s).reload(); } catch {} }
    $("pf-msg").textContent = "Refreshed " + sides.map((s) => NAME[s]).join(" and ") + ".";
  };

  // ---------------- never stuck: an invisible layer over everything gets out of the way ----------------
  // If something see-through ever ends up covering the window (so nothing but the title bar can be clicked), it's
  // found within a few seconds and clicks go through it. A layer has to stay invisible across two checks first, so
  // something that's just fading in is left alone.
  const seeThrough = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none") return true;
      o *= Number(cs.opacity) || 0;
      if (o < 0.04) return true;
    }
    return false;
  };
  const suspects = new WeakSet();
  const moved = new Set(); // (layers clicks go through: back to normal the moment they can be seen again)
  function unstick() {
    if (document.hidden) return;
    for (const n of [...moved]) if (!n.isConnected || !seeThrough(n)) { n.style.removeProperty("pointer-events"); moved.delete(n); }
    const W = innerWidth, H = innerHeight;
    for (const [x, y] of [[0.5, 0.5], [0.3, 0.4], [0.7, 0.6], [0.5, 0.85], [0.15, 0.5]]) {
      const hit = document.elementFromPoint(W * x, H * y);
      if (!hit || hit === document.body || hit === document.documentElement) continue;
      for (let n = hit, i = 0; n && n !== body && i < 8; n = n.parentElement, i++) {
        const cs = getComputedStyle(n);
        if (cs.pointerEvents === "none") break;
        if (cs.position !== "fixed" && cs.position !== "absolute" && n.tagName !== "WEBVIEW") continue;
        const r = n.getBoundingClientRect();
        if (r.width < W * 0.6 || r.height < H * 0.6) continue;
        if (!seeThrough(n)) break;
        if (!suspects.has(n)) { suspects.add(n); break; }
        suspects.delete(n);
        n.style.setProperty("pointer-events", "none", "important");
        moved.add(n);
        try { console.warn("BelleCord: an invisible layer was covering the window, so clicks now go through it:", n); } catch {}
        break;
      }
    }
  }
  setInterval(unstick, 1500);
  window.addEventListener("focus", unstick);

  // start once the settings are read
  const wait = setInterval(() => { if (!window.bcPref || !window.bcPrefsReady) return; clearInterval(wait); gpuStarted = opt("gpu"); drawOpts(); apply(); }, 200);
})();
