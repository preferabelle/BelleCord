// The app's own page: sides, the server lists' top buttons, the dashboard (inbox, jump in, who's around, today,
// countdowns, skin studio, theme studio, quick links), and putting the theme on both sites.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || { hub: async () => ({ ok: false, error: "offline" }), getPrefs: async () => ({}), setPrefs: async (c) => c, getImg: async () => null, setImg: async () => true, notify: async () => {}, openExternal: async () => {}, setTitleBar: async () => {}, onSwitch: () => {}, onNotice: () => {} };
  const T = window.bcThemes, R = window.bcRail;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SIDES = ["fluxer", "discord"];
  const sideName = (s) => (s === "fluxer" ? "Fluxer" : "Discord");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------------- settings ----------------
  let prefs = {};
  const DEF = {
    mode: "fluxer", side: "fluxer", rail: "cols", split: 50, theme: { ...T.DEFAULT_STACK }, keepColors: false, myThemes: [],
    skins: [{ id: "me", name: "Me", color: "" }], wearF: "me", wearD: "me", wStr: 30, wBlur: 2,
    countdowns: [], links: [], inbox: [], today: null, todaySeen: [], voiceSeen: {}, pinNoteSeen: false,
    me: {}, myName: "", myBadges: {}, hubKey: "", badgesDirty: false, badgeCache: {},
  };
  const P = (k) => (prefs[k] === undefined ? DEF[k] : prefs[k]);
  async function save(changes) { Object.assign(prefs, changes); try { prefs = Object.assign(await host.setPrefs(changes), prefs); } catch {} }
  const later = {}; // busy things (inbox, today, voice) are saved at most every few seconds
  function saveSoon(key) { clearTimeout(later[key]); later[key] = setTimeout(() => save({ [key]: prefs[key] }), 4000); }
  function toast(t, ms) { const e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), ms || 3200); }

  // pictures (skin pictures, wallpapers, banners) live in their own files
  const imgs = new Map();
  async function img(key) { if (imgs.has(key)) return imgs.get(key); let d = null; try { d = await host.getImg(key); } catch {} imgs.set(key, d || null); return d || null; }
  async function setImg(key, data) { imgs.set(key, data || null); try { await host.setImg(key, data || null); } catch {} }
  function pickImage(maxW, maxH, quality) {
    return new Promise((resolve) => {
      const f = $("filepick");
      f.onchange = async () => {
        const file = f.files && f.files[0]; f.value = "";
        if (!file) return resolve(null);
        try {
          const im = await createImageBitmap(file);
          const k = Math.min(1, maxW / im.width, maxH / im.height);
          const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL(maxW <= 512 ? "image/png" : "image/jpeg", quality || 0.85));
        } catch { toast("That picture couldn't be opened. Try a JPG or PNG."); resolve(null); }
      };
      f.click();
    });
  }

  // ---------------- sides ----------------
  const MODES = ["fluxer", "discord", "both", "dash"];
  let dmMode = false;
  const curSide = () => document.body.dataset.side || "fluxer";
  function setMode(m, quiet) {
    if (!MODES.includes(m)) m = "fluxer";
    document.body.dataset.mode = m;
    if (m === "fluxer" || m === "discord") {
      document.body.dataset.side = m;
      if (dmMode) R.act(m, "dm").then(() => setTimeout(() => R.read(m), 300)); // on the DM page: switching sides opens that side's DMs
      const wv = $("wv-" + m); setTimeout(() => { try { wv.focus(); } catch {} }, 0);
    }
    if (!quiet) save({ mode: m, side: curSide() });
    paintShell(); paintRailTop();
    if (m === "dash") paintDash(true);
  }
  window.bcSetMode = setMode;
  // a click on a server (or the DM button) in the double list
  window.bcOnServer = (side, kind) => {
    if (kind === "f") return; // (a folder just opens or closes in the list)
    dmMode = kind === "dm";
    if (document.body.dataset.mode !== "both") { const was = dmMode; dmMode = false; setMode(side); dmMode = was; }
  };
  // on the dashboard, the Fluxer / Discord tabs pick the side but you stay on the dashboard
  function pickSide(s) { document.body.dataset.side = s; save({ side: s }); paintShell(); paintRailTop(); paintDash(true); }
  const tab = (s) => (document.body.dataset.mode === "dash" ? pickSide(s) : setMode(s));
  document.querySelectorAll("#tabs [data-mode]").forEach((b) => (b.onclick = () => tab(b.dataset.mode)));
  $("bothbtn").onclick = () => setMode(document.body.dataset.mode === "both" ? curSide() : "both");
  $("r-dash").onclick = () => { dmMode = false; setMode(document.body.dataset.mode === "dash" ? curSide() : "dash"); };
  $("r-dm").onclick = async () => {
    const m = document.body.dataset.mode;
    if (m === "both") { dmMode = true; for (const s of SIDES) R.press(s, "dm", "@me"); return; }
    await R.press(curSide(), "dm", "@me");
    dmMode = true;
  };
  const MAC = (window.bcApp && window.bcApp.platform) === "darwin";
  document.body.classList.add(MAC ? "mac" : (window.bcApp && window.bcApp.platform) === "linux" ? "linux" : "win");
  if (MAC) document.querySelectorAll("[title*='Ctrl+']").forEach((el) => (el.title = el.title.replace(/Ctrl\+/g, "⌘")));
  addEventListener("keydown", (e) => { if ((MAC ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); keyMode(Number(e.key)); } if (e.key === "Escape") { $("addmenu").hidden = true; $("gcard").hidden = true; } });
  function keyMode(n) { setMode(MODES[n - 1]); } // (Ctrl+1 to Ctrl+4 go straight there)
  host.onSwitch((n) => keyMode(n));
  document.querySelectorAll(".layoutsw [data-rail]").forEach((b) => (b.onclick = () => { document.body.dataset.rail = b.dataset.rail; save({ rail: b.dataset.rail }); }));
  $("r-add").onclick = (e) => { e.stopPropagation(); $("addmenu").hidden = !$("addmenu").hidden; };
  document.querySelectorAll("#addmenu [data-add]").forEach((b) => (b.onclick = async () => { $("addmenu").hidden = true; const s = b.dataset.add; setMode(s); await new Promise((r) => setTimeout(r, 150)); const ok = await R.act(s, "add"); if (!ok) toast("Couldn't find " + sideName(s) + "'s add button yet. Is " + sideName(s) + " signed in?"); }));
  addEventListener("click", (e) => { if (!e.target.closest("#addmenu,#r-add")) $("addmenu").hidden = true; });

  // side by side: drag the line between them
  const div = $("divider");
  div.addEventListener("pointerdown", (e) => {
    e.preventDefault(); div.setPointerCapture(e.pointerId); div.classList.add("on"); document.body.classList.add("dragging");
    const box = $("panes").getBoundingClientRect();
    const move = (ev) => { const pct = Math.max(25, Math.min(75, ((ev.clientX - box.left) / box.width) * 100)); document.documentElement.style.setProperty("--split", pct.toFixed(1) + "%"); div.dataset.pct = pct.toFixed(1); };
    const up = () => { div.removeEventListener("pointermove", move); div.classList.remove("on"); document.body.classList.remove("dragging"); if (div.dataset.pct) save({ split: Number(div.dataset.pct) }); };
    div.addEventListener("pointermove", move); div.addEventListener("pointerup", up, { once: true }); div.addEventListener("pointercancel", up, { once: true });
  });

  // ---------------- each site: unread number, connection dot, a screen when it can't load ----------------
  const ready = { fluxer: false, discord: false };
  for (const name of SIDES) {
    const wv = $("wv-" + name), pane = $(name), fail = pane.querySelector(".fail"), badge = $("b-" + name), net = $("n-" + name);
    wv.addEventListener("page-title-updated", (e) => { const m = String(e.title || "").match(/^\((\d+\+?)\)/); badge.classList.toggle("on", !!m); badge.textContent = m ? m[1] : ""; });
    wv.addEventListener("did-fail-load", (e) => {
      if (!e.isMainFrame || e.errorCode === -3) return;
      const offline = /INTERNET|NAME_NOT_RESOLVED|NETWORK/i.test(e.errorDescription);
      fail.querySelector(".why").textContent = offline ? "Your internet looks off. When it's back, try again." : sideName(name) + " didn't answer (" + e.errorDescription + "). It may be having trouble; try again in a bit.";
      fail.hidden = false; net.className = "net down"; net.title = offline ? "Your internet is off" : sideName(name) + " isn't answering";
    });
    wv.addEventListener("did-finish-load", () => { fail.hidden = true; net.className = "net"; net.title = "Connected"; });
    // a fresh page: the look goes on again (after anything still on its way, which is taken off first)
    const fresh = async () => { for (const k of [themeKeys[name], fontKeys[name]]) if (k) { try { await wv.removeInsertedCSS(k); } catch {} } themeKeys[name] = null; fontKeys[name] = null; lastCss[name] = ""; lastFont[name] = ""; };
    wv.addEventListener("dom-ready", () => { ready[name] = true; chains[name] = chains[name].then(fresh, fresh); if (name === "fluxer") readFluxerColors(); applySide(name); });
    fail.querySelector(".retry").onclick = () => { fail.hidden = true; try { wv.reload(); } catch {} };
  }
  addEventListener("offline", () => { for (const n of SIDES) { $("n-" + n).className = "net down"; $("n-" + n).title = "Your internet is off"; } });
  addEventListener("online", () => { for (const n of SIDES) { $("n-" + n).className = "net"; $("n-" + n).title = "Connected"; } });

  // ---------------- skins (each side wears one) ----------------
  const skins = () => (P("skins") && P("skins").length ? P("skins") : DEF.skins);
  const skinOf = (side) => skins().find((s) => s.id === P(side === "fluxer" ? "wearF" : "wearD")) || skins()[0];
  const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : null);

  // ---------------- the theme, on both sites and on this app ----------------
  let fxColors = null;
  const themeKeys = { fluxer: null, discord: null }, fontKeys = { fluxer: null, discord: null }, lastCss = { fluxer: "", discord: "" }, lastFont = { fluxer: "", discord: "" };
  const chains = { fluxer: Promise.resolve(), discord: Promise.resolve() };
  async function ctxFor(side) {
    const sk = skinOf(side);
    return { fluxer: fxColors, accent: okColor(sk.color), wall: sk.wall ? await img("skin-" + sk.id + "-wall") : null, strength: P("wStr"), blur: P("wBlur") };
  }
  async function readFluxerColors() {
    const v = $("wv-fluxer");
    if (!ready.fluxer || !v.executeJavaScript) return;
    let c = null;
    try { c = await v.executeJavaScript(T.READ_FLUXER_COLORS); } catch { return; }
    if (!c || !c.chat) return;
    if (JSON.stringify(c) === JSON.stringify(fxColors)) return;
    fxColors = c; save({ fxColors: c }); // (kept, so Discord has your Fluxer look right away next time, even if Fluxer is down)
    applySide("discord"); paintShell(); paintStudio();
  }
  setInterval(readFluxerColors, 20000);
  function applySide(side) { chains[side] = chains[side].then(() => doApply(side), () => doApply(side)); return chains[side]; }
  async function doApply(side) {
    const v = $("wv-" + side);
    if (!ready[side] || !v.insertCSS) return;
    const stack = P("theme"), x = await ctxFor(side);
    const css = side === "fluxer" ? T.fluxerCss(stack, x) : T.discordCss(stack, x);
    if (side === "fluxer") { try { await v.executeJavaScript("document.documentElement.setAttribute('data-bc-theme','');1"); } catch {} }
    if (css !== lastCss[side]) {
      let k = null; try { k = await v.insertCSS(css); } catch {} // the new look goes on before the old comes off: no flash
      if (themeKeys[side]) { try { await v.removeInsertedCSS(themeKeys[side]); } catch {} }
      themeKeys[side] = k; lastCss[side] = css;
    }
    const f = await fontCss(stack.font);
    if ((f || "") !== lastFont[side]) {
      let k = null; if (f) { try { k = await v.insertCSS(f); } catch {} }
      if (fontKeys[side]) { try { await v.removeInsertedCSS(fontKeys[side]); } catch {} }
      fontKeys[side] = k; lastFont[side] = f || "";
    }
  }
  function applyAll() { for (const s of SIDES) applySide(s); paintShell(); }
  // fonts: fetched once from Google Fonts and handed to the sites inside the style (their rules allow that)
  const fontMem = {};
  async function fontCss(key) {
    const F = T.FONTS[key];
    if (!F || !F.g) return null;
    if (fontMem[key] !== undefined) return fontMem[key];
    try { const c = localStorage.getItem("bcfont:" + key); if (c) return (fontMem[key] = c); } catch {}
    try {
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=" + encodeURIComponent(F.g).replace(/%20/g, "+") + ":wght@400;700&display=swap", { signal: AbortSignal.timeout(10000) })).text();
      const files = new Map(); let out = "";
      for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
        if (m[1] !== "latin" && m[1] !== "latin-ext") continue;
        const url = (m[2].match(/url\((https:[^)]+)\)/) || [])[1]; if (!url) continue;
        if (!files.has(url)) { const buf = new Uint8Array(await (await fetch(url, { signal: AbortSignal.timeout(10000) })).arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); files.set(url, "data:font/woff2;base64," + btoa(bin)); }
        out += "@font-face{" + m[2].replace(/url\([^)]+\)/, "url(" + files.get(url) + ")") + "}\n";
      }
      fontMem[key] = out || null;
      try { if (out) localStorage.setItem("bcfont:" + key, out); } catch {}
    } catch { return null; } // (offline: the site keeps its own font; tried again next time)
    return fontMem[key];
  }
  // this app follows the theme too (and the skin color of the side you're on)
  async function paintShell() {
    const side = curSide(), stack = P("theme");
    const v = T.shellVars(stack, { fluxer: fxColors, accent: okColor(skinOf(side).color) });
    const r = document.documentElement.style;
    for (const [k, val] of Object.entries(v)) if (k !== "--font" && k !== "--light") r.setProperty(k, val);
    if (v["--font"]) r.setProperty("--font", v["--font"]); else r.removeProperty("--font");
    const tF = T.tokens(stack, { fluxer: fxColors, accent: okColor(skinOf("fluxer").color) }), tD = T.tokens(stack, { fluxer: fxColors, accent: okColor(skinOf("discord").color) });
    r.setProperty("--fx", tF.accent); r.setProperty("--dc", tD.accent);
    document.documentElement.style.colorScheme = v["--light"] === "1" ? "light" : "dark";
    const tb = [hexOf(v["--bg"]), hexOf(v["--dim"])];
    if (tb[0] && tb[1] && tb.join() !== paintShell.tb && host.setTitleBar) { paintShell.tb = tb.join(); host.setTitleBar(tb[0], tb[1]).catch(() => {}); }
    const f = await fontCss(stack.font);
    if ($("shellfont").textContent !== (f || "")) $("shellfont").textContent = f || "";
    paintRailTop();
  }

  // any CSS color as #rrggbb (the window's own buttons want that)
  const hexCtx = document.createElement("canvas").getContext("2d");
  function hexOf(c) { try { hexCtx.fillStyle = "#000000"; hexCtx.fillStyle = String(c || ""); const v = hexCtx.fillStyle; return /^#[0-9a-f]{6}$/i.test(v) ? v : null; } catch { return null; } }

  // ---------------- the top of the server list: your dashboard picture, one DM button ----------------
  async function paintRailTop() {
    const sk = skinOf(curSide());
    const pic = sk.pic ? await img("skin-" + sk.id + "-pic") : null;
    const html = pic ? '<img src="' + pic + '" alt="">' : '<span class="mono">' + esc((sk.name || "B").slice(0, 1).toUpperCase()) + "</span>";
    const box = $("dashpic"); if (box.dataset.k !== sk.id + ":" + !!pic + ":" + (pic ? pic.length : sk.name)) { box.dataset.k = sk.id + ":" + !!pic + ":" + (pic ? pic.length : sk.name); box.innerHTML = html; }
    const st = R.state, dms = st.fluxer.dms + st.discord.dms, ping = $("r-dm").querySelector(".ping");
    ping.textContent = dms ? String(dms > 99 ? "99+" : dms) : ""; ping.classList.toggle("on", !!dms);
    $("r-dm").title = "Direct messages" + (dms ? " (" + st.fluxer.dms + " on Fluxer, " + st.discord.dms + " on Discord)" : "");
    const m = document.body.dataset.mode, inDms = (m === "fluxer" || m === "discord") && /^\/channels\/@me/.test(st[m].path || "");
    $("r-dm").classList.toggle("sel", inDms);
    const hp = $("heropic"); const hk = "h" + box.dataset.k; if (hp.dataset.k !== hk) { hp.dataset.k = hk; hp.innerHTML = html; }
    const banner = sk.banner ? await img("skin-" + sk.id + "-banner") : null;
    $("hero").style.backgroundImage = banner ? 'url("' + banner + '")' : "";
  }
  $("r-dash").oncontextmenu = (e) => { e.preventDefault(); $("heropic").click(); };
  $("heropic").onclick = async () => { const sk = skinOf(curSide()); const d = await pickImage(512, 512); if (!d) return; await setImg("skin-" + sk.id + "-pic", d); updateSkin(sk.id, { pic: true }); toast("Picture changed"); };

  // ---------------- what the sites tell us: inbox, voice, people, today ----------------
  const people = new Map(); // side:id -> {name, status, avatar, side, at}
  const seenMsg = new Set(P("todaySeen") || []);
  const snowTime = (id) => { try { return Number((BigInt(id) >> 22n) + 1420070400000n); } catch { return 0; } };
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  addEventListener("bc-read", (e) => {
    const side = e.detail.side, st = R.state[side], now = Date.now();
    let inboxChanged = false, todayChanged = false, voiceChanged = false;
    const inbox = P("inbox").slice();
    const has = (k) => inbox.some((x) => x.key === k);
    for (const n of e.detail.notes || []) { // a notification from that site
      const key = side + ":n:" + (n.url || n.title + n.body + n.at);
      if (has(key)) continue;
      inbox.unshift({ key, side, kind: "note", nkey: n.key, title: n.title, body: n.body, icon: n.icon || "", url: n.url || "", path: n.path || "", at: n.at || now });
      inboxChanged = true;
    }
    for (const m of st.msgs || []) {
      const t = snowTime(m.id);
      if (m.mention && !m.self && now - t < 864e5) { // a message that mentions you or replies to you
        const key = side + ":m:" + m.id;
        if (!has(key)) { inbox.unshift({ key, side, kind: "mention", title: m.author, body: m.text, icon: m.avatar || "", path: "/channels/" + m.g + "/" + m.ch + "/" + m.id, at: t, where: st.channel ? "#" + st.channel : "" }); inboxChanged = true; }
      }
      const sk = side + ":" + m.id; // today's numbers
      if (seenMsg.has(sk) || dayKey(t) !== dayKey(now)) continue;
      seenMsg.add(sk); todayChanged = true;
      let td = P("today"); if (!td || td.date !== dayKey(now)) { td = { date: dayKey(now), ch: {}, ppl: {} }; seenMsg.clear(); seenMsg.add(sk); }
      const other = m.g === "@me" ? ((st.msgs || []).find((x) => x.ch === m.ch && !x.self && x.author) || {}).author : null; // (a DM is named after the other person)
      const ck = side + ":" + m.g + ":" + m.ch, chName = other ? "DM with " + other : st.channel ? (side === "discord" && /^@/.test(st.channel) ? st.channel : "#" + st.channel) : m.g === "@me" ? "a DM" : "a channel";
      td.ch[ck] = { n: ((td.ch[ck] && td.ch[ck].n) || 0) + 1, name: (td.ch[ck] && !/^a (channel|DM)$/.test(td.ch[ck].name) && td.ch[ck].name) || chName, guild: (td.ch[ck] && td.ch[ck].guild) || (m.g === "@me" ? "" : (st.guild && st.guild.name) || ""), side };
      const pk = side + ":" + (m.aid || m.author);
      if (m.author) td.ppl[pk] = { n: ((td.ppl[pk] && td.ppl[pk].n) || 0) + 1, name: m.author, avatar: m.avatar || (td.ppl[pk] && td.ppl[pk].avatar) || "", side };
      prefs.today = td;
    }
    for (const p of st.people || []) people.set(side + ":" + p.id, { ...p, side, at: now });
    if (st.me && st.me.id && (P("me")[side] || {}).id !== st.me.id) { // who you are on that side (for your badges and the intro)
      const me = { ...P("me"), [side]: st.me }; const ch = { me }; if (st.me.name && (side === "fluxer" || !P("myName"))) ch.myName = st.me.name; save(ch);
      if (P("badgesDirty")) sendBadges(true);
    }
    const vs = { ...P("voiceSeen") };
    for (const v of st.voice || []) { const k = side + ":" + v.guild + ":" + (v.cid || v.name); vs[k] = { ...v, side, at: now }; voiceChanged = true; }
    if (inboxChanged) { prefs.inbox = inbox.slice(0, 80); saveSoon("inbox"); }
    if (todayChanged) { prefs.todaySeen = [...seenMsg].slice(-4000); saveSoon("today"); saveSoon("todaySeen"); }
    if (voiceChanged) { const keys = Object.keys(vs).sort((a, b) => vs[b].at - vs[a].at); for (const k of keys.slice(60)) delete vs[k]; prefs.voiceSeen = vs; saveSoon("voiceSeen"); }
    paintRailTop();
    if (document.body.dataset.mode === "dash") paintDash();
  });

  // ---------------- dashboard ----------------
  const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : s < 86400 ? Math.round(s / 3600) + " h ago" : Math.round(s / 86400) + " d ago"; };
  const setHtml = (el, html) => { if (el.__h !== html) { el.__h = html; el.innerHTML = html; return true; } return false; };
  const av = (src, name) => (src ? '<img src="' + esc(src) + '" alt="">' : '<span class="av">' + esc(String(name || "?").slice(0, 2)) + "</span>");
  function paintDash(force) {
    if (document.body.dataset.mode !== "dash" && !force) return;
    tick();
    // unread mentions per server, both sides
    const w = R.waiting();
    if (setHtml($("waiting"), w.slice(0, 14).map((x) => '<button class="chip" data-side="' + x.side + '" data-g="' + esc(x.id) + '">' + av(x.icon, x.ini || x.name) + esc(x.name) + ' <span class="tag ' + x.side + '">' + sideName(x.side) + '</span><span class="n">' + x.m + "</span></button>").join("")))
      $("waiting").querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => R.press(b.dataset.side, "g", b.dataset.g)));
    // inbox
    const ib = P("inbox");
    if (setHtml($("inbox"), ib.slice(0, 40).map((x, i) => '<button class="ib" data-i="' + i + '">' + av(x.icon, x.title) + '<span class="t"><b>' + esc(x.title || "Someone") + '</b> <span class="tag ' + x.side + '">' + sideName(x.side) + "</span>" + (x.where ? ' <span class="dim small">' + esc(x.where) + "</span>" : "") + "<div>" + esc(x.body || "") + '</div></span><span class="when">' + ago(x.at) + "</span></button>").join("")))
      $("inbox").querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => openInbox(ib[Number(b.dataset.i)])));
    // jump in
    const vs = Object.values(P("voiceSeen") || {}).sort((a, b) => (b.users || []).length - (a.users || []).length || b.at - a.at).slice(0, 12);
    if (setHtml($("jump"), vs.map((v) => { const live = Date.now() - v.at < 15000; const n = (v.users || []).length; return '<button class="vcard' + (live && n ? " live" : "") + '" data-side="' + v.side + '" data-g="' + esc(v.guild) + '" data-c="' + esc(v.cid || v.name) + '"><span class="spk">🔊</span><b>Join ' + esc(v.name) + '</b><span class="dim small">' + esc(v.guildName || "") + ' <span class="tag ' + v.side + '">' + sideName(v.side) + '</span></span><span class="who">' + (n ? (v.users || []).slice(0, 8).map((u) => av(u.avatar, u.name)).join("") + (live ? "" : " " + ago(v.at)) : live ? "Nobody's in yet" : "Nobody was in · " + ago(v.at)) + "</span></button>"; }).join("")))
      $("jump").querySelectorAll(".vcard").forEach((b) => (b.onclick = async () => { const ok = await R.joinVoice(b.dataset.side, b.dataset.g, b.dataset.c); if (!ok) toast("Open that server once so its voice channels are on the page, then try again."); }));
    // who's around
    const cut = Date.now() - 15 * 60000, RANK = { online: 0, idle: 1, dnd: 2 }, byName = new Map();
    for (const p of people.values()) { // the same name on both sides is one person here (that's what bridging is for)
      if (p.at <= cut || !p.name) continue;
      const k = String(p.name).toLowerCase(), o = byName.get(k) || { name: p.name, avatar: p.avatar, status: p.status, sides: new Set() };
      o.sides.add(p.side); if ((RANK[p.status] ?? 3) < (RANK[o.status] ?? 3)) o.status = p.status; if (!o.avatar && p.avatar) o.avatar = p.avatar;
      byName.set(k, o);
    }
    const ppl = [...byName.values()].sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3) || String(a.name).localeCompare(String(b.name)));
    const SW = { online: "online", idle: "idle", dnd: "on do not disturb" };
    setHtml($("who"), ppl.slice(0, 60).map((p) => '<span class="chip" title="' + esc(p.name + " is " + (SW[p.status] || p.status) + " on " + [...p.sides].map(sideName).join(" and ")) + '">' + av(p.avatar, p.name) + esc(p.name) + '<i class="st ' + esc(p.status) + '"></i>' + [...p.sides].sort().reverse().map((x) => '<span class="tag ' + x + '">' + sideName(x).slice(0, 1) + "</span>").join("") + "</span>").join(""));
    // today
    const td = P("today"), today = td && td.date === dayKey(Date.now()) ? td : { ch: {}, ppl: {} };
    const chs = Object.values(today.ch).sort((a, b) => b.n - a.n).slice(0, 6), total = Object.values(today.ch).reduce((s, c) => s + c.n, 0);
    const maxC = Math.max(1, ...chs.map((c) => c.n));
    $("today-count").textContent = total ? total + " message" + (total === 1 ? "" : "s") : "";
    setHtml($("today-ch"), chs.map((c) => '<div class="bar"><span title="' + esc(c.name + (c.guild ? " in " + c.guild : "") + " on " + sideName(c.side)) + '">' + esc(c.name) + (c.guild ? ' <small class="dim">' + esc(c.guild) + "</small>" : "") + ' <span class="tag ' + c.side + '">' + sideName(c.side).slice(0, 1) + '</span></span><i><b style="width:' + Math.round((c.n / maxC) * 100) + '%"></b></i><em>' + c.n + "</em></div>").join(""));
    const pm = new Map();
    for (const p of Object.values(today.ppl)) { const k = String(p.name).toLowerCase(), o = pm.get(k) || { name: p.name, avatar: p.avatar, n: 0 }; o.n += p.n; if (!o.avatar && p.avatar) o.avatar = p.avatar; pm.set(k, o); }
    const ps = [...pm.values()].sort((a, b) => b.n - a.n).slice(0, 6), maxP = Math.max(1, ...ps.map((p) => p.n));
    setHtml($("today-ppl"), ps.length ? ps.map((p) => '<div class="bar"><span>' + (p.avatar ? '<img src="' + esc(p.avatar) + '" alt="">' : "") + esc(p.name) + '</span><i><b style="width:' + Math.round((p.n / maxP) * 100) + '%"></b></i><em>' + p.n + "</em></div>").join("") : '<p class="empty">Nobody yet</p>');
  }
  async function openInbox(x) {
    if (!x) return;
    dmMode = false; setMode(x.side);
    let ok = 0;
    if (x.url) { try { ok = await R.act(x.side, "path", new URL(x.url, "https://x").pathname); } catch {} }
    if (!ok && x.nkey) ok = await R.act(x.side, "note", x.nkey);
    if (!ok && x.path && /^\/channels\//.test(x.path)) ok = await R.act(x.side, "path", x.path);
    setTimeout(() => R.read(x.side), 400);
  }
  $("inbox-clear").onclick = () => { prefs.inbox = []; save({ inbox: [] }); paintDash(true); };

  // ---------------- countdowns (Christmas is always there; yours take turns in the title bar) ----------------
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function nextDate(dateStr, yearly) {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return null;
    if (yearly) { d = new Date(today.getFullYear(), d.getMonth(), d.getDate()); if (d < today) d = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate()); }
    return Math.round((d - today) / 864e5);
  }
  function countdowns() {
    const y = new Date().getFullYear();
    const list = [{ id: "xmas", name: "Christmas", emoji: "🎄", days: nextDate(y + "-12-25", true), fixed: true }];
    for (const c of P("countdowns")) { const days = nextDate(c.date, c.yearly); if (days != null && days >= 0) list.push({ ...c, days }); }
    return list.sort((a, b) => a.days - b.days);
  }
  let cdTurn = 0;
  function tick() {
    const now = new Date(), h = now.getHours();
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("greet").textContent = (h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (skinOf(curSide()).name && skinOf(curSide()).name !== "Me" ? ", " + skinOf(curSide()).name : "");
    $("bigclock").textContent = time + " · " + now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const cds = countdowns(), c = cds[cdTurn % Math.max(1, cds.length)];
    $("clockline").textContent = time + (c ? " · " + c.emoji + " " + (c.days === 0 ? c.name + " is today!" : c.days + (c.days === 1 ? " day" : " days") + " until " + c.name) : "");
  }
  setInterval(() => { cdTurn++; tick(); }, 8000);
  function paintCountdowns() {
    setHtml($("cdlist"), countdowns().map((c) => '<div class="cdrow"><span>' + esc(c.emoji || "📅") + "</span><b>" + esc(c.name) + "</b><small>" + (c.days === 0 ? "today!" : c.days + (c.days === 1 ? " day" : " days")) + "</small>" + (c.fixed ? "" : '<button data-rm="' + esc(c.id) + '" title="Remove">✕</button>') + "</div>").join(""));
    $("cdlist").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => { await save({ countdowns: P("countdowns").filter((x) => x.id !== b.dataset.rm) }); paintCountdowns(); tick(); }));
  }
  (function cdForm() {
    const now = new Date();
    $("cd-m").innerHTML = MONTHS.map((m, i) => '<option value="' + (i + 1) + '"' + (i === now.getMonth() ? " selected" : "") + ">" + m + "</option>").join("");
    $("cd-d").innerHTML = Array.from({ length: 31 }, (_, i) => '<option value="' + (i + 1) + '"' + (i + 1 === now.getDate() ? " selected" : "") + ">" + (i + 1) + "</option>").join("");
    $("cd-y").innerHTML = '<option value="yearly">Every year</option>' + [0, 1, 2, 3].map((k) => '<option value="' + (now.getFullYear() + k) + '"' + (k === 0 ? " selected" : "") + ">" + (now.getFullYear() + k) + "</option>").join("");
    const EMO = ["🎂", "🎉", "🎄", "🎃", "🎆", "✈️", "🏖️", "🎮", "🎬", "🎵", "🎤", "💖", "💍", "👶", "🎓", "📚", "🏆", "⚽", "🍕", "🍰", "🌸", "☀️", "❄️", "🌙", "⭐", "🐾", "🚗", "🏠", "💼", "🩺", "🎁", "📅"];
    $("cd-emoji").onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".emojipop").forEach((x) => x.remove());
      const pop = document.createElement("div"); pop.className = "emojipop";
      pop.innerHTML = EMO.map((x) => "<button>" + x + "</button>").join("");
      const r = $("cd-emoji").getBoundingClientRect(); pop.style.left = Math.max(8, r.right - 280) + "px"; pop.style.top = r.bottom + 6 + "px";
      document.body.appendChild(pop);
      pop.querySelectorAll("button").forEach((b) => (b.onclick = () => { $("cd-emoji").textContent = b.textContent; pop.remove(); }));
      setTimeout(() => addEventListener("click", function off(ev) { if (!pop.contains(ev.target)) { pop.remove(); removeEventListener("click", off); } }), 0);
    };
    $("cd-add").onclick = async () => {
      const name = $("cd-name").value.trim(); if (!name) return toast("What are you counting down to?");
      const y = $("cd-y").value, yearly = y === "yearly";
      const date = (yearly ? new Date().getFullYear() : y) + "-" + String($("cd-m").value).padStart(2, "0") + "-" + String($("cd-d").value).padStart(2, "0");
      if (!yearly && nextDate(date, false) < 0) return toast("That date has already passed.");
      await save({ countdowns: [...P("countdowns"), { id: uid(), name, emoji: $("cd-emoji").textContent, date, yearly }] });
      $("cd-name").value = ""; paintCountdowns(); tick();
    };
  })();

  // ---------------- skin studio ----------------
  function updateSkin(id, changes) {
    const list = skins().map((s) => (s.id === id ? { ...s, ...changes } : s));
    save({ skins: list }); paintSkins(); applyAll();
  }
  async function paintSkins() {
    const wornF = P("wearF"), wornD = P("wearD");
    const cards = await Promise.all(skins().map(async (s) => {
      const pic = s.pic ? await img("skin-" + s.id + "-pic") : null;
      return '<div class="skin' + (s.id === wornF ? " wornF" : "") + (s.id === wornD ? " wornD" : "") + '" data-id="' + esc(s.id) + '"><div class="head"><span class="pp">' + (pic ? '<img src="' + pic + '" alt="">' : '<span class="mono">' + esc((s.name || "?").slice(0, 1).toUpperCase()) + "</span>") + '</span><input type="text" class="nm" value="' + esc(s.name) + '" maxlength="24" aria-label="Skin name"><input type="color" class="col" value="' + esc(okColor(s.color) || "#5865f2") + '" title="Color (the accent on the side wearing this skin)">' + (s.color ? '<button class="nocol" title="No color: use the theme\'s">⟲</button>' : "") + "</div>" +
        '<div class="btns"><button data-up="pic" class="' + (s.pic ? "has" : "") + '" title="' + (s.pic ? "Change the picture (Shift-click to remove it)" : "Choose a picture: your dashboard button") + '">Picture</button><button data-up="wall" class="' + (s.wall ? "has" : "") + '" title="' + (s.wall ? "Change the wallpaper (Shift-click to remove it)" : "Choose a wallpaper: behind the chat") + '">Wallpaper</button><button data-up="banner" class="' + (s.banner ? "has" : "") + '" title="' + (s.banner ? "Change the banner (Shift-click to remove it)" : "Choose a banner: the top of the dashboard") + '">Banner</button>' + (s.id !== "me" ? '<button data-del title="Delete this skin">Delete</button>' : "") + "</div>" +
        '<div class="wear">Wear on <button data-wear="F" class="' + (s.id === wornF ? "on" : "") + '">Fluxer</button><button data-wear="D" class="' + (s.id === wornD ? "on" : "") + '">Discord</button></div></div>';
    }));
    if (!setHtml($("skins"), cards.join(""))) return;
    $("skins").querySelectorAll(".skin").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".nm").onchange = (e) => updateSkin(id, { name: e.target.value.trim() || "Skin" });
      card.querySelector(".col").onchange = (e) => updateSkin(id, { color: e.target.value });
      const nc = card.querySelector(".nocol"); if (nc) nc.onclick = () => updateSkin(id, { color: "" });
      card.querySelectorAll("[data-up]").forEach((b) => (b.onclick = async (ev) => {
        const what = b.dataset.up;
        if (b.classList.contains("has") && ev.shiftKey) { await setImg("skin-" + id + "-" + what, null); updateSkin(id, { [what]: false }); return; }
        const d = what === "pic" ? await pickImage(512, 512) : what === "banner" ? await pickImage(1600, 600, 0.85) : await pickImage(1920, 1200, 0.82);
        if (!d) return;
        await setImg("skin-" + id + "-" + what, d); updateSkin(id, { [what]: true });
        if (what === "wall" && P("theme").background !== "wallpaper") { await save({ theme: { ...P("theme"), background: "wallpaper" } }); applyAll(); paintStudio(); toast("Wallpaper on"); }
      }));
      const del = card.querySelector("[data-del]"); if (del) del.onclick = async () => { if (!confirm("Delete this skin?")) return; for (const w of ["pic", "wall", "banner"]) await setImg("skin-" + id + "-" + w, null); const ch = { skins: skins().filter((s) => s.id !== id) }; if (P("wearF") === id) ch.wearF = "me"; if (P("wearD") === id) ch.wearD = "me"; await save(ch); paintSkins(); applyAll(); };
      card.querySelectorAll("[data-wear]").forEach((b) => (b.onclick = async () => { await save({ ["wear" + b.dataset.wear]: id }); paintSkins(); applyAll(); }));
    });
  }
  $("skin-new").onclick = async () => { const s = { id: uid(), name: "New skin", color: "" }; await save({ skins: [...skins(), s] }); await paintSkins(); const inp = $("skins").querySelector('[data-id="' + s.id + '"] .nm'); if (inp) { inp.focus(); inp.select(); } };
  $("w-str").oninput = (e) => { prefs.wStr = Number(e.target.value); clearTimeout(later.ws); later.ws = setTimeout(() => { save({ wStr: prefs.wStr }); applyAll(); }, 200); };
  $("w-blur").oninput = (e) => { prefs.wBlur = Number(e.target.value); clearTimeout(later.wb); later.wb = setTimeout(() => { save({ wBlur: prefs.wBlur }); applyAll(); }, 200); };

  // ---------------- theme studio ----------------
  const sameStack = (a, b) => ["palette", "background", "corners", "font", "size", "spacing"].every((k) => (a[k] || "") === (b[k] || "")) && [...(a.effects || [])].sort().join() === [...(b.effects || [])].sort().join();
  function preview(pieces) {
    const t = T.tokens(pieces, { fluxer: fxColors }), r = (T.CORNERS[pieces.corners] || {}).r ?? 8, F = T.FONTS[pieces.font];
    const L = T.bgLayer(pieces, t, { wall: null });
    const bub = (pieces.effects || []).includes("bubbles");
    const style = "--tf:" + t.frame + ";--tp:" + t.panel + ";--tc:" + t.chat + ";--ta:" + t.accent + ";--tt:" + t.text + ";--tm:" + t.muted + ";--ti:" + t.input + ";--tr:" + r + "px;" + (F && F.stack ? "font-family:" + F.stack : "");
    return '<div class="tp" style="' + esc(style) + '"><div class="f"><i></i><i></i><i></i></div><div class="s"><i class="a"></i><i></i><i></i><i></i></div><div class="c' + (bub ? " bub" : "") + '">' + (L ? '<div class="bg" style="' + esc("background:" + L.css + (L.size ? ";background-size:" + L.size : "")) + '"></div>' : "") + '<div class="m"><u></u><span></span></div><div class="m"><u></u><span class="s2"></span></div><div class="bx"></div><span class="lbl">' + esc(F && F.stack ? F.name : "Aa") + "</span></div></div>";
  }
  function themeNow() {
    const s = P("theme"), bits = [];
    bits.push((T.PALETTES[s.palette] || T.PALETTES.fluxer).name + " colors");
    if (s.background !== "none") bits.push((T.BACKGROUNDS[s.background] || {}).name);
    if (s.corners !== "site") bits.push((T.CORNERS[s.corners] || {}).name + " corners");
    if (s.font !== "site") bits.push((T.FONTS[s.font] || {}).name);
    if (s.size !== "site") bits.push((T.SIZES[s.size] || {}).name + " text");
    if (s.spacing !== "site") bits.push((T.SPACING[s.spacing] || {}).name + " spacing");
    for (const e of s.effects || []) bits.push((T.EFFECTS[e] || {}).name);
    return bits.filter(Boolean).join(" · ");
  }
  async function setTheme(changes) {
    const next = { ...P("theme"), ...changes };
    await save({ theme: next });
    applyAll(); paintStudio();
  }
  // ---- the mini app: how a theme looks before (and after) you pick it ----
  let miniWall = null;
  function mini(stack) {
    const t = T.tokens(stack, { fluxer: fxColors, accent: okColor(skinOf(curSide()).color) });
    const r = (T.CORNERS[stack.corners] || {}).r ?? 8, F = T.FONTS[stack.font], fx = new Set(stack.effects || []);
    const px = (T.SIZES[stack.size] || {}).px || 15, gap = (T.SPACING[stack.spacing] || {}).px ?? 14;
    const L = T.bgLayer(stack, t, { wall: miniWall, strength: P("wStr"), blur: P("wBlur") });
    const glass = L && fx.has("glass");
    const panel = glass ? "color-mix(in srgb," + t.panel + " 62%,transparent)" : t.panel, chat = glass || L ? "color-mix(in srgb," + t.chat + " " + (glass ? 50 : 100) + "%,transparent)" : t.chat;
    const vars = "--mf:" + t.frame + ";--mp:" + panel + ";--mc:" + chat + ";--mr:" + t.raised + ";--mi:" + t.input + ";--mt:" + t.text + ";--ms:" + t.strong + ";--mm:" + t.muted + ";--ma:" + t.accent + ";--msel:" + t.selected + ";--mline:" + t.line + ";--mrad:" + r + "px;--mfs:" + px + "px;--mgap:" + gap + "px;" + (F && F.stack ? "--mfont:" + F.stack + ";" : "");
    const bg = L ? '<div class="mbg' + (glass ? " all" : "") + '" style="' + esc(T.bgDecl(L)) + '"></div>' : "";
    const msg = (name, color, text, mention) => '<div class="mm' + (fx.has("bubbles") ? " bub" : "") + (mention ? " men" : "") + '"><i style="background:' + color + '"></i><div><b style="color:' + color + '">' + name + "</b><span>" + text + "</span></div></div>";
    return '<div class="mapp' + (fx.has("glow") ? " glow" : "") + (fx.has("shadows") ? " shad" : "") + (fx.has("scanlines") ? " scan" : "") + '" style="' + esc(vars) + '">' + (glass ? bg : "") +
      '<div class="mrail"><i class="d"></i><i></i><i></i><i></i></div><div class="mside"><b>THE FELLAS</b><p class="sel"># general</p><p># memes</p><p>🔊 Gaming</p></div>' +
      '<div class="mchat">' + (glass ? "" : bg) + '<div class="mhead"># general</div><div class="mmsgs">' + msg("Pear", "#5aa469", "are you coming to game night?", true) + msg("Mythbell", "#4a6cd4", "bro i knew it") + msg("Kiwi", "#c75b9b", "look at this cat") + '</div><div class="mbox">Message #general</div></div>' +
      '<div class="mmem"><p>ONLINE</p><p><i style="background:#5aa469"></i>Pear</p><p><i style="background:#4a6cd4"></i>Mythbell</p><p><i style="background:#c75b9b"></i>Kiwi</p></div></div>';
  }
  function showMini(stack) { setHtml($("mini"), mini(stack || P("theme"))); }
  function paintStudio() {
    const stack = P("theme");
    showMini(stack);
    ctxFor(curSide()).then((x) => { if (x.wall !== miniWall) { miniWall = x.wall; showMini(); } });
    $("theme-now").textContent = themeNow();
    const mine = (P("myThemes") || []).map((m) => ({ id: "my:" + m.id, name: m.name, blurb: "Yours", pieces: m.pieces, mine: m.id }));
    const all = [...mine, ...T.TEMPLATES];
    setHtml($("templates"), all.map((tp, i) => '<button class="tpl' + (sameStack(stack, tp.pieces) ? " on" : "") + '" data-i="' + i + '">' + preview(tp.pieces) + "<b>" + esc(tp.name) + "</b><small>" + esc(tp.blurb) + "</small>" + (tp.mine ? '<span class="x" data-del="' + esc(tp.mine) + '" title="Delete">✕</span>' : "") + "</button>").join(""));
    const asPicked = (tp) => { const p = { ...tp.pieces, effects: [...(tp.pieces.effects || [])] }; if (P("keepColors") && !tp.mine) p.palette = P("theme").palette; return { ...P("theme"), ...p }; };
    $("templates").querySelectorAll(".tpl").forEach((b) => { b.onmouseenter = () => showMini(asPicked(all[Number(b.dataset.i)])); b.onmouseleave = () => showMini(); });
    $("templates").querySelectorAll(".tpl").forEach((b) => (b.onclick = async (e) => {
      const del = e.target.closest("[data-del]");
      if (del) { e.stopPropagation(); await save({ myThemes: P("myThemes").filter((m) => m.id !== del.dataset.del) }); paintStudio(); return; }
      const tp = all[Number(b.dataset.i)], pieces = { ...tp.pieces, effects: [...(tp.pieces.effects || [])] };
      if (P("keepColors") && !tp.mine) delete pieces.palette; // your colors stay; the rest of the template goes on top
      await setTheme(pieces);
      toast(tp.name);
    }));
    const rows = T.CATS.map((cat) => '<div class="prow"><b>' + esc(cat.name) + '</b><div class="popts">' + Object.entries(cat.set).map(([k, o]) => {
      let sw = "";
      if (cat.key === "palette") { const t = o.own ? fxColors || {} : o; sw = '<span class="sw" style="background:linear-gradient(135deg,' + esc(t.chat || "#555") + " 50%," + esc(t.accent || "#999") + ' 50%)"></span>'; }
      if (cat.key === "background" && k !== "none" && k !== "wallpaper") { const L = T.bgLayer({ background: k, effects: [] }, T.tokens(stack, { fluxer: fxColors }), {}); sw = '<span class="sw" style="' + esc("background:" + (L ? L.css : "none") + ";background-color:" + T.tokens(stack, { fluxer: fxColors }).chat) + '"></span>'; }
      if (cat.key === "font" && o.stack) return '<button class="popt' + (stack[cat.key] === k ? " on" : "") + '" data-cat="' + cat.key + '" data-k="' + k + '" style="font-family:' + esc(o.stack) + '">' + esc(o.name) + "</button>";
      return '<button class="popt' + (stack[cat.key] === k ? " on" : "") + '" data-cat="' + cat.key + '" data-k="' + k + '">' + sw + esc(o.name) + "</button>";
    }).join("") + "</div></div>").join("") +
      '<div class="prow"><b>Effects</b><div class="popts">' + Object.entries(T.EFFECTS).map(([k, o]) => '<button class="popt' + ((stack.effects || []).includes(k) ? " on" : "") + '" data-fx="' + k + '" title="' + esc(o.hint) + '">' + esc(o.name) + "</button>").join("") + "</div></div>";
    setHtml($("pieces"), rows);
    $("pieces").querySelectorAll("[data-cat]").forEach((b) => { b.onclick = () => setTheme({ [b.dataset.cat]: b.dataset.k }); b.onmouseenter = () => showMini({ ...P("theme"), [b.dataset.cat]: b.dataset.k }); b.onmouseleave = () => showMini(); });
    $("pieces").querySelectorAll("[data-fx]").forEach((b) => { b.onmouseenter = () => { const f = new Set(P("theme").effects || []); f.has(b.dataset.fx) ? f.delete(b.dataset.fx) : f.add(b.dataset.fx); showMini({ ...P("theme"), effects: [...f] }); }; b.onmouseleave = () => showMini(); });
    $("pieces").querySelectorAll("[data-fx]").forEach((b) => (b.onclick = () => { const fx = new Set(P("theme").effects || []); fx.has(b.dataset.fx) ? fx.delete(b.dataset.fx) : fx.add(b.dataset.fx); setTheme({ effects: [...fx] }); }));
  }
  $("keep-colors").onchange = (e) => save({ keepColors: e.target.checked });
  $("theme-save").onclick = async () => { const name = $("theme-name").value.trim(); if (!name) return toast("Give your theme a name first."); await save({ myThemes: [{ id: uid(), name, pieces: { ...P("theme"), effects: [...(P("theme").effects || [])] } }, ...(P("myThemes") || [])] }); $("theme-name").value = ""; paintStudio(); toast("Saved"); };
  $("theme-reset").onclick = () => setTheme({ ...T.DEFAULT_STACK });

  // ---------------- quick links: TikTok, Pinterest, X, and yours ----------------
  const BUILTIN = [
    { id: "tiktok", name: "TikTok", letter: "T", url: "https://www.tiktok.com/", part: "persist:tiktok" },
    { id: "pinterest", name: "Pinterest", letter: "P", url: "https://www.pinterest.com/", part: "persist:pinterest" },
    { id: "x", name: "X", letter: "𝕏", url: "https://x.com/", part: "persist:x" },
  ];
  const allLinks = () => [...BUILTIN, ...(P("links") || []).map((l) => ({ ...l, letter: (l.name || "?").slice(0, 1).toUpperCase(), part: "persist:links" }))];
  const panels = new Map();
  let openId = null;
  function drawLinks() {
    setHtml($("links"), allLinks().map((l) => '<button data-id="' + esc(l.id) + '" title="' + esc(l.name) + '"' + (openId === l.id ? ' class="on"' : "") + ">" + esc(l.letter) + "</button>").join(""));
    $("links").querySelectorAll("button").forEach((b) => (b.onclick = () => togglePanel(b.dataset.id)));
    setHtml($("linklist"), (P("links") || []).map((l) => '<div class="lk"><b>' + esc((l.name || "?").slice(0, 1).toUpperCase()) + "</b><span>" + esc(l.name) + " · " + esc(l.url) + '</span><button data-rm="' + esc(l.id) + '">Remove</button></div>').join(""));
    $("linklist").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => { const p = panels.get(b.dataset.rm); if (p) { p.remove(); panels.delete(b.dataset.rm); } if (openId === b.dataset.rm) closePanel(); await save({ links: P("links").filter((l) => l.id !== b.dataset.rm) }); drawLinks(); }));
  }
  const QUIET = "document.querySelectorAll('video,audio').forEach(function(m){try{m.pause()}catch(e){}});1";
  function hush(w, off) { try { w.setAudioMuted(!!off); } catch {} if (off) { try { w.executeJavaScript(QUIET).catch(() => {}); } catch {} } }
  function closePanel() { const w = panels.get(openId); if (w) hush(w, true); $("sidepanel").hidden = true; openId = null; drawLinks(); }
  function togglePanel(id) {
    const l = allLinks().find((x) => x.id === id);
    if (!l) return;
    if (openId === id) return closePanel();
    if (openId && panels.get(openId)) hush(panels.get(openId), true);
    openId = id;
    let w = panels.get(id);
    if (!w) { w = document.createElement("webview"); w.setAttribute("partition", l.part); w.setAttribute("allowpopups", ""); w.setAttribute("src", l.url); $("spbody").appendChild(w); panels.set(id, w); }
    panels.forEach((x) => x.classList.toggle("on", x === w));
    hush(w, false);
    $("sptitle").textContent = l.name; $("sidepanel").hidden = false;
    $("pinnote").hidden = !(id === "pinterest" && !P("pinNoteSeen"));
    drawLinks();
  }
  $("spx").onclick = closePanel;
  $("spout").onclick = () => { const l = allLinks().find((x) => x.id === openId); if (l) host.openExternal(l.url); };
  $("pinnote-x").onclick = () => { $("pinnote").hidden = true; save({ pinNoteSeen: true }); };
  // Pinterest: Google's sign-in can't work inside an app. Say so, and how to sign in instead.
  host.onNotice((what) => {
    if (!/^pinterest-google/.test(what)) return;
    if (what === "pinterest-google") { // you pressed "Continue with Google"
      if (openId !== "pinterest") togglePanel("pinterest");
      $("pinnote").hidden = false; $("pinnote").classList.remove("flash"); void $("pinnote").offsetWidth; $("pinnote").classList.add("flash");
      toast("Google sign-in isn't possible here. Use the QR code, or sign in regularly on the sign-in page.", 6000);
    } else if (openId === "pinterest" && !P("pinNoteSeen")) $("pinnote").hidden = false; // (its Google button was left out)
  });
  $("ln-add").onclick = async () => {
    const name = $("ln-name").value.trim(); let url = $("ln-url").value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    if (!name || !/^https:\/\/[^\s/]+\.[^\s]+/i.test(url)) return toast("Give it a name and a web address.");
    if ((P("links") || []).length >= 6) return toast("Six of your own is the most.");
    await save({ links: [...(P("links") || []), { id: uid(), name, url }] });
    $("ln-name").value = ""; $("ln-url").value = ""; drawLinks();
  };

  // ---------------- the intro (Belle's, with your name) ----------------
  function intro() {
    const sp = $("bcsplash");
    if (!sp || sessionStorage.getItem("bcIntro")) return;
    try { sessionStorage.setItem("bcIntro", "1"); } catch {}
    $("bcswm").innerHTML = "BELLECORD".split("").map((c, i) => '<span style="animation-delay:' + (0.45 + i * 0.05).toFixed(2) + 's">' + c + "</span>").join("");
    const pilot = String(P("myName") || (skinOf(curSide()).name !== "Me" ? skinOf(curSide()).name : "") || "").toUpperCase();
    $("bcspilot").textContent = pilot ? "PILOT · " + pilot : "PILOT";
    sp.hidden = false;
    const n = $("bcsync"), t0 = performance.now() + 1250;
    const f = () => { const p = Math.min(1, Math.max(0, (performance.now() - t0) / 1000)); n.textContent = "SYNC RATIO " + Math.round(p * 400) + "%"; if (p < 1 && !sp.hidden) requestAnimationFrame(f); };
    requestAnimationFrame(f);
    const done = () => { sp.hidden = true; };
    sp.onclick = done; setTimeout(done, 3100);
  }

  // ---------------- game badges ----------------
  const G = window.bcGames;
  const hub = (method, route, payload) => (host.hub ? host.hub(method, route, payload).catch(() => ({ ok: false, error: "offline" })) : Promise.resolve({ ok: false, error: "offline" }));
  const people2 = new Map(); // "fluxer:id" -> person or null (fetched this session)
  const asking = new Set(); let askTimer = null;
  const badgeList = (person) => (person && person.games ? G.GAMES.filter((g) => person.games[g.key] && person.games[g.key].enabled !== false).map((g) => ({ key: g.key, glyph: g.glyph, color: g.color, name: g.name })) : []);
  function rememberPerson(k, person) {
    people2.set(k, person);
    const bc = { ...P("badgeCache") };
    if (person) bc[k] = person; else delete bc[k];
    const ks = Object.keys(bc); if (ks.length > 300) for (const x of ks.slice(0, ks.length - 300)) delete bc[x];
    prefs.badgeCache = bc; saveSoon("badgeCache");
  }
  async function lookUp(keys) {
    const want = keys.filter((k) => /^(fluxer|discord):\d{3,25}$/.test(k));
    if (!want.length) return {};
    const r = await hub("GET", "/v1/people?ids=" + want.join(","));
    const out = {};
    for (const k of want) {
      if (r.ok && r.data && k in r.data) { rememberPerson(k, r.data[k]); out[k] = r.data[k]; }
      else out[k] = people2.has(k) ? people2.get(k) : P("badgeCache")[k] || null; // (hub away: the last copy)
    }
    return out;
  }
  // the pages ask for the badges of a profile you open; a badge you click opens its card here
  async function answer(side, keys) {
    const got = await lookUp(keys), push = {};
    for (const k of keys) push[k] = badgeList(got[k]);
    const v = $("wv-" + side);
    try { await v.executeJavaScript("window.__bcGBset && window.__bcGBset(" + JSON.stringify(push) + ");1"); } catch {}
  }
  function onPageMessage(side, msg) {
    msg = String(msg || "");
    if (msg.startsWith("__bcgb:need:")) {
      const k = msg.slice(12); if (!/^(fluxer|discord):\d{3,25}$/.test(k)) return;
      asking.add(side + "|" + k); clearTimeout(askTimer);
      askTimer = setTimeout(() => { const by = { fluxer: [], discord: [] }; for (const x of asking) { const [s2, k2] = x.split("|"); by[s2].push(k2); } asking.clear(); for (const s2 of SIDES) if (by[s2].length) answer(s2, by[s2]); }, 80);
    } else if (msg.startsWith("__bcgb:open:")) {
      try { const o = JSON.parse(msg.slice(12)); openCard(o.key, o.game); } catch {}
    }
  }
  for (const s2 of SIDES) $("wv-" + s2).addEventListener("console-message", (e) => onPageMessage(s2, e.message));
  // what goes into each page: badges next to the name on profiles (like the site's own badges)
  const BADGE_PAGE = "(" + function (side) {
    if (window.__bcGB) return 1;
    window.__bcGB = 1;
    var cache = {}, asked = {};
    var css = document.createElement("style");
    css.textContent = ".bc-gbrow{display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;margin:2px 0 0 6px;vertical-align:middle}.bc-gbrow button{width:22px;height:22px;border-radius:6px;border:0;padding:0;cursor:pointer;color:#fff;font:900 8.5px/1 'Segoe UI',sans-serif;letter-spacing:-.02em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);text-shadow:0 1px 1px rgba(0,0,0,.4)}.bc-gbrow button:hover{filter:brightness(1.15);transform:translateY(-1px)}";
    (document.head || document.documentElement).appendChild(css);
    var idIn = function (box) {
      if (side === "fluxer") { var a = box.querySelector("[data-flx-user-id]"); return a ? a.getAttribute("data-flx-user-id") : null; }
      var ims = box.querySelectorAll("img"); for (var i = 0; i < ims.length; i++) { var m = (ims[i].currentSrc || ims[i].src || "").match(/\/avatars\/(\d{5,25})\//); if (m) return m[1]; }
      return null;
    };
    var anchors = function () {
      var out = [], els, i, up, id, n;
      if (side === "fluxer") {
        els = document.querySelectorAll('[data-flx="user.profile.profile-card.profile-card-user-info.badge-container"],[data-flx="user.user-profile-modal.user-info.div--5"]');
        for (i = 0; i < els.length; i++) { for (up = els[i], id = null, n = 0; up && n < 12 && !id; up = up.parentElement, n++) id = idIn(up); if (id) out.push({ el: els[i], key: "fluxer:" + id }); }
      } else {
        els = document.querySelectorAll('[class*="userPopoutOuter_"],[class*="userProfileOuter_"],[class*="userProfileModalOuter_"],[class*="user-profile-popout"],[class*="userPopout_"]');
        for (i = 0; i < els.length; i++) {
          id = idIn(els[i]); if (!id) continue;
          var at = els[i].querySelector('[class^="badgeList_"],[class*=" badgeList_"]') || els[i].querySelector('[class^="nickname_"],[class*=" nickname_"],h1,h2');
          if (at) out.push({ el: at, key: "discord:" + id, after: !/badgeList_/.test(at.getAttribute("class") || "") });
        }
      }
      return out;
    };
    var draw = function (a) {
      var list = cache[a.key], host = a.after ? a.el.parentElement : a.el;
      if (!host) return;
      var row = host.querySelector(":scope > .bc-gbrow");
      if (!list || !list.length) { if (row) row.remove(); return; }
      var sig = list.map(function (b) { return b.key; }).join(",") + "|" + a.key;
      if (row && row.getAttribute("data-sig") === sig) return;
      if (!row) { row = document.createElement("span"); row.className = "bc-gbrow"; if (a.after) a.el.after(row); else a.el.appendChild(row); }
      row.setAttribute("data-sig", sig); row.textContent = "";
      list.forEach(function (b) {
        var x = document.createElement("button"); x.type = "button"; x.textContent = b.glyph; x.title = b.name; x.setAttribute("aria-label", b.name + " profile"); x.style.background = b.color;
        x.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); console.log("__bcgb:open:" + JSON.stringify({ key: a.key, game: b.key })); }, true);
        row.appendChild(x);
      });
    };
    var scan = function () { anchors().forEach(function (a) { if (a.key in cache) draw(a); else if (!asked[a.key]) { asked[a.key] = 1; console.log("__bcgb:need:" + a.key); } }); };
    window.__bcGBset = function (m) { for (var k in m) cache[k] = m[k]; scan(); };
    window.__bcGBforget = function (k) { delete cache[k]; delete asked[k]; scan(); };
    var soon = function () { setTimeout(scan, 120); setTimeout(scan, 450); setTimeout(scan, 1200); };
    document.addEventListener("click", soon, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Enter") soon(); }, true);
    return 1;
  }.toString() + ")";
  for (const s2 of SIDES) $("wv-" + s2).addEventListener("dom-ready", () => { $("wv-" + s2).executeJavaScript(BADGE_PAGE + "(" + JSON.stringify(s2) + ")").catch(() => {}); });
  // Fluxer: if you were at the bottom of a chat, you stay at the bottom when something changes size
  // (a new message, a picture loading, the search panel opening) instead of the last message ending up under the box
  const STICK = "(" + function () {
    if (window.__bcStick) return 1;
    window.__bcStick = 1;
    var sc = null, atBottom = true;
    var ro = new ResizeObserver(function () { if (sc && atBottom) sc.scrollTop = sc.scrollHeight; });
    var onScroll = function () { atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 30; };
    var hook = function () {
      var s = document.querySelector('[data-flx="channel.messages.scroller"]');
      if (s === sc) return;
      ro.disconnect(); if (sc) sc.removeEventListener("scroll", onScroll);
      sc = s; atBottom = true; if (!s) return;
      s.addEventListener("scroll", onScroll, { passive: true });
      ro.observe(s); var c = s.querySelector('[data-flx="channel.messages.scroller-content"]'); if (c) ro.observe(c);
    };
    setInterval(hook, 1000); hook();
    return 1;
  }.toString() + ")()";
  $("wv-fluxer").addEventListener("dom-ready", () => { $("wv-fluxer").executeJavaScript(STICK).catch(() => {}); });

  // ---- the card you get when you click a badge ----
  const cardEsc = esc;
  async function openCard(key, gameKey, liveFresh) {
    const person = key === "me" ? myPerson() : people2.has(key) ? people2.get(key) : P("badgeCache")[key];
    if (!person || !person.games) return;
    const game = G.BY[gameKey] || G.BY[Object.keys(person.games)[0]];
    const g = person.games[game.key];
    if (!g) return;
    let live = null, liveErr = null;
    if (game.live && g.handle && g.tracking !== false) {
      drawCard(person, key, game, g, null, null, true);
      const r = await hub("GET", "/v1/live/" + game.live + "?handle=" + encodeURIComponent(g.handle) + (liveFresh ? "&t=" + Date.now() : ""));
      if (r.ok) live = r.data; else liveErr = r.status === 404 ? "Couldn't find " + g.handle : r.error === "offline" ? null : "Live stats aren't available right now";
      if (live && live.private) liveErr = "Career profile is private";
    }
    drawCard(person, key, game, g, live, liveErr, false);
  }
  function drawCard(person, key, game, g, live, liveErr, loading) {
    const box = $("gcard").querySelector(".gcbox"), L = live || {};
    const accent = g.accent || game.color;
    const av = L.avatar || person.avatar;
    const stats = {}; for (const [k, v] of Object.entries(g.stats || {})) if (v) stats[k] = v; for (const [k, v] of Object.entries(L.stats || {})) if (v) stats[k] = v;
    const rr = {}; for (const [k, v] of Object.entries(g.roleRanks || {})) if (v) rr[k] = v; for (const [k, v] of Object.entries(L.roleRanks || {})) if (v) rr[k] = v;
    const ranks = Object.keys(rr).length ? Object.entries(rr) : g.rank ? [[game.rankLabel || "Rank", g.rank + (g.rankDetail ? " " + g.rankDetail : "")]] : [];
    const main = g.main || L.main, sticker = g.showSticker !== false ? g.sticker || L.mainPortrait || null : null;
    const others = badgeList(person).filter((b) => b.key !== game.key);
    box.style.setProperty("--gc", accent);
    box.style.setProperty("--gcard", L.banner ? 'url("' + L.banner + '")' : "linear-gradient(135deg," + accent + ",#24262b)");
    box.innerHTML =
      (others.length ? '<div class="gswitch">' + badgeList(person).map((b) => '<button class="gb" data-g="' + b.key + '" title="' + cardEsc(b.name) + '" style="background:' + b.color + (b.key === game.key ? ";box-shadow:0 0 0 2px #fff" : "") + '">' + cardEsc(b.glyph) + "</button>").join("") + "</div>" : "") +
      '<div class="gtop">' + (av ? '<img class="gav" src="' + cardEsc(av) + '" alt="">' : '<span class="gav" style="background:' + accent + '">' + cardEsc((person.name || "?").slice(0, 1)) + "</span>") +
      '<div><div class="gk">' + cardEsc(game.name) + ' profile</div><h2>' + cardEsc(L.name || String(g.handle || person.name || game.name).split("#")[0]) + '</h2><div class="gtag">' + cardEsc(g.handle || "") + (L.title ? " · " + cardEsc(L.title) : "") + "</div></div></div>" +
      '<div class="gbody">' +
      (g.tagline ? '<div class="gline"><div><b>' + cardEsc(g.tagline) + "</b></div></div>" : "") +
      (main || g.role ? '<div class="gline">' + (L.mainPortrait ? '<img src="' + cardEsc(L.mainPortrait) + '" alt="">' : "") + "<div><b>" + cardEsc(main ? "Mains " + main : g.role) + "</b><small>" + cardEsc([main && g.role ? g.role : "", game.mainLabel && main ? game.mainLabel : ""].filter(Boolean).join(" · ")) + "</small></div></div>" : "") +
      (sticker ? '<div class="gline"><img src="' + cardEsc(sticker) + '" alt="" style="width:64px;height:64px"><div><b>Sticker</b></div></div>' : "") +
      (g.showRank !== false && ranks.length ? '<div class="ggrid">' + ranks.map(([k, v]) => '<div class="gstat"><b>' + cardEsc(k) + "</b><span>" + cardEsc(v) + "</span></div>").join("") + "</div>" : "") +
      (g.showStats !== false && Object.keys(stats).length ? '<div class="ggrid">' + Object.entries(stats).map(([k, v]) => '<div class="gstat"><b>' + cardEsc(k) + "</b><span>" + cardEsc(v) + "</span></div>").join("") + "</div>" : "") +
      (L.endorsement ? '<div class="gmuted">Endorsement level ' + cardEsc(L.endorsement) + "</div>" : "") +
      (loading ? '<div class="gmuted">Loading stats…</div>' : "") + (liveErr ? '<div class="gwarn">' + cardEsc(liveErr) + "</div>" : "") +
      '<div class="gacts"><button id="gc-x">Close</button>' + (game.live && g.handle && g.tracking !== false ? '<button id="gc-r">Refresh</button>' : "") + (key === "me" || isMine(key) ? '<button class="primary" id="gc-e">Customize</button>' : "") + "</div></div>";
    $("gcard").hidden = false;
    box.querySelector("#gc-x").onclick = () => ($("gcard").hidden = true);
    const rf = box.querySelector("#gc-r"); if (rf) rf.onclick = () => openCard(key, game.key, true);
    const ed = box.querySelector("#gc-e"); if (ed) ed.onclick = () => { $("gcard").hidden = true; setMode("dash"); editGame(game.key); $("s-badges").scrollIntoView({ behavior: "smooth" }); };
    box.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => openCard(key, b.dataset.g)));
  }
  $("gcard").addEventListener("click", (e) => { if (e.target === $("gcard")) $("gcard").hidden = true; });
  const isMine = (k) => { const me = P("me"); return SIDES.some((s2) => me[s2] && k === s2 + ":" + me[s2].id); };
  function myPerson() { return { name: P("myName"), avatar: (P("me").fluxer || P("me").discord || {}).avatar || "", games: (P("myBadges") || {}).games || {} }; }

  // ---- your badges (dashboard) ----
  let editing = null;
  function paintBadges() {
    const mine = myPerson().games;
    setHtml($("gb-mine"), badgeList(myPerson()).map((b) => '<button class="mine" data-g="' + b.key + '"><span class="gb" style="background:' + b.color + '">' + esc(b.glyph) + "</span>" + esc(b.name) + "</button>").join(""));
    $("gb-mine").querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => openCard("me", b.dataset.g)));
    setHtml($("gb-games"), G.GAMES.map((g) => '<button data-g="' + g.key + '" class="' + (mine[g.key] ? "has" : "") + (editing === g.key ? " on" : "") + '"><span class="gb" style="background:' + g.color + '">' + esc(g.glyph) + "</span>" + esc(g.name) + (mine[g.key] ? " ✓" : "") + "</button>").join(""));
    $("gb-games").querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => (editing === b.dataset.g ? closeEdit() : editGame(b.dataset.g))));
  }
  function closeEdit() { editing = null; $("gb-edit").hidden = true; paintBadges(); }
  function editGame(key) {
    const game = G.BY[key]; if (!game) return;
    editing = key; paintBadges();
    const d = myPerson().games[key] || { enabled: true, tracking: true, showRank: true, showStats: true, showSticker: true };
    const opt = (list, sel, none) => '<option value="">' + none + "</option>" + list.map((x) => '<option' + (x === sel ? " selected" : "") + ">" + esc(x) + "</option>").join("") + (sel && !list.includes(sel) ? "<option selected>" + esc(sel) + "</option>" : "");
    const isOW = key === "overwatch";
    const box = $("gb-edit");
    box.innerHTML = '<h3><span class="gb" style="background:' + game.color + '">' + esc(game.glyph) + "</span>" + esc(game.name) + "</h3>" +
      '<label>' + esc(game.handle) + '<input type="text" id="ge-handle" maxlength="40" placeholder="' + esc(game.hint) + '" value="' + esc(d.handle || "") + '"></label>' +
      (game.ranks.length && !isOW ? '<label>' + esc(game.rankLabel || "Rank") + '<select id="ge-rank">' + opt(game.ranks, d.rank, "—") + "</select></label>" + (game.rankLabel ? "" : '<label>Division / number<input type="text" id="ge-rankd" maxlength="30" placeholder="2, 1534 LP…" value="' + esc(d.rankDetail || "") + '"></label>') : "") +
      (isOW ? game.roles.map((r) => '<label>' + r + ' rank<select data-rr="' + r + '">' + opt(game.ranks, (d.roleRanks || {})[r], "—") + "</select></label>").join("") : game.roles ? '<label>Role<select id="ge-role">' + opt(game.roles, d.role, "—") + "</select></label>" : "") +
      '<label>' + esc(game.mainLabel) + (game.mains ? '<select id="ge-main">' + opt(game.mains, d.main, "—") + "</select>" : '<input type="text" id="ge-main" maxlength="40" value="' + esc(d.main || "") + '">') + "</label>" +
      '<label>Color<input type="color" id="ge-accent" value="' + esc(/^#[0-9a-f]{6}$/i.test(d.accent || "") ? d.accent : game.color) + '"></label>' +
      '<label class="wide">A line under the name<textarea id="ge-tag" maxlength="140">' + esc(d.tagline || "") + "</textarea></label>" +
      '<div class="statrow">' + game.stats.map((st) => '<label>' + esc(st) + '<input type="text" data-st="' + esc(st) + '" maxlength="24" value="' + esc((d.stats || {})[st] || "") + '"></label>').join("") + "</div>" +
      '<div class="acts"><button id="ge-st">' + (d.sticker ? "Change sticker" : "Sticker…") + "</button>" + (d.sticker ? '<button id="ge-stx">Remove sticker</button>' : "") + "</div>" +
      '<div class="checks"><label><input type="checkbox" id="ge-on"' + (d.enabled !== false ? " checked" : "") + "> Show the badge</label>" + (game.live ? '<label><input type="checkbox" id="ge-live"' + (d.tracking !== false ? " checked" : "") + "> Live stats</label>" : "") + '<label><input type="checkbox" id="ge-sr"' + (d.showRank !== false ? " checked" : "") + '> Rank</label><label><input type="checkbox" id="ge-ss"' + (d.showStats !== false ? " checked" : "") + '> Stats</label><label><input type="checkbox" id="ge-sk"' + (d.showSticker !== false ? " checked" : "") + "> Sticker</label></div>" +
      '<div class="acts"><button class="primary" id="ge-save">Save</button><button id="ge-view">Preview</button>' + (myPerson().games[key] ? '<button id="ge-del">Remove</button>' : "") + '<button id="ge-close">Close</button><span class="msg" id="ge-msg"></span></div><div class="acts" id="ge-code" hidden></div>';
    box.hidden = false;
    let sticker = d.sticker || "";
    const q = (x) => box.querySelector(x);
    const collect = () => {
      const stats = {}; box.querySelectorAll("[data-st]").forEach((i) => { if (i.value.trim()) stats[i.dataset.st] = i.value.trim(); });
      const roleRanks = {}; box.querySelectorAll("[data-rr]").forEach((i) => { if (i.value) roleRanks[i.dataset.rr] = i.value; });
      return { enabled: q("#ge-on").checked, handle: q("#ge-handle").value.trim(), rank: q("#ge-rank") ? q("#ge-rank").value : "", rankDetail: q("#ge-rankd") ? q("#ge-rankd").value.trim() : "", role: q("#ge-role") ? q("#ge-role").value : "", roleRanks, main: q("#ge-main").value.trim(), tagline: q("#ge-tag").value.trim(), accent: q("#ge-accent").value, stats, sticker, tracking: q("#ge-live") ? q("#ge-live").checked : true, showRank: q("#ge-sr").checked, showStats: q("#ge-ss").checked, showSticker: q("#ge-sk").checked };
    };
    q("#ge-st").onclick = async () => { const im = await pickImage(256, 256); if (im) { sticker = im; q("#ge-st").textContent = "Change sticker"; } };
    if (q("#ge-stx")) q("#ge-stx").onclick = () => { sticker = ""; q("#ge-stx").remove(); };
    q("#ge-close").onclick = closeEdit;
    q("#ge-view").onclick = () => { const keep = (P("myBadges") || {}).games || {}; prefs.myBadges = { games: { ...keep, [key]: collect() } }; openCard("me", key); prefs.myBadges = { games: keep }; };
    q("#ge-save").onclick = async () => {
      const g = collect();
      if (key === "overwatch" && g.handle && !/^[^#\s]{2,32}#\d{3,8}$/.test(g.handle)) { q("#ge-msg").className = "msg bad"; q("#ge-msg").textContent = "A BattleTag looks like Name#1234"; return; }
      await save({ myBadges: { games: { ...myPerson().games, [key]: g } }, badgesDirty: true });
      q("#ge-msg").className = "msg"; q("#ge-msg").textContent = "Saving…";
      showSave(await sendBadges());
    };
    const showSave = (r) => {
      if (r.status === 401 && r.data && r.data.error === "code") { q("#ge-msg").textContent = ""; return askCode(r.data.need || [], r.data.bad || {}); }
      q("#ge-code").hidden = true;
      q("#ge-msg").className = "msg" + (r.ok || r.error === "offline" ? "" : " bad");
      q("#ge-msg").textContent = r.ok ? "Saved" : r.error === "offline" ? "Saved on this computer; it goes up when the badge hub is on" : r.error;
      paintBadges();
    };
    // the first time: Asuka DMs you a code on each side, to prove the accounts are yours
    const askCode = async (need, bad) => {
      const box2 = q("#ge-code"), first = need.some((s2) => bad[s2] === "none" || bad[s2] === "expired");
      box2.hidden = false;
      box2.innerHTML = need.map((s2) => '<label>' + sideName(s2) + ' code<input type="text" inputmode="numeric" maxlength="6" data-code="' + s2 + '" placeholder="123456"></label>').join("") + '<button class="primary" id="gc-ok">Confirm</button><button id="gc-new">Send a new code</button><span class="msg" id="gc-msg"></span>';
      const say = (t, badT) => { box2.querySelector("#gc-msg").className = "msg" + (badT ? " bad" : ""); box2.querySelector("#gc-msg").textContent = t; };
      const sendNew = async () => {
        say("Asking Asuka…");
        const me = P("me"), ids = {}; for (const s2 of need) if (me[s2]) ids[s2] = me[s2].id;
        const r = await hub("POST", "/v1/code", { ids });
        if (!r.ok) return say(r.error === "offline" ? "The badge hub is off" : r.error, true);
        const fails = Object.entries(r.data.failed || {}).map(([s2, why]) => sideName(s2) + ": " + why);
        say((r.data.sent || []).length ? "Asuka sent you a code on " + r.data.sent.map(sideName).join(" and ") + (fails.length ? ". " + fails.join(". ") : "") : fails.join(". "), !(r.data.sent || []).length);
      };
      box2.querySelector("#gc-new").onclick = sendNew;
      box2.querySelector("#gc-ok").onclick = async () => {
        const codes = {}; box2.querySelectorAll("[data-code]").forEach((i) => { if (i.value.trim()) codes[i.dataset.code] = i.value.trim(); });
        say("Checking…");
        const r = await sendBadges(false, codes);
        if (r.status === 401 && r.data && r.data.error === "code") {
          const b2 = r.data.bad || {}, why = Object.entries(b2).map(([s2, w]) => sideName(s2) + ": " + (w === "wrong" ? "that code isn't right" : w === "expired" ? "that code expired, send a new one" : "send a code first")).join(". ");
          return say(why, true);
        }
        showSave(r);
      };
      if (first) await sendNew(); else say(Object.entries(bad).map(([s2, w]) => sideName(s2) + ": " + (w === "wrong" ? "that code isn't right" : "send a new code")).join(". "), true);
    };
    const del = q("#ge-del"); if (del) del.onclick = async () => { const gs = { ...myPerson().games }; delete gs[key]; await save({ myBadges: { games: gs }, badgesDirty: true }); await sendBadges(); closeEdit(); };
  }
  let sending = null;
  async function sendBadges(quiet, codes) {
    if (sending) return sending;
    sending = (async () => {
      const me = P("me"), ids = {}; for (const s2 of SIDES) if (me[s2] && me[s2].id) ids[s2] = me[s2].id;
      if (!Object.keys(ids).length) return { ok: false, error: "Open Fluxer or Discord first" };
      const av = [me.fluxer, me.discord].map((x) => x && x.avatar).find((a) => /^https:\/\//.test(a || "")) || "";
      const r = await hub("POST", "/v1/save", { key: P("hubKey") || undefined, ids, codes: codes || undefined, name: P("myName"), avatar: av, games: myPerson().games });
      if (r.ok) {
        const ch = { badgesDirty: false }; if (r.data.key) ch.hubKey = r.data.key; await save(ch);
        for (const s2 of Object.keys(ids)) { const k = s2 + ":" + ids[s2]; rememberPerson(k, r.data.person); try { $("wv-" + s2).executeJavaScript("window.__bcGBforget && window.__bcGBforget(" + JSON.stringify(k) + ");1").catch(() => {}); } catch {} }
      }
      return r;
    })();
    try { return await sending; } finally { sending = null; }
  }

  // ---------------- app: tray and updates ----------------
  $("opt-tray").onchange = (e) => save({ tray: e.target.checked });
  async function checkUpdate(loud) {
    if (!host.checkUpdate) return;
    if (loud) $("upd-msg").textContent = "Checking…";
    const r = await host.checkUpdate().catch(() => null);
    if (!r) return;
    $("app-ver").textContent = "Version " + r.version;
    $("updbtn").hidden = !r.available;
    if (loud) $("upd-msg").textContent = r.available ? "Version " + r.latest + " is ready" : r.error ? "Couldn't check" : "Up to date";
  }
  const doUpdate = async () => { $("updbtn").textContent = "Updating…"; $("updbtn").disabled = true; const r = await host.applyUpdate(); if (!r.ok) { $("updbtn").textContent = "Update"; $("updbtn").disabled = false; toast("The update didn't work: " + r.error, 6000); } };
  $("updbtn").onclick = doUpdate;
  $("upd-check").onclick = async () => { await checkUpdate(true); if (!$("updbtn").hidden && confirm("Update now? BelleCord restarts.")) doUpdate(); };

  // ---------------- start ----------------
  (async () => {
    try { prefs = (await host.getPrefs()) || {}; } catch { prefs = {}; }
    if (prefs.mode === "home") prefs.mode = "fluxer";
    if (!prefs.theme) prefs.theme = { ...T.DEFAULT_STACK };
    if (prefs.fxColors && typeof prefs.fxColors === "object" && prefs.fxColors.chat) fxColors = prefs.fxColors;
    document.body.dataset.side = P("side") === "discord" ? "discord" : "fluxer";
    document.body.dataset.rail = P("rail") === "one" ? "one" : "cols";
    document.documentElement.style.setProperty("--split", P("split") + "%");
    $("keep-colors").checked = !!P("keepColors"); $("w-str").value = P("wStr"); $("w-blur").value = P("wBlur");
    for (const s of P("todaySeen") || []) seenMsg.add(s);
    const cdLive = (P("countdowns") || []).filter((c) => c.yearly || (nextDate(c.date, false) ?? -1) >= 0);
    if (cdLive.length !== (P("countdowns") || []).length) save({ countdowns: cdLive }); // (one-time countdowns that are over)
    setMode(P("mode"), true);
    tick(); drawLinks(); paintCountdowns(); paintSkins(); paintStudio(); applyAll(); // (in case a site was quicker than your settings)
    setInterval(() => { tick(); if (document.body.dataset.mode === "dash") paintDash(); }, 15000);
    $("opt-tray").checked = P("tray") !== false; checkUpdate(); setInterval(checkUpdate, 6 * 3600000);
    intro(); paintBadges(); if (P("badgesDirty")) sendBadges(true);
  })();
})();
