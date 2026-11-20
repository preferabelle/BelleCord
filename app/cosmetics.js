// (Update 21) Belle's profile, the way she made it: her theme colors over her whole profile card, her avatar
// decoration, her profile effect, her nameplate in the member list, and her name's style and pronouns, on both sides
// (Discord and Fluxer), the same as in her own BelleCord. She sets them; the badge hub hands them out; this draws them.
// Nobody else's profile is touched, and nothing is sent anywhere.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  if (!host.hub) return;
  const SIDES = ["fluxer", "discord"];
  let data = { people: [], art: {} }, sig = "";

  const CXSRC = "  // ---------------------------------------------------------------- Belle's profile cosmetics: how they're drawn\n  // (the same drawing code is in my panel, utils/panel-v120.js, and in everyone's BelleCord, app/cosmetics.js)\n  const CX = {};\n  const H = (s) => String(s == null ? \"\" : s).replace(/[&<>\"']/g, (c) => ({ \"&\": \"&amp;\", \"<\": \"&lt;\", \">\": \"&gt;\", '\"': \"&quot;\", \"'\": \"&#39;\" })[c]);\n  const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || \"\")) ? String(c) : null);\n  // avatar decorations: drawn around a 100-wide avatar in a 120x120 box (my own designs)\n  CX.DECOS = {\n    hearts: { name: \"Hearts\", svg: '<g fill=\"#ff5c8a\" stroke=\"#fff\" stroke-width=\"1.5\"><path d=\"M18 30c-3-6 5-10 8-4 3-6 11-2 8 4l-8 8z\"/><path d=\"M92 22c-3-6 5-10 8-4 3-6 11-2 8 4l-8 8z\"/><path d=\"M98 92c-3-6 5-10 8-4 3-6 11-2 8 4l-8 8z\"/><path d=\"M8 84c-2.4-4.8 4-8 6.4-3.2 2.4-4.8 8.8-1.6 6.4 3.2l-6.4 6.4z\"/></g><circle cx=\"60\" cy=\"60\" r=\"54\" fill=\"none\" stroke=\"#ff8fb1\" stroke-width=\"3\" stroke-dasharray=\"2 7\" stroke-linecap=\"round\"/>' },\n    stars: { name: \"Stars\", svg: '<g fill=\"#ffd166\"><path class=\"tw\" d=\"M20 14l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z\"/><path class=\"tw d2\" d=\"M100 26l2.4 5.6 5.6.8-4 4 .8 5.6-4.8-2.4-4.8 2.4.8-5.6-4-4 5.6-.8z\"/><path class=\"tw d3\" d=\"M102 96l2 5 5 .5-3.6 3.4.8 5-4.2-2.4-4.4 2.4 1-5-3.6-3.4 5-.5z\"/><path class=\"tw d2\" d=\"M14 92l1.6 4 4 .4-3 2.8.8 4-3.4-2-3.4 2 .8-4-3-2.8 4-.4z\"/></g><circle cx=\"60\" cy=\"60\" r=\"55\" fill=\"none\" stroke=\"#ffd166\" stroke-opacity=\".55\" stroke-width=\"2\"/>' },\n    flowers: { name: \"Flower crown\", svg: '<g><circle cx=\"60\" cy=\"60\" r=\"54\" fill=\"none\" stroke=\"#7bc47f\" stroke-width=\"4\" stroke-dasharray=\"70 400\" stroke-dashoffset=\"-280\"/>' + [[26, 22, \"#ff9ec7\"], [44, 10, \"#ffd1e8\"], [60, 6, \"#ff7aa8\"], [76, 10, \"#ffe08a\"], [94, 22, \"#c9a7ff\"]].map(([x, y, c]) => '<g transform=\"translate(' + x + \" \" + y + ')\"><circle r=\"5\" cx=\"-4\" fill=\"' + c + '\"/><circle r=\"5\" cx=\"4\" fill=\"' + c + '\"/><circle r=\"5\" cy=\"-4\" fill=\"' + c + '\"/><circle r=\"5\" cy=\"4\" fill=\"' + c + '\"/><circle r=\"3\" fill=\"#fff3b0\"/></g>').join(\"\") + \"</g>\" },\n    cat: { name: \"Cat ears\", svg: '<path d=\"M22 34 30 4l24 22z\" fill=\"#2b2d31\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M98 34 90 4 66 26z\" fill=\"#2b2d31\" stroke=\"#fff\" stroke-width=\"2\"/><path d=\"M29 26 33 12l10 10z\" fill=\"#ff9ec7\"/><path d=\"M91 26 87 12 77 22z\" fill=\"#ff9ec7\"/>' },\n    halo: { name: \"Halo\", svg: '<ellipse cx=\"60\" cy=\"9\" rx=\"30\" ry=\"7\" fill=\"none\" stroke=\"#ffe27a\" stroke-width=\"4.5\"/><ellipse cx=\"60\" cy=\"9\" rx=\"30\" ry=\"7\" fill=\"none\" stroke=\"#fff6c7\" stroke-width=\"1.5\"/><circle cx=\"60\" cy=\"60\" r=\"55\" fill=\"none\" stroke=\"#fff6c7\" stroke-opacity=\".35\" stroke-width=\"2\"/>' },\n    flames: { name: \"Flames\", svg: '<defs><linearGradient id=\"bcfl\" x1=\"0\" y1=\"1\" x2=\"0\" y2=\"0\"><stop offset=\"0\" stop-color=\"#ff3d00\"/><stop offset=\".6\" stop-color=\"#ff9100\"/><stop offset=\"1\" stop-color=\"#ffe57f\"/></linearGradient></defs><g fill=\"url(#bcfl)\">' + [[22, 112, 0.9], [44, 120, 1.1], [60, 122, 1.25], [76, 120, 1.1], [98, 112, 0.9]].map(([x, y, k]) => '<g transform=\"translate(' + x + \" \" + y + \") scale(\" + k + ')\"><path class=\"fl\" d=\"M0 0c-9-4-11-14-5-22 0 6 4 8 6 5 1-7-2-11 3-17 2 9 8 13 7 21-1 8-5 13-11 13z\"/></g>').join(\"\") + \"</g>\" },\n    ring: { name: \"Sparkle ring\", svg: '<defs><linearGradient id=\"bcrg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ff6fa5\"/><stop offset=\".5\" stop-color=\"#a78bfa\"/><stop offset=\"1\" stop-color=\"#60a5fa\"/></linearGradient></defs><circle cx=\"60\" cy=\"60\" r=\"55\" fill=\"none\" stroke=\"url(#bcrg)\" stroke-width=\"5\"/><g fill=\"#fff\"><path class=\"tw\" d=\"M60 0l2 4 4 2-4 2-2 4-2-4-4-2 4-2z\"/><path class=\"tw d2\" d=\"M112 58l1.6 3.2 3.2 1.6-3.2 1.6-1.6 3.2-1.6-3.2-3.2-1.6 3.2-1.6z\"/><path class=\"tw d3\" d=\"M22 104l1.6 3.2 3.2 1.6-3.2 1.6-1.6 3.2-1.6-3.2-3.2-1.6 3.2-1.6z\"/></g>' },\n    snow: { name: \"Snowflakes\", svg: '<g stroke=\"#e0f2ff\" stroke-width=\"2\" stroke-linecap=\"round\">' + [[18, 22, 1], [102, 20, 0.8], [106, 100, 1], [14, 98, 0.7], [60, 4, 0.6]].map(([x, y, k]) => '<g transform=\"translate(' + x + \" \" + y + \") scale(\" + k + ')\"><g class=\"tw\"><path d=\"M0-8v16M-7-4l14 8M-7 4l14-8\"/></g></g>').join(\"\") + '</g><circle cx=\"60\" cy=\"60\" r=\"55\" fill=\"none\" stroke=\"#bfe3ff\" stroke-opacity=\".5\" stroke-width=\"2\"/>' },\n  };\n  // profile effects: little things moving across the whole card\n  CX.EFFECTS = { sparkles: \"Sparkles\", snow: \"Snowfall\", petals: \"Petals\", hearts: \"Floating hearts\", stars: \"Starfield\", aurora: \"Aurora\", confetti: \"Confetti\", bubbles: \"Bubbles\" };\n  CX.PLATES = {\n    sunset: { name: \"Sunset\", bg: \"linear-gradient(90deg,rgba(255,111,97,.38),rgba(255,195,113,.12) 70%,transparent)\" },\n    ocean: { name: \"Ocean\", bg: \"linear-gradient(90deg,rgba(0,184,217,.35),rgba(88,101,242,.12) 70%,transparent)\" },\n    sakura: { name: \"Sakura\", bg: \"linear-gradient(90deg,rgba(255,158,199,.4),rgba(255,209,232,.12) 70%,transparent)\" },\n    galaxy: { name: \"Galaxy\", bg: \"radial-gradient(circle at 12% 50%,rgba(167,139,250,.5),transparent 45%),linear-gradient(90deg,rgba(76,29,149,.45),transparent 80%)\" },\n    forest: { name: \"Forest\", bg: \"linear-gradient(90deg,rgba(35,165,90,.38),rgba(16,94,58,.12) 70%,transparent)\" },\n    candy: { name: \"Candy\", bg: \"repeating-linear-gradient(115deg,rgba(255,158,199,.28) 0 10px,rgba(167,139,250,.2) 10px 20px),linear-gradient(90deg,transparent 60%,rgba(0,0,0,.25))\" },\n    midnight: { name: \"Midnight\", bg: \"linear-gradient(90deg,rgba(15,23,42,.85),rgba(30,58,138,.25) 70%,transparent)\" },\n    gold: { name: \"Gold\", bg: \"linear-gradient(90deg,rgba(240,178,50,.42),rgba(255,230,150,.12) 70%,transparent)\" },\n  };\n  CX.FONTS = { default: { name: \"Default\", css: \"\" }, bold: { name: \"Bold\", css: \"font-weight:800;letter-spacing:.01em\" }, serif: { name: \"Serif\", css: \"font-family:Georgia,'Times New Roman',serif;font-weight:700\" }, mono: { name: \"Mono\", css: \"font-family:Consolas,'SF Mono',Menlo,monospace;font-weight:700\" }, script: { name: \"Script\", css: \"font-family:'Segoe Script','Brush Script MT',cursive;font-weight:700\" }, round: { name: \"Round\", css: \"font-family:'Arial Rounded MT Bold','Segoe UI',sans-serif;font-weight:800\" }, wide: { name: \"Wide\", css: \"font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.92em\" } };\n  CX.NAMEFX = { solid: \"Solid\", gradient: \"Gradient\", neon: \"Neon\", toon: \"Toon\", pop: \"Pop\" };\n  CX.css = `\n.bcx-deco{position:absolute;pointer-events:none;z-index:4;left:50%;top:50%;width:120%;height:120%;transform:translate(-50%,-50%)}\n.bcx-deco svg,.bcx-deco img{width:100%;height:100%;display:block;overflow:visible}\n.bcx-deco .tw{animation:bcxTw 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.bcx-deco .d2{animation-delay:.8s}.bcx-deco .d3{animation-delay:1.6s}\n.bcx-deco .fl{animation:bcxFl 1.2s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center bottom}\n@keyframes bcxTw{0%,100%{opacity:.45;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}\n@keyframes bcxFl{from{transform:scaleY(.94)}to{transform:scaleY(1.06)}}\n.bcx-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;border-radius:inherit}\n.bcx-fx i{position:absolute;display:block;will-change:transform,opacity}\n.bcx-fx.sparkles i{width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px rgba(255,255,255,.7);animation:bcxTw 2.2s ease-in-out infinite}\n.bcx-fx.stars i{width:2px;height:2px;border-radius:50%;background:#fff;animation:bcxTw 3s ease-in-out infinite}\n.bcx-fx.snow i{width:6px;height:6px;border-radius:50%;background:#fff;opacity:.85;animation:bcxFall linear infinite}\n.bcx-fx.petals i{width:10px;height:7px;border-radius:70% 0 70% 0;background:#ffb7d0;animation:bcxFallSway linear infinite}\n.bcx-fx.confetti i{width:6px;height:10px;animation:bcxFallSpin linear infinite}\n.bcx-fx.hearts i{font-style:normal;font-size:14px;color:#ff6b9a;animation:bcxRise ease-in infinite}\n.bcx-fx.bubbles i{width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(255,255,255,.7);animation:bcxRise ease-in infinite}\n.bcx-fx.aurora{background:linear-gradient(120deg,rgba(35,165,90,.0),rgba(35,212,190,.28),rgba(167,139,250,.3),rgba(35,165,90,0));background-size:300% 300%;animation:bcxAur 9s ease-in-out infinite;mix-blend-mode:screen}\n@keyframes bcxFall{from{transform:translateY(-20px)}to{transform:translateY(520px)}}\n@keyframes bcxFallSway{0%{transform:translate(0,-20px) rotate(0)}50%{transform:translate(18px,240px) rotate(160deg)}100%{transform:translate(-6px,520px) rotate(320deg)}}\n@keyframes bcxFallSpin{from{transform:translateY(-20px) rotate(0)}to{transform:translateY(520px) rotate(720deg)}}\n@keyframes bcxRise{0%{transform:translateY(0) scale(.7);opacity:0}15%{opacity:1}100%{transform:translateY(-480px) scale(1.1);opacity:0}}\n@keyframes bcxAur{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}\n@media (prefers-reduced-motion: reduce){.bcx-fx i,.bcx-fx.aurora,.bcx-deco .tw,.bcx-deco .fl{animation:none!important}}\n.bcx-name-gradient{-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}\n`;\n  CX.decoHtml = (d, artBase) => {\n    if (!d) return \"\";\n    if (d.art) return '<img src=\"' + H(artBase + d.art) + '\" alt=\"\">';\n    const p = CX.DECOS[d.id];\n    return p ? '<svg viewBox=\"0 0 120 120\" aria-hidden=\"true\">' + p.svg + \"</svg>\" : \"\";\n  };\n  CX.effectEl = (e, artBase) => {\n    if (!e) return null;\n    const box = document.createElement(\"div\");\n    box.className = \"bcx-fx\";\n    if (e.art) { box.style.background = 'url(\"' + String(artBase + e.art).replace(/\"/g, \"\") + '\") center/cover no-repeat'; return box; }\n    if (!CX.EFFECTS[e.id]) return null;\n    box.classList.add(e.id);\n    if (e.id === \"aurora\") return box;\n    const n = { sparkles: 14, stars: 40, snow: 26, petals: 16, confetti: 22, hearts: 10, bubbles: 10 }[e.id] || 12;\n    const COL = [\"#ff6fa5\", \"#ffd166\", \"#60a5fa\", \"#23a55a\", \"#a78bfa\", \"#ff8a3d\"];\n    let h = \"\";\n    for (let i = 0; i < n; i++) {\n      const x = Math.random() * 100, y = Math.random() * 100, dl = (Math.random() * 6).toFixed(2), du = (4 + Math.random() * 6).toFixed(2);\n      if (e.id === \"sparkles\" || e.id === \"stars\") h += '<i style=\"left:' + x + \"%;top:\" + y + \"%;animation-delay:-\" + dl + 's\"></i>';\n      else if (e.id === \"hearts\") h += '<i style=\"left:' + x + \"%;bottom:-20px;animation-duration:\" + du + \"s;animation-delay:-\" + dl + 's\">♥</i>';\n      else if (e.id === \"bubbles\") h += '<i style=\"left:' + x + \"%;bottom:-20px;animation-duration:\" + du + \"s;animation-delay:-\" + dl + 's\"></i>';\n      else h += '<i style=\"left:' + x + \"%;top:-20px;animation-duration:\" + du + \"s;animation-delay:-\" + dl + \"s\" + (e.id === \"confetti\" ? \";background:\" + COL[i % COL.length] : \"\") + '\"></i>';\n    }\n    box.innerHTML = h;\n    return box;\n  };\n  CX.nameStyle = (ns) => {\n    if (!ns) return \"\";\n    const f = (CX.FONTS[ns.font] || CX.FONTS.default).css;\n    const c1 = okColor(ns.c1), c2 = okColor(ns.c2) || c1;\n    let fx = \"\";\n    if (c1 && ns.fx === \"gradient\") fx = \"background-image:linear-gradient(90deg,\" + c1 + \",\" + c2 + \")!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;\";\n    else if (c1 && ns.fx === \"neon\") fx = \"color:\" + c1 + \"!important;text-shadow:0 0 6px \" + c1 + \",0 0 14px \" + (c2 || c1) + \";\";\n    else if (c1 && ns.fx === \"toon\") fx = \"color:\" + c1 + \"!important;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,2px 2px 0 \" + (c2 || \"#000\") + \";\";\n    else if (c1 && ns.fx === \"pop\") fx = \"color:\" + c1 + \"!important;text-shadow:2px 2px 0 \" + (c2 || \"rgba(0,0,0,.4)\") + \";\";\n    else if (c1) fx = \"color:\" + c1 + \"!important;\";\n    return f + (f ? \";\" : \"\") + fx;\n  };\n  CX.nameClass = (ns) => (ns && ns.fx === \"gradient\" && okColor(ns.c1) ? \"bcx-name-gradient\" : \"\");\n  CX.plateBg = (p, artBase) => (!p ? \"\" : p.art ? 'url(\"' + String(artBase + p.art).replace(/\"/g, \"\") + '\") center/cover no-repeat' : (CX.PLATES[p.id] || {}).bg || \"\");\n  CX.themeBg = (t) => {\n    const a = okColor(t && t.primary), b = okColor(t && t.accent) || a;\n    if (!a) return \"\";\n    return \"linear-gradient(\" + (Number(t.angle) || 180) + \"deg,\" + a + \",\" + b + \")\";\n  };\n  // the dark wash Discord puts over a profile theme, so text stays readable\n  CX.themeOverlay = \"linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.6))\";\n";
  // the page part: drawing code (shared with Belle's panel) plus finding profiles and names
  const PAGE = "(" + function (side) {
    if (!window.__bcCX) {
      window.__bcCX = (function () { /*CXSRC*/ return CX; })();
      var st = document.createElement("style");
      st.textContent = window.__bcCX.css +
        ".bcx-themed{background:var(--bcx-ov),var(--bcx-theme)!important}" +
        ".bcx-themed [class*='inner_'],.bcx-themed [class*='body_'],.bcx-themed [class*='overlayBackground_']{background:transparent!important}" +
        ".bcx-plate{background:var(--bcx-plate)!important;border-radius:6px}" +
        ".bcx-pron{font-size:14px;line-height:18px;margin-top:2px;color:var(--text-normal,#dbdee1)}" +
        ".bcx-avw{position:relative!important}";
      (document.head || document.documentElement).appendChild(st);
    }
    var CX = window.__bcCX;
    var who = {}; // "discord:id" -> cosmetics (art already turned into pictures)
    var ids = { discord: [], fluxer: [] };
    var idOf = function (img) { var m = String((img && (img.currentSrc || img.src)) || "").match(/\/avatars\/(\d{5,25})\//); return m ? m[1] : null; };
    var mineIn = function (box) {
      if (side === "fluxer") { var a = box.querySelector("[data-flx-user-id]"); if (a && who["fluxer:" + a.getAttribute("data-flx-user-id")]) return who["fluxer:" + a.getAttribute("data-flx-user-id")]; }
      var ims = box.querySelectorAll("img"); for (var i = 0; i < ims.length && i < 8; i++) { var id = idOf(ims[i]); if (id && who[side + ":" + id]) return who[side + ":" + id]; }
      return null;
    };
    var nameStyle = function (el, c) {
      if (!el || !c.nameStyle) return;
      var css = CX.nameStyle(c.nameStyle);
      if (el.__bcx === css) return;
      el.__bcx = css; el.style.cssText += ";" + css;
      if (CX.nameClass(c.nameStyle)) el.classList.add("bcx-name-gradient");
    };
    var dressCard = function (card, c) {
      if (card.__bcxDone === c.__sig) return;
      card.__bcxDone = c.__sig;
      var t = CX.themeBg(c.theme);
      if (t) { card.classList.add("bcx-themed"); card.style.setProperty("--bcx-theme", t); card.style.setProperty("--bcx-ov", CX.themeOverlay); }
      // the decoration, around the biggest avatar in the card
      var av = null, best = 0, ims = card.querySelectorAll("img");
      for (var i = 0; i < ims.length; i++) { var w = ims[i].getBoundingClientRect().width; if (idOf(ims[i]) && w > best) { best = w; av = ims[i]; } }
      var html = CX.decoHtml(c.deco, "");
      if (av && html) {
        var wrap = av.parentElement;
        if (wrap && !wrap.querySelector(":scope > .bcx-deco")) {
          wrap.classList.add("bcx-avw");
          var d = document.createElement("div"); d.className = "bcx-deco"; d.innerHTML = html; wrap.appendChild(d);
        }
      }
      if (c.effect && !card.querySelector(":scope > .bcx-fx")) { var fx = CX.effectEl(c.effect, ""); if (fx) { if (getComputedStyle(card).position === "static") card.style.position = "relative"; card.appendChild(fx); } }
      // the name and pronouns
      var nm = side === "discord" ? card.querySelector("[class*='nickname_'],h1,h2") : card.querySelector("[data-flx*='display-name'],[data-flx*='username'],h1,h2");
      nameStyle(nm, c);
      if (c.pronouns && nm && !card.querySelector(".bcx-pron")) { var p = document.createElement("div"); p.className = "bcx-pron"; p.textContent = c.pronouns; (nm.parentElement || nm).after(p); }
    };
    // (Update 21) this person's own Discord profile colors, as Discord draws them on their own profile: sent once
    // to the badge hub so Belle's BelleCord can show them (a bot can't see profile themes)
    var themeSent = "";
    var myTheme = function () {
      if (side !== "discord" || !window.__bcCXme) return;
      var els = document.querySelectorAll("[style*='--profile-gradient-primary-color']");
      for (var i = 0; i < els.length; i++) {
        var box = els[i], id = null, ims = box.querySelectorAll("img");
        for (var j = 0; j < ims.length && !id; j++) id = idOf(ims[j]);
        if (id !== window.__bcCXme) continue;
        var cs = getComputedStyle(box), a = cs.getPropertyValue("--profile-gradient-primary-color").trim(), b = cs.getPropertyValue("--profile-gradient-secondary-color").trim();
        var hex = function (c) { var m = c.match(/^#([0-9a-f]{6})$/i); if (m) return "#" + m[1].toLowerCase(); m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map(function (x) { return (+x).toString(16).padStart(2, "0"); }).join("") : null; };
        var t = { primary: hex(a), accent: hex(b) || hex(a) };
        if (!t.primary) continue;
        var sig = t.primary + t.accent;
        if (sig !== themeSent) { themeSent = sig; console.log("__bcth:" + JSON.stringify(t)); }
        return;
      }
    };
    var scan = function () {
      try { myTheme(); } catch (e) {}
      try {
        // profile cards (popouts and the big one)
        var cards = side === "discord"
          ? document.querySelectorAll("[class*='userPopoutOuter_'],[class*='userProfileOuter_'],[class*='userProfileModalOuter_'],[class*='user-profile-popout']")
          : document.querySelectorAll("[data-flx='user.profile.profile-card'],[data-flx^='user.user-profile-modal'],[data-flx*='profile-popout']");
        for (var i = 0; i < cards.length; i++) { var c = mineIn(cards[i]); if (c) dressCard(cards[i], c); }
        if (side === "fluxer" && !cards.length) {
          var bs = document.querySelectorAll('[data-flx="user.profile.profile-card.profile-card-user-info.badge-container"],[data-flx="user.user-profile-modal.user-info.div--5"]');
          for (var j = 0; j < bs.length; j++) { for (var up = bs[j], n = 0; up && n < 12; up = up.parentElement, n++) { var cc = mineIn(up); if (cc && up.getBoundingClientRect().width > 220) { dressCard(up, cc); break; } } }
        }
        // my name on messages and in the member list
        for (var s2 in who) {
          if (s2.indexOf(side + ":") !== 0) continue;
          var c2 = who[s2], id = s2.slice(side.length + 1);
          var ims = document.querySelectorAll("img[src*='/avatars/" + id + "/']");
          for (var k = 0; k < ims.length && k < 60; k++) {
            var im = ims[k];
            if (side === "discord") {
              var msg = im.closest("[class*='contents_']");
              if (msg) { nameStyle(msg.querySelector("[class*='username_']"), c2); continue; }
              var row = im.closest("[class*='member_'],[class*='memberInner_']");
              if (row) {
                nameStyle(row.querySelector("[class*='username_'],[class*='name_'] span,[class*='name_']"), c2);
                var plate = CX.plateBg(c2.nameplate, "");
                if (plate && !row.classList.contains("bcx-plate")) { row.classList.add("bcx-plate"); row.style.setProperty("--bcx-plate", plate); }
              }
            } else {
              var m2 = im.closest("[data-flx*='message']");
              if (m2) { nameStyle(m2.querySelector("[data-flx*='author'],[data-flx*='username']"), c2); continue; }
              var r2 = im.closest("[data-flx*='member-list-item'],[data-flx*='member']");
              if (r2) {
                nameStyle(r2.querySelector("[data-flx*='name']"), c2);
                var pl2 = CX.plateBg(c2.nameplate, "");
                if (pl2 && !r2.classList.contains("bcx-plate")) { r2.classList.add("bcx-plate"); r2.style.setProperty("--bcx-plate", pl2); }
              }
            }
          }
        }
      } catch (e) {}
    };
    window.__bcCXset = function (people) {
      who = {};
      (people || []).forEach(function (p) { (p.ids || []).forEach(function (k) { who[k] = p.c; }); });
      scan();
    };
    if (!window.__bcCXt) window.__bcCXt = setInterval(function () { if (!document.hidden) scan(); }, 900);
    return 1;
  }.toString().replace("/*CXSRC*/", () => CXSRC) + ")";

  // what the hub says (every 10 minutes), with Belle's own pictures fetched once
  async function load() {
    const r = await host.hub("GET", "/v1/cosmetics").catch(() => null);
    if (!r || !r.ok || !r.data || !Array.isArray(r.data.people)) return;
    const people = [];
    for (const p of r.data.people.slice(0, 4)) {
      const c = JSON.parse(JSON.stringify((p && p.c) || {}));
      for (const k of ["deco", "effect", "nameplate"]) {
        const a = c[k] && c[k].art;
        if (!a) continue;
        if (!(a in data.art)) data.art[a] = (host.hubArt ? await host.hubArt(a).catch(() => null) : null) || null;
        if (data.art[a]) c[k] = { art: data.art[a] }; else delete c[k];
      }
      c.__sig = String(p.at || "") + JSON.stringify(c).length;
      people.push({ ids: (p.ids || []).filter((k) => /^(discord|fluxer):\d{5,25}$/.test(k)), c });
    }
    data.people = people;
    const s2 = JSON.stringify(people);
    if (s2 !== sig) { sig = s2; for (const side of SIDES) push(side); }
  }
  let prefs = {};
  const myId = () => (prefs.me && prefs.me.discord && prefs.me.discord.id) || "";
  function push(side) {
    const v = $("wv-" + side);
    if (!v || !v.executeJavaScript) return;
    v.executeJavaScript(PAGE + "(" + JSON.stringify(side) + ");window.__bcCXme=" + JSON.stringify(myId()) + ";window.__bcCXset(" + JSON.stringify(data.people) + ");1").catch(() => {});
  }
  // (my own profile colors, from my own Discord page: the badge hub keeps them, only from this account's BelleCord)
  const dv = $("wv-discord");
  if (dv) dv.addEventListener("console-message", (e) => {
    const m = String(e.message || "");
    if (!m.startsWith("__bcth:")) return;
    let t = null; try { t = JSON.parse(m.slice(7)); } catch (x) { return; }
    const sig = JSON.stringify(t);
    if (!myId() || prefs.themeSent === sig) return;
    host.hub("POST", "/v1/theme", { ids: { discord: myId() }, install: prefs.installId || "", theme: t }).then((r) => { if (r && r.ok) { prefs.themeSent = sig; host.setPrefs && host.setPrefs({ themeSent: sig }); } }).catch(() => {});
  });
  for (const side of SIDES) { const v = $("wv-" + side); if (v) v.addEventListener("dom-ready", () => setTimeout(() => push(side), 1500)); }
  setTimeout(async () => { try { prefs = (await host.getPrefs()) || {}; } catch (e) {} for (const side of SIDES) push(side); load(); }, 6000);
  setInterval(load, 10 * 60000);
})();
