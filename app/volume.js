// Volume: turn people up to 350%, and turn the whole app up or down.
// - Right-click someone in a call (on Fluxer or Discord) and the menu gets a "Volume (BelleCord)" slider up to 350%.
// - Dashboard > App: an "App volume" slider (0 - 350%) for everything BelleCord plays, and a list of the people
//   you can hear right now, each with their own slider.
// How it works: voices in a call come in over the call connection. They're played through a volume knob BelleCord
// adds, so they can go past 100%. Nothing changes until you move a slider. Your microphone is never touched.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const SIDES = ["fluxer", "discord"];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let appVol = 100, people = {}; // people: { "fluxer:123": 250 }

  // ---------------------------------------------------------------- inside the Fluxer / Discord page
  const PAGE = "(" + function () {
    if (window.__bcVol) return 1;
    window.__bcVol = 1;
    var S = { app: 1, people: {} }, changes = [], ctx = null, sinkId = "";
    var routes = [], local = new WeakSet(), remote = new WeakSet(), names = {};
    var C = function () {
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); if (sinkId && ctx.setSinkId) ctx.setSinkId(sinkId).catch(function () {}); }
      if (ctx.state === "suspended") ctx.resume().catch(function () {});
      return ctx;
    };
    // my own microphone and screen are "local": they're never turned up
    var md = navigator.mediaDevices;
    ["getUserMedia", "getDisplayMedia"].forEach(function (fn) {
      if (!md || !md[fn]) return;
      var real = md[fn].bind(md);
      md[fn] = function () { return real.apply(null, arguments).then(function (s) { try { s.getTracks().forEach(function (t) { local.add(t); }); } catch (e) {} return s; }); };
    });
    var AC = window.AudioContext || window.webkitAudioContext;
    var realDest = AC && AC.prototype.createMediaStreamDestination;
    if (realDest) AC.prototype.createMediaStreamDestination = function () { var d = realDest.apply(this, arguments); try { d.stream.getTracks().forEach(function (t) { local.add(t); }); } catch (e) {} return d; };
    // voices from the call
    var RPC = window.RTCPeerConnection;
    if (RPC && !RPC.__bc) {
      var W = function (a, b) { var pc = new RPC(a, b); try { pc.addEventListener("track", function (e) { if (e.track && e.track.kind === "audio") remote.add(e.track); }); } catch (x) {} return pc; };
      W.prototype = RPC.prototype; Object.setPrototypeOf(W, RPC); W.__bc = 1;
      window.RTCPeerConnection = W;
    }
    var isVoice = function (stream) {
      try { var t = stream && stream.getAudioTracks && stream.getAudioTracks()[0]; return !!t && !local.has(t) && (remote.has(t) || t.label === "" || /remote|receiver|^[0-9a-f-]{20,}$/i.test(t.label)); } catch (e) { return false; }
    };
    var boostOf = function (r) { return r.user && S.people[r.user] != null ? S.people[r.user] : 1; };
    var newRoute = function (r) { r.score = {}; r.user = null; r.level = 0; r.buf = null; routes.push(r); return r; };
    // a page that plays a voice through its own sound engine: a volume knob goes right after it
    var realCMSS = AC && AC.prototype.createMediaStreamSource;
    if (realCMSS) AC.prototype.createMediaStreamSource = function (stream) {
      var src = realCMSS.apply(this, arguments);
      try {
        if (this !== ctx && isVoice(stream)) {
          var g = this.createGain(), an = this.createAnalyser(), rc = AudioNode.prototype.connect;
          an.fftSize = 512;
          rc.call(src, g); rc.call(src, an);
          src.connect = function () { return rc.apply(g, arguments); };
          var rd = AudioNode.prototype.disconnect;
          src.disconnect = function () { try { return rd.apply(g, arguments); } catch (e) {} };
          newRoute({ kind: "node", stream: stream, gain: g, an: an });
          apply();
        }
      } catch (e) {}
      return src;
    };
    // a page that plays a voice in an <audio> element
    var M = HTMLMediaElement.prototype;
    var dSrc = Object.getOwnPropertyDescriptor(M, "srcObject"), dVol = Object.getOwnPropertyDescriptor(M, "volume"), dMut = Object.getOwnPropertyDescriptor(M, "muted");
    var siteVol = new WeakMap(), siteMut = new WeakMap(), elRoute = new WeakMap();
    var setVol = function (el, v) { try { dVol.set.call(el, Math.max(0, Math.min(1, v))); } catch (e) {} };
    var setMut = function (el, v) { try { dMut.set.call(el, !!v); } catch (e) {} };
    var onStream = function (el, stream) {
      if (!stream || !isVoice(stream)) return;
      var r = elRoute.get(el);
      if (r && r.stream === stream) return;
      if (r) { try { r.src && r.src.disconnect(); r.out && r.out.disconnect(); } catch (e) {} var at = routes.indexOf(r); if (at >= 0) routes.splice(at, 1); }
      r = newRoute({ kind: "el", el: el, stream: stream });
      try { var c = C(); r.an = c.createAnalyser(); r.an.fftSize = 512; r.src = realCMSS.call(c, stream); AudioNode.prototype.connect.call(r.src, r.an); } catch (e) {}
      elRoute.set(el, r);
      apply();
    };
    if (dSrc && dSrc.set) Object.defineProperty(M, "srcObject", { configurable: true, enumerable: dSrc.enumerable, get: function () { return dSrc.get.call(this); }, set: function (v) { dSrc.set.call(this, v); try { onStream(this, v); } catch (e) {} } });
    if (dVol && dVol.set) Object.defineProperty(M, "volume", { configurable: true, enumerable: dVol.enumerable, get: function () { var v = siteVol.get(this); return v == null ? dVol.get.call(this) : v; }, set: function (v) { siteVol.set(this, Number(v)); applyEl(this); } });
    if (dMut && dMut.set) Object.defineProperty(M, "muted", { configurable: true, enumerable: dMut.enumerable, get: function () { var v = siteMut.get(this); return v == null ? dMut.get.call(this) : v; }, set: function (v) { siteMut.set(this, !!v); applyEl(this); } });
    var realSink = M.setSinkId;
    if (realSink) M.setSinkId = function (id) { sinkId = id || ""; if (ctx && ctx.setSinkId) ctx.setSinkId(sinkId).catch(function () {}); return realSink.apply(this, arguments); };
    // the volume each thing should play at
    function applyEl(el) {
      // (what the page set, kept before BelleCord changes the real one, so the page always reads back its own)
      if (!siteVol.has(el)) siteVol.set(el, dVol.get.call(el));
      if (!siteMut.has(el)) siteMut.set(el, dMut.get.call(el));
      var sv = siteVol.has(el) ? siteVol.get(el) : 1, sm = siteMut.has(el) ? siteMut.get(el) : dMut.get.call(el);
      var r = elRoute.get(el);
      var want = sv * S.app * (r ? boostOf(r) : 1);
      if (r && (want > 1 || r.out) && r.src && ctx && (ctx.state === "running" || r.out)) {
        // past 100%: the voice goes through BelleCord's own knob (the element keeps playing, silently)
        // (only once the knob can really play: until then it stays at the page's own 100%, never silent)
        if (!r.out) { try { var c = C(); r.out = c.createGain(); AudioNode.prototype.connect.call(r.src, r.out); AudioNode.prototype.connect.call(r.out, c.destination); } catch (e) { r.out = null; } }
        if (r.out) { r.out.gain.value = sm ? 0 : want; setVol(el, 0); setMut(el, false); return; }
      }
      setVol(el, want); setMut(el, sm);
    }
    function apply() {
      for (var i = 0; i < routes.length; i++) { var r = routes[i]; if (r.kind === "node") { try { r.gain.gain.value = S.app * boostOf(r); } catch (e) {} } }
      var els = document.querySelectorAll("audio, video");
      for (var j = 0; j < els.length; j++) applyEl(els[j]);
      for (var k = 0; k < routes.length; k++) if (routes[k].el && !routes[k].el.isConnected) applyEl(routes[k].el);
    }
    // (the knob can only play after a click or key press on the page)
    ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, function () { if (ctx && ctx.state === "suspended") ctx.resume().then(apply).catch(function () {}); }, true); });
    document.addEventListener("play", function (e) { if (e.target && e.target.tagName) applyEl(e.target); }, true);
    // who's who: a voice that's loud while one person's speaking ring is lit is that person
    var idIn = function (el) {
      if (!el) return null;
      var u = el.closest && el.closest("[data-user-id]");
      if (u) return u.getAttribute("data-user-id");
      for (var n = el, i = 0; n && i < 5; n = n.parentElement, i++) {
        var im = n.tagName === "IMG" ? n : n.querySelector && n.querySelector('img[src*="/avatars/"]');
        var m = im && /\/avatars\/(\d{15,21})\//.exec(im.src || "");
        if (m) { if (!names[m[1]]) names[m[1]] = { name: (im.alt || (n.getAttribute && n.getAttribute("aria-label")) || "").replace(/,.*$/, "").trim().slice(0, 40), avatar: im.src }; return m[1]; }
      }
      return null;
    };
    var speakers = function () {
      var out = {}, els = document.querySelectorAll('[class*="peaking"], [data-speaking="true"], [data-speaking=""]');
      for (var i = 0; i < els.length && i < 60; i++) {
        var cls = String(els[i].className && els[i].className.baseVal != null ? els[i].className.baseVal : els[i].className || "");
        if (/not.?speaking|speaking.?(indicator|ring)?.?(off|false)/i.test(cls) && !els[i].hasAttribute("data-speaking")) continue;
        var id = idIn(els[i]); if (id) out[id] = 1;
      }
      return Object.keys(out);
    };
    var level = function (r) {
      if (!r.an) return 0;
      try { if (!r.buf) r.buf = new Float32Array(r.an.fftSize); r.an.getFloatTimeDomainData(r.buf); var s = 0; for (var i = 0; i < r.buf.length; i++) s += r.buf[i] * r.buf[i]; return Math.sqrt(s / r.buf.length); } catch (e) { return 0; }
    };
    setInterval(function () {
      for (var i = routes.length - 1; i >= 0; i--) { var r = routes[i]; var t = r.stream && r.stream.getAudioTracks()[0]; if (!t || t.readyState === "ended") { routes.splice(i, 1); try { r.out && r.out.disconnect(); } catch (e) {} } }
      if (!routes.length) return;
      var who = speakers();
      for (var j = 0; j < routes.length; j++) {
        var r2 = routes[j], lv = level(r2), loud = lv > 0.012;
        r2.level = r2.level * 0.7 + lv * 0.3;
        for (var k in r2.score) r2.score[k] *= 0.995;
        if (!loud || !who.length) continue;
        for (var w = 0; w < who.length; w++) r2.score[who[w]] = (r2.score[who[w]] || 0) + (who.length === 1 ? 2 : 1 / who.length);
        var best = null, b1 = 0, b2 = 0;
        for (var id in r2.score) { var v = r2.score[id]; if (v > b1) { b2 = b1; b1 = v; best = id; } else if (v > b2) b2 = v; }
        if (best && b1 >= 4 && b1 >= b2 * 2 && r2.user !== best) { r2.user = best; idIn(document.querySelector('img[src*="/avatars/' + best + '/"]')); apply(); }
      }
    }, 150);
    // right-click someone: the menu gets a volume slider up to 350%
    var last = null;
    document.addEventListener("contextmenu", function (e) { var id = idIn(e.target); last = id ? { id: id, at: Date.now() } : null; }, true);
    new MutationObserver(function (list) {
      if (!last || Date.now() - last.at > 1500) return;
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) {
        var n = list[i].addedNodes[j];
        if (n.nodeType !== 1) continue;
        var menu = n.matches && n.matches('[role="menu"]') ? n : n.querySelector && n.querySelector('[role="menu"]');
        if (menu && !menu.querySelector(".bc-vol")) { addRow(menu, last.id); last = null; return; }
      }
    }).observe(document.body, { childList: true, subtree: true });
    function addRow(menu, id) {
      var pct = Math.round((S.people[id] != null ? S.people[id] : 1) * 100);
      var row = document.createElement("div");
      row.className = "bc-vol"; row.setAttribute("role", "presentation");
      row.style.cssText = "padding:6px 8px 8px;margin:2px 0 4px;border-bottom:1px solid rgba(255,255,255,.08);font:500 14px/18px inherit;color:#b5bac1;cursor:default";
      row.innerHTML = '<div style="display:flex;justify-content:space-between"><span>Volume (BelleCord)</span><b class="bc-vol-n" style="color:#dbdee1">' + pct + '%</b></div><input type="range" min="0" max="350" step="5" value="' + pct + '" style="width:100%;margin:6px 0 0;accent-color:#5865f2">';
      var r = row.querySelector("input"), n = row.querySelector(".bc-vol-n");
      ["mousedown", "pointerdown", "click", "keydown"].forEach(function (ev) { row.addEventListener(ev, function (e) { e.stopPropagation(); }, false); });
      r.oninput = function () { var v = Number(r.value); n.textContent = v + "%"; S.people[id] = v / 100; changes.push({ id: id, pct: v }); apply(); };
      menu.insertBefore(row, menu.firstChild);
    }
    window.__bcVolSet = function (app, ppl) { S.app = Math.max(0, Number(app) || 0); S.people = {}; for (var k in ppl || {}) S.people[k] = Number(ppl[k]) / 100; apply(); return 1; };
    window.__bcVolTake = function () {
      var seen = {}, list = [];
      for (var i = 0; i < routes.length; i++) { var u = routes[i].user; if (u && !seen[u]) { seen[u] = 1; list.push({ id: u, name: (names[u] && names[u].name) || "", avatar: (names[u] && names[u].avatar) || "", talking: routes[i].level > 0.012 }); } }
      var unknown = routes.filter(function (r) { return !r.user; }).length;
      return { changes: changes.splice(0), people: list, unknown: unknown };
    };
    return 1;
  }.toString() + ")()";

  // ---------------------------------------------------------------- the app's side
  const wv = (s) => $("wv-" + s);
  const push = (s) => { const v = wv(s); if (!v) return; const mine = {}; for (const k in people) if (k.startsWith(s + ":")) mine[k.slice(s.length + 1)] = people[k]; try { v.executeJavaScript("window.__bcVolSet && window.__bcVolSet(" + JSON.stringify(appVol / 100) + "," + JSON.stringify(mine) + ")").catch(() => {}); } catch (e) {} };
  const pushAll = () => SIDES.forEach(push);
  for (const s of SIDES) {
    const v = wv(s);
    if (!v) continue;
    v.addEventListener("dom-ready", () => { v.executeJavaScript(PAGE).then(() => push(s)).catch(() => {}); });
  }
  let saveT = null;
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { host.setPrefs && host.setPrefs({ appVol, peopleVol: people }); } catch (e) {} }, 600); };
  Promise.resolve(host.getPrefs ? host.getPrefs() : {}).then((p) => {
    appVol = p && typeof p.appVol === "number" ? p.appVol : 100;
    people = (p && p.peopleVol && typeof p.peopleVol === "object") ? p.peopleVol : {};
    pushAll(); drawApp();
  }).catch(() => {});

  // what the pages heard: changes made from a right-click menu, and who's talking right now
  let heard = { fluxer: { people: [], unknown: 0 }, discord: { people: [], unknown: 0 } };
  setInterval(async () => {
    for (const s of SIDES) {
      const v = wv(s);
      if (!v || !v.executeJavaScript) continue;
      let r = null;
      try { r = await v.executeJavaScript("window.__bcVolTake ? window.__bcVolTake() : null"); } catch (e) {}
      if (!r) continue;
      for (const c of r.changes || []) { if (c.pct === 100) delete people[s + ":" + c.id]; else people[s + ":" + c.id] = c.pct; saveSoon(); }
      heard[s] = { people: r.people || [], unknown: r.unknown || 0 };
    }
    drawPeople();
  }, 1500);

  // ---------------------------------------------------------------- dashboard > App
  const css = document.createElement("style");
  css.textContent = [
    ".bcvol{display:flex;align-items:center;gap:8px}.bcvol input{width:160px}.bcvol b{min-width:44px;color:var(--text,#dbdee1)}",
    "#volcard h3{margin:0 0 4px}#volcard .vp{display:flex;align-items:center;gap:10px;padding:6px 0}#volcard .vp img,#volcard .vp i{width:28px;height:28px;border-radius:50%;flex:none;background:#5865f2;object-fit:cover}",
    "#volcard .vp i{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;color:#fff;font-size:12px}#volcard .vp .nm{flex:0 0 150px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#volcard .vp .nm small{display:block;color:var(--dim,#949ba4);font-size:11px}",
    "#volcard .vp input{flex:1}#volcard .vp b{min-width:44px;text-align:right}#volcard .vp.talk img,#volcard .vp.talk i{box-shadow:0 0 0 2px #23a55a}",
  ].join("\n");
  document.head.appendChild(css);
  function drawApp() {
    const card = document.querySelector(".appcard");
    if (!card) return;
    let l = $("opt-vol");
    if (!l) {
      const lab = document.createElement("label");
      lab.className = "keep bcvol"; lab.title = "Everything BelleCord plays: calls, videos, sounds. Calls can go past 100%.";
      lab.innerHTML = 'App volume <input type="range" id="opt-vol" min="0" max="350" step="5"> <b id="opt-vol-n"></b>';
      card.insertBefore(lab, card.querySelector("#app-ver") || null);
      l = $("opt-vol");
      l.oninput = () => { appVol = Number(l.value); $("opt-vol-n").textContent = appVol + "%"; pushAll(); saveSoon(); };
      l.ondblclick = () => { l.value = 100; l.oninput(); };
      const vc = document.createElement("div");
      vc.className = "card"; vc.id = "volcard";
      vc.innerHTML = '<h3>People volume</h3><p class="dim small">Right-click anyone in a call on Fluxer or Discord to turn them up to 350%. The people you can hear right now show here too.</p><div id="vol-people"></div>';
      card.after(vc);
    }
    l.value = appVol; $("opt-vol-n").textContent = appVol + "%";
    drawPeople();
  }
  let lastSig = "";
  function drawPeople() {
    const box = $("vol-people");
    if (!box) return;
    const rows = [];
    for (const s of SIDES) for (const p of heard[s].people) rows.push({ s, ...p });
    const unknown = heard.fluxer.unknown + heard.discord.unknown;
    const sig = JSON.stringify([rows.map((r) => [r.s, r.id, r.name, r.talking, people[r.s + ":" + r.id]]), unknown]);
    if (sig === lastSig || (document.activeElement && document.activeElement.closest && document.activeElement.closest("#vol-people"))) return;
    lastSig = sig;
    box.innerHTML = rows.map((r) => {
      const k = r.s + ":" + r.id, v = people[k] ?? 100;
      return '<div class="vp' + (r.talking ? " talk" : "") + '">' + (r.avatar ? '<img alt="" src="' + esc(r.avatar) + '">' : "<i>" + esc((r.name || "?")[0].toUpperCase()) + "</i>") +
        '<div class="nm">' + esc(r.name || "Someone") + "<small>" + (r.s === "fluxer" ? "Fluxer" : "Discord") + '</small></div><input type="range" min="0" max="350" step="5" value="' + v + '" data-k="' + esc(k) + '"><b>' + v + "%</b></div>";
    }).join("") + (unknown ? '<p class="dim small">' + unknown + " more voice" + (unknown === 1 ? "" : "s") + " in your call. Each one shows here once they talk.</p>" : "") +
      (!rows.length && !unknown ? '<p class="dim small">Nobody to show yet. Join a call and they show up here once they talk.</p>' : "");
    box.querySelectorAll("input[data-k]").forEach((i) => {
      i.oninput = () => { const v = Number(i.value); i.nextElementSibling.textContent = v + "%"; if (v === 100) delete people[i.dataset.k]; else people[i.dataset.k] = v; push(i.dataset.k.split(":")[0]); saveSoon(); };
      i.ondblclick = () => { i.value = 100; i.oninput(); };
    });
  }
  setTimeout(drawApp, 1500);
})();
