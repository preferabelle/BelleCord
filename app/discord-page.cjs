// preload for discord.com: ignore conditional-mediation passkey requests so the login page doesn't
// trigger the windows passkey dialog on load. the passkey button still works.
const { webFrame, ipcRenderer } = require("electron");
webFrame.executeJavaScript(`(function () {
  var c = navigator.credentials; if (!c || !c.get || c.__bc) return;
  var get = c.get.bind(c);
  c.get = function (o) { if (o && o.mediation === "conditional") return new Promise(function () {}); return get(o); };
  c.__bc = 1;
})();`).catch(() => {});

// going live on Discord: when the stream stops, BelleCord stops showing it on Fluxer too (bridgestream.js)
webFrame.executeJavaScript(`(function () {
  var md = navigator.mediaDevices; if (!md || !md.getDisplayMedia || md.__bcShare) return;
  md.__bcShare = 1;
  var real = md.getDisplayMedia.bind(md);
  md.getDisplayMedia = function (c) {
    return real(c).then(function (s) {
      try {
        window.postMessage({ __bcShare: "started" }, "*");
        var v = s.getVideoTracks()[0];
        if (v) v.addEventListener("ended", function () { window.postMessage({ __bcShare: "ended" }, "*"); });
        var stop = v && v.stop ? v.stop.bind(v) : null;
        if (stop) v.stop = function () { window.postMessage({ __bcShare: "ended" }, "*"); return stop(); };
      } catch (e) {}
      return s;
    });
  };
})();`).catch(() => {});
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data || typeof e.data.__bcShare !== "string") return;
  try { ipcRenderer.send("bc-share-state", e.data.__bcShare); } catch (x) {}
});
