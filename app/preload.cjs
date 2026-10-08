// The app's own page gets exactly these few things from the app, nothing more.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bcApp", {
  getPrefs: () => ipcRenderer.invoke("prefs:get"),
  getImg: (key) => ipcRenderer.invoke("img:get", key),
  setImg: (key, data) => ipcRenderer.invoke("img:set", key, data),
  setPrefs: (changes) => ipcRenderer.invoke("prefs:set", changes),
  notify: (title, body) => ipcRenderer.invoke("notify", { title, body }),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  hub: (method, route, payload) => ipcRenderer.invoke("hub", method, route, payload),
  setTitleBar: (color, symbol) => ipcRenderer.invoke("titlebar", { color, symbol }),
  onSwitch: (fn) => ipcRenderer.on("switch", (e, n) => fn(n)),
  onNotice: (fn) => ipcRenderer.on("notice", (e, what) => fn(String(what))),
});
