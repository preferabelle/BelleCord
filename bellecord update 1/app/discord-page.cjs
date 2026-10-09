// Runs in Discord's page before Discord does: Discord's sign-in page asks Windows for a passkey on its own
// (the "choose a passkey" box every time). That automatic ask is stopped; pressing Discord's passkey button still works.
const { webFrame } = require("electron");
webFrame.executeJavaScript(`(function () {
  var c = navigator.credentials; if (!c || !c.get || c.__bc) return;
  var get = c.get.bind(c);
  c.get = function (o) { if (o && o.mediation === "conditional") return new Promise(function () {}); return get(o); };
  c.__bc = 1;
})();`).catch(() => {});
