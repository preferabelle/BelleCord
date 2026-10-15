// The app's own page gets exactly these few things from the app, nothing more.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bcApp", {
  platform: process.platform,
  getPrefs: () => ipcRenderer.invoke("prefs:get"),
  getImg: (key) => ipcRenderer.invoke("img:get", key),
  setImg: (key, data) => ipcRenderer.invoke("img:set", key, data),
  setPrefs: (changes) => ipcRenderer.invoke("prefs:set", changes),
  notify: (title, body) => ipcRenderer.invoke("notify", { title, body }),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  hub: (method, route, payload) => ipcRenderer.invoke("hub", method, route, payload),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  whatsNew: () => ipcRenderer.invoke("whatsnew"),
  applyUpdate: () => ipcRenderer.invoke("update:apply"),
  // Fix Fluxer (one button for whatever keeps Fluxer from working)
  fixFluxer: () => ipcRenderer.invoke("fluxer:fix"),
  fluxerDiagnose: () => ipcRenderer.invoke("fluxer:diagnose"),
  fluxerReset: () => ipcRenderer.invoke("fluxer:reset"),
  fluxerClean: () => ipcRenderer.invoke("fluxer:clean"),
  fluxerHelp: (what) => ipcRenderer.invoke("fluxer:help", String(what || "")),
  fluxerHome: () => ipcRenderer.invoke("fluxer:home"),
  fluxerLast: () => ipcRenderer.invoke("fluxer:last"),
  restartApp: () => ipcRenderer.invoke("app:restart"),
  // Performance (dashboard)
  perfUsage: () => ipcRenderer.invoke("perf:usage"),
  perfSpell: (on) => ipcRenderer.invoke("perf:spell", !!on),
  perfClean: () => ipcRenderer.invoke("perf:clean"),
  perfTop: () => ipcRenderer.invoke("perf:top"),
  onFluxerProgress: (fn) => ipcRenderer.on("fluxer-progress", (e, step) => { try { fn(step); } catch (x) {} }),
  setTitleBar: (color, symbol) => ipcRenderer.invoke("titlebar", { color, symbol }),
  onSwitch: (fn) => ipcRenderer.on("switch", (e, n) => fn(n)),
  onNav: (fn) => ipcRenderer.on("nav", (e, way) => fn(String(way))),
  onNotice: (fn) => ipcRenderer.on("notice", (e, what) => fn(String(what))),
});
