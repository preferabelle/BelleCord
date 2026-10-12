// Fix Fluxer: one button that finds out why Fluxer won't work in BelleCord, and fixes everything an app can fix.
// Shared by both BelleCords (Belle's own and the everyone app). Runs in the app's main process (Electron).
//
// What it checks, and what it does about each:
//   * old lookups and stuck connections ............. forgets them
//   * a broken or stale saved copy of Fluxer ........ clears Fluxer's cached files (you stay signed in)
//   * DNS that can't find Fluxer, or blocks it ....... switches to secure DNS (Cloudflare / Google / Quad9), but only
//                                                      after checking it really works here; otherwise puts it back
//   * a "hosts" file line that blocks Fluxer ......... goes around it for BelleCord, and names the lines to delete
//   * a proxy Fluxer can't get through ............... connects to Fluxer directly instead (only if that works)
//   * Fluxer's move from fluxer.app to fluxer.com .... uses whichever address answers
//   * then it reloads Fluxer and checks the page really came up (signed in, signed out, blank, an error page)
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
const errCode = (e) => { const m = String((e && (e.message || e.code)) || e || "").match(/ERR_[A-Z0-9_]+/); return m ? m[0] : String((e && e.code) || (e && e.message) || "error").slice(0, 60); };
function kindOf(code) {
  code = String(code || "");
  if (/NAME_NOT_RESOLVED|NAME_RESOLUTION|DNS/.test(code)) return "dns";
  if (/CERT|SSL|TLS/.test(code)) return "tls";
  if (/PROXY|TUNNEL/.test(code)) return "proxy";
  if (/BLOCKED/.test(code)) return "blocked";
  if (/timeout/i.test(code) || /TIMED_OUT/.test(code)) return "timeout";
  if (/INTERNET_DISCONNECTED|NETWORK_CHANGED|NETWORK_ACCESS_DENIED/.test(code)) return "offline";
  return "connect";
}
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error((label || "timeout") + " (timeout)")), ms))]);
const hostOf = (u) => { try { return new URL(String(u).replace(/^wss?:/i, "https:")).hostname.toLowerCase(); } catch { return ""; } };
const isHome = (u) => HOMES.includes(String(u || "").replace(/\/+$/, ""));

// runs inside Fluxer's page: did Fluxer really come up, and are you signed in?
const PAGE_PROBE = "(" + function () {
  var path = location.pathname || "/", text = "";
  try { text = (document.body && document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 600); } catch (e) {}
  var shell = document.querySelector('[data-flx^="app.guilds-layout"],[data-flx-user-self="true"],[data-flx^="app.sidebar-nav"]');
  var login = /^\/(login|register|authorize|reset|verify)(\/|$)/.test(path) || !!document.querySelector('input[type="password"]');
  var root = document.getElementById("root") || document.body;
  var kids = root ? root.querySelectorAll("*").length : 0;
  var errLine = (text.match(/[^.!?]*(something went wrong|couldn.t (connect|load|reach)|failed to (load|connect)|unable to (connect|load)|reconnecting|offline|no internet)[^.!?]*[.!?]?/i) || [""])[0].trim().slice(0, 160);
  var kind = shell ? "ok" : /^\/migrate/.test(path) ? "migrating" : login ? "login" : errLine ? "error" : kids < 25 ? "blank" : "unknown";
  return { url: location.href, kind: kind, text: errLine };
}.toString() + ")()";

/**
 * @param {object} o
 *   app, session, webContents, BrowserWindow, shell — Electron's own modules
 *   store: { get(): object, set(changes): void } — where this BelleCord keeps the Fix Fluxer settings
 *   partition — Fluxer's saved sign-in (default persist:fluxer); log — optional
 */
