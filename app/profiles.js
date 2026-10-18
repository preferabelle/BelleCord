// People on this computer. Everyone who uses BelleCord here gets their own Fluxer and Discord sign-ins, their own
// side-panel sign-ins (TikTok, Pinterest, X, your links) and their own BelleCord settings (themes, skins, badges,
// countdowns...). The round button at the bottom of the server list swaps between them in one click: a colored
// circle sweeps out from the button, the window reloads as the other person underneath it, and the circle sweeps
// back into the button. Add, rename, recolor, give a picture to, or remove people from its menu.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const A = window.bcApp || {};
  const H = A.profiles || null;
  const now = A.profile || { active: "main", suffix: "", list: [] };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- first: each site opens in this person's own saved sign-in (before anything else touches the sites) ----
  for (const w of document.querySelectorAll("webview[data-part]")) {
    if (w.getAttribute("partition")) continue;
    w.setAttribute("partition", "persist:" + w.dataset.part + (now.suffix || ""));
    w.setAttribute("src", w.dataset.src);
  }

  const COLORS = ["#ff6fa5", "#5865f2", "#23a55a", "#f0b232", "#e0301e", "#00b8d9", "#9b59b6", "#ff8a3d"];
  let list = now.list || [], active = now.active || "main";
  const colorOf = (p, i) => (p && p.color) || COLORS[(i < 0 ? 0 : i) % COLORS.length];
  const nameOf = (p, i) => (p && p.name) || (p && p.id === "main" ? "Me" : "Person " + (i + 1));
  const me = () => list.find((p) => p.id === active) || list[0] || { id: "main" };
  const face = (p, size) => { const i = list.indexOf(p); return '<span class="pf-face" style="--pc:' + esc(colorOf(p, i)) + ";width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.42) + 'px">' + (p && p.pic ? '<img src="' + esc(p.pic) + '" alt="">' : esc(nameOf(p, i).slice(0, 1).toUpperCase())) + "</span>"; };
  const still = () => document.body.dataset.motion === "off" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  const css = document.createElement("style");
  css.textContent = [
    ".pf-face{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--pc) 60%,#fff),var(--pc) 70%);color:#fff;font-weight:800;flex:none;overflow:hidden;text-shadow:0 1px 2px rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}",
    ".pf-face img{width:100%;height:100%;object-fit:cover}",
    // (a slim strip in the bottom-left corner, under the server list: your picture, your name, and the swap arrows)
    "#r-who{display:flex;align-items:center;gap:8px;width:calc(100% - 12px);margin:2px 6px 0;padding:4px 6px;border-radius:10px;background:color-mix(in srgb,var(--bg) 55%,#000);color:var(--text);text-align:left;min-height:34px;transition:background .15s}",
    "#r-who:hover{background:color-mix(in srgb,var(--bg) 35%,#000);filter:none}#r-who .pf-face{transition:transform .25s cubic-bezier(.3,1.4,.5,1)}#r-who:hover .pf-face{transform:scale(1.08)}",
    "#r-who .nm{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--strong);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#r-who .sw{font-size:13px;color:var(--dim);flex:none}",
    "#r-who .dots{display:flex;gap:3px;flex:none}#r-who .dots i{width:7px;height:7px;border-radius:50%;background:var(--c);opacity:.85}",
    "body[data-rail=one] #r-who .nm,body[data-rail=one] #r-who .dots,body[data-rail=one] #r-who .sw{display:none}body[data-rail=one] #r-who{justify-content:center;width:auto;padding:4px;background:transparent}",
    "body[data-only] #r-who .nm,body[data-only] #r-who .dots,body[data-only] #r-who .sw{display:none}body[data-only] #r-who{justify-content:center;width:auto;padding:4px;background:transparent}",
    "#whomenu{position:fixed;left:8px;bottom:52px;width:270px;background:var(--side);border:1px solid var(--line);border-radius:calc(var(--r) * 1.4);padding:8px;z-index:30;box-shadow:0 14px 40px rgba(0,0,0,.45);transform-origin:bottom left}#whomenu .key{margin-left:auto;font-size:10.5px;color:var(--dim);background:var(--raised);border-radius:4px;padding:1px 5px;font-family:inherit}",
    "#whomenu[hidden]{display:none}#whomenu:not([hidden]){animation:pfIn .22s cubic-bezier(.2,1.2,.4,1) both}",
    "@keyframes pfIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}",
    "#whomenu h4{margin:4px 6px 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}",
    "#whomenu .row{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border-radius:calc(var(--r) * .8);background:transparent;text-align:left;color:var(--text)}",
    "#whomenu .row:hover{background:var(--hover);filter:none}#whomenu .row.on{background:var(--sel)}",
    "#whomenu .row b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--strong);font-weight:600}",
    "#whomenu .row small{color:var(--dim);font-size:11px}#whomenu .row .ck{color:var(--accent);font-weight:800}",
    "#whomenu .row .ed{opacity:0;padding:2px 7px;font-size:12px;background:var(--raised)}#whomenu .row:hover .ed,#whomenu .row .ed:focus{opacity:1}",
    "#whomenu .sep{height:1px;background:var(--line);margin:6px 4px}",
    "#whomenu .add{color:var(--accent)}#whomenu .add .plus{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:2px dashed currentColor;font-size:18px;flex:none}",
    "#whomenu form{display:flex;flex-direction:column;gap:8px;padding:6px}#whomenu form input[type=text]{width:100%}",
    "#whomenu .cols{display:flex;gap:6px;flex-wrap:wrap}#whomenu .cols button{width:24px;height:24px;border-radius:50%;padding:0;background:var(--c);box-shadow:inset 0 0 0 2px rgba(255,255,255,.15)}#whomenu .cols button.on{box-shadow:0 0 0 2px var(--side),0 0 0 4px var(--c)}",
    "#whomenu .btns{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}#whomenu .btns .rm{margin-right:auto;color:#f23f43;background:transparent}",
    "#whomenu .note{font-size:11.5px;color:var(--dim);line-height:1.35;margin:0}",
    // the swap: a circle of their color sweeps out of the button, then back into it after the reload
    "#bcswap{position:fixed;inset:0;z-index:2147483601;pointer-events:all;display:flex;align-items:center;justify-content:center}",
    "#bcswap .wipe{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--swapc) 70%,#fff 10%),var(--swapc) 60%,color-mix(in srgb,var(--swapc) 55%,#000));clip-path:circle(0 at var(--sx) var(--sy));transition:clip-path .45s cubic-bezier(.7,0,.25,1)}",
    "#bcswap.open .wipe{clip-path:circle(150vmax at var(--sx) var(--sy))}",
    "#bcswap .card{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;color:#fff;opacity:0;transform:translateY(14px) scale(.9);transition:opacity .35s ease,transform .5s cubic-bezier(.2,1.3,.4,1)}",
    "#bcswap.open .card.show{opacity:1;transform:none}",
    "#bcswap .card .pf-face{box-shadow:0 0 0 4px rgba(255,255,255,.85),0 18px 50px rgba(0,0,0,.35)}",
    "#bcswap .card b{font-size:28px;font-weight:800;text-shadow:0 2px 12px rgba(0,0,0,.3)}#bcswap .card small{font-size:14px;opacity:.85}",
    "#bcswap .dots{display:flex;gap:6px}#bcswap .dots i{width:7px;height:7px;border-radius:50%;background:#fff;opacity:.4;animation:pfDot 1s ease-in-out infinite}#bcswap .dots i:nth-child(2){animation-delay:.15s}#bcswap .dots i:nth-child(3){animation-delay:.3s}",
    "@keyframes pfDot{50%{opacity:1;transform:translateY(-4px)}}",
    "html.bc-swapping #bcswap .wipe{transition:none}",
  ].join("\n");
  document.head.appendChild(css);

  // ---- the button ----
  function drawButton() {
    const bottom = document.querySelector("#rail .bottom");
    if (!bottom) return;
    let b = $("r-who");
    if (!b) {
      b = document.createElement("button");
      b.id = "r-who";
      bottom.appendChild(b); // (the very bottom: the bottom-left corner of the window)
      b.onclick = (e) => { e.stopPropagation(); toggleMenu(); };
      // (right-click: straight back to whoever was on before, no menu)
      b.oncontextmenu = (e) => { e.preventDefault(); const prev = lastOther(); if (prev) swapTo(prev); else toggleMenu(true); };
    }
    const p = me(), i = list.indexOf(p), others = list.filter((x) => x !== p);
    b.innerHTML = face(p, 26) + '<span class="nm">' + esc(nameOf(p, i)) + "</span>" + (others.length ? '<span class="dots">' + others.slice(0, 3).map((x) => '<i style="--c:' + esc(colorOf(x, list.indexOf(x))) + '"></i>').join("") + "</span>" : "") + '<span class="sw">' + (others.length ? "⇅" : "＋") + "</span>";
    b.title = nameOf(p, i) + (others.length ? " · click to swap people (Ctrl+Shift+1 to " + list.length + "), right-click to swap back" : " · click to add someone who shares this computer");
    b.setAttribute("aria-label", b.title);
  }
  // who was on before (remembered between swaps)
  const lastOther = () => { try { const id = localStorage.getItem("bcPrevProfile"); return id && id !== active && list.some((x) => x.id === id) ? id : (list.find((x) => x.id !== active) || {}).id; } catch (e) { return null; } };

  // ---- the menu ----
  let mode = "list", editing = null;
  function toggleMenu(force) {
    let m = $("whomenu");
    if (!m) { m = document.createElement("div"); m.id = "whomenu"; m.hidden = true; document.body.appendChild(m); m.addEventListener("click", (e) => e.stopPropagation()); }
    const open = force !== undefined ? force : m.hidden;
    if (open) { mode = "list"; editing = null; drawMenu(); }
    m.hidden = !open;
    if (open) { const am = $("addmenu"); if (am) am.hidden = true; }
  }
  addEventListener("click", () => { const m = $("whomenu"); if (m && !m.hidden) m.hidden = true; });
  addEventListener("keydown", (e) => { const m = $("whomenu"); if (e.key === "Escape" && m && !m.hidden) m.hidden = true; });

  function drawMenu() {
    const m = $("whomenu"); if (!m) return;
    if (mode === "list") {
      m.innerHTML = "<h4>Who's using BelleCord?</h4>" + list.map((p, i) => '<div class="row' + (p.id === active ? " on" : "") + '" role="button" tabindex="0" data-id="' + esc(p.id) + '">' + face(p, 32) + "<b>" + esc(nameOf(p, i)) + "</b>" + (p.id === active ? '<span class="ck" title="On now">✓</span>' : '<kbd class="key" title="Ctrl+Shift+' + (i + 1) + '">⌃⇧' + (i + 1) + "</kbd>") + '<button class="ed" data-ed="' + esc(p.id) + '" title="Edit">✎</button></div>').join("") +
        '<div class="sep"></div>' + (list.length < 8 ? '<button class="row add" id="pf-add"><span class="plus">+</span><b style="color:inherit">Add someone</b></button>' : "") +
        '<p class="note" style="padding:4px 8px 2px">Each person has their own Fluxer and Discord sign-ins and their own BelleCord look.</p>';
      m.querySelectorAll(".row[data-id]").forEach((r) => {
        const go = () => { if (r.dataset.id !== active) swapTo(r.dataset.id, r); };
        r.onclick = (e) => { if (e.target.closest("[data-ed]")) return; go(); };
        r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
      });
      m.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); mode = "edit"; editing = b.dataset.ed; drawMenu(); }));
      const add = $("pf-add"); if (add) add.onclick = () => { mode = "add"; drawMenu(); };
      return;
    }
    const p = mode === "edit" ? list.find((x) => x.id === editing) : null, i = p ? list.indexOf(p) : list.length;
    let color = p ? colorOf(p, i) : COLORS[list.length % COLORS.length], pic = p ? p.pic || "" : "";
    m.innerHTML = "<h4>" + (p ? "Edit " + esc(nameOf(p, i)) : "Add someone") + '</h4><form id="pf-form"><input type="text" id="pf-name" maxlength="24" placeholder="Their name" value="' + esc(p ? p.name || "" : "") + '">' +
      '<div class="cols">' + COLORS.map((c) => '<button type="button" data-c="' + c + '" style="--c:' + c + '"' + (c === color ? ' class="on"' : "") + ' aria-label="Color"></button>').join("") + "</div>" +
      (p ? '<div class="btns" style="justify-content:flex-start"><button type="button" id="pf-pic">🖼 Picture</button>' + (pic ? '<button type="button" id="pf-nopic">No picture</button>' : "") + '<input type="file" id="pf-file" accept="image/*" hidden></div>' : '<p class="note">They\'ll sign in to Fluxer and Discord once, then it remembers. Your own sign-ins stay exactly as they are.</p>') +
      '<div class="btns">' + (p && p.id !== "main" && p.id !== active ? '<button type="button" class="rm" id="pf-rm">Remove</button>' : "") + '<button type="button" id="pf-cancel">Back</button><button class="primary" type="submit">' + (p ? "Save" : "Add &amp; switch") + "</button></div></form>";
    const inp = $("pf-name"); setTimeout(() => inp.focus(), 30);
    m.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => { color = b.dataset.c; m.querySelectorAll("[data-c]").forEach((x) => x.classList.toggle("on", x === b)); }));
    $("pf-cancel").onclick = () => { mode = "list"; drawMenu(); };
    const fb = $("pf-pic"), file = $("pf-file");
    if (fb) fb.onclick = () => file.click();
    if (file) file.onchange = async () => { const f = file.files && file.files[0]; if (!f) return; pic = await shrink(f); await saveEdit({ id: p.id, pic }); drawMenu(); };
    const np = $("pf-nopic"); if (np) np.onclick = async () => { await saveEdit({ id: p.id, pic: "" }); drawMenu(); };
    const rm = $("pf-rm"); if (rm) rm.onclick = async () => {
      if (!confirm("Remove " + nameOf(p, i) + "? This signs them out of Fluxer and Discord in BelleCord and forgets their BelleCord settings.")) return;
      const r = await H.remove(p.id); if (r && r.list) { list = r.list; drawButton(); } mode = "list"; drawMenu();
    };
    $("pf-form").onsubmit = async (e) => {
      e.preventDefault();
      const name = inp.value.trim();
      if (!name) return inp.focus();
      if (p) { await saveEdit({ id: p.id, name, color }); if (p.id === active) { try { window.bcSavePref && window.bcSavePref({ pilotName: name }); } catch {} } mode = "list"; drawMenu(); return; }
      const r = await H.add({ name, color });
      if (!r || r.error) { alert((r && r.error) || "Couldn't add them."); return; }
      list = r.list; drawButton();
      swapTo(r.id, $("r-who"));
    };
  }
  async function saveEdit(a) { const r = await H.edit(a); if (r && r.list) { list = r.list; drawButton(); } }
  // (a picture is made small and round-friendly before it's saved)
  function shrink(f) {
    return new Promise((res) => {
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => { const s = 112, c = document.createElement("canvas"); c.width = c.height = s; const k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k; c.getContext("2d").drawImage(img, (s - w) / 2, (s - h) / 2, w, h); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.85)); };
      img.onerror = () => res("");
      img.src = url;
    });
  }

  // ---- the swap ----
  function overlay() {
    let o = $("bcswap");
    if (!o) { o = document.createElement("div"); o.id = "bcswap"; o.innerHTML = '<div class="wipe"></div><div class="card"></div>'; document.body.appendChild(o); }
    return o;
  }
  function from(el) {
    const r = ((el && el.querySelector && el.querySelector(".pf-face")) || el || document.body).getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2) + "px", y: Math.round(r.top + r.height / 2) + "px" };
  }
  async function swapTo(id, el) {
    const p = list.find((x) => x.id === id); if (!p || !H) return;
    const i = list.indexOf(p), color = colorOf(p, i);
    toggleMenu(false);
    const o = overlay(), at = from($("r-who"));
    o.style.setProperty("--swapc", color); o.style.setProperty("--sx", at.x); o.style.setProperty("--sy", at.y);
    o.querySelector(".card").innerHTML = face(p, 96) + "<b>" + esc(nameOf(p, i)) + '</b><div class="dots"><i></i><i></i><i></i></div>';
    void o.offsetWidth;
    o.classList.add("open");
    setTimeout(() => o.querySelector(".card").classList.add("show"), still() ? 0 : 180);
    try { sessionStorage.setItem("bcSwapTo", JSON.stringify({ id, color, at: Date.now() })); localStorage.setItem("bcPrevProfile", active); } catch {}
    setTimeout(async () => {
      const r = await H.switchTo(id).catch(() => null);
      if (!r || !r.ok) { try { sessionStorage.removeItem("bcSwapTo"); } catch {} o.classList.remove("open"); o.querySelector(".card").classList.remove("show"); setTimeout(() => o.remove(), 700); }
      // (the window reloads as them, under the cover)
    }, still() ? 50 : 480);
  }
  // after the reload: "Hi, Sam", then the circle sweeps back into the button
  function arrive() {
    let s = null; try { s = JSON.parse(sessionStorage.getItem("bcSwapTo") || "null"); sessionStorage.removeItem("bcSwapTo"); } catch {}
    if (!s || Date.now() - s.at > 15000) return;
    const p = me(), i = list.indexOf(p);
    const o = overlay();
    o.style.setProperty("--swapc", s.color || colorOf(p, i));
    const at = from($("r-who")); o.style.setProperty("--sx", at.x); o.style.setProperty("--sy", at.y);
    o.classList.add("open");
    void o.offsetWidth; // (already fully open: no sweep on the way in, it was hidden under the cover)
    const card = o.querySelector(".card");
    card.innerHTML = face(p, 96) + "<b>Hi, " + esc(nameOf(p, i)) + "!</b><small>Here's your BelleCord</small>";
    card.classList.add("show");
    document.documentElement.classList.remove("bc-swapping");
    setTimeout(() => {
      card.classList.remove("show");
      setTimeout(() => {
        const at2 = from($("r-who")); o.style.setProperty("--sx", at2.x); o.style.setProperty("--sy", at2.y);
        o.classList.remove("open");
        o.style.pointerEvents = "none";
        setTimeout(() => o.remove(), 700);
      }, still() ? 0 : 200);
    }, still() ? 300 : 650);
  }

  // ---- shortcuts: Ctrl+Shift+1 to 8 (Cmd+Shift on a Mac) swaps straight to that person ----
  const byNumber = (n) => { const p = list[n - 1]; if (p && p.id !== active) swapTo(p.id); };
  if (A.onProfileKey) A.onProfileKey(byNumber); // (while you're in Fluxer or Discord)
  addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && /^Digit[1-8]$/.test(e.code)) { e.preventDefault(); byNumber(Number(e.code.slice(5))); } });

  // ---- start ----
  drawButton();
  arrive();
  // (once the settings are in: the first person's name comes from what they told BelleCord, if they never named it here)
  const wait = setInterval(() => {
    if (!window.bcPrefsReady) return;
    clearInterval(wait);
    const p = me(), nm = window.bcPref ? window.bcPref("pilotName") : "";
    if (H && p && !p.name && nm) H.edit({ id: p.id, name: nm }).then((r) => { if (r && r.list) { list = r.list; drawButton(); } }).catch(() => {});
  }, 300);
  window.bcProfiles = { open: () => toggleMenu(true), swapTo };
})();
