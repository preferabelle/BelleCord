// single-site mode: hides the other side everywhere and doesn't load its webview.
// asked on first run, changeable in App.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const { pref, savePref } = window.bcUtil;
  const name = (s) => (s === "fluxer" ? "Fluxer" : "Discord");
  const other = (s) => (s === "fluxer" ? "discord" : "fluxer");
  const HOME = { fluxer: "https://web.fluxer.app/channels/@me", discord: "https://discord.com/app" };
  const now = () => { const o = pref("only"); return o === "fluxer" || o === "discord" ? o : null; };

  const css = document.createElement("style");
  css.textContent = [
    // hide the unused side
    "body[data-only=discord] #tabs [data-mode=fluxer],body[data-only=fluxer] #tabs [data-mode=discord]{display:none}",
    "body[data-only] #bothbtn,body[data-only] #rail .wall,body[data-only] .layoutsw [data-swap]{display:none}",
    "body[data-only=discord] #rail .col[data-side=fluxer],body[data-only=fluxer] #rail .col[data-side=discord]{display:none}",
    "body[data-only=discord] #fluxer,body[data-only=fluxer] #discord{display:none!important}",
    "body[data-only=discord] #conncard{display:none}",
    "body[data-only] .appcard label:has(#opt-flip){display:none}",
    // first-run prompt
    "#onlybox{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}",
    "#onlybox .ob{width:min(560px,92vw);background:var(--side,#2b2d31);color:var(--text,#dbdee1);border-radius:14px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5)}",
    "#onlybox h2{margin:0 0 6px;font-size:20px;color:var(--strong,#fff)}#onlybox p{margin:0 0 16px;color:var(--dim,#949ba4);font-size:14px}",
    "#onlybox .opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}",
    "#onlybox .opts button{display:flex;flex-direction:column;gap:6px;align-items:center;padding:16px 10px;border-radius:12px;font-size:14px;font-weight:700}",
    "#onlybox .opts small{font-weight:400;color:var(--dim,#949ba4);font-size:12px;line-height:1.3}",
    "#onlybox .note{margin:14px 0 0;font-size:12px;color:var(--dim,#949ba4)}",
    "@media (max-width:520px){#onlybox .opts{grid-template-columns:1fr}}",
  ].join("\n");
  document.head.appendChild(css);

  // unload the unused webview, restore when re-enabled
  function pages(only) {
    for (const s of ["fluxer", "discord"]) {
      const v = $("wv-" + s); if (!v) continue;
      let url = ""; try { url = v.getURL ? v.getURL() : ""; } catch {}
      if (only && s !== only) { if (url && url !== "about:blank") { try { v.stop(); } catch {} try { v.loadURL("about:blank"); } catch { v.setAttribute("src", "about:blank"); } } }
      else if (!url || url === "about:blank") { try { v.loadURL(HOME[s]); } catch { v.setAttribute("src", HOME[s]); } }
    }
  }
  function apply() {
    const only = now();
    if (only) body.dataset.only = only; else delete body.dataset.only;
    if (only) {
      if (body.dataset.side !== only) { if (window.bcPickSide) window.bcPickSide(only); else body.dataset.side = only; } // re-render dashboard + theme studio
      const m = body.dataset.mode;
      if (m && m !== "dash" && m !== only && window.bcSetMode) window.bcSetMode(only, true);
    }
    pages(only);
    relabel();
    const sel = $("opt-only"); if (sel) sel.value = only || "both";
  }
  function choose(v) {
    const only = v === "fluxer" || v === "discord" ? v : null;
    savePref({ only: only || "both" });
    apply();
    if (only && window.bcSetMode && body.dataset.mode !== "dash") window.bcSetMode(only);
  }

  // discord only: 'Fluxer's own' palette falls back to discord's
  let relabelT = 0;
  function relabel() {
    if (now() !== "discord") return;
    const dash = $("dash"); if (!dash) return;
    const w = document.createTreeWalker(dash, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes("Fluxer's own")) n.nodeValue = n.nodeValue.replace(/Fluxer's own/g, "Discord's own");
  }
  new MutationObserver(() => { clearTimeout(relabelT); relabelT = setTimeout(relabel, 120); }).observe(document.getElementById("dash") || document.body, { childList: true, subtree: true, characterData: true });

  // App toggle
  function option() {
    const card = document.querySelector(".appcard");
    if (!card || $("opt-only")) return;
    const l = document.createElement("label");
    l.className = "keep";
    l.innerHTML = 'Use <select id="opt-only"><option value="both">Fluxer and Discord</option><option value="fluxer">Only Fluxer</option><option value="discord">Only Discord</option></select>';
    card.insertBefore(l, card.children[1] || null);
    $("opt-only").value = now() || "both";
    $("opt-only").onchange = (e) => {
      choose(e.target.value);
      const o = now();
      if (window.bcToast) window.bcToast(o ? "Only " + name(o) + " now. " + name(other(o)) + " is hidden and not loaded." : "Fluxer and Discord, both back.");
    };
  }

  // first run: ask after name + intro
  function ask() {
    if (pref("only") !== undefined || $("onlybox")) return;
    const box = document.createElement("div");
    box.id = "onlybox";
    box.innerHTML = '<div class="ob" role="dialog" aria-label="Which do you use?"><h2>Which do you use?</h2><p>BelleCord puts Fluxer and Discord in one window. If you only use one of them, I\'ll hide the other one completely.</p>' +
      '<div class="opts"><button class="primary" data-v="both">Both<small>Fluxer and Discord, side by side</small></button><button data-v="discord">Only Discord<small>No Fluxer anywhere</small></button><button data-v="fluxer">Only Fluxer<small>No Discord anywhere</small></button></div>' +
      '<p class="note">You only pick this once. You can change it any time in the dashboard, in the App section.</p></div>';
    box.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => { box.remove(); choose(b.dataset.v); }));
    document.body.appendChild(box);
  }
  // prefs arrive async; apply right away so the unused side never loads, but hold the prompt until after name/intro
  function whenLoaded(tries) {
    if (!(typeof window.bcPref === "function" && pref("theme") !== undefined)) { if (tries < 200) setTimeout(() => whenLoaded(tries + 1), 100); return; }
    apply(); option(); whenFree(0);
  }
  function whenFree(tries) {
    if ($("namebox") || ($("bcsplash") && !$("bcsplash").hidden)) { if (tries < 600) setTimeout(() => whenFree(tries + 1), 300); return; }
    ask();
  }
  whenLoaded(0);
  setInterval(option, 2000);
})();
