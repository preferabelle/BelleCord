// back/forward history across modes and in-page navigation
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const SIDES = ["fluxer", "discord"];
  const MAX = 100;
  const past = [], future = [];
  let moving = 0; // suppresses recording while go() is navigating
  const urlOf = (s) => { try { const v = $("wv-" + s); return v && v.getURL ? String(v.getURL() || "") : ""; } catch { return ""; } };
  const here = () => ({ mode: body.dataset.mode || "fluxer", fluxer: urlOf("fluxer"), discord: urlOf("discord") });
  // dashboard is one entry regardless of what the webviews are doing
  const key = (e) => e.mode === "dash" ? "dash" : e.mode === "both" ? "both|" + e.fluxer + "|" + e.discord : e.mode + "|" + e[e.mode];

  let recordT = 0, pending = false;
  function commit() {
    pending = false;
    const e = here();
    if (e.mode !== "dash" && !e[e.mode === "both" ? "fluxer" : e.mode]) return;
    const top = past[past.length - 1];
    // same key: just update the stored URL
    if (top && (key(top) === key(e) || Date.now() < moving)) { past[past.length - 1] = e; return; }
    past.push(e); if (past.length > MAX) past.shift();
    future.length = 0;
    paint();
  }
  // channel load right after a server click merges into the same entry
  function record() { clearTimeout(recordT); pending = true; recordT = setTimeout(commit, 450); }

  // go: set mode first, then pushState each webview so nothing reloads
  function inPage(s, url) {
    const v = $("wv-" + s); if (!v || !url || urlOf(s) === url) return;
    let same = false; try { same = new URL(url).origin === new URL(urlOf(s)).origin; } catch {}
    if (!same) { try { v.loadURL(url); } catch {} return; }
    const u = new URL(url), path = u.pathname + u.search + u.hash;
    v.executeJavaScript("(function(p){if(location.pathname+location.search+location.hash!==p){history.pushState(null,'',p);dispatchEvent(new PopStateEvent('popstate',{state:null}));}return 1})(" + JSON.stringify(path) + ")").catch(() => {});
  }
  function go(e) {
    moving = Date.now() + 800;
    if (body.dataset.mode !== e.mode && window.bcSetMode) window.bcSetMode(e.mode);
    if (e.mode === "fluxer" || e.mode === "both") inPage("fluxer", e.fluxer);
    if (e.mode === "discord" || e.mode === "both") inPage("discord", e.discord);
    paint();
  }
  let lastNav = 0;
  function nav(way) {
    if (Date.now() - lastNav < 250) return; // dedupe mouse button + windows app-command back
    lastNav = Date.now();
    if (pending) { clearTimeout(recordT); commit(); } // flush pending entry first
    if (way === "back") { if (past.length < 2) return; future.push(past.pop()); go(past[past.length - 1]); }
    else { if (!future.length) return; const e = future.pop(); past.push(e); go(e); }
  }
  window.bcNav = nav;

  // record on mode change and webview url change
  new MutationObserver(record).observe(body, { attributes: true, attributeFilter: ["data-mode"] });
  for (const s of SIDES) {
    const v = $("wv-" + s); if (!v) continue;
    v.addEventListener("did-navigate-in-page", (e) => { if (e.isMainFrame !== false) record(); });
    v.addEventListener("did-navigate", record);
  }
  setTimeout(record, 3000);

  // inputs: mouse buttons on the shell, keys, and IPC from main (webview mouse buttons, mac swipe)
  addEventListener("mouseup", (e) => { if (e.button === 3 || e.button === 4) { e.preventDefault(); nav(e.button === 3 ? "back" : "forward"); } });
  addEventListener("keydown", (e) => {
    const mac = (window.bcApp && window.bcApp.platform) === "darwin";
    const back = mac ? e.metaKey && e.key === "[" : e.altKey && !e.ctrlKey && e.key === "ArrowLeft";
    const fwd = mac ? e.metaKey && e.key === "]" : e.altKey && !e.ctrlKey && e.key === "ArrowRight";
    if ((back || fwd) && !(e.target && e.target.matches && e.target.matches("input,textarea,[contenteditable]"))) { e.preventDefault(); nav(back ? "back" : "forward"); }
  });
  if (window.bcApp && window.bcApp.onNav) window.bcApp.onNav(nav);
  // webviews eat mouse buttons 3/4, forward them to the host
  const SIDE_BUTTONS = "(function(){if(window.__bcNavBtn)return 1;window.__bcNavBtn=1;var stop=function(e){if(e.button===3||e.button===4){e.preventDefault();e.stopPropagation();}};addEventListener('mousedown',stop,true);addEventListener('auxclick',stop,true);addEventListener('mouseup',function(e){if(e.button===3||e.button===4){stop(e);console.log('__bcnav:'+(e.button===3?'back':'forward'));}},true);return 1})()";
  for (const s of SIDES) {
    const v = $("wv-" + s); if (!v) continue;
    const hook = () => { try { v.executeJavaScript(SIDE_BUTTONS).catch(() => {}); } catch {} };
    v.addEventListener("dom-ready", hook); setTimeout(hook, 2500);
    v.addEventListener("console-message", (e) => { const m = /^__bcnav:(back|forward)$/.exec(String(e.message || "")); if (m) nav(m[1]); });
  }

  // toolbar arrows
  const css = document.createElement("style");
  css.textContent = "#bcnav{display:inline-flex;gap:2px;-webkit-app-region:no-drag}#bcnav button{width:26px;padding:2px 0;font-size:17px;line-height:1}#bcnav button:disabled{opacity:.35;cursor:default;background:transparent}";
  document.head.appendChild(css);
  const box = document.createElement("span");
  box.id = "bcnav";
  box.innerHTML = '<button class="tb" id="bcback" aria-label="Back">‹</button><button class="tb" id="bcfwd" aria-label="Forward">›</button>';
  const bar = $("bar"); if (bar) bar.insertBefore(box, $("bothbtn") ? $("bothbtn").nextSibling : null);
  const mac = (window.bcApp && window.bcApp.platform) === "darwin";
  $("bcback").title = "Back (" + (mac ? "Cmd+[" : "Alt+Left") + ", or your mouse's back button)";
  $("bcfwd").title = "Forward (" + (mac ? "Cmd+]" : "Alt+Right") + ", or your mouse's forward button)";
  $("bcback").onclick = () => nav("back");
  $("bcfwd").onclick = () => nav("forward");
  function paint() { $("bcback").disabled = past.length < 2; $("bcfwd").disabled = !future.length; }
  paint();
})();