module.exports = function createFluxerFix(o) {
  const { app, session, webContents, BrowserWindow, shell, store } = o;
  const partition = o.partition || "persist:fluxer";
  const log = o.log || (() => {});
  const screenshotTo = o.screenshotTo || "send Belle a screenshot of this box"; // (each BelleCord says who helps its user)
  const S = () => { try { return store.get() || {}; } catch { return {}; } };
  const save = (ch) => { try { store.set(ch); } catch {} };
  const fses = () => session.fromPartition(partition);
  const home = () => (isHome(S().home) ? String(S().home).replace(/\/+$/, "") : HOMES[0]);
  let busy = null;

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
  // secure DNS answers (JSON form) straight from Cloudflare / Google: for the hosts-file workaround
  async function dohA(name) {
    const tries = ["https://1.1.1.1/dns-query?name=" + encodeURIComponent(name) + "&type=A", "https://8.8.8.8/resolve?name=" + encodeURIComponent(name) + "&type=A"];
    for (const u of tries) {
      try {
        const r = await withTimeout(session.defaultSession.fetch(u, { headers: { accept: "application/dns-json" }, cache: "no-store" }), 6000, "doh");
        if (!r.ok) continue;
        const j = await r.json();
        const ips = (j.Answer || []).filter((a) => a.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(a.data) && !blockedIp(a.data)).map((a) => a.data);
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
  const pinsRule = (pins) => Object.entries(pins || {}).filter(([h, ips]) => FLUXER_RE.test(h) && /^[a-z0-9.-]+$/i.test(h) && Array.isArray(ips) && /^\d+\.\d+\.\d+\.\d+$/.test(ips[0] || "")).map(([h, ips]) => "MAP " + h + " " + ips[0]).join(",");
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
  async function discovery(ses) {
    for (const u of ["https://api.fluxer.app/.well-known/fluxer", "https://fluxer.com/api/.well-known/fluxer"]) {
      const r = await reach(ses, u, 9000);
      if (r.ok && r.body) { try { const j = JSON.parse(r.body); if (j && j.endpoints) return { ok: true, from: u, endpoints: j.endpoints }; } catch {} }
    }
    return { ok: false, endpoints: null };
  }

  // ---------------- look ----------------
  async function diagnose() {
    const ses = fses();
    const s = S();
    const out = { at: new Date().toISOString(), internet: null, clockMin: null, proxy: "?", vpn: vpnAdapters(), hostsFile: hostsFile(), discovery: null, hosts: {}, secureDns: !!s.secureDns, pins: Object.keys(s.pins || {}), direct: !!s.direct, home: home(), pages: [] };
    // is the internet itself up (and is this PC's clock right)?
    const net = await reach(session.defaultSession, "https://1.1.1.1/cdn-cgi/trace", 8000);
    const net2 = net.ok ? net : await reach(session.defaultSession, "https://www.google.com/generate_204", 8000);
    out.internet = { ok: net.ok || net2.ok, code: net2.code || net.code || "" };
    const date = net.date || net2.date;
    if (date) { const t = Date.parse(date); if (!isNaN(t)) out.clockMin = Math.round((Date.now() - t) / 60000); }
    try { out.proxy = String(await withTimeout(ses.resolveProxy("https://web.fluxer.app/"), 4000, "proxy")).trim() || "DIRECT"; } catch { out.proxy = "?"; }
    out.discovery = await discovery(ses);
    const e = (out.discovery && out.discovery.endpoints) || {};
    const want = new Map([["web.fluxer.app", "https://web.fluxer.app/"], ["api.fluxer.app", "https://api.fluxer.app/.well-known/fluxer"], ["gateway.fluxer.app", "https://gateway.fluxer.app/"], ["fluxerusercontent.com", "https://fluxerusercontent.com/"], ["fluxer.com", "https://fluxer.com/"]]);
    for (const k of ["webapp", "api", "gateway", "media", "static_cdn"]) { const h = hostOf(e[k]); if (h && FLUXER_RE.test(h) && !want.has(h)) want.set(h, "https://" + h + "/"); }
    await Promise.all([...want].map(async ([h, url]) => {
      const [dns, http] = await Promise.all([resolve(ses, h, false), reach(ses, url, 9000)]);
      out.hosts[h] = { dns, http: { ok: http.ok, reached: http.reached, status: http.status, code: http.code || "", kind: http.kind || "", ms: http.ms } };
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
      let restartNeeded = false;
      const step = (id, label, status, detail) => {
        let x = steps.find((y) => y.id === id);
        if (!x) { x = { id, label }; steps.push(x); }
        Object.assign(x, { label, status, detail: detail || "" });
        try { progress && progress({ ...x }); } catch {}
      };
      const ses = fses();

      step("look", "Checking your connection to Fluxer", "run");
      const before = await diagnose();
      const H = before.hosts, key = ["web.fluxer.app", "api.fluxer.app", "gateway.fluxer.app"];
      const blockedByHostsFile = new Set(before.hostsFile.hosts);
      step("look", "Checked your connection to Fluxer", "ok", before.internet.ok ? "" : "Your internet itself looks off.");

      step("flush", "Forgetting old lookups and stuck connections", "run");
      for (const x of [ses, session.defaultSession]) { try { await x.clearHostResolverCache(); } catch {} }
      try { await ses.closeAllConnections(); } catch {}
      step("flush", "Forgot old lookups and stuck connections", "fixed");

      step("cache", "Clearing Fluxer's saved files (you stay signed in)", "run");
      try { await ses.clearCache(); } catch {}
      try { await ses.clearCodeCaches({}); } catch {}
      try { await ses.clearStorageData({ storages: ["serviceworkers", "cachestorage", "shadercache"] }); } catch {}
      step("cache", "Cleared Fluxer's saved files (you stay signed in)", "fixed");

      // DNS: only the lookups the hosts file isn't behind
      step("dns", "Checking your DNS", "run");
      const dnsBad = key.filter((h) => H[h] && !blockedByHostsFile.has(h) && (H[h].dns.blocked || (!H[h].dns.ips.length && kindOf(H[h].dns.code) === "dns")));
      if (dnsBad.length) {
        applyResolver(true);
        const ok = (await Promise.all(["web.fluxer.app", "api.fluxer.app"].map((h) => resolve(ses, h, true)))).every((r) => r.ips.length && !r.blocked);
        if (ok) { s.secureDns = true; step("dns", "Your DNS couldn't find Fluxer — now using secure DNS instead", "fixed", "Lookups for Fluxer go to Cloudflare / Google over an encrypted connection, around your router's or provider's DNS."); }
        else { applyResolver(false); s.secureDns = false; step("dns", "Your DNS can't find Fluxer, and secure DNS is blocked here too", "fail", "Something on this network (antivirus web protection, a parental filter, or the router) blocks both."); youDo.push({ text: "Something on this PC or network blocks Fluxer's address (antivirus “web protection”, a parental/ad filter, or your router). Allow fluxer.app and fluxer.com in it, or try another network to confirm." }); }
      } else if (s.secureDns) {
        applyResolver(true);
        const still = await resolve(ses, "web.fluxer.app", true);
        if (still.ips.length && !still.blocked) step("dns", "Secure DNS is on and working", "ok");
        else { applyResolver(false); s.secureDns = false; step("dns", "Secure DNS stopped working on this network, so it's off again", "fixed"); }
      } else { applyResolver(false); step("dns", "Your DNS finds Fluxer fine", "ok"); }

      // the hosts file (DNS can't go around this one, so BelleCord maps those names itself)
      if (before.hostsFile.hosts.length) {
        step("hosts", "Your PC's hosts file blocks Fluxer — going around it", "run");
        const pins = {};
        for (const h of before.hostsFile.hosts) { const ips = await dohA(h); if (ips.length) pins[h] = ips.slice(0, 4); }
        const lines = before.hostsFile.lines.map((l) => "line " + l.n + ": " + l.text).join("\n");
        if (Object.keys(pins).length) {
          if (pinsRule(pins) !== pinsRule(s.pins)) restartNeeded = true;
          s.pins = pins;
          step("hosts", "Your PC's hosts file blocks Fluxer — BelleCord now goes around it", "fixed", "Restart BelleCord to finish. To fix your browser too, delete these lines from " + before.hostsFile.file + ":\n" + lines);
        } else step("hosts", "Your PC's hosts file blocks Fluxer", "fail", "Delete these lines from " + before.hostsFile.file + ":\n" + lines);
        youDo.push({ text: "Your hosts file (" + before.hostsFile.file + ") has " + before.hostsFile.lines.length + " line(s) blocking Fluxer — an ad-blocker or “privacy” tool probably added them. Delete them (Notepad, run as administrator) so Fluxer works in your browser too.", action: "hosts" });
      } else if (s.pins && Object.keys(s.pins).length) { s.pins = {}; restartNeeded = true; step("hosts", "Your hosts file doesn't block Fluxer anymore — workaround removed", "fixed", "Restart BelleCord to finish."); }

      // a proxy Fluxer can't get through
      const viaProxy = before.proxy !== "?" && !/^DIRECT\b/i.test(before.proxy);
      if (viaProxy || s.direct) {
        step("proxy", "Checking your PC's proxy", "run");
        const now = await reach(ses, home() + "/", 9000);
        if (now.ok) step("proxy", s.direct ? "Connecting to Fluxer directly works" : "Fluxer gets through your proxy fine", "ok");
        else if (!s.direct) {
          try { await ses.setProxy({ mode: "direct" }); } catch {}
          const direct = await reach(ses, home() + "/", 9000);
          if (direct.ok) { s.direct = true; step("proxy", "Fluxer couldn't get through your PC's proxy — now connecting directly", "fixed", before.proxy); }
          else { try { await ses.setProxy({ mode: "system" }); } catch {} step("proxy", "Fluxer can't get through your PC's proxy, and a direct connection doesn't work either", "fail", before.proxy); youDo.push({ text: "Your PC sends web traffic through a proxy (" + before.proxy + ") that Fluxer can't get through. Turn it off in Windows Settings › Network › Proxy, or ask whoever set it up." }); }
        } else { try { await ses.setProxy({ mode: "system" }); } catch {} s.direct = false; step("proxy", "Going back to your PC's normal connection settings", "fixed"); }
      }

      // clock (secure sites refuse to connect when it's far off)
      if (before.clockMin != null && Math.abs(before.clockMin) >= 5) {
        step("clock", "Your PC's clock is " + Math.abs(before.clockMin) + " minutes " + (before.clockMin > 0 ? "ahead" : "behind"), "fail", "Secure sites like Fluxer refuse to connect when the clock is wrong.");
        youDo.push({ text: "Your PC's clock is off by " + Math.abs(before.clockMin) + " minutes. Open Windows Settings › Time & language › Date & time and press “Sync now”.", action: "time" });
      }

      // which address to use (Fluxer is moving from web.fluxer.app to fluxer.com)
      step("where", "Finding which Fluxer address answers", "run");
      try { await ses.clearHostResolverCache(); } catch {}
      const [oldA, newA] = await Promise.all([reach(ses, HOMES[0] + "/", 10000), reach(ses, HOMES[1] + "/", 10000)]);
      // the hosts-file workaround only starts after a restart: an address it covers counts as answering
      const pinnedOld = restartNeeded && !!(s.pins && s.pins[hostOf(HOMES[0])]);
      let where = home();
      if (oldA.ok || pinnedOld) where = HOMES[0];
      else if (newA.ok) where = HOMES[1];
      const moved = where !== home();
      s.home = where;
      if (pinnedOld && !oldA.ok) step("where", "Fluxer will answer at web.fluxer.app after the restart", "ok");
      else if (oldA.ok || newA.ok) step("where", moved ? "web.fluxer.app isn't answering, so BelleCord now uses fluxer.com" : "Fluxer answers at " + where.replace(/^https:\/\//, ""), moved ? "fixed" : "ok", moved ? "You may need to sign in to Fluxer once there." : "");
      else {
        const why = oldA.kind === "dns" ? "its address can't be found" : oldA.kind === "tls" ? "the secure connection fails (often a wrong clock, or antivirus checking secure sites)" : oldA.kind === "timeout" ? "it doesn't answer in time" : oldA.kind === "offline" ? "your internet is off" : "the connection fails (" + (oldA.code || "no answer") + ")";
        step("where", "Neither of Fluxer's addresses answers from this PC — " + why, "fail");
        const vpn = before.vpn;
        if (vpn.length) youDo.push({ text: "A VPN is on (" + vpn.join(", ") + "). Fluxer is known not to work through some of them — Cloudflare WARP especially. Turn it off and press Fix Fluxer again." });
        if (oldA.kind === "tls") youDo.push({ text: "If you use antivirus with “HTTPS scanning” / “web shield”, let it skip fluxer.app and fluxer.com (or turn that part off), then try again." });
        if (before.internet.ok && !vpn.length && oldA.kind !== "tls") youDo.push({ text: "Your internet works but Fluxer doesn't answer at all. If it works on your phone on the same Wi-Fi, something on this PC is blocking it (antivirus or firewall); if not, Fluxer may be down for a bit." });
      }

      save(s);
      // reload Fluxer, and look at what really came up
      let page = null;
      const views = fluxerViews();
      if (restartNeeded) step("reload", "Restart BelleCord to finish — Fluxer opens with the fix", "warn");
      else if (views.length) {
        step("reload", "Reloading Fluxer", "run");
        for (const wc of views) {
          const wait = waitLoad(wc, 30000);
          try { if (moved || !/^https:\/\/([a-z0-9-]+\.)*fluxer\.(app|com)\//i.test(wc.getURL())) wc.loadURL(where + "/channels/@me"); else wc.reloadIgnoringCache(); } catch {}
          const r = await wait;
          await new Promise((res) => setTimeout(res, r.ok ? 3500 : 300));
          page = r.ok ? await probe(wc) : { url: "", kind: "failed", text: r.desc + (r.code ? " (" + r.code + ")" : "") };
          break; // (one Fluxer view is enough to judge by)
        }
        const say = { ok: ["Fluxer is up and you're signed in", "ok"], login: ["Fluxer is up — you're signed out here, so sign in once", "warn"], migrating: ["Fluxer is moving you to fluxer.com — let it finish", "ok"], error: ["Fluxer's page loaded but shows an error", "fail"], blank: ["Fluxer's page loaded but stayed blank", "fail"], unknown: ["Fluxer's page loaded", "ok"], failed: ["Fluxer's page didn't load", "fail"] }[page.kind] || ["Fluxer's page loaded", "ok"];
        step("reload", say[0], say[1], page.text || "");
        if (page.kind === "login") youDo.push({ text: "Sign in to Fluxer on the Fluxer side (just once). Your other devices stay signed in." });
        if (page.kind === "blank" || page.kind === "error" || page.kind === "unknown") youDo.push({ text: "Try “Open Fluxer in a clean window”. If Fluxer works there, BelleCord's look is what's breaking it — " + screenshotTo + ". If it doesn't, try “Sign out & start fresh”.", action: "clean" });
      } else step("reload", "Open the Fluxer side to finish", "skip");

      const after = { web: oldA, com: newA };
      const reachable = after.web.ok || after.com.ok || pinnedOld;
      const ok = restartNeeded ? reachable : reachable && (!page || page.kind === "ok" || page.kind === "migrating" || page.kind === "unknown");
      const report = { ok, restartNeeded, steps, youDo, home: where, page, tech: techText(before, after, page, s) };
      save({ ...s, lastFix: { at: before.at, ok, page: page && page.kind } });
      return report;
    })();
    try { return await busy; } finally { busy = null; }
  }
  function techText(b, after, page, s) {
    const L = ["BelleCord · Fix Fluxer · " + new Date(b.at).toLocaleString(), "Internet: " + (b.internet.ok ? "ok" : "DOWN " + b.internet.code) + " · clock " + (b.clockMin == null ? "?" : b.clockMin === 0 ? "in sync" : b.clockMin + " min off") + " · proxy " + b.proxy + " · VPN " + (b.vpn.join(", ") || "none")];
    L.push("Hosts file: " + (b.hostsFile.lines.length ? b.hostsFile.lines.map((l) => "#" + l.n + " " + l.text).join(" | ") : "no Fluxer lines"));
    L.push("Discovery: " + (b.discovery && b.discovery.ok ? "ok (webapp " + ((b.discovery.endpoints || {}).webapp || "?") + ")" : "no answer"));
    for (const [h, r] of Object.entries(b.hosts)) L.push(h + "  dns " + (r.dns.ips.length ? r.dns.ips.slice(0, 2).join(" ") + (r.dns.blocked ? " (BLOCKED)" : "") : r.dns.code) + "  https " + (r.http.status || r.http.code) + " " + r.http.ms + "ms");
    L.push("After: web.fluxer.app " + (after.web.status || after.web.code) + " · fluxer.com " + (after.com.status || after.com.code));
    L.push("Secure DNS " + (s.secureDns ? "on" : "off") + " · hosts workaround " + (Object.keys(s.pins || {}).join(", ") || "none") + " · direct " + (s.direct ? "on" : "off") + " · using " + (s.home || HOMES[0]));
    L.push("Page: " + (page ? page.kind + " " + (page.url || "") + (page.text ? " — " + page.text : "") : "Fluxer side not open"));
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
      const w = new BrowserWindow({ width: 1200, height: 860, title: "Fluxer (clean test)", autoHideMenuBar: true, backgroundColor: "#313338", webPreferences: { partition, contextIsolation: true, sandbox: true } });
      w.loadURL(home() + "/channels/@me");
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }
  function openHelp(what) {
    try {
      if (what === "time" && process.platform === "win32") return shell.openExternal("ms-settings:dateandtime");
      if (what === "hosts") return shell.showItemInFolder(hostsFile().file);
    } catch {}
    return null;
  }

  // ---------------- start-up ----------------
  // before the app is ready: the hosts-file workaround has to be in place before anything connects
  function beforeReady() {
    const rule = pinsRule(S().pins);
    if (rule) { try { app.commandLine.appendSwitch("host-resolver-rules", rule); } catch {} }
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
      // refresh the hosts-file workaround's addresses (in the background; used from the next start)
      (async () => { const next = {}; for (const h of Object.keys(s.pins)) { const ips = await dohA(h); next[h] = ips.length ? ips.slice(0, 4) : s.pins[h]; } save({ pins: next }); })().catch(() => {});
    }
  }

  return { beforeReady, afterReady, diagnose, fix, reset, openClean, openHelp, home, _test: { blockedIp, kindOf, errCode, pinsRule, hostsFile, PAGE_PROBE, FLUXER_RE } };
};
module.exports.FLUXER_RE = FLUXER_RE;
module.exports.blockedIp = blockedIp;
