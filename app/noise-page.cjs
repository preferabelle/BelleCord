// Runs first in the Fluxer pages (before their own code): gives noise-core.js the filter files and the
// level you picked, and puts it in the page. On Fluxer it also switches Fluxer's own noise filter off while
// BelleCord's is on (and puts back whatever you had when you turn BelleCord's off), so the two never stack.
const { contextBridge, ipcRenderer, webFrame } = require("electron");
// (Fluxer only: Discord keeps its own noise suppression. An older BelleCord put this in Discord too.)
const onFluxer = /(^|\.)fluxer\.(app|com)$/i.test(location.hostname);

let level = "max", keepFluxerOff = false;
try {
  const got = ipcRenderer.sendSync("bc-noise-level-sync");
  if (got && typeof got === "object") { level = got.level || "max"; keepFluxerOff = !!got.keepFluxerOff; } else if (got) level = String(got);
} catch (e) {}

// Fluxer keeps its voice settings in the page's storage under "VoiceSettings" (read when it starts, so this has to
// happen before Fluxer's code runs, which is why it's here)
try {
  if (/(^|\.)fluxer\.(app|com)$/i.test(location.hostname)) {
    const SAVED = "bcNoiseFluxerBefore";
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/(^|[:._])VoiceSettings$/.test(k)) continue;
      let v = {};
      try { v = JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { continue; }
      if (!v || typeof v !== "object") continue;
      const before = localStorage.getItem(SAVED);
      if (level !== "off") {
        if (v.noiseSuppressionBackendPrefV1 !== "none") {
          if (before == null) localStorage.setItem(SAVED, JSON.stringify(v.noiseSuppressionBackendPrefV1 ?? null));
          v.noiseSuppressionBackendPrefV1 = "none";
          v.deepFilterDefaultRetiredMigratedV1 = true;
          localStorage.setItem(k, JSON.stringify(v));
        }
      } else if (before != null) {
        let was = null;
        try { was = JSON.parse(before); } catch (e) {}
        // (in my own window Fluxer's own filter stays off: I don't want it, and an older BelleCord had switched it on)
        if (keepFluxerOff && (was === "deep_filter" || was == null)) was = "none";
        v.noiseSuppressionBackendPrefV1 = was;
        localStorage.setItem(k, JSON.stringify(v));
        localStorage.removeItem(SAVED);
      }
    }
  }
} catch (e) {}

if (onFluxer) try {
  contextBridge.exposeInMainWorld("__bcNoiseHost", {
    assets: () => ipcRenderer.invoke("bc-noise-assets"),
    level: () => ipcRenderer.invoke("bc-noise-level"),
  });
  ipcRenderer.invoke("bc-noise-core").then((code) => { if (code) webFrame.executeJavaScript(code).catch(() => {}); }).catch(() => {});
} catch (e) {}
