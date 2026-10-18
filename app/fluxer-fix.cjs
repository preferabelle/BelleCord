// Fix Fluxer: one button that finds out why Fluxer won't work in BelleCord, and fixes everything an app can fix.
// Shared by both BelleCords (mine and the everyone app). Runs in the app's main process (Electron).
//
// What it checks, and what it does about each:
//   * old lookups and stuck connections ............. forgets them
//   * a broken or stale saved copy of Fluxer ........ clears Fluxer's cached files (you stay signed in)
//   * DNS that can't find Fluxer, blocks it, or gives
//     out-of-date addresses for any part of it ....... switches to secure DNS (Cloudflare / Google / Quad9), but only
//                                                      after checking it really helps here; otherwise puts it back
//   * a "hosts" file line that blocks Fluxer ......... goes around it for BelleCord, and names the lines to delete
//   * a proxy Fluxer can't get through ............... connects to Fluxer directly instead (only if that works)
//   * Fluxer's app files not downloading ............. finds out why (IPv6 that doesn't get through, the fast
//                                                      "QUIC" connection type being broken, out-of-date DNS) and
//                                                      goes around it
//   * Fluxer's move from fluxer.app to fluxer.com .... uses whichever address answers
//   * then it reloads Fluxer, waits for it to start, and writes down exactly what failed to load if it doesn't
// What no app can fix (a VPN like Cloudflare WARP, a wrong clock, Fluxer itself being down) it names plainly.
// Nothing it changes can leave BelleCord worse off: every network change is tested, and undone if it doesn't help.
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");

const FLUXER_RE = /(^|\.)(fluxer\.(app|com|gg|media|gift)|fluxerusercontent\.com|fluxerstatic\.com|fluxerstatus\.com)$/i;
// secure DNS servers, best first (the first is reached by its address, so it works even when names don't)
const DOH_TEMPLATES = ["https://1.1.1.1/dns-query", "https://cloudflare-dns.com/dns-query", "https://dns.google/dns-query", "https://dns.quad9.net/dns-query"];
const HOMES = ["https://web.fluxer.app", "https://fluxer.com"];
const VPN_RE = /warp|cloudflare|wireguard|\bwg\d|nordlynx|nordvpn|proton|mullvad|expressvpn|surfshark|openvpn|tap-windows|\btap\d*\b|\btun\d*\b|vpn|zerotier|hamachi|fortinet|forticlient|globalprotect|pangp|anyconnect|cisco/i;
// every part of Fluxer its page talks to (from Fluxer's own discovery answer; these are the defaults), and what to ask each
const PARTS = [
  ["webapp", "web.fluxer.app", "/", "the Fluxer page"],
  ["api_public", "api.fluxer.app", "/.well-known/fluxer", "Fluxer's server"],
  ["gateway", "gateway.fluxer.app", "/", "Fluxer's live connection"],
  ["static_cdn", "fluxerstatic.com", "/web/favicon-32x32.png", "Fluxer's app files"],
  ["media", "fluxerusercontent.com", "/", "pictures and videos"],
  ["upload_relay", "uploads.fluxer.app", "/", "uploads"],
];
const MUST = new Set(["web.fluxer.app", "api.fluxer.app", "gateway.fluxer.app"]); // (Fluxer can't start without these)

/** An answer no Fluxer server would ever have: a "blocked" reply from a filter, or nowhere. */
function blockedIp(ip) {
  ip = String(ip || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!ip) return true;
  if (ip === "0.0.0.0" || ip === "::" || ip === "::1" || /^0+(:0+){7}$/.test(ip) || /^0+(:0+){6}:0*1$/.test(ip)) return true;
  if (/^(0|127|10)\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^169\.254\./.test(ip)) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(ip) || /^fe80:/.test(ip)) return true;
  if (/^::ffff:(0|127|10)\./.test(ip) || /^::ffff:192\.168\./.test(ip)) return true;
  return false;
}
const isV4 = (ip) => /^\d+\.\d+\.\d+\.\d+$/.test(String(ip || ""));
const errCode = (e) => { const m = String((e && (e.message || e.code)) || e || "").match(/ERR_[A-Z0-9_]+/); return m ? m[0] : String((e && e.code) || (e && e.message) || "error").slice(0, 60); };
function kindOf(code) {
  code = String(code || "");
  if (/QUIC/.test(code)) return "quic";
  if (/NAME_NOT_RESOLVED|NAME_RESOLUTION|DNS|ENOTFOUND|EAI_AGAIN/.test(code)) return "dns";
  if (/CERT|SSL|TLS/.test(code)) return "tls";
  if (/PROXY|TUNNEL/.test(code)) return "proxy";
  if (/BLOCKED/.test(code)) return "blocked";
  if (/timeout/i.test(code) || /TIMED_OUT|ETIMEDOUT/.test(code)) return "timeout";
  if (/INTERNET_DISCONNECTED|NETWORK_CHANGED|NETWORK_ACCESS_DENIED|ENETUNREACH|ADDRESS_UNREACHABLE/.test(code)) return "offline";
  return "connect";
}
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error((label || "timeout") + " (timeout)")), ms))]);
const hostOf = (u) => { try { return new URL(String(u).replace(/^wss?:/i, "https:")).hostname.toLowerCase(); } catch { return ""; } };
const isHome = (u) => HOMES.includes(String(u || "").replace(/\/+$/, ""));
const short = (u) => { try { const x = new URL(u); return x.hostname + (x.pathname.length > 32 ? x.pathname.slice(0, 14) + "..." + x.pathname.slice(-16) : x.pathname); } catch { return String(u || "").slice(0, 60); } };
const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

// runs inside Fluxer's page: did Fluxer really come up, and are you signed in?
const PAGE_PROBE = "(" + function () {
  var path = location.pathname || "/", text = "";
  try { text = (document.body && document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 600); } catch (e) {}
  var shell = document.querySelector('[data-flx^="app.guilds-layout"],[data-flx-user-self="true"],[data-flx^="app.sidebar-nav"]');
  var login = /^\/(login|register|authorize|reset|verify)(\/|$)/.test(path) || !!document.querySelector('input[type="password"]');
  var root = document.getElementById("root") || document.body;
  var kids = root ? root.querySelectorAll("*").length : 0;
  var booting = !!document.getElementById("fluxer-boot-shell") && kids < 25; // (Fluxer's grey "loading" outline, before its code runs)
  var errLine = (text.match(/[^.!?]*(something went wrong|couldn.t (connect|load|reach)|failed to (load|connect)|unable to (connect|load)|reconnecting|offline|no internet)[^.!?]*[.!?]?/i) || [""])[0].trim().slice(0, 160);
  var kind = shell ? "ok" : /^\/migrate/.test(path) ? "migrating" : login ? "login" : errLine ? "error" : booting ? "booting" : kids < 25 ? "blank" : "unknown";
  return { url: location.href, kind: kind, text: errLine };
}.toString() + ")()";

