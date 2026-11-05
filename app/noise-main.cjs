// Noise suppression, the window program's side (noise-core.js has how it works).
// - Puts noise-page.cjs into the Fluxer and Discord sessions, so every page there gets the filter.
// - Hands the pages the DeepFilterNet files from app/noise/ (read once, kept in memory after the first call).
// - Lets the pages make the background thread the filter runs in: Fluxer's and Discord's pages only allow their
//   own scripts, so "blob:" (a script made in the page itself) and running WebAssembly are added to what they
//   allow. Nothing else about their security rules changes.
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function noiseMain({ ipcMain, webContents, getLevel, setLevel, allowed, keepFluxerOff = false }) {
  const DIR = path.join(__dirname, "noise");
  const LEVELS = ["max", "balanced", "off"];
  const lvl = () => { const l = getLevel(); return LEVELS.includes(l) ? l : "max"; };
  let files = null;
  const ok = (e) => { try { return allowed(e.sender); } catch { return false; } };

  ipcMain.on("bc-noise-level-sync", (e) => { e.returnValue = ok(e) ? { level: lvl(), keepFluxerOff } : { level: "off", keepFluxerOff }; });
  ipcMain.handle("bc-noise-level", (e) => (ok(e) ? lvl() : "off"));
  ipcMain.handle("bc-noise-core", (e) => { if (!ok(e)) return ""; try { return fs.readFileSync(path.join(__dirname, "noise-core.js"), "utf-8"); } catch { return ""; } });
  ipcMain.handle("bc-noise-assets", (e) => {
    if (!ok(e)) throw new Error("not here");
    if (!files) {
      const read = (n) => { const b = fs.readFileSync(path.join(DIR, n)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
      files = { wasm: read("df_bg.wasm"), model: read("DeepFilterNet3_onnx.tar.gz") };
    }
    return files;
  });

  /** A new level from the dashboard: saved, and every open page switches its open mics right away. */
  function set(l) {
    if (!LEVELS.includes(l)) return lvl();
    setLevel(l);
    for (const wc of webContents.getAllWebContents()) {
      try { if (!wc.isDestroyed() && allowed(wc)) wc.executeJavaScript("window.__bcNoiseSet && window.__bcNoiseSet(" + JSON.stringify(l) + ")", false).catch(() => {}); } catch {}
    }
    return l;
  }

  // (adds sources to the directives that are there; a directive that isn't there already allows it)
  const ADD = { "script-src": ["blob:", "'wasm-unsafe-eval'"], "worker-src": ["blob:"], "child-src": ["blob:"] };
  function loosen(csp) {
    const parts = String(csp).split(";");
    const has = (n) => parts.some((x) => (x.trim().split(/\s+/)[0] || "").toLowerCase() === n);
    // (only default-src: scripts follow it, so script-src is written out from it with the additions)
    if (!has("script-src") && has("default-src")) parts.push(" script-src " + parts.find((x) => /^\s*default-src/i.test(x)).trim().split(/\s+/).slice(1).join(" "));
    return parts.map((part) => {
      const bits = part.trim().split(/\s+/);
      const name = (bits[0] || "").toLowerCase();
      if (!ADD[name]) return part;
      if (bits.includes("'none'")) return name + " " + ADD[name].join(" ");
      for (const s of ADD[name]) if (!bits.includes(s)) bits.push(s);
      return " " + bits.join(" ");
    }).join(";");
  }
  function setUpSession(ses) {
    if (!ses || ses.__bcNoise) return;
    ses.__bcNoise = true;
    const file = path.join(__dirname, "noise-page.cjs");
    try { if (ses.registerPreloadScript) ses.registerPreloadScript({ type: "frame", id: "bc-noise", filePath: file }); else ses.setPreloads([...(ses.getPreloads ? ses.getPreloads() : []), file]); } catch {}
    try {
      ses.webRequest.onHeadersReceived({ urls: ["https://*.discord.com/*", "https://discord.com/*", "https://*.fluxer.app/*", "https://fluxer.app/*", "https://*.fluxer.com/*", "https://fluxer.com/*"] }, (d, cb) => {
        if (d.resourceType !== "mainFrame" && d.resourceType !== "subFrame") return cb({});
        const h = { ...d.responseHeaders };
        let changed = false;
        for (const k of Object.keys(h)) {
          if (!/^content-security-policy$/i.test(k)) continue;
          h[k] = (Array.isArray(h[k]) ? h[k] : [h[k]]).map(loosen);
          changed = true;
        }
        cb(changed ? { responseHeaders: h } : {});
      });
    } catch {}
  }
  return { setUpSession, set, level: lvl };
};
