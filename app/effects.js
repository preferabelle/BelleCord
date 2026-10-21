// star reaction effects injected into both sites: glow at 2+, next-milestone tag (3/5/7), burst on new star.
// hides the bot's fallback sparkle reactions. toggle in perf; static when motion is off.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function PAGE(on, still) {
    window.__bcStarOn = on; window.__bcStarStill = still;
    if (window.__bcStars) { window.__bcStarsDress && window.__bcStarsDress(); return 1; }
    window.__bcStars = true;
    var STEPS = [[3, "💗"], [5, "✨"], [7, "🏆"]], FX = ["🌠", "💫", "🎇", "🎆"];
    var PILLS = 'button[data-flx^="channel.message-reactions.message-reaction-item.reaction-button"],button[class*="MessageReactions.module__reactionButton"],button[class*="MessageReactions_reactionButton"],div[class*="reactionInner"]';
    var st = document.createElement("style");
    st.textContent = [
      "@keyframes bcSglow{0%,100%{box-shadow:0 0 0 1px #f0b23255,0 0 6px #f0b23244}50%{box-shadow:0 0 0 1px #f0b232aa,0 0 14px #f0b23288}}",
      "@keyframes bcStw{0%,100%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1) translateY(-3px)}80%{opacity:0;transform:scale(.6) translateY(-8px)}}",
      "@keyframes bcSpop{0%{transform:translate(0,0) scale(.6);opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1.1);opacity:0}}",
      "@keyframes bcSshine{0%{background-position:-120% 0}100%{background-position:220% 0}}",
      "@keyframes bcSbump{0%{transform:scale(1)}35%{transform:scale(1.25)}100%{transform:scale(1)}}",
      "[data-bcslv]{position:relative;overflow:visible!important;border:1px solid #f0b232!important;border-radius:8px;background:linear-gradient(135deg,#3b3020,#2b2d31)!important;animation:bcSglow 1.8s ease-in-out infinite}",
      "[data-bcslv]::before{content:'✦';position:absolute;top:-7px;left:-3px;font-size:9px;color:#ffd76a;pointer-events:none;animation:bcStw 1.9s ease-in-out infinite}",
      "[data-bcsnext]::after{content:attr(data-bcsnext);position:absolute;left:50%;top:-17px;transform:translateX(-50%);font-size:10px;font-weight:700;line-height:14px;color:#ffd76a;background:#1e1f22e6;border:1px dashed #f0b23288;border-radius:7px;padding:0 5px;white-space:nowrap;pointer-events:none;z-index:2}",
      "[data-bcslv='3']{background:linear-gradient(135deg,#4a2a3a,#3b3020)!important;border-color:#ff7ab6!important}",
      "[data-bcslv='5']{background:linear-gradient(110deg,#3b3020 20%,#6b5520 45%,#3b3020 70%)!important;background-size:220% 100%!important;animation:bcSglow 1.4s ease-in-out infinite,bcSshine 2.4s linear infinite}",
      "[data-bcslv='7']{background:linear-gradient(110deg,#5a3d10 15%,#c9952b 45%,#5a3d10 75%)!important;background-size:220% 100%!important;color:#fff!important;animation:bcSglow 1.1s ease-in-out infinite,bcSshine 1.8s linear infinite}",
      "[data-bcsbump]{animation:bcSbump .45s ease-out,bcSglow 1.8s ease-in-out infinite!important}",
      ".bcSspark{position:fixed;pointer-events:none;z-index:99999;font-size:13px;animation:bcSpop .8s ease-out forwards}",
      "html[data-bcsstill] [data-bcslv],html[data-bcsstill] [data-bcslv]::before{animation:none!important}",
      "@media (prefers-reduced-motion: reduce){[data-bcslv],[data-bcslv]::before,.bcSspark{animation:none!important}}",
    ].join("\n");
    document.head.appendChild(st);
    var seen = new WeakMap();
    function emojiOf(p) { var img = p.querySelector("img"); return (img ? String(img.getAttribute("alt") || "") : "") + "|" + (img ? String(img.getAttribute("src") || "") : "") + "|" + (img ? "" : String(p.textContent || "")); }
    function isStar(p) { var e = emojiOf(p); return /^⭐\|/.test(e) || /^:?star:?\|/i.test(e) || /(^|[\/_-])2b50([._-]|$)/i.test(e) || /\|\|.*⭐/.test(e); }
    function isFx(p) { var e = emojiOf(p); for (var i = 0; i < FX.length; i++) if (e.indexOf(FX[i]) >= 0) return true; return false; }
    function count(p) { var w = p.querySelector('[data-flx$="count-wrapper"],[class*="countWrapper"],[class*="reactionCount"]') || p; var m = /\d+/.exec(w.textContent || ""); return m ? Number(m[0]) : 0; }
    function holder(p) { return p.matches('div[class*="reactionInner"]') && p.parentElement ? p.parentElement : p; } // discord: whole pill
    function burst(p, big) {
      if (window.__bcStarStill) return;
      var r = p.getBoundingClientRect();
      if (!r.width) return;
      var n = big ? 14 : 8, chars = big ? ["⭐", "✦", "✨", "💛"] : ["✦", "⭐", "✧"];
      for (var i = 0; i < n; i++) {
        var s = document.createElement("span");
        s.className = "bcSspark"; s.textContent = chars[i % chars.length];
        var a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = (big ? 34 : 22) + Math.random() * 14;
        s.style.left = r.left + r.width / 2 - 6 + "px"; s.style.top = r.top + r.height / 2 - 8 + "px";
        s.style.setProperty("--x", Math.cos(a) * d + "px"); s.style.setProperty("--y", Math.sin(a) * d - 6 + "px");
        document.body.appendChild(s);
        (function (el) { setTimeout(function () { el.remove(); }, 900); })(s);
      }
      p.setAttribute("data-bcsbump", "1");
      setTimeout(function () { p.removeAttribute("data-bcsbump"); }, 500);
    }
    function clear(p) { p.removeAttribute("data-bcslv"); p.removeAttribute("data-bcsnext"); }
    function dress() {
      if (window.__bcStarStill) document.documentElement.setAttribute("data-bcsstill", ""); else document.documentElement.removeAttribute("data-bcsstill");
      var list = document.querySelectorAll(PILLS);
      for (var i = 0; i < list.length; i++) {
        var pill = list[i], p = holder(pill), n = count(pill);
        // hide the bot's sparkle reactions
        if (isFx(pill)) { var off = n <= 1; if (off && p.style.display !== "none") { p.style.display = "none"; p.setAttribute("data-bcfx", "1"); } else if (!off && p.getAttribute("data-bcfx")) { p.style.display = ""; p.removeAttribute("data-bcfx"); } continue; }
        if (!window.__bcStarOn || !isStar(pill)) { if (p.hasAttribute("data-bcslv")) clear(p); continue; }
        var lv = n >= 7 ? "7" : n >= 5 ? "5" : n >= 3 ? "3" : n >= 2 ? "2" : null;
        if (lv) { if (p.getAttribute("data-bcslv") !== lv) p.setAttribute("data-bcslv", lv); } else clear(p);
        var next = null;
        for (var k = 0; k < STEPS.length; k++) if (STEPS[k][0] > n) { next = STEPS[k]; break; }
        var tag = lv && next ? "+" + (next[0] - n) + " → " + next[1] : null;
        if (tag) { if (p.getAttribute("data-bcsnext") !== tag) p.setAttribute("data-bcsnext", tag); } else p.removeAttribute("data-bcsnext");
        var before = seen.get(pill);
        if (before !== undefined && n > before && n >= 2) burst(p, STEPS.some(function (x) { return x[0] === n; }));
        seen.set(pill, n);
      }
    }
    window.__bcStarsDress = dress;
    var t = null;
    new MutationObserver(function () { if (!t) t = setTimeout(function () { t = null; dress(); }, 80); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    dress();
    return 1;
  }

  const on = () => !window.bcPerf || window.bcPerf.opt("starFx");
  const still = () => document.body.dataset.motion === "off";
  function put(side) {
    const w = $("wv-" + side);
    if (!w || !w.executeJavaScript) return;
    try { w.executeJavaScript("(" + PAGE.toString() + ")(" + JSON.stringify(on()) + "," + JSON.stringify(still()) + ")").catch(() => {}); } catch {}
  }
  for (const side of ["fluxer", "discord"]) { const w = $("wv-" + side); if (w) w.addEventListener("dom-ready", () => setTimeout(() => put(side), 1500)); }
  // re-apply periodically (spa navigation, setting changes)
  setInterval(() => { if (window.bcPrefsReady) { put("fluxer"); put("discord"); } }, 5000);
})();