/**
 * @param {object} o
 *   app, session, webContents, BrowserWindow, shell - Electron's own modules
 *   store: { get(): object, set(changes): void } - where this BelleCord keeps the Fix Fluxer settings
 *   helpLine - who helps this BelleCord's user, said in the app's own voice (or null for none)
 *   partition - Fluxer's saved sign-in (default persist:fluxer); log - optional
 *   https - Node's https module (tests pass a stand-in)
 */
module.exports = function createFluxerFix(o) {
  const { app, session, webContents, BrowserWindow, shell, store } = o;
  const partitionOf = () => (typeof o.partition === "function" ? o.partition() : o.partition) || "persist:fluxer"; // (the person who's on now)
  const log = o.log || (() => {});
  const helpLine = o.helpLine === undefined ? "send me a screenshot of this box" : o.helpLine;
  const https = o.https || require("https");
  const bootWait = o.bootWaitMs || 20000; // (how long Fluxer gets to start after its page loads)
  const S = () => { try { return store.get() || {}; } catch { return {}; } };
  const save = (ch) => { try { store.set(ch); } catch {} };
  const fses = () => session.fromPartition(partitionOf());
  const home = () => (isHome(S().home) ? String(S().home).replace(/\/+$/, "") : HOMES[0]);
  let busy = null;
  // your normal browser (the one links open in), by name: on most Windows computers, Microsoft Edge
  const browserName = () => { try { return String(app.getApplicationNameForProtocol("https://fluxer.com/") || "").replace(/\.exe$/i, "").trim(); } catch { return ""; } };
  const inBrowser = () => { const n = browserName(); return n ? "in " + n + " (your normal browser)" : "in your normal browser"; };

  // ---------------- the parts ----------------
  function applyResolver(secure) {
    // Fluxer's own desktop app always skips the newer "HTTPS record" lookups (some home routers choke on them)
    const opts = { enableAdditionalDnsQueryTypes: false, enableHappyEyeballs: true };
    if (secure) Object.assign(opts, { enableBuiltInResolver: true, secureDnsMode: "secure", secureDnsServers: DOH_TEMPLATES });
    try { app.configureHostResolver(opts); return true; } catch (e) { log("resolver: " + (e && e.message || e)); return false; }
  }
  async function resolve(ses, host, secure) {
    try {
      const r = await withTimeout(ses.resolveHost(host, { cacheUsage: "disallowed", secureDnsPolicy: secure ? "allow" : "disable" }), 6000, "lookup");
      const ips = ((r && r.endpoints) || []).map((e) => e.address).filter(Boolean);
      return { ips, blocked: ips.length > 0 && ips.every(blockedIp), code: ips.length ? "" : "ERR_NAME_NOT_RESOLVED" };
    } catch (e) {
      // a lookup that fails is a DNS failure, whatever words the error uses
      const c = errCode(e);
      return { ips: [], blocked: false, code: /^ERR_/.test(c) ? c : /timeout/i.test(c) ? "ERR_DNS_TIMED_OUT" : "ERR_NAME_NOT_RESOLVED" };
    }
  }
  async function reach(ses, url, ms) {
    const t0 = Date.now();
    try {
      const r = await withTimeout(ses.fetch(url, { method: "GET", redirect: "follow", cache: "no-store", headers: { "cache-control": "no-cache" } }), ms || 9000, "request");
      let body = null; try { body = await withTimeout(r.text(), 4000, "body"); } catch {}
      return { reached: r.status > 0, ok: r.status > 0 && r.status < 500, status: r.status, ms: Date.now() - t0, date: r.headers.get("date") || null, url: r.url || url, body };
    } catch (e) { const code = errCode(e); return { reached: false, ok: false, status: 0, code, kind: kindOf(code), ms: Date.now() - t0 }; }
  }
  // a whole file, the way Fluxer's page downloads it (counts the bytes; a connection that stalls partway shows here)
  async function download(ses, url, ms) {
    const t0 = Date.now();
    try {
      const got = await withTimeout((async () => {
        const r = await ses.fetch(url, { method: "GET", redirect: "follow", cache: "no-store", headers: { "cache-control": "no-cache" } });
        const buf = await r.arrayBuffer();
        return { status: r.status, bytes: buf.byteLength };
      })(), ms || 30000, "download");
      return { url, ok: got.status > 0 && got.status < 400, status: got.status, bytes: got.bytes, ms: Date.now() - t0 };
    } catch (e) { const code = errCode(e); return { url, ok: false, status: 0, bytes: 0, code, kind: kindOf(code), ms: Date.now() - t0 }; }
  }
  // the same file through a plain connection to one exact address (no QUIC, no proxy, no DNS): tells IPv6 from
  // IPv4 trouble, out-of-date DNS answers, and Chromium's fast "QUIC" connection being broken on this network
  function probeAt(url, ip, ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      let done = false, bytes = 0, req = null;
      // (finishing never throws, and nothing the connection does afterwards can reach the app: a late error from a
      // half-open connection, unhandled, would take down BelleCord's window program)
      const end = (r) => { if (done) return; done = true; clearTimeout(timer); setImmediate(() => { try { req && req.destroy(); } catch {} }); resolve({ ip, ms: Date.now() - t0, bytes, ...r }); };
      const timer = setTimeout(() => end({ ok: false, code: "ETIMEDOUT" }), ms || 20000);
      try {
        const u = new URL(url), family = isV4(ip) ? 4 : 6;
        req = https.request({
          host: u.hostname, servername: u.hostname, port: 443, path: u.pathname + u.search, method: "GET", agent: false, // (a fresh connection every time: never one left over to another address)
          headers: { "user-agent": "Mozilla/5.0 (BelleCord Fix Fluxer)", accept: "*/*", "accept-encoding": "identity" },
          lookup: (h, opts, cb) => { if (typeof opts === "function") { cb = opts; opts = {}; } process.nextTick(() => { if (opts && opts.all) cb(null, [{ address: ip, family }]); else cb(null, ip, family); }); },
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400) { end({ ok: true, status: res.statusCode }); return; }
          res.on("data", (c) => { bytes += c.length; });
          res.on("end", () => end({ ok: res.statusCode < 400, status: res.statusCode }));
          res.on("error", (e) => end({ ok: false, code: errCode(e) }));
        });
        req.on("error", (e) => end({ ok: false, code: String((e && e.code) || errCode(e)) }));
        req.on("socket", (sk) => { try { sk.on("error", (e) => end({ ok: false, code: String((e && e.code) || errCode(e)) })); } catch {} });
        req.end();
      } catch (e) { end({ ok: false, code: errCode(e) }); }
    });
  }
  // secure DNS answers (JSON form) straight from Cloudflare / Google
  async function dohA(name) {
    const tries = ["https://1.1.1.1/dns-query?name=" + encodeURIComponent(name) + "&type=A", "https://8.8.8.8/resolve?name=" + encodeURIComponent(name) + "&type=A"];
    for (const u of tries) {
      try {
        const r = await withTimeout(session.defaultSession.fetch(u, { headers: { accept: "application/dns-json" }, cache: "no-store" }), 6000, "doh");
        if (!r.ok) continue;
        const j = await r.json();
        const ips = (j.Answer || []).filter((a) => a.type === 1 && isV4(a.data) && !blockedIp(a.data)).map((a) => a.data);
        if (ips.length) return ips;
      } catch {}
    }
    return [];
  }
  function hostsFile() {
    const file = o.hostsPath || (process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "drivers", "etc", "hosts") : "/etc/hosts");
    let text = "";
    try { text = fs.readFileSync(file, "utf-8"); } catch { return { file, lines: [], hosts: [] }; }
    const lines = [], hosts = new Set();
    text.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.replace(/#.*/, "").trim();
      if (!line) return;
      const parts = line.split(/\s+/), names = parts.slice(1).filter((n) => FLUXER_RE.test(n.replace(/\.$/, "")));
      if (!names.length) return;
      lines.push({ n: i + 1, text: raw.trim().slice(0, 120), ip: parts[0], blocked: blockedIp(parts[0]) });
      for (const n of names) hosts.add(n.replace(/\.$/, "").toLowerCase());
    });
    return { file, lines, hosts: [...hosts] };
  }
  function vpnAdapters() {
    const out = [];
    try { for (const [name, addrs] of Object.entries(os.networkInterfaces())) if (VPN_RE.test(name) && !/tailscale/i.test(name) && (addrs || []).some((a) => !a.internal)) out.push(name); } catch {}
    return out;
  }
  const pinsRule = (pins) => Object.entries(pins || {}).filter(([h, ips]) => FLUXER_RE.test(h) && /^[a-z0-9.-]+$/i.test(h) && Array.isArray(ips) && isV4(ips[0] || "")).map(([h, ips]) => "MAP " + h + " " + ips[0]).join(",");
  function fluxerViews() {
    const ses = fses();
    try { return webContents.getAllWebContents().filter((wc) => { try { return !wc.isDestroyed() && wc.getType() === "webview" && wc.session === ses; } catch { return false; } }); } catch { return []; }
  }
  function waitLoad(wc, ms) {
    return new Promise((resolve) => {
      let done = false;
      const end = (r) => { if (done) return; done = true; clearTimeout(t); try { wc.removeListener("did-finish-load", ok); wc.removeListener("did-fail-load", bad); } catch {} resolve(r); };
      const ok = () => end({ ok: true });
      const bad = (e, code, desc, url, isMain) => { if (isMain === false || code === -3) return; end({ ok: false, code, desc: String(desc || "") }); };
      const t = setTimeout(() => end({ ok: false, code: 0, desc: "timeout" }), ms);
      try { wc.on("did-finish-load", ok); wc.on("did-fail-load", bad); } catch { end({ ok: false, code: 0, desc: "gone" }); }
    });
  }
  async function probe(wc) {
    try { return await withTimeout(wc.executeJavaScript(PAGE_PROBE, true), 5000, "page"); } catch (e) { return { url: (() => { try { return wc.getURL(); } catch { return ""; } })(), kind: "unknown", text: "" }; }
  }
  // while Fluxer's page loads: every file that fails, every error its code prints, and where it goes
  function watchPage(ses, wc) {
    const seen = { failed: [], http: [], errors: [], navs: [], crashed: "" };
    const add = (list, item, max) => { if (list.length < (max || 12) && !list.some((x) => JSON.stringify(x) === JSON.stringify(item))) list.push(item); };
    const mine = (u) => FLUXER_RE.test(hostOf(u));
    const wr = ses.webRequest;
    try {
      wr.onErrorOccurred({ urls: ["*://*/*"] }, (d) => { if (mine(d.url) && !/ERR_ABORTED/.test(d.error || "")) add(seen.failed, { url: short(d.url), error: String(d.error || "").replace(/^net::/, ""), type: d.resourceType || "" }); });
      wr.onCompleted({ urls: ["*://*/*"] }, (d) => { if (mine(d.url) && d.statusCode >= 400 && !(d.statusCode === 401 && /\/api\//.test(d.url))) add(seen.http, { url: short(d.url), status: d.statusCode, type: d.resourceType || "" }); });
    } catch {}
    const onConsole = (e, level, message) => {
      const lv = e && e.level != null ? e.level : level, msg = e && e.message != null ? e.message : message;
      if (lv === 3 || lv === "error") add(seen.errors, String(msg || "").replace(/\s+/g, " ").slice(0, 200), 5);
    };
    const onNav = (e, url) => { if (url && seen.navs[seen.navs.length - 1] !== url) add(seen.navs, String(url).slice(0, 120), 8); };
    const onGone = (e, d) => { seen.crashed = (d && d.reason) || "crashed"; };
    try { wc.on("console-message", onConsole); wc.on("did-navigate", onNav); wc.on("render-process-gone", onGone); } catch {}
    seen.stop = () => {
      try { wr.onErrorOccurred(null); wr.onCompleted(null); } catch {}
      try { wc.removeListener("console-message", onConsole); wc.removeListener("did-navigate", onNav); wc.removeListener("render-process-gone", onGone); } catch {}
      delete seen.stop;
      return seen;
    };
    return seen;
  }
  async function discovery(ses) {
    for (const u of ["https://api.fluxer.app/.well-known/fluxer", "https://fluxer.com/api/.well-known/fluxer"]) {
      const r = await reach(ses, u, 9000);
      if (r.ok && r.body) { try { const j = JSON.parse(r.body); if (j && j.endpoints) return { ok: true, from: u, endpoints: j.endpoints, favicon: j.app_public && j.app_public.branding && j.app_public.branding.favicon_url }; } catch {} }
    }
    return { ok: false, endpoints: null };
  }
  // the files Fluxer's page needs to start (its code), read from the page itself
  function appFiles(html, base) {
    const out = [];
    const re = /<(script|link)\b[^>]*?\b(src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = re.exec(String(html || "")))) {
      const tag = m[0].toLowerCase();
      if (m[1].toLowerCase() === "link" && !/rel\s*=\s*["']?(stylesheet|modulepreload|preload)/.test(tag)) continue;
      let u; try { u = new URL(m[3], base).href; } catch { continue; }
      if (!/^https:/.test(u) || !FLUXER_RE.test(hostOf(u)) || /\.(png|ico|svg|webp|jpe?g|woff2?|json|txt)(\?|$)/i.test(u)) continue;
      if (!out.includes(u)) out.push(u);
    }
    return out.sort((a, b) => /\.js(\?|$)/.test(b) - /\.js(\?|$)/.test(a)).slice(0, 4);
  }

  // ---------------- look ----------------
  async function diagnose() {
    const ses = fses();
    const s = S();
    const out = { at: new Date().toISOString(), internet: null, clockMin: null, proxy: "?", vpn: vpnAdapters(), hostsFile: hostsFile(), discovery: null, hosts: {}, secureDns: !!s.secureDns, pins: Object.keys(s.pins || {}), direct: !!s.direct, noQuic: !!s.noQuic, home: home(), pages: [] };
    // is the internet itself up (and is this PC's clock right)?
    const net = await reach(session.defaultSession, "https://1.1.1.1/cdn-cgi/trace", 8000);
    const net2 = net.ok ? net : await reach(session.defaultSession, "https://www.google.com/generate_204", 8000);
    out.internet = { ok: net.ok || net2.ok, code: net2.code || net.code || "" };
    const date = net.date || net2.date;
    if (date) { const t = Date.parse(date); if (!isNaN(t)) out.clockMin = Math.round((Date.now() - t) / 60000); }
    try { out.proxy = String(await withTimeout(ses.resolveProxy("https://web.fluxer.app/"), 4000, "proxy")).trim() || "DIRECT"; } catch { out.proxy = "?"; }
    // is the graphics chip doing the video work? (when it isn't, videos lag)
    try { const g = app.getGPUFeatureStatus(); out.gpu = { video: String(g.video_decode || "?"), compositing: String(g.gpu_compositing || "?") }; } catch { out.gpu = null; }
    out.discovery = await discovery(ses);
    const e = (out.discovery && out.discovery.endpoints) || {};
    // every part of Fluxer the page talks to, as Fluxer itself lists them (plus fluxer.com, where Fluxer is moving)
    const want = new Map();
    for (const [key, def, ask, what] of PARTS) {
      const h = hostOf(e[key]) || def;
      if (!FLUXER_RE.test(h) || want.has(h)) continue;
      const askHere = key === "static_cdn" && out.discovery.favicon && hostOf(out.discovery.favicon) === h ? new URL(out.discovery.favicon).pathname : ask;
      want.set(h, { url: "https://" + h + askHere, what });
    }
    const apiH = hostOf(e.api); if (apiH && FLUXER_RE.test(apiH) && !want.has(apiH)) want.set(apiH, { url: "https://" + apiH + "/", what: "Fluxer's server" });
    if (!want.has("fluxer.com")) want.set("fluxer.com", { url: "https://fluxer.com/", what: "Fluxer's new address" });
    await Promise.all([...want].map(async ([h, x]) => {
      const [dns, doh, http] = await Promise.all([resolve(ses, h, false), dohA(h), reach(ses, x.url, 9000)]);
      const sys4 = dns.ips.filter(isV4);
      const differs = sys4.length > 0 && doh.length > 0 && !sys4.some((ip) => doh.includes(ip));
      out.hosts[h] = { what: x.what, url: x.url, dns, doh, differs, v6: dns.ips.some((ip) => !isV4(ip)), http: { ok: http.ok, reached: http.reached, status: http.status, code: http.code || "", kind: http.kind || "", ms: http.ms } };
    }));
    for (const wc of fluxerViews()) out.pages.push(await probe(wc));
    return out;
  }

  // ---------------- fix ----------------
  async function fix(progress) {
    if (busy) return busy;
    busy = (async () => {
      const steps = [], youDo = [];
      const s = { ...S() };
      s.pins = { ...(s.pins || {}) }; s.pinWhy = { ...(s.pinWhy || {}) };
      let restartNeeded = false, finding = "";
      const step = (id, label, status, detail) => {
        let x = steps.find((y) => y.id === id);
        if (!x) { x = { id, label }; steps.push(x); }
        Object.assign(x, { label, status, detail: detail || "" });
        try { progress && progress({ ...x }); } catch {}
      };
      const ses = fses();
      const pinRule0 = pinsRule(s.pins), quic0 = !!s.noQuic;

      step("look", "Checking every part of Fluxer from this computer", "run");
      const before = await diagnose();
      const H = before.hosts;
      const blockedByHostsFile = new Set(before.hostsFile.hosts);
      step("look", "Checked every part of Fluxer from this computer", "ok", before.internet.ok ? "" : "Your internet itself looks off.");

      step("flush", "Forgetting old lookups and stuck connections", "run");
      for (const x of [ses, session.defaultSession]) { try { await x.clearHostResolverCache(); } catch {} }
      try { await ses.closeAllConnections(); } catch {}
      step("flush", "Forgot old lookups and stuck connections", "fixed");

      step("cache", "Clearing Fluxer's saved files (you stay signed in)", "run");
      try { await ses.clearCache(); } catch {}
      try { await ses.clearCodeCaches({}); } catch {}
      try { await ses.clearStorageData({ storages: ["serviceworkers", "cachestorage", "shadercache"] }); } catch {}
      step("cache", "Cleared Fluxer's saved files (you stay signed in)", "fixed");

      // DNS: any part of Fluxer your DNS can't find, blocks, or gives an out-of-date address for (that doesn't answer)
      step("dns", "Checking your DNS", "run");
      const dnsBad = Object.keys(H).filter((h) => !blockedByHostsFile.has(h) && (H[h].dns.blocked || (!H[h].dns.ips.length && kindOf(H[h].dns.code) === "dns") || (H[h].differs && !H[h].http.ok)));
      if (dnsBad.length) {
        const names = dnsBad.join(", ");
        applyResolver(true);
        try { await ses.clearHostResolverCache(); } catch {}
        const look = await Promise.all(dnsBad.map((h) => resolve(ses, h, true)));
        const again = await Promise.all(dnsBad.map((h) => reach(ses, H[h].url || "https://" + h + "/", 9000)));
        // secure DNS helped if it finds every one of them, nothing that worked stopped working, and (when some didn't
        // answer before) at least one of those answers now
        const wasDown = dnsBad.map((h, i) => (H[h].http.ok ? -1 : i)).filter((i) => i >= 0);
        const helped = look.every((r) => r.ips.length && !r.blocked) && dnsBad.every((h, i) => !H[h].http.ok || again[i].ok) && (!wasDown.length || wasDown.some((i) => again[i].ok));
        if (helped) { s.secureDns = true; step("dns", "Your DNS gave wrong or out-of-date answers for Fluxer - now using secure DNS instead", "fixed", "Fixed for: " + names + ". Lookups for Fluxer now go to Cloudflare / Google over an encrypted connection, around your router's or provider's DNS. (Fluxer's status page has a notice about out-of-date DNS answers since it moved its servers.)"); finding = finding || "Your DNS was giving out wrong or out-of-date addresses for " + names + "."; }
        else { applyResolver(false); s.secureDns = false; step("dns", "Your DNS has trouble with Fluxer, and secure DNS doesn't get through here either", "fail", names); youDo.push({ text: "Something on this computer or network blocks Fluxer's addresses (antivirus \"web protection\", a parental/ad filter, or your router). Allow fluxer.app, fluxer.com, fluxerstatic.com and fluxerusercontent.com in it, or try another network to confirm." }); }
      } else if (s.secureDns) {
        applyResolver(true);
        const still = await resolve(ses, "web.fluxer.app", true);
        if (still.ips.length && !still.blocked) step("dns", "Secure DNS is on and working", "ok");
        else { applyResolver(false); s.secureDns = false; step("dns", "Secure DNS stopped working on this network, so it's off again", "fixed"); }
      } else { applyResolver(false); step("dns", "Your DNS finds every part of Fluxer", "ok"); }

      // the hosts file (DNS can't go around this one, so BelleCord maps those names itself)
      if (before.hostsFile.hosts.length) {
        step("hosts", "Your computer's hosts file blocks Fluxer - going around it", "run");
        const pins = {};
        for (const h of before.hostsFile.hosts) { const ips = await dohA(h); if (ips.length) pins[h] = ips.slice(0, 4); }
        const lines = before.hostsFile.lines.map((l) => "line " + l.n + ": " + l.text).join("\n");
        if (Object.keys(pins).length) {
          for (const [h, ips] of Object.entries(pins)) { s.pins[h] = ips; s.pinWhy[h] = "hosts"; }
          step("hosts", "Your computer's hosts file blocks Fluxer - BelleCord now goes around it", "fixed", "To fix your browser too, delete these lines from " + before.hostsFile.file + ":\n" + lines);
        } else step("hosts", "Your computer's hosts file blocks Fluxer", "fail", "Delete these lines from " + before.hostsFile.file + ":\n" + lines);
        youDo.push({ text: "Your hosts file (" + before.hostsFile.file + ") has " + before.hostsFile.lines.length + " line(s) blocking Fluxer - an ad-blocker or \"privacy\" tool probably added them. Delete them (Notepad, run as administrator) so Fluxer works in your browser too.", action: "hosts" });
        finding = finding || "Your computer's hosts file blocks Fluxer.";
      } else {
        const old = Object.keys(s.pins).filter((h) => (s.pinWhy[h] || "hosts") === "hosts");
        if (old.length) { for (const h of old) { delete s.pins[h]; delete s.pinWhy[h]; } step("hosts", "Your hosts file doesn't block Fluxer anymore - workaround removed", "fixed"); }
      }

      // a proxy Fluxer can't get through
      const viaProxy = before.proxy !== "?" && !/^DIRECT\b/i.test(before.proxy);
      if (viaProxy || s.direct) {
        step("proxy", "Checking your computer's proxy", "run");
        const now = await reach(ses, home() + "/", 9000);
        if (now.ok) step("proxy", s.direct ? "Connecting to Fluxer directly works" : "Fluxer gets through your proxy fine", "ok");
        else if (!s.direct) {
          try { await ses.setProxy({ mode: "direct" }); } catch {}
          const direct = await reach(ses, home() + "/", 9000);
          if (direct.ok) { s.direct = true; step("proxy", "Fluxer couldn't get through your computer's proxy - now connecting directly", "fixed", before.proxy); finding = finding || "Fluxer couldn't get through your computer's proxy."; }
          else { try { await ses.setProxy({ mode: "system" }); } catch {} step("proxy", "Fluxer can't get through your computer's proxy, and a direct connection doesn't work either", "fail", before.proxy); youDo.push({ text: "Your computer sends web traffic through a proxy (" + before.proxy + ") that Fluxer can't get through. Turn it off in Windows Settings › Network › Proxy, or ask whoever set it up." }); }
        } else { try { await ses.setProxy({ mode: "system" }); } catch {} s.direct = false; step("proxy", "Going back to your computer's normal connection settings", "fixed"); }
      }

      // clock (secure sites refuse to connect when it's far off)
      if (before.clockMin != null && Math.abs(before.clockMin) >= 5) {
        step("clock", "Your computer's clock is " + Math.abs(before.clockMin) + " minutes " + (before.clockMin > 0 ? "ahead" : "behind"), "fail", "Secure sites like Fluxer refuse to connect when the clock is wrong.");
        youDo.push({ text: "Your computer's clock is off by " + Math.abs(before.clockMin) + " minutes. Open Windows Settings › Time & language › Date & time and press \"Sync now\".", action: "time" });
        finding = finding || "Your computer's clock is wrong, so secure sites refuse to connect.";
      }

      // videos: decoded by the graphics chip, or by the processor alone (slow: videos lag and pause)
      if (before.gpu && before.gpu.video !== "?" && !/^enabled/.test(before.gpu.video)) {
        step("video", "Videos are played without your graphics chip, so they can lag", "warn", "Video decoding: " + before.gpu.video + " · compositing: " + before.gpu.compositing);
        youDo.push({ text: "Update your graphics driver (NVIDIA, AMD or Intel, from their website or Windows Update), then restart your computer. Videos in BelleCord use the graphics chip once the driver is up to date." });
      }

      // which address to use (Fluxer is moving from web.fluxer.app to fluxer.com)
      step("where", "Finding which Fluxer address answers", "run");
      try { await ses.clearHostResolverCache(); } catch {}
      const [oldA, newA] = await Promise.all([reach(ses, HOMES[0] + "/channels/@me", 10000), reach(ses, HOMES[1] + "/channels/@me", 10000)]);
      // the hosts-file workaround only starts after a restart: an address it covers counts as answering
      const pinnedOld = pinsRule(s.pins) !== pinRule0 && !!s.pins[hostOf(HOMES[0])];
      let where = home();
      if (oldA.ok || pinnedOld) where = HOMES[0];
      else if (newA.ok) where = HOMES[1];
      const moved = where !== home();
      s.home = where;
      if (pinnedOld && !oldA.ok) step("where", "Fluxer will answer at web.fluxer.app after the restart", "ok");
      else if (oldA.ok || newA.ok) step("where", moved ? "web.fluxer.app isn't answering, so BelleCord now uses fluxer.com" : "Fluxer answers at " + where.replace(/^https:\/\//, ""), moved ? "fixed" : "ok", moved ? "You may need to sign in to Fluxer once there." : "");
      else {
        const why = oldA.kind === "dns" ? "its address can't be found" : oldA.kind === "tls" ? "the secure connection fails (often a wrong clock, or antivirus checking secure sites)" : oldA.kind === "timeout" ? "it doesn't answer in time" : oldA.kind === "offline" ? "your internet is off" : "the connection fails (" + (oldA.code || "no answer") + ")";
        step("where", "Neither of Fluxer's addresses answers from this computer - " + why, "fail");
        finding = finding || "Neither of Fluxer's addresses answers from this computer - " + why + ".";
        const vpn = before.vpn;
        if (vpn.length) youDo.push({ text: "A VPN is on (" + vpn.join(", ") + "). Fluxer is known not to work through some of them - Cloudflare WARP especially. Turn it off and press Fix Fluxer again." });
        if (oldA.kind === "tls") youDo.push({ text: "If you use antivirus with \"HTTPS scanning\" / \"web shield\", let it skip fluxer.app, fluxer.com and fluxerstatic.com (or turn that part off), then try again." });
        if (before.internet.ok && !vpn.length && oldA.kind !== "tls") youDo.push({ text: "Your internet works but Fluxer doesn't answer at all. If it works on your phone on the same Wi-Fi, something on this computer is blocking it (antivirus or firewall); if not, Fluxer may be down for a bit." });
      }

      // Fluxer's app files: the page is only an empty frame until its code (from fluxerstatic.com) downloads
      let files = null;
      const list = appFiles(where === HOMES[1] ? newA.body : oldA.body, where + "/");
      if (list.length && (oldA.ok || newA.ok)) {
        step("files", "Downloading Fluxer's app files like its page does", "run");
        const got = await Promise.all(list.map((u) => download(ses, u, 30000)));
        files = { list: got };
        const bad = got.filter((g) => !g.ok);
        const bytes = got.reduce((n, g) => n + (g.bytes || 0), 0), slowest = Math.max(...got.map((g) => g.ms));
        if (!bad.length) step("files", "Fluxer's app files download fine (" + mb(bytes) + " in " + (slowest / 1000).toFixed(1) + "s)", "ok");
        else {
          const first = bad[0], fh = hostOf(first.url);
          step("files", "Fluxer's app files don't download from " + fh + " - finding out why", "run", short(first.url) + ": " + (first.code || "HTTP " + first.status));
          // ask the same file through each address, over a plain connection
          const sys = await resolve(ses, fh, false), doh = await dohA(fh);
          const v6 = sys.ips.filter((ip) => !isV4(ip) && !blockedIp(ip)).slice(0, 1), v4 = sys.ips.filter((ip) => isV4(ip) && !blockedIp(ip)).slice(0, 1);
          const d4 = doh.filter((ip) => !v4.includes(ip)).slice(0, 1);
          const tests = await Promise.all([...v6, ...v4, ...d4].map((ip) => probeAt(first.url, ip, 20000)));
          const by = (ip) => tests.find((t) => t.ip === ip) || null;
          files.probes = tests.map((t) => ({ ip: t.ip, ok: t.ok, status: t.status || 0, bytes: t.bytes, ms: t.ms, code: t.code || "" }));
          const okV4 = [...v4, ...d4].filter((ip) => by(ip) && by(ip).ok), okV6 = v6.filter((ip) => by(ip) && by(ip).ok);
          const sysV4ok = v4.some((ip) => by(ip) && by(ip).ok);
          let did = false;
          if (v6.length && !okV6.length && okV4.length) {
            // IPv6 to Fluxer doesn't get through on this network (IPv4 does): BelleCord uses IPv4 for Fluxer
            for (const h of new Set([fh, ...Object.keys(H).filter((x) => H[x].v6 && x !== "fluxer.com")])) {
              const ips = h === fh ? okV4 : (H[h].dns.ips.filter(isV4).length ? H[h].dns.ips.filter(isV4) : H[h].doh);
              if (ips.length && !s.pins[h]) { s.pins[h] = ips.slice(0, 4); s.pinWhy[h] = "ipv4"; did = true; }
            }
            if (did) {
              step("files", "Fluxer's newer IPv6 connection doesn't get through on your network - BelleCord now uses IPv4 for Fluxer", "fixed", "Your phone or iPad can have the same trouble on this Wi-Fi (videos and big files are hit first).");
              finding = finding || "Your network's IPv6 connection to Fluxer drops big files, like Fluxer's app files and videos.";
            }
          }
          if (!did && sysV4ok && !quic0) {
            // a plain connection to the very same address works, so Chromium's fast "QUIC" connection is what fails here
            s.noQuic = true; did = true;
            step("files", "Your network breaks the fast connection type (QUIC) Fluxer's files come over - BelleCord now uses the regular one", "fixed", "Some routers and antivirus programs drop QUIC partway through.");
            finding = finding || "Your network breaks the fast \"QUIC\" connection that Fluxer's files come over.";
          }
          if (!did && !sysV4ok && d4.length && by(d4[0]) && by(d4[0]).ok && (s.pinWhy[fh] !== "dns" || (s.pins[fh] || [])[0] !== d4[0])) {
            s.pins[fh] = [d4[0], ...doh.filter((ip) => ip !== d4[0])].slice(0, 4); s.pinWhy[fh] = "dns"; did = true;
            step("files", "Your DNS gives an out-of-date address for " + fh + " - BelleCord now uses the right one", "fixed");
            finding = finding || "Your DNS gives an out-of-date address for " + fh + ", where Fluxer's app files come from.";
          }
          if (!did) {
            const t = tests.find((x) => !x.ok) || {};
            step("files", "This computer can't download Fluxer's app files from " + fh, "fail", short(first.url) + ": " + (first.code || "HTTP " + first.status) + (t.code || t.status ? " · plain connection: " + (t.code || "HTTP " + t.status) : ""));
            finding = finding || "This computer can't download Fluxer's app files from " + fh + " (" + (first.code || "HTTP " + first.status) + "), so Fluxer's page stays empty.";
            if (tests.some((x) => /CERT|SELF_SIGNED|ISSUER/.test(x.code || ""))) youDo.push({ text: "Something on this computer checks secure connections in the middle (antivirus \"HTTPS scanning\" / \"web shield\"). Let it skip fluxer.app, fluxer.com and fluxerstatic.com, or turn that part off, then press Fix Fluxer again." });
            youDo.push({ text: "Something between this computer and " + fh + " stops Fluxer's app files: antivirus \"web protection\", a firewall, a VPN, or your internet provider. Check whether Fluxer opens " + inBrowser() + ". If it doesn't open there either, try your phone's hotspot: if it works there, your Wi-Fi or provider is the problem.", action: "browser" });
          }
        }
      }

      if (pinsRule(s.pins) !== pinRule0 || !!s.noQuic !== quic0) restartNeeded = true;
      save(s);
      // reload Fluxer, wait for it to start, and look at what really came up
      let page = null, watched = null;
      const views = fluxerViews();
      if (restartNeeded) step("reload", "Restart BelleCord to finish - Fluxer opens with the fix", "warn");
      else if (views.length) {
        step("reload", "Reloading Fluxer", "run");
        const wc = views[0]; // (one Fluxer view is enough to judge by)
        const w = watchPage(ses, wc);
        const wait = waitLoad(wc, 30000);
        try { if (moved || !/^https:\/\/([a-z0-9-]+\.)*fluxer\.(app|com)\//i.test(wc.getURL())) wc.loadURL(where + "/channels/@me"); else wc.reloadIgnoringCache(); } catch {}
        const r = await wait;
        if (r.ok) {
          // Fluxer draws a grey outline first and starts once its code is in: give it up to 20 seconds
          const t0 = Date.now();
          await new Promise((res) => setTimeout(res, 3500));
          page = await probe(wc);
          while (["booting", "blank", "unknown"].includes(page.kind) && Date.now() - t0 < bootWait) { await new Promise((res) => setTimeout(res, 1500)); page = await probe(wc); }
        } else page = { url: "", kind: "failed", text: r.desc + (r.code ? " (" + r.code + ")" : "") };
        watched = w.stop();
        page.failed = watched.failed; page.http = watched.http; page.errors = watched.errors; page.navs = watched.navs; page.crashed = watched.crashed;
        const say = { ok: ["Fluxer is up and you're signed in", "ok"], login: ["Fluxer is up - you're signed out here, so sign in once", "warn"], migrating: ["Fluxer is moving you to fluxer.com - let it finish", "ok"], error: ["Fluxer's page loaded but shows an error", "fail"], booting: ["Fluxer's page stayed on its grey loading outline", "fail"], blank: ["Fluxer's page loaded but stayed blank", "fail"], unknown: ["Fluxer's page loaded", "ok"], failed: ["Fluxer's page didn't load", "fail"] }[page.kind] || ["Fluxer's page loaded", "ok"];
        const what = [];
        if (page.failed.length) what.push("Didn't load: " + page.failed.slice(0, 3).map((f) => f.url + " (" + f.error + ")").join(", "));
        if (page.http.length) what.push("Refused: " + page.http.slice(0, 3).map((f) => f.url + " (HTTP " + f.status + ")").join(", "));
        if (page.errors.length && say[1] === "fail") what.push("Fluxer said: " + page.errors[0]);
        if (page.crashed) what.push("The page crashed (" + page.crashed + ")");
        step("reload", say[0], say[1], [page.text, ...what].filter(Boolean).join("\n"));
        if (page.kind === "login") youDo.push({ text: "Sign in to Fluxer on the Fluxer side (just once). Your other devices stay signed in." });
        // files that failed over the fast "QUIC" connection: BelleCord uses the regular one from the next start
        if (say[1] === "fail" && !quic0 && !s.noQuic && page.failed.some((f) => /QUIC/.test(f.error))) {
          s.noQuic = true; restartNeeded = true; save(s);
          step("reload", "Fluxer's files fail over the fast connection type (QUIC) on your network - restart BelleCord to use the regular one", "warn", what.join("\n"));
          finding = finding || "Your network breaks the fast \"QUIC\" connection that Fluxer's files come over.";
        } else if (say[1] === "fail") {
          const f = page.failed[0], hcode = page.http.find((x) => x.status === 429 || x.status === 403 || x.status >= 500);
          if (f) finding = finding || "Fluxer's page couldn't load " + f.url + " (" + f.error + ").";
          else if (hcode) finding = finding || "Fluxer's servers refused " + hcode.url + " (HTTP " + hcode.status + (hcode.status === 429 ? ": too many requests - Fluxer is slowing this connection down" : "") + ").";
          else if (page.crashed) finding = finding || "Fluxer's page crashed (" + page.crashed + ").";
          else if (page.errors.length) finding = finding || "Fluxer's page starts but its code stops with an error: " + page.errors[0];
          else finding = finding || "Fluxer's page loads but never starts, and nothing failed to download.";
          youDo.push({ text: "Try \"Open Fluxer in a clean window\". If Fluxer works there, BelleCord's look is what's breaking it" + (helpLine ? " - " + helpLine : "") + ". If it doesn't, check whether Fluxer opens " + inBrowser() + ", then try \"Sign out & start fresh\".", action: "clean" });
        }
      } else step("reload", "Open the Fluxer side to finish", "skip");

      const reachable = oldA.ok || newA.ok || pinnedOld;
      const filesOk = !files || files.list.every((g) => g.ok) || restartNeeded;
      const ok = restartNeeded ? reachable : reachable && filesOk && (!page || page.kind === "ok" || page.kind === "migrating" || page.kind === "unknown");
      if (!ok && !finding && !reachable) finding = "Fluxer doesn't answer from this computer.";
      const report = { ok, restartNeeded, finding, steps, youDo, home: where, page, files, browser: { name: browserName(), engine: "Chromium " + (process.versions.chrome || "?"), electron: process.versions.electron || "" }, tech: techText(before, { web: oldA, com: newA }, files, page, s) };
      save({ ...s, lastFix: { at: before.at, ok, page: page && page.kind, finding } });
      return report;
    })();
    try { return await busy; } finally { busy = null; }
  }
  function techText(b, after, files, page, s) {
    const L = ["BelleCord · Fix Fluxer · " + new Date(b.at).toLocaleString(), "Internet: " + (b.internet.ok ? "ok" : "DOWN " + b.internet.code) + " · clock " + (b.clockMin == null ? "?" : b.clockMin === 0 ? "in sync" : b.clockMin + " min off") + " · proxy " + b.proxy + " · VPN " + (b.vpn.join(", ") || "none")];
    L.push("Hosts file: " + (b.hostsFile.lines.length ? b.hostsFile.lines.map((l) => "#" + l.n + " " + l.text).join(" | ") : "no Fluxer lines"));
    L.push("Graphics: " + (b.gpu ? "video " + b.gpu.video + " · compositing " + b.gpu.compositing : "?"));
    L.push("BelleCord runs on Chromium " + (process.versions.chrome || "?") + " (Electron " + (process.versions.electron || "?") + ") · your browser: " + (browserName() || "?"));
    L.push("Discovery: " + (b.discovery && b.discovery.ok ? "ok (webapp " + ((b.discovery.endpoints || {}).webapp || "?") + ")" : "no answer"));
    for (const [h, r] of Object.entries(b.hosts)) L.push(h + "  dns " + (r.dns.ips.length ? r.dns.ips.slice(0, 2).join(" ") + (r.dns.blocked ? " (BLOCKED)" : "") : r.dns.code) + (r.differs ? "  (secure DNS says " + r.doh.slice(0, 2).join(" ") + ")" : "") + "  https " + (r.http.status || r.http.code) + " " + r.http.ms + "ms");
    L.push("After: web.fluxer.app " + (after.web.status || after.web.code) + " · fluxer.com " + (after.com.status || after.com.code));
    if (files) {
      L.push("App files: " + files.list.map((g) => short(g.url) + " " + (g.ok ? mb(g.bytes) + " " + g.ms + "ms" : (g.code || "HTTP " + g.status) + " after " + g.ms + "ms")).join(" | "));
      if (files.probes) L.push("Plain connection: " + files.probes.map((t) => t.ip + " " + (t.ok ? "ok " + mb(t.bytes) : t.code || "HTTP " + t.status) + " " + t.ms + "ms").join(" | "));
    } else L.push("App files: not checked");
    L.push("Secure DNS " + (s.secureDns ? "on" : "off") + " · pinned " + (Object.entries(s.pins || {}).map(([h, ips]) => h + "→" + ips[0] + " (" + ((s.pinWhy || {})[h] || "hosts") + ")").join(", ") || "none") + " · QUIC " + (s.noQuic ? "off" : "on") + " · direct " + (s.direct ? "on" : "off") + " · using " + (s.home || HOMES[0]));
    if (page) {
      L.push("Page: " + page.kind + " " + (page.url || "") + (page.text ? " - " + page.text : ""));
      if (page.navs && page.navs.length) L.push("Went to: " + page.navs.join(" → "));
      if (page.failed && page.failed.length) L.push("Didn't load: " + page.failed.map((f) => f.url + " " + f.error + (f.type ? " [" + f.type + "]" : "")).join(" | "));
      if (page.http && page.http.length) L.push("Refused: " + page.http.map((f) => f.url + " " + f.status).join(" | "));
      if (page.errors && page.errors.length) L.push("Page errors: " + page.errors.join(" | "));
      if (page.crashed) L.push("Crashed: " + page.crashed);
    } else L.push("Page: Fluxer side not open");
    return L.join("\n");
  }

  // ---------------- the last resort: sign out of Fluxer here and start fresh ----------------
  async function reset() {
    const ses = fses();
    try { await ses.clearStorageData(); } catch {}
    try { await ses.clearCache(); } catch {}
    try { await ses.clearCodeCaches({}); } catch {}
    try { await ses.clearHostResolverCache(); } catch {}
    try { await ses.closeAllConnections(); } catch {}
    for (const wc of fluxerViews()) { try { wc.loadURL(home() + "/channels/@me"); } catch {} }
    return { ok: true };
  }
  // Fluxer on its own, with none of BelleCord's changes (tells whether BelleCord's look is what breaks it)
  function openClean() {
    try {
      const w = new BrowserWindow({ width: 1200, height: 860, title: "Fluxer (clean test)", autoHideMenuBar: true, backgroundColor: "#313338", webPreferences: { partition: partitionOf(), contextIsolation: true, sandbox: true } });
      w.loadURL(home() + "/channels/@me");
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }
  // Fluxer in your normal browser (tells whether it's BelleCord or this computer)
  function openBrowser() { try { shell.openExternal(home() + "/channels/@me"); return { ok: true }; } catch (e) { return { ok: false }; } }
  function openHelp(what) {
    try {
      if (what === "time" && process.platform === "win32") return shell.openExternal("ms-settings:dateandtime");
      if (what === "hosts") return shell.showItemInFolder(hostsFile().file);
      if (what === "browser") return openBrowser();
    } catch {}
    return null;
  }

  // ---------------- start-up ----------------
  // before the app is ready: the address workarounds and "no QUIC" have to be in place before anything connects
  function beforeReady() {
    const s = S();
    const rule = pinsRule(s.pins);
    if (rule) { try { app.commandLine.appendSwitch("host-resolver-rules", rule); } catch {} }
    if (s.noQuic) { try { app.commandLine.appendSwitch("disable-quic"); } catch {} }
  }
  // once ready: the DNS settings, and a check that secure DNS still works on this network (never stuck without DNS)
  async function afterReady() {
    const s = S();
    applyResolver(!!s.secureDns);
    if (s.direct) { try { await fses().setProxy({ mode: "direct" }); } catch {} }
    if (s.secureDns) {
      const r = await resolve(fses(), "web.fluxer.app", true).catch(() => ({ ips: [] }));
      if (!r.ips || !r.ips.length || r.blocked) { applyResolver(false); save({ secureDns: false }); log("secure DNS didn't work on this network, so it's off"); }
    }
    if (s.pins && Object.keys(s.pins).length) {
      // refresh the pinned addresses (in the background; used from the next start)
      (async () => { const next = {}; for (const h of Object.keys(s.pins)) { const ips = await dohA(h); next[h] = ips.length ? ips.slice(0, 4) : s.pins[h]; } save({ pins: next }); })().catch(() => {});
    }
  }

  return { beforeReady, afterReady, diagnose, fix, reset, openClean, openBrowser, openHelp, home, last: () => S().lastFix || null, _test: { blockedIp, kindOf, errCode, pinsRule, hostsFile, appFiles, probeAt, PAGE_PROBE, FLUXER_RE } };
};
module.exports.FLUXER_RE = FLUXER_RE;
module.exports.blockedIp = blockedIp;
