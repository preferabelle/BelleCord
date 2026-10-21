// shared helpers for the shell page scripts (bcPref/bcSavePref/bcToast are set by shell.js)
(function () {
  "use strict";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pref = (k, d) => { try { const v = window.bcPref ? window.bcPref(k) : undefined; return v === undefined ? d : v; } catch { return d; } };
  const savePref = (c) => { try { window.bcSavePref && window.bcSavePref(c); } catch {} };
  const toast = (t, ms) => { try { window.bcToast && window.bcToast(t, ms); } catch {} };
  window.bcUtil = { esc, pref, savePref, toast };
})();
