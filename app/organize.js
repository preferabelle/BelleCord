// dashboard reorder / hide. order saved in prefs; sections added in later updates keep their default spot
// until moved.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const { pref: P, savePref: save, esc } = window.bcUtil;

  const css = document.createElement("style");
  css.textContent = [
    "#dash .sec.org-off{display:none!important}",
    "#org-btn{position:absolute;top:14px;right:16px;z-index:3;background:color-mix(in srgb,var(--side) 70%,transparent);backdrop-filter:blur(6px);font-size:13px;padding:6px 12px}",
    "body.org-on #org-btn{background:var(--accent);color:var(--onaccent)}",
    "#org-tray{display:none;margin:0 0 18px;padding:14px 16px;border-radius:var(--r,8px);background:var(--side);box-shadow:inset 0 0 0 2px var(--accent)}",
    "body.org-on #org-tray{display:block}",
    "#org-tray .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#org-tray .top b{color:var(--strong)}#org-tray .top .sp{flex:1}",
    "#org-tray .hid{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}#org-tray .hid .none{color:var(--dim);font-size:13px}",
    "#org-tray .hid button{font-size:13px;padding:5px 10px}#org-tray .hid button::before{content:'+ ';color:var(--accent);font-weight:800}",
    ".org-bar{display:none}",
    "body.org-on #dash .sec{position:relative;outline:2px dashed color-mix(in srgb,var(--dim) 55%,transparent);outline-offset:6px;border-radius:var(--r,8px)}",
    "body.org-on #dash .sec>*:not(.org-bar):not(h2){pointer-events:none;opacity:.55}",
    "body.org-on .org-bar{display:flex;position:absolute;top:-2px;right:0;gap:6px;z-index:2}",
    ".org-bar button{font-size:12px;padding:4px 9px}.org-bar .grab{cursor:grab;letter-spacing:-2px}",
    "body.org-on #dash .sec.org-drag{opacity:.4}",
    "body.org-on #dash .sec.org-above{box-shadow:0 -4px 0 var(--accent)}body.org-on #dash .sec.org-below{box-shadow:0 4px 0 var(--accent)}",
  ].join("\n");
  document.head.appendChild(css);

  const wrap = () => $("dash") && $("dash").querySelector(".wrap");
  const sections = () => { const w = wrap(); return w ? [...w.children].filter((e) => e.matches("section.sec") && e.id) : []; };
  const nameOf = (sec) => { const h = sec.querySelector("h2"); return (h ? h.childNodes[0] && h.childNodes[0].nodeType === 3 ? h.childNodes[0].textContent : h.textContent : sec.id).trim(); };
  let order = [], hidden = [], applying = false, editing = false;

  // apply saved order; unknown (new) sections stay put
  function apply() {
    const w = wrap(); if (!w) return;
    applying = true;
    try {
      const secs = sections();
      for (const s of secs) s.classList.toggle("org-off", hidden.includes(s.id));
      const known = secs.filter((s) => order.includes(s.id));
      const sorted = [...known].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      if (sorted.some((s, i) => s !== known[i])) {
        // known sections permute among their own slots
        const marks = known.map((s) => { const m = document.createComment("org"); s.before(m); return m; });
        sorted.forEach((s, i) => marks[i].replaceWith(s));
      }
      if (editing) { for (const s of sections()) bar(s); tray(); }
    } finally { applying = false; }
  }
  function remember() {
    order = sections().map((s) => s.id);
    save({ dashOrder: order, dashHidden: hidden });
  }

  // per-section toolbar in edit mode
  function bar(sec) {
    let b = sec.querySelector(":scope > .org-bar");
    if (!b) {
      b = document.createElement("div"); b.className = "org-bar";
      b.innerHTML = '<button class="grab" title="Drag to move" aria-label="Drag to move">⋮⋮</button><button data-m="-1" title="Move up" aria-label="Move up">↑</button><button data-m="1" title="Move down" aria-label="Move down">↓</button><button data-h title="Hide this section">Hide</button>';
      sec.prepend(b);
      b.querySelectorAll("[data-m]").forEach((x) => (x.onclick = () => move(sec, Number(x.dataset.m))));
      b.querySelector("[data-h]").onclick = () => { hidden = [...new Set([...hidden, sec.id])]; remember(); apply(); };
      const g = b.querySelector(".grab");
      g.onpointerdown = () => { sec.draggable = true; };
    }
    if (!sec.__orgWired) {
      sec.__orgWired = true;
      sec.addEventListener("dragstart", (e) => { if (!editing) return e.preventDefault(); drag = sec; sec.classList.add("org-drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", sec.id); } catch {} });
      sec.addEventListener("dragend", () => { sec.draggable = false; sec.classList.remove("org-drag"); clearMarks(); drag = null; });
      sec.addEventListener("dragover", (e) => { if (!drag || drag === sec) return; e.preventDefault(); clearMarks(); sec.classList.add(below(e, sec) ? "org-below" : "org-above"); });
      sec.addEventListener("drop", (e) => { if (!drag || drag === sec) return; e.preventDefault(); if (below(e, sec)) sec.after(drag); else sec.before(drag); clearMarks(); remember(); apply(); });
    }
  }
  let drag = null;
  const below = (e, sec) => { const r = sec.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
  const clearMarks = () => sections().forEach((s) => s.classList.remove("org-above", "org-below"));
  function move(sec, dir) {
    const shown = sections().filter((s) => !s.classList.contains("org-off"));
    const i = shown.indexOf(sec), other = shown[i + dir];
    if (!other) return;
    if (dir < 0) other.before(sec); else other.after(sec);
    remember(); apply();
    sec.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // top bar in edit mode: hidden sections + buttons
  function tray() {
    const w = wrap(); if (!w) return;
    let t = $("org-tray");
    if (!t) {
      t = document.createElement("div"); t.id = "org-tray";
      t.innerHTML = '<div class="top"><b>Organize your dashboard</b><span class="dim small">Drag sections by ⋮⋮ (or use the arrows). Hide what you don\'t use.</span><span class="sp"></span><button id="org-reset" title="Every section back, in the normal order">Back to normal</button><button class="primary" id="org-done">Done</button></div><div class="dim small" style="margin-top:10px">Hidden:</div><div class="hid" id="org-hid"></div>';
      t.querySelector("#org-reset").onclick = () => { order = []; hidden = []; save({ dashOrder: [], dashHidden: [] }); restoreNormal(); };
      t.querySelector("#org-done").onclick = () => setEditing(false);
    }
    if (t.parentNode !== w || w.firstElementChild !== t) w.prepend(t);
    const list = sections().filter((s) => hidden.includes(s.id));
    $("org-hid").innerHTML = list.length ? list.map((s) => '<button data-back="' + esc(s.id) + '" title="Add it back">' + esc(nameOf(s)) + "</button>").join("") : '<span class="none">Nothing. Press Hide on a section to put it here.</span>';
    $("org-hid").querySelectorAll("[data-back]").forEach((x) => (x.onclick = () => { hidden = hidden.filter((h) => h !== x.dataset.back); remember(); apply(); const s = $(x.dataset.back); if (s) s.scrollIntoView({ block: "center", behavior: "smooth" }); }));
  }
  // default order = original DOM order, saved on first run
  let normal = [];
  function restoreNormal() {
    const w = wrap(); if (!w) return;
    const secs = sections();
    const sorted = [...secs].sort((a, b) => (normal.indexOf(a.id) + 1 || 999) - (normal.indexOf(b.id) + 1 || 999));
    applying = true;
    const marks = secs.map((s) => { const m = document.createComment("org"); s.before(m); return m; });
    sorted.forEach((s, i) => marks[i].replaceWith(s));
    applying = false;
    apply();
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("org-on", on);
    const b = $("org-btn"); if (b) b.textContent = on ? "✓ Done" : "✎ Organize";
    if (on) { apply(); const w = wrap(); if (w) w.scrollIntoView({ block: "start", behavior: "smooth" }); }
    else { const t = $("org-tray"); if (t) t.remove(); sections().forEach((s) => { const b2 = s.querySelector(":scope > .org-bar"); if (b2) b2.remove(); s.draggable = false; }); }
  }

  function button() {
    const hero = $("hero");
    if (!hero || $("org-btn")) return;
    const b = document.createElement("button");
    b.id = "org-btn"; b.textContent = "✎ Organize"; b.title = "Move, hide and bring back dashboard sections";
    b.onclick = (e) => { e.stopPropagation(); setEditing(!editing); };
    hero.appendChild(b);
  }

  // init after prefs; observe for sections added later
  const wait = setInterval(() => {
    if (!window.bcPrefsReady || !wrap()) return;
    clearInterval(wait);
    order = Array.isArray(P("dashOrder", [])) ? P("dashOrder", []) : [];
    hidden = Array.isArray(P("dashHidden", [])) ? P("dashHidden", []) : [];
    const noteNormal = () => { for (const s of sections()) if (!normal.includes(s.id)) { const prev = s.previousElementSibling, at = prev && prev.id ? normal.indexOf(prev.id) : -1; if (at >= 0 && !order.length) normal.splice(at + 1, 0, s.id); else normal.push(s.id); } };
    noteNormal();
    button();
    apply();
    new MutationObserver(() => { if (applying || drag) return; noteNormal(); apply(); }).observe(wrap(), { childList: true });
    // esc exits
    document.addEventListener("keydown", (e) => { if (editing && e.key === "Escape") setEditing(false); });
  }, 200);
  window.bcSecHidden = (id) => hidden.includes(id);
})();
