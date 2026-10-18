// Your bridge bot, on the dashboard: BridgeCord (a bot that joins a Fluxer community and a Discord server into one)
// running on this computer while the app is open. Paste the two bot tokens, press Start, claim it, invite it.
// The work is done by bridgebot.cjs; this is only the box you see.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const B = (window.bcApp || {}).bridgeBot;
  const open = (u) => { try { window.bcApp.openExternal(u); } catch {} };
  const toast = (t, ms) => { try { window.bcToast && window.bcToast(t, ms); } catch {} };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (!B) return;
  const GUIDE = "https://github.com/preferabelle/BridgeCord#readme";
  const HOW = "https://github.com/preferabelle/BridgeCord/blob/main/INSTALL.txt";

  const css = document.createElement("style");
  css.textContent = [
    "#s-bot .bbtop{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#s-bot .pill{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--bg);color:var(--dim)}",
    "#s-bot .pill.on{background:#23a55a33;color:#3ec97a}#s-bot .pill.busy{background:#f0b23233;color:#f0b232}#s-bot .pill.bad{background:#f2353533;color:#f47070}",
    "#s-bot .bbrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}#s-bot input[type=password]{flex:1;min-width:220px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:8px}",
    "#s-bot .tok{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;margin-top:8px}#s-bot .tok b.ok{color:#3ec97a}",
    "#s-bot .claim{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--bg);border-radius:8px;padding:10px 12px;margin-top:10px}#s-bot .claim code{font-size:18px;font-weight:800;color:var(--strong);letter-spacing:.5px}",
    "#s-bot details{margin-top:10px}#s-bot pre{max-height:220px;overflow:auto;background:var(--bg);border-radius:8px;padding:10px;font-size:11.5px;white-space:pre-wrap;word-break:break-word;margin:6px 0 0}",
    "#s-bot .dim{color:var(--dim)}#s-bot .small{font-size:12px}#s-bot label.keep{display:flex;gap:8px;align-items:center;margin-top:10px;cursor:pointer}",
  ].join("\n");
  document.head.appendChild(css);

  const sec = document.createElement("section");
  sec.className = "sec"; sec.id = "s-bot";
  sec.innerHTML = '<h2>Your bridge bot</h2>' +
    '<div class="card">' +
    '<div class="bbtop"><b>BridgeCord</b><span class="pill" id="bb-pill">Off</span><span class="dim small" id="bb-ver"></span></div>' +
    '<div class="dim small" style="margin-top:6px">Your own bot that joins a Fluxer community and a Discord server into one: messages, replies, reactions, voice, polls, and copying a whole server from one side to the other. It runs on this computer while BelleCord is open. <a href="#" id="bb-more">What it can do</a></div>' +
    '<div id="bb-steps"></div>' +
    '</div>';
  const before = $("s-app");
  if (before && before.parentNode) before.parentNode.insertBefore(sec, before); else ($("dash") && $("dash").querySelector(".wrap") || document.body).appendChild(sec);
  $("bb-more").onclick = (e) => { e.preventDefault(); open(GUIDE); };

  let st = null, editing = false;
  const PHASE = { off: ["Off", ""], installing: ["Getting it ready...", "busy"], starting: ["Starting...", "busy"], running: ["Running", "on"], stopped: ["Stopped", "bad"], error: ["Didn't work", "bad"], neednode: ["Needs Node.js", "bad"] };

  function draw() {
    if (!st) return;
    const [label, kind] = PHASE[st.phase] || PHASE.off;
    $("bb-pill").textContent = st.running && st.phase !== "starting" ? "Running" : label;
    $("bb-pill").className = "pill " + (st.running && st.phase !== "starting" ? "on" : kind);
    $("bb-ver").textContent = st.tag ? (st.title || "version " + st.tag) + (st.latest && st.latest.tag && st.latest.tag !== st.tag ? " (" + (st.latest.title || st.latest.tag) + " is out)" : "") : "";
    if (editing) return; // (don't redraw over what you're typing)
    let h = "";
    const t = st.tokens || {};
    // 1. the tokens
    h += '<div class="tok"><span>Fluxer bot token</span>' + (t.fluxer ? '<span><b class="ok">✓ saved</b> <a href="#" data-retoken="fluxer" class="small">change</a></span>' : '<input type="password" id="bb-fx" placeholder="Paste it here" autocomplete="off" spellcheck="false">') +
      '<span>Discord bot token</span>' + (t.discord ? '<span><b class="ok">✓ saved</b> <a href="#" data-retoken="discord" class="small">change</a></span>' : '<input type="password" id="bb-dc" placeholder="Paste it here" autocomplete="off" spellcheck="false">') + "</div>";
    if (!t.fluxer || !t.discord) h += '<div class="bbrow"><button class="primary" id="bb-save">Save tokens</button><a href="#" id="bb-how" class="small">How do I make the two bots? (5 minutes, free)</a></div><div class="dim small" style="margin-top:6px">Your tokens stay on this computer. Never paste them in a chat.</div>';
    // 2. Node.js
    if (st.phase === "neednode") h += '<div class="bbrow"><span>BridgeCord runs on <b>Node.js</b> (free). Install the LTS version, then press Start again.</span><button id="bb-node">Get Node.js</button></div>';
    // 3. start / stop
    if (t.fluxer && t.discord) {
      h += '<div class="bbrow">' + (st.running ? '<button id="bb-stop">Stop</button>' : '<button class="primary" id="bb-start"' + (st.phase === "installing" ? " disabled" : "") + ">Start</button>") +
        '<button id="bb-check">Check for updates</button><button id="bb-folder" title="Where BridgeCord and its settings.txt are kept">Open its folder</button></div>' +
        '<label class="keep"><input type="checkbox" id="bb-auto"' + (st.auto ? " checked" : "") + "> Start it when BelleCord opens</label>";
    }
    if (st.note) h += '<div class="dim small" style="margin-top:8px">' + esc(st.note) + "</div>";
    // 4. once it's running: claim it, invite it
    if (st.claim) h += '<div class="claim"><span>Make yourself its owner. In your Fluxer community, type</span><code>' + esc(st.claim) + '</code><button id="bb-copy">Copy</button></div>';
    if (st.invites && (st.invites.discord || st.invites.fluxer)) {
      h += '<div class="bbrow">' + (st.invites.fluxer ? '<button data-inv="fluxer">➕ Add it to Fluxer</button>' : "") + (st.invites.discord ? '<button data-inv="discord">➕ Add it to Discord</button>' : "") + "</div>";
      h += '<div class="dim small" style="margin-top:6px">Then type <b>b!link all &lt;your Discord server&gt;</b> in Fluxer to bridge every channel, or <b>b!syncserver to fluxer</b> to copy your whole Discord server over. <b>b!help</b> shows everything.</div>';
    }
    // 5. what it printed
    if (st.log && st.log.length) h += "<details" + (st.phase === "error" || st.phase === "stopped" ? " open" : "") + '><summary class="small dim">Details</summary><pre id="bb-log">' + esc(st.log.join("\n")) + "</pre><div class=\"dim small\">If it won't start, send me a screenshot of this box.</div></details>";
    $("bb-steps").innerHTML = h;
    wire();
    const log = $("bb-log"); if (log) log.scrollTop = log.scrollHeight;
  }

  function wire() {
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    for (const id of ["bb-fx", "bb-dc"]) { const el = $(id); if (el) { el.onfocus = () => (editing = true); el.onblur = () => setTimeout(() => (editing = !!(document.activeElement && /^bb-(fx|dc)$/.test(document.activeElement.id))), 0); } }
    on("bb-save", async () => {
      const fx = ($("bb-fx") || {}).value || "", dc = ($("bb-dc") || {}).value || "";
      if (!fx.trim() && !dc.trim()) return toast("Paste a token first.");
      const r = await B.tokens({ fluxer: fx, discord: dc });
      editing = false;
      if (!r.ok) return toast(r.error || "That didn't save.", 5000);
      toast("Saved.");
      refresh();
    });
    on("bb-how", (e) => { e.preventDefault(); open(HOW); });
    on("bb-node", () => { B.getNode(); toast("Install the LTS version, then press Start.", 5000); });
    on("bb-start", async () => { st = { ...st, phase: "installing", note: "One moment..." }; draw(); st = await B.start(); draw(); fast(); });
    on("bb-stop", async () => { st = await B.stop(); draw(); fast(); });
    on("bb-folder", () => B.folder());
    on("bb-check", async () => {
      const r = await B.check();
      if (!r.ok) return toast("Couldn't check: " + (r.error || "no answer"), 5000);
      if (r.tag && r.latest.tag === r.tag) return toast("You have the newest BridgeCord (" + r.tag + ").");
      if (!confirm("BridgeCord " + r.latest.title + " is out" + (r.tag ? " (you have " + r.tag + ")" : "") + ". Get it now?" + (st.running ? " It restarts by itself." : ""))) return;
      st = { ...st, phase: "installing", note: "Getting " + r.latest.title + "..." }; draw();
      st = await B.update(); draw(); fast();
    });
    const auto = $("bb-auto"); if (auto) auto.onchange = async () => { st = await B.auto(auto.checked); toast(auto.checked ? "It'll start when BelleCord opens." : "It won't start by itself."); };
    on("bb-copy", () => { try { navigator.clipboard.writeText(st.claim); toast("Copied. Paste it in your Fluxer community."); } catch {} });
    document.querySelectorAll("#s-bot [data-inv]").forEach((b) => (b.onclick = () => open(st.invites[b.dataset.inv])));
    document.querySelectorAll("#s-bot [data-retoken]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.tokens[a.dataset.retoken] = false; draw(); const el = $(a.dataset.retoken === "fluxer" ? "bb-fx" : "bb-dc"); if (el) el.focus(); }));
  }

  async function refresh() { try { st = await B.status(); draw(); } catch {} }
  // (checked often while it's getting ready or starting, slowly otherwise, and only while the dashboard is open)
  let quickUntil = 0;
  const fast = () => (quickUntil = Date.now() + 90_000);
  setInterval(() => {
    if (document.body.dataset.mode !== "dash") return;
    const busy = st && (st.phase === "installing" || st.phase === "starting" || Date.now() < quickUntil);
    if (busy || Date.now() % 10_000 < 2000) refresh();
  }, 2000);
  refresh();
})();
