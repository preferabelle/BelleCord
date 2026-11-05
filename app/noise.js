// Noise suppression: the card in Dashboard > App. The filter itself is BelleCord's own (noise-core.js, DeepFilterNet
// 3 running on your PC), the same on Fluxer and Discord. It replaces Fluxer's own filter while it's on.
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
    draw();
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
    box.innerHTML = '<h3>Noise suppression</h3><p class="dim small">BelleCord\'s own filter, on Fluxer and Discord. It runs on your PC in the background, so it doesn\'t slow down games or make your voice crackle. On Discord, set Discord\'s own Noise Suppression (Voice & Video) to None while this is on, so the two don\'t stack.</p>' +
      '<div class="pchips" id="noise-seg">' + CHOICES.map((c) => '<button data-v="' + c[0] + '"' + (c[0] === level ? ' class="on"' : "") + ">" + c[1] + "</button>").join("") + "</div>" +
      '<p class="dim small">' + cur[2] + (note ? " " + note : "") + "</p>";
    box.querySelectorAll("[data-v]").forEach((b) => (b.onclick = async () => {
      const from = level;
      level = b.dataset.v;
      try { if (host.noiseSet) await host.noiseSet(level); else await host.setPrefs?.({ noiseLevel: level }); } catch (e) {}
      // (switching between Max and Balanced happens straight away, even mid-call; turning it on or off counts from
      //  the next time Fluxer and Discord load, because Fluxer's own filter has to be switched around too)
      draw((from === "off") !== (level === "off") ? "This counts once BelleCord restarts (or press Ctrl+R on each side when you're not in a call)." : "");
      was = level;
    }));
  }
  setTimeout(() => draw(), 1600);
  // whether it's really running on each side (the first call after a start shows it), so it's never "on" in name only
  const status = async () => {
    const box = $("noisecard");
    if (!box || box.offsetParent === null) return;
    const parts = [];
    for (const [s, name] of [["fluxer", "Fluxer"], ["discord", "Discord"]]) {
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
