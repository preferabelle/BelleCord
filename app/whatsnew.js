// What's new, on the dashboard: what came in every update, newest first (the newest one open, the rest a click
// away). It reads the real release notes from GitHub, and shows the copy that came with the app when GitHub can't be
// reached. A "NEW" tag sits on it until you've seen the latest one.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const P = (k, d) => { try { const v = window.bcPref ? window.bcPref(k) : undefined; return v === undefined ? d : v; } catch { return d; } };
  const save = (c) => { try { window.bcSavePref && window.bcSavePref(c); } catch {} };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const numOf = (title) => { const m = /Update\s+(\d+)/i.exec(String(title || "")); return m ? Number(m[1]) : /^BelleCord$/i.test(String(title || "").trim()) ? 1 : 0; };

  // release notes are written like "- **Thing.** what it does": just enough of that, made into a page
  function md(text) {
    const inline = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/ — /g, " - ").replace(/—/g, "-");
    const out = []; let list = null, sub = null;
    const close = () => { if (sub) { list.push("<ul>" + sub.join("") + "</ul>"); sub = null; } if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } };
    for (const raw of String(text || "").replace(/\r/g, "").split("\n")) {
      const line = raw.replace(/\s+$/, "");
      const top = /^[-*]\s+(.*)$/.exec(line), nested = /^\s{2,}[-*]\s+(.*)$/.exec(line);
      if (nested && list) { (sub = sub || []).push("<li>" + inline(nested[1]) + "</li>"); continue; }
      if (top) { if (sub) { list.push("<ul>" + sub.join("") + "</ul>"); sub = null; } (list = list || []).push("<li>" + inline(top[1]) + "</li>"); continue; }
      close();
      if (line.trim()) out.push("<p>" + inline(line.trim()) + "</p>");
    }
    close();
    return out.join("");
  }

  const css = document.createElement("style");
  css.textContent = [
    "#s-new .wn{border-radius:var(--r,8px);background:var(--side);margin-bottom:8px;overflow:hidden}",
    "#s-new .wn summary{cursor:pointer;list-style:none;padding:12px 16px;display:flex;align-items:center;gap:10px;font-weight:700;color:var(--strong)}#s-new .wn summary::-webkit-details-marker{display:none}",
    "#s-new .wn summary::before{content:'▸';color:var(--dim);transition:transform .15s}#s-new .wn[open] summary::before{transform:rotate(90deg)}",
    "#s-new .wn summary small{margin-left:auto;color:var(--dim);font-weight:400;font-size:12px}",
    "#s-new .wn .body{padding:0 18px 12px 34px;font-size:14px;line-height:1.55;color:var(--text)}#s-new .wn .body ul{margin:4px 0;padding-left:18px}#s-new .wn .body li{margin:4px 0}#s-new .wn .body p{margin:6px 0}",
    "#s-new .wn .body b{color:var(--strong)}#s-new .wn .body code{background:var(--bg);border-radius:4px;padding:0 4px}",
    "#s-new .wn.latest{box-shadow:inset 3px 0 0 var(--accent)}",
    "#s-new h2 .newtag,#s-new .wn .newtag{display:inline-block;margin-left:8px;font-size:10px;font-weight:800;letter-spacing:.08em;padding:2px 7px;border-radius:8px;background:#f23f43;color:#fff;vertical-align:middle}",
    "#s-new .more{margin:4px 0 0}",
  ].join("\n");
  document.head.appendChild(css);

  const sec = document.createElement("section");
  sec.className = "sec"; sec.id = "s-new";
  sec.innerHTML = '<h2>What\'s new</h2><div id="wn-list"><p class="dim small">Loading...</p></div>';
  const wrap = $("dash") && $("dash").querySelector(".wrap");
  if (wrap) wrap.insertBefore(sec, wrap.firstChild); else document.body.appendChild(sec);

  let showAll = false, list = [];
  function draw() {
    const box = $("wn-list"); if (!box) return;
    const latest = list[0] ? list[0].n : 0, seen = Number(P("whatsNewSeen", 0)) || 0;
    const h2 = sec.querySelector("h2"); h2.innerHTML = "What's new" + (latest > seen ? '<span class="newtag">NEW</span>' : "");
    const shown = showAll ? list : list.slice(0, 3);
    box.innerHTML = shown.map((u, i) => '<details class="wn' + (i === 0 ? " latest" : "") + '"' + (i === 0 ? " open" : "") + "><summary>" + esc(u.n > 1 ? "Update " + u.n : "The first version") + (u.n > seen && u.n === latest ? '<span class="newtag">NEW</span>' : "") + (u.at ? "<small>" + esc(new Date(u.at).toLocaleDateString()) + "</small>" : "") + '</summary><div class="body">' + (md(u.notes) || '<p class="dim">Small fixes.</p>') + "</div></details>").join("") +
      (list.length > 3 ? '<div class="more"><button id="wn-more">' + (showAll ? "Show fewer" : "Show all " + list.length + " updates") + "</button></div>" : "");
    const mb = $("wn-more"); if (mb) mb.onclick = () => { showAll = !showAll; draw(); };
  }
  // (seen once it's actually on screen on the dashboard)
  setInterval(() => {
    if (!list.length || document.body.dataset.mode !== "dash") return;
    const r = sec.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && Number(P("whatsNewSeen", 0)) < list[0].n) setTimeout(() => { save({ whatsNewSeen: list[0].n }); }, 4000);
  }, 2000);

  async function load() {
    // the copy that came with the app first, then the real notes from GitHub over it
    const byN = new Map();
    for (const u of window.bcWhatsNew || []) byN.set(u.n, { n: u.n, notes: u.notes, at: u.at || null });
    draw2(byN);
    let r = null; try { r = host.whatsNew ? await host.whatsNew() : null; } catch {}
    for (const x of (r && r.list) || []) { const n = numOf(x.title); if (n) byN.set(n, { n, notes: x.notes || (byN.get(n) || {}).notes || "", at: x.at || null }); }
    draw2(byN);
  }
  function draw2(byN) { list = [...byN.values()].sort((a, b) => b.n - a.n); draw(); }
  const wait = setInterval(() => { if (!window.bcPrefsReady) return; clearInterval(wait); load(); }, 200);
})();
