// Back and forward, like a web browser, but for BelleCord: every server, channel and DM you open (on either side)
// and every switch between Fluxer, Discord, both and the dashboard is a step you can go back to. Use the arrows
// in the top bar, the back and forward buttons on the side of your mouse, Alt+Left / Alt+Right (Cmd+[ and Cmd+]
// on a Mac) or a swipe on a Mac trackpad.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const SIDES = ["fluxer", "discord"];
  const MAX = 100;
  const past = [], future = [];
  let moving = 0; // (while I'm taking you somewhere, the steps that causes aren't new steps)
  const urlOf = (s) => { try { const v = $("wv-" + s); return v && v.getURL ? String(v.getURL() || "") : ""; } catch { return ""; } };
  const here = () => ({ mode: body.dataset.mode || "fluxer", fluxer: urlOf("fluxer"), discord: urlOf("discord") });
  // only what you can see counts: the dashboard is one place, whatever Fluxer and Discord are doing behind it
  const key = (e) => e.mode === "dash" ? "dash" : e.mode === "both" ? "both|" + e.fluxer + "|" + e.discord : e.mode + "|" + e[e.mode];

  let recordT = 0, pending = false;
  function commit() {
    pending = false;
    const e = here();
    if (e.mode !== "dash" && !e[e.mode === "both" ? "fluxer" : e.mode]) return; // (the side hasn't loaded yet)
    const top = past[past.length - 1];
    // the same place (or the page settling after I took you somewhere): that step just gets its exact address
    if (top && (key(top) === key(e) || Date.now() < moving)) { past[past.length - 1] = e; return; }
    past.push(e); if (past.length > MAX) past.shift();
    future.length = 0;
    paint();
  }
  // (opening a server opens its channel right after: that's one step, not two)
  function record() { clearTimeout(recordT); pending = true; recordT = setTimeout(commit, 450); }

  // going to a place: the side first, then each page to its address (inside the page, so nothing reloads)
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
    if (Date.now() - lastNav < 250) return; // (one press can arrive two ways: the mouse button and Windows' own "back")
    lastNav = Date.now();
    if (pending) { clearTimeout(recordT); commit(); } // (a step that was still settling counts first)
    if (way === "back") { if (past.length < 2) return; future.push(past.pop()); go(past[past.length - 1]); }
    else { if (!future.length) return; const e = future.pop(); past.push(e); go(e); }
  }
  window.bcNav = nav;

  // what counts as a step: switching sides, and the address changing in Fluxer or Discord
  new MutationObserver(record).observe(body, { attributes: true, attributeFilter: ["data-mode"] });
  for (const s of SIDES) {
    const v = $("wv-" + s); if (!v) continue;
    v.addEventListener("did-navigate-in-page", (e) => { if (e.isMainFrame !== false) record(); });
    v.addEventListener("did-navigate", record);
  }
  setTimeout(record, 3000);

  // ways in: the mouse's side buttons over BelleCord's own parts, the keys, and the app (mouse buttons and keys inside
  // Fluxer or Discord, and Mac swipes)
  addEventListener("mouseup", (e) => { if (e.button === 3 || e.button === 4) { e.preventDefault(); nav(e.button === 3 ? "back" : "forward"); } });
  addEventListener("keydown", (e) => {
    const mac = (window.bcApp && window.bcApp.platform) === "darwin";
    const back = mac ? e.metaKey && e.key === "[" : e.altKey && !e.ctrlKey && e.key === "ArrowLeft";
    const fwd = mac ? e.metaKey && e.key === "]" : e.altKey && !e.ctrlKey && e.key === "ArrowRight";
    if ((back || fwd) && !(e.target && e.target.matches && e.target.matches("input,textarea,[contenteditable]"))) { e.preventDefault(); nav(back ? "back" : "forward"); }
  });
  if (window.bcApp && window.bcApp.onNav) window.bcApp.onNav(nav);
  // inside Fluxer and Discord the mouse's side buttons go to their page, not to BelleCord, so each page gets a tiny
  // listener that passes those two buttons on (nothing else)
  const SIDE_BUTTONS = "(function(){if(window.__bcNavBtn)return 1;window.__bcNavBtn=1;var stop=function(e){if(e.button===3||e.button===4){e.preventDefault();e.stopPropagation();}};addEventListener('mousedown',stop,true);addEventListener('auxclick',stop,true);addEventListener('mouseup',function(e){if(e.button===3||e.button===4){stop(e);console.log('__bcnav:'+(e.button===3?'back':'forward'));}},true);return 1})()";
  for (const s of SIDES) {
    const v = $("wv-" + s); if (!v) continue;
    const hook = () => { try { v.executeJavaScript(SIDE_BUTTONS).catch(() => {}); } catch {} };
    v.addEventListener("dom-ready", hook); setTimeout(hook, 2500);
    v.addEventListener("console-message", (e) => { const m = /^__bcnav:(back|forward)$/.exec(String(e.message || "")); if (m) nav(m[1]); });
  }

  // the arrows in the top bar
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
