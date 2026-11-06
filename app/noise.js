// Noise suppression: the 🎙 button at the top, and the card in Dashboard > App. The filter itself is BelleCord's own
// (noise-core.js, DeepFilterNet 3 running on your PC), for Fluxer. It replaces Fluxer's own filter while it's on.
// Discord keeps its own noise suppression: BelleCord's never touches the Discord side.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const CHOICES = [
    ["max", "Max", "Takes out keyboards, fans, dogs and hum. Voices far back in the room get quieter too, but someone right next to you still comes through (it's a voice too)."],
    ["balanced", "Balanced", "Takes out most noise but leaves a little room, so your voice sounds a bit more natural."],
    ["off", "Off", "Your mic exactly as it is (Fluxer's own setting comes back)."],
  ];
  let level = "max", was = "max"; // eslint-disable-line no-unused-vars

  Promise.resolve(host.getPrefs ? host.getPrefs() : {}).then((p) => {
    if (p && CHOICES.some((c) => c[0] === p.noiseLevel)) level = was = p.noiseLevel;
    draw(); button();
  }).catch(() => {});

  function draw(note) {
    const card = document.querySelector(".appcard");
    if (!card) return;
    let box = $("noisecard");
    if (!box) {
      box = document.createElement("div");
      box.className = "card"; box.id = "noisecard";
      ($("volcard") || card).after(box);
    }
    const cur = CHOICES.find((c) => c[0] === level) || CHOICES[0];
    box.innerHTML = '<h3>Noise suppression on Fluxer</h3><p class="dim small">BelleCord\'s own filter for your mic on Fluxer. It runs on your PC in the background, so it doesn\'t slow down games or make your voice crackle. Discord keeps its own. Quick switch: the 🎙 button at the top.</p>' +
      '<div class="pchips" id="noise-seg">' + CHOICES.map((c) => '<button data-v="' + c[0] + '"' + (c[0] === level ? ' class="on"' : "") + ">" + c[1] + "</button>").join("") + "</div>" +
      '<p class="dim small">' + cur[2] + (note ? " " + note : "") + "</p>";
    box.querySelectorAll("[data-v]").forEach((b) => (b.onclick = async () => {
      const from = level;
      level = b.dataset.v;
      try { if (host.noiseSet) await host.noiseSet(level); else await host.setPrefs?.({ noiseLevel: level }); } catch (e) {}
      // (switching between Max and Balanced happens straight away, even mid-call; turning it on or off counts from
      //  the next time Fluxer loads, because Fluxer's own filter has to be switched around too)
      draw((from === "off") !== (level === "off") ? "This counts once BelleCord restarts (or press Ctrl+R on the Fluxer side when you're not in a call)." : "");
      was = level;
      button();
    }));
  }

  // ---------------------------------------------------------------- the 🎙 button at the top
  const css = document.createElement("style");
  css.textContent = "#noisebtn{position:relative}#noisebtn .lv{position:absolute;right:-2px;bottom:-1px;font-size:8px;font-weight:800;line-height:12px;padding:0 3px;border-radius:6px;background:var(--accent,#5865f2);color:#fff}#noisebtn.off .lv{background:#4e5058}" +
    "#noisemenu{position:fixed;z-index:9000;min-width:260px;max-width:340px;background:#111214;color:#dbdee1;border:1px solid rgba(255,255,255,.08);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);padding:8px;font-size:14px}" +
    "#noisemenu h4{margin:2px 6px 8px;font-size:12px;text-transform:uppercase;letter-spacing:.02em;color:#949ba4}#noisemenu button{display:flex;width:100%;gap:10px;align-items:flex-start;background:none;border:0;color:inherit;font:inherit;text-align:left;padding:7px 8px;border-radius:4px;cursor:pointer}" +
    "#noisemenu button:hover,#noisemenu button:focus-visible{background:var(--accent,#5865f2);color:#fff}#noisemenu .dot{width:10px;height:10px;margin-top:4px;border-radius:50%;border:2px solid currentColor;flex:none}#noisemenu [aria-checked=true] .dot{background:currentColor}" +
    "#noisemenu small{display:block;opacity:.75;font-size:12px}#noisemenu .foot{color:#949ba4;font-size:12px;margin:6px 8px 2px;line-height:1.35}";
  document.head.appendChild(css);
  function button() {
    let b = $("noisebtn");
    if (!b) {
      const after = $("bothbtn");
      if (!after) return;
      b = document.createElement("button");
      b.id = "noisebtn"; b.className = "tb";
      b.innerHTML = '🎙<span class="lv"></span>';
      b.onclick = (e) => { e.stopPropagation(); menu(b); };
      after.after(b);
    }
    const cur = CHOICES.find((c) => c[0] === level) || CHOICES[0];
    b.classList.toggle("off", level === "off");
    b.querySelector(".lv").textContent = level === "off" ? "OFF" : level === "max" ? "MAX" : "BAL";
    b.title = "Noise suppression on Fluxer: " + cur[1] + " (click to change)";
    b.setAttribute("aria-label", b.title);
  }
  function closeMenu() { const m = $("noisemenu"); if (m) m.remove(); document.removeEventListener("click", closeMenu); }
  function menu(anchor) {
    if ($("noisemenu")) return closeMenu();
    const m = document.createElement("div");
    m.id = "noisemenu"; m.setAttribute("role", "menu"); m.setAttribute("aria-label", "Noise suppression on Fluxer");
    m.innerHTML = "<h4>Noise suppression on Fluxer</h4>" + CHOICES.map((c) => '<button role="menuitemradio" data-v="' + c[0] + '" aria-checked="' + (c[0] === level) + '"><span class="dot"></span><span><b>' + c[1] + "</b><small>" + c[2] + "</small></span></button>").join("") +
      '<div class="foot">Discord keeps its own. More in Dashboard &gt; App.</div>';
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = r.bottom + 6 + "px";
    m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.left)) + "px";
    m.addEventListener("click", (e) => e.stopPropagation());
    m.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeMenu(); anchor.focus(); } });
    m.querySelectorAll("[data-v]").forEach((x) => (x.onclick = async () => {
      const from = level;
      level = x.dataset.v;
      try { if (host.noiseSet) await host.noiseSet(level); else await host.setPrefs?.({ noiseLevel: level }); } catch (e) {}
      closeMenu(); button(); draw((from === "off") !== (level === "off") ? "This counts once BelleCord restarts (or press Ctrl+R on the Fluxer side when you're not in a call)." : "");
    }));
    const on = m.querySelector('[aria-checked="true"]'); if (on) on.focus();
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }
  setTimeout(button, 800);
  setTimeout(() => draw(), 1600);
  // whether it's really running on each side (the first call after a start shows it), so it's never "on" in name only
  const status = async () => {
    const box = $("noisecard");
    if (!box || box.offsetParent === null) return;
    const parts = [];
    for (const [s, name] of [["fluxer", "Fluxer"]]) {
      const v = $("wv-" + s);
      let st = null;
      try { st = v && v.executeJavaScript ? await v.executeJavaScript("window.__bcNoiseState ? window.__bcNoiseState() : null") : null; } catch (e) {}
      if (!st) continue;
      if (st.running) parts.push(name + ": cleaning your mic now");
      else if (st.problem) parts.push(name + ": couldn't start (" + st.problem + "), so your normal mic is used");
      else if (st.worked) parts.push(name + ": ready");
    }
    let el = $("noise-live");
    if (!el) { el = document.createElement("p"); el.id = "noise-live"; el.className = "dim small"; el.setAttribute("role", "status"); box.appendChild(el); }
    el.textContent = parts.join(" · ");
  };
  setInterval(status, 5000);
})();
