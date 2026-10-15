// The tutorial: BelleCord, played like a video game's first level. Each mission lights up one part of the app,
// says what it does in a couple of lines, and gives XP. A few missions ask you to actually try the thing (they
// finish by themselves when you do). Enter or → goes on, ← goes back, Esc skips. The 🎮 button in the title bar
// plays it again any time, and so does "Play the tutorial" in App on the dashboard.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const P = (k, d) => { try { const v = window.bcPref ? window.bcPref(k) : undefined; return v === undefined ? d : v; } catch { return d; } };
  const save = (c) => { try { window.bcSavePref && window.bcSavePref(c); } catch {} };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mac = (window.bcApp && window.bcApp.platform) === "darwin";
  const key = (k) => (mac ? "Cmd" : "Ctrl") + "+" + k;
  const only = () => { const o = P("only", null); return o === "fluxer" || o === "discord" ? o : null; }; // (when you only use one side)
  const go = (m) => { try { window.bcSetMode && window.bcSetMode(m); } catch {} };
  const showSec = (id) => { go("dash"); setTimeout(() => { const el = $(id); if (el) el.scrollIntoView({ block: "center", behavior: body.dataset.motion === "off" ? "auto" : "smooth" }); }, 250); };

  // ---------------- the missions ----------------
  // at: what gets lit up (none = the middle of the screen). before: done when the mission starts. try: a little
  // task that finishes the mission by itself. skip: leave it out (for example, the side you don't use).
  const MISSIONS = () => [
    { title: "Welcome, pilot", xp: 0, text: () => "Hi " + esc(P("pilotName", "") || "there") + "! This is BelleCord, Fluxer and Discord in one window. I'll show you around. It takes about two minutes.<br><br><b>Enter</b> or <b>→</b> goes on, <b>←</b> goes back, <b>Esc</b> skips it." },
    { at: "#tabs", title: "Two worlds", xp: 50, skip: () => !!only(), before: () => go(body.dataset.side || "fluxer"),
      text: () => "These switch between Fluxer and Discord. Both are the real websites, signed in as you, so everything works like it normally does.<br><br>Shortcuts: <b>" + key(1) + "</b> Fluxer, <b>" + key(2) + "</b> Discord.",
      try: { what: "Switch to the other side", done: (s) => body.dataset.side !== s.side, start: () => ({ side: body.dataset.side }) } },
    { at: "#bothbtn", title: "Split screen", xp: 50, skip: () => !!only(),
      text: () => "This puts Fluxer and Discord side by side (<b>" + key(3) + "</b>). Drag the line in the middle to make one side bigger.",
      try: { what: "Open both at once", done: () => body.dataset.mode === "both" } },
    { at: "#rail .scroll", title: "Your servers", xp: 50, before: () => { if (body.dataset.mode === "dash") go(body.dataset.side || "fluxer"); },
      text: () => (only() ? "All your servers, in one list. Click one to go there." : "All your servers from both apps, in one list: Fluxer's on one side, Discord's on the other. Click one to go there.") + " Drag them to sort them, or drop one on another to make a folder." },
    { at: ".layoutsw", title: "Your layout", xp: 25, skip: () => !!only(), text: () => "Two lists side by side, or one long list. Pick whichever feels better." },
    { at: "#r-dm", title: "Messages", xp: 25, text: () => "Your DMs, for whichever side you're on." },
    { at: "#r-add", title: "New servers", xp: 25, text: () => "Join or make a server on either side." },
    { at: "#links", title: "Quick links", xp: 25, text: () => "TikTok, Pinterest, X and any site you add open in a panel on the side, so you never have to leave." },
    { at: "#bcnav", title: "Time travel", xp: 25, skip: () => !$("bcnav"), text: () => "Back and forward, like a browser. Your mouse's side buttons work too, and so do <b>Alt+←</b> and <b>Alt+→</b>." },
    { at: "#r-dash", title: "Home base", xp: 50, text: () => "The dashboard (<b>" + key(4) + "</b>). Everything that's only in BelleCord lives here. Right-click it to change its picture.",
      try: { what: "Open the dashboard", done: () => body.dataset.mode === "dash" } },
    { at: "#s-theme", title: "Theme studio", xp: 50, before: () => showSec("s-theme"), text: () => "Change how BelleCord, Fluxer and Discord look, all at the same time. Stuck? <b>🎲 Surprise me</b> picks a whole look at random." },
    { at: "#s-inbox", title: "Inbox", xp: 25, before: () => showSec("s-inbox"), text: () => "Mentions and replies from both sides land here, so nothing slips by." },
    { at: "#s-jump", title: "Jump in", xp: 25, before: () => showSec("s-jump"), text: () => "Voice channels with people in them right now. Click one to join." },
    { at: "#s-who", title: "Who's around", xp: 25, before: () => showSec("s-who"), text: () => "Who's online right now." },
    { at: "#s-cd", title: "Countdowns", xp: 25, before: () => showSec("s-cd"), text: () => "Birthdays, game launches, anything. They take turns in the title bar." },
    { at: "#s-skins", title: "Skins", xp: 50, before: () => showSec("s-skins"), text: () => "Make your own look (a name, a color, a picture and a wallpaper) and wear one on each side." },
    { at: "#s-badges", title: "Game badges", xp: 50, before: () => showSec("s-badges"), text: () => "Show your ranks next to your name. Overwatch, Minecraft, Roblox, Dota 2, the chess sites and more fill in from your real profile." },
    { at: "#s-perf", title: "Performance", xp: 50, skip: () => !$("s-perf"), before: () => showSec("s-perf"), text: () => "If your computer feels slow, pick <b>Light</b> or <b>Battery saver</b>. The numbers at the top show what BelleCord is using right now." },
    { at: "#s-app", title: "Settings", xp: 25, before: () => showSec("s-app"), text: () => "Your name, swapping the sides, animations and updates. If Fluxer ever won't load, <b>🔧 Fix Fluxer</b> is here too." },
    { at: "#tutbtn", title: "Replay", xp: 25, text: () => "This plays the tutorial again whenever you want." },
    { title: "Mission complete", end: true, xp: 100, text: () => "That's everything. You're officially a BelleCord pilot." },
  ];

  // ---------------- the look ----------------
  const css = document.createElement("style");
  css.textContent = [
    "#tutbtn{font-size:14px;padding:2px 8px}",
    "#bctut{position:fixed;inset:0;z-index:99990;pointer-events:none;font-family:var(--font,system-ui,sans-serif)}",
    "#bctut .dim{position:fixed;inset:0;background:rgba(5,5,10,.72);pointer-events:auto}#bctut.lit .dim{background:transparent;pointer-events:none}",
    "#bctut .hole{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(5,5,10,.72),0 0 0 3px var(--accent,#5865f2),0 0 24px 6px color-mix(in srgb,var(--accent,#5865f2) 60%,transparent);transition:all .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}",
    "#bctut .hole::after{content:'';position:absolute;inset:-8px;border-radius:16px;border:2px solid var(--accent,#5865f2);opacity:.6;animation:bcTping 1.6s ease-out infinite}",
    "@keyframes bcTping{0%{transform:scale(.96);opacity:.7}100%{transform:scale(1.08);opacity:0}}",
    "#bctut .card{position:fixed;width:min(380px,calc(100vw - 32px));background:linear-gradient(160deg,#1b1c22,#121318);color:#e8e9ee;border:1px solid #ffffff1f;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6);pointer-events:auto;overflow:hidden;transition:left .35s cubic-bezier(.2,.8,.2,1),top .35s cubic-bezier(.2,.8,.2,1)}",
    "#bctut .top{display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(90deg,#e0301e,#7c2bd9);font-weight:800;letter-spacing:.08em;font-size:11px;color:#fff;text-transform:uppercase}",
    "#bctut .top .lv{margin-left:auto;background:#0006;border-radius:6px;padding:2px 7px}",
    "#bctut .in{padding:14px 16px 12px;display:flex;gap:12px}",
    "#bctut .face{flex:none;width:44px;height:44px;border-radius:12px;background:radial-gradient(circle at 30% 30%,#ff6b5a,#e0301e 55%,#5a0d07);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 0 2px #ffffff22}",
    "#bctut h3{margin:0 0 4px;font-size:17px;color:#fff}#bctut p{margin:0;font-size:14px;line-height:1.5;color:#c9cbd3}#bctut b{color:#fff}",
    "#bctut .quest{margin:10px 16px 0;padding:8px 10px;border:1px dashed #f0b23288;border-radius:8px;font-size:13px;color:#ffd76a;display:flex;gap:8px;align-items:center}",
    "#bctut .quest.done{border-style:solid;border-color:#23a55a;color:#7ee2a8}",
    "#bctut .xp{margin:12px 16px 0;height:8px;background:#ffffff14;border-radius:4px;overflow:hidden;position:relative}",
    "#bctut .xp i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f0b232,#ff7ab6);border-radius:4px;transition:width .6s cubic-bezier(.2,.8,.2,1)}",
    "#bctut .xpline{display:flex;justify-content:space-between;margin:4px 16px 0;font-size:11px;color:#8b8e99;font-weight:700;letter-spacing:.04em}",
    "#bctut .btns{display:flex;gap:8px;padding:12px 16px 14px;align-items:center}",
    "#bctut .btns button{border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;background:#ffffff14;color:#e8e9ee}",
    "#bctut .btns .next{margin-left:auto;background:linear-gradient(90deg,#e0301e,#c2185b);color:#fff;box-shadow:0 4px 14px #e0301e55}",
    "#bctut .btns .skip{background:transparent;color:#8b8e99;padding:8px 6px}",
    "#bctut .pop{position:fixed;font-weight:900;font-size:18px;color:#ffd76a;text-shadow:0 2px 8px #000;pointer-events:none;animation:bcTpop 1s ease-out forwards}",
    "@keyframes bcTpop{0%{transform:translateY(0) scale(.7);opacity:0}20%{opacity:1;transform:translateY(-6px) scale(1.1)}100%{transform:translateY(-40px) scale(1);opacity:0}}",
    "#bctut .end{text-align:center;padding:18px 16px 4px}#bctut .end .rank{font-size:46px;line-height:1}#bctut .end h3{font-size:22px;margin:8px 0 4px}",
    "#bctut .conf{position:fixed;top:-10px;width:8px;height:14px;border-radius:2px;pointer-events:none;animation:bcTfall linear forwards}",
    "@keyframes bcTfall{to{transform:translateY(105vh) rotate(720deg)}}",
    "#bctut .card.bump{animation:bcTbump .35s ease-out}@keyframes bcTbump{0%{transform:scale(.96)}60%{transform:scale(1.02)}100%{transform:scale(1)}}",
    "body[data-motion=off] #bctut *{animation:none!important;transition:none!important}",
    "#tuthint{position:fixed;top:40px;right:160px;z-index:9000;background:#1b1c22;border:1px solid #f0b23288;color:#ffd76a;border-radius:10px;padding:8px 12px;font-size:13px;box-shadow:0 8px 24px #0008;cursor:pointer}",
    "#tuthint::before{content:'';position:absolute;top:-6px;right:24px;width:10px;height:10px;background:#1b1c22;border-left:1px solid #f0b23288;border-top:1px solid #f0b23288;transform:rotate(45deg)}",
  ].join("\n");
  document.head.appendChild(css);

  // ---------------- the buttons that start it ----------------
  const bar = $("bar");
  if (bar && !$("tutbtn")) {
    const b = document.createElement("button");
    b.id = "tutbtn"; b.className = "tb"; b.title = "Tutorial: how to use BelleCord"; b.setAttribute("aria-label", "Tutorial"); b.textContent = "🎮";
    b.onclick = () => start();
    const before = $("updbtn") || $("links");
    if (before) bar.insertBefore(b, before); else bar.appendChild(b);
  }
  const appCard = document.querySelector("#s-app .appcard");
  if (appCard && !$("tut-again")) {
    const b = document.createElement("button");
    b.id = "tut-again"; b.textContent = "🎮 Play the tutorial";
    b.onclick = () => start();
    appCard.appendChild(b);
  }

  // ---------------- playing it ----------------
  let list = [], i = 0, xp = 0, root = null, trying = null, tryTimer = null, startedFrom = null;
  const total = () => list.reduce((n, m) => n + (m.xp || 0), 0);
  function start() {
    stop(true);
    list = MISSIONS().filter((m) => !(m.skip && m.skip()));
    i = 0; xp = 0; startedFrom = body.dataset.mode;
    root = document.createElement("div");
    root.id = "bctut";
    root.innerHTML = '<div class="dim"></div><div class="hole" hidden></div><div class="card" role="dialog" aria-label="Tutorial"></div>';
    document.body.appendChild(root);
    root.querySelector(".dim").onclick = (e) => e.stopPropagation();
    addEventListener("keydown", onKey, true);
    addEventListener("resize", place);
    const h = $("tuthint"); if (h) h.remove();
    show();
  }
  function stop(quiet) {
    clearInterval(tryTimer); trying = null;
    removeEventListener("keydown", onKey, true);
    removeEventListener("resize", place);
    if (root) { root.remove(); root = null; }
    if (!quiet) save({ tutDone: true });
  }
  function onKey(e) {
    if (!root) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stop(); return; }
    if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); next(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); back(); }
  }
  function next() {
    const m = list[i];
    if (m && m.end) { stop(); if (startedFrom && startedFrom !== body.dataset.mode && startedFrom !== "dash") go(startedFrom); return; }
    if (m && !m.got) { m.got = true; gain(m.xp); }
    i = Math.min(list.length - 1, i + 1);
    show();
  }
  function back() { if (i > 0) { i--; show(); } }
  function gain(n) {
    if (!n) return;
    xp += n;
    const card = root && root.querySelector(".card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    const p = document.createElement("div");
    p.className = "pop"; p.textContent = "+" + n + " XP";
    p.style.left = r.right - 90 + "px"; p.style.top = r.top - 10 + "px";
    root.appendChild(p); setTimeout(() => p.remove(), 1000);
  }
  function target(m) {
    if (!m.at) return null;
    const el = document.querySelector(m.at);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }
  function show() {
    if (!root) return;
    clearInterval(tryTimer); trying = null;
    const m = list[i];
    if (m.before) { try { m.before(); } catch {} }
    const level = i + 1, n = list.length;
    const card = root.querySelector(".card");
    const pct = Math.round((xp / Math.max(1, total())) * 100);
    if (m.end) {
      const all = total();
      card.innerHTML = '<div class="top">🏁 Mission complete<span class="lv">' + n + " / " + n + '</span></div><div class="end"><div class="rank">🏆</div><h3>Rank: BelleCord Pilot</h3><p>' + m.text() + "</p></div>" +
        '<div class="xp"><i style="width:100%"></i></div><div class="xpline"><span>' + all + " XP</span><span>MAX</span></div>" +
        '<div class="btns"><button class="back">←</button><button class="next">Finish ▶</button></div>';
      confetti();
    } else {
      card.innerHTML = '<div class="top">' + (i === 0 ? "▶ Tutorial" : "Mission " + (level - 1)) + '<span class="lv">' + level + " / " + n + "</span></div>" +
        '<div class="in"><div class="face">' + (i === 0 ? "👋" : "⭐") + "</div><div><h3>" + esc(m.title) + "</h3><p>" + m.text() + "</p></div></div>" +
        (m.try ? '<div class="quest" id="tq">🎯 <span>Try it: ' + esc(m.try.what) + "</span></div>" : "") +
        '<div class="xp"><i style="width:' + pct + '%"></i></div><div class="xpline"><span>' + xp + " XP</span><span>" + (m.xp ? "+" + m.xp + " XP for this one" : "Press Enter to start") + "</span></div>" +
        '<div class="btns">' + (i > 0 ? '<button class="back" title="Back (←)">←</button>' : "") + '<button class="skip" title="Esc">Skip tutorial</button><button class="next">' + (i === 0 ? "Start ▶" : "Next ▶") + "</button></div>";
    }
    const bk = card.querySelector(".back"); if (bk) bk.onclick = back;
    const sk = card.querySelector(".skip"); if (sk) sk.onclick = () => stop();
    card.querySelector(".next").onclick = next;
    card.classList.remove("bump"); void card.offsetWidth; card.classList.add("bump");
    // a little task: it finishes the mission by itself when you do it
    if (m.try) {
      const st = m.try.start ? m.try.start() : {};
      trying = m;
      tryTimer = setInterval(() => {
        if (trying !== m || !root) return;
        if (m.try.done(st)) {
          clearInterval(tryTimer);
          const q = $("tq"); if (q) { q.classList.add("done"); q.innerHTML = "✅ <span>Nice! Mission done.</span>"; }
          setTimeout(() => { if (trying === m && list[i] === m) next(); }, 900);
        }
      }, 250);
    }
    // (the page may still be moving into place, so the light finds its spot again a moment later)
    place(); setTimeout(place, 300); setTimeout(place, 700);
  }
  function place() {
    if (!root) return;
    const m = list[i], hole = root.querySelector(".hole"), card = root.querySelector(".card");
    const r = target(m);
    root.classList.toggle("lit", !!r);
    if (!r) {
      hole.hidden = true;
      card.style.left = Math.round((innerWidth - card.offsetWidth) / 2) + "px";
      card.style.top = Math.round((innerHeight - card.offsetHeight) / 2) + "px";
      return;
    }
    const pad = 6;
    hole.hidden = false;
    Object.assign(hole.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    // the card goes where there's room: below, above, right, then left
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 16, M = 12;
    let x, y;
    if (r.bottom + gap + ch < innerHeight - M) { y = r.bottom + gap; x = r.left; }
    else if (r.top - gap - ch > M) { y = r.top - gap - ch; x = r.left; }
    else if (r.right + gap + cw < innerWidth - M) { x = r.right + gap; y = r.top; }
    else { x = r.left - gap - cw; y = r.top; }
    x = Math.max(M, Math.min(innerWidth - cw - M, x));
    y = Math.max(M, Math.min(innerHeight - ch - M, y));
    card.style.left = Math.round(x) + "px"; card.style.top = Math.round(y) + "px";
  }
  function confetti() {
    if (body.dataset.motion === "off" || !root) return;
    const colors = ["#e0301e", "#f0b232", "#ff7ab6", "#5865f2", "#23a55a", "#ffffff"];
    for (let k = 0; k < 70; k++) {
      const c = document.createElement("i");
      c.className = "conf";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[k % colors.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.8 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      root.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }
  window.bcTutorial = { start, stop };

  // the first time: a little note pointing at the 🎮 (once, after the intro and the name box are gone)
  const wait = setInterval(() => {
    if (!window.bcPrefsReady) return;
    clearInterval(wait);
    if (P("tutDone", false) || P("tutHinted", false)) return;
    setTimeout(() => {
      if ($("namebox") || ($("bcsplash") && !$("bcsplash").hidden) || $("onlybox") || $("bctut")) return; // (try again next time)
      const h = document.createElement("div");
      h.id = "tuthint"; h.textContent = "New here? Press 🎮 for a quick tutorial.";
      h.onclick = () => { h.remove(); start(); };
      const b = $("tutbtn");
      if (b) { const r = b.getBoundingClientRect(); h.style.right = Math.max(8, innerWidth - r.right - 20) + "px"; }
      document.body.appendChild(h);
      save({ tutHinted: true });
      setTimeout(() => h.remove(), 15000);
    }, 4500);
  }, 300);
})();
