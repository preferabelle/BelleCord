// preload for discord.com: ignore conditional-mediation passkey requests so the login page doesn't
// trigger the windows passkey dialog on load. the passkey button still works.
const { webFrame } = require("electron");
webFrame.executeJavaScript(`(function () {
  var c = navigator.credentials; if (!c || !c.get || c.__bc) return;
  var get = c.get.bind(c);
  c.get = function (o) { if (o && o.mediation === "conditional") return new Promise(function () {}); return get(o); };
  c.__bc = 1;
})();`).catch(() => {});
