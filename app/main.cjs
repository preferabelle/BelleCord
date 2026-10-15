// BelleCord (new): Fluxer and Discord in one window, each the real website, each signed in as you.
// No bot is needed to read or type: these are the sites themselves, in their own saved sign-ins.
// Nothing here reads, types or clicks for you on either site.
const { app, BrowserWindow, session, shell, desktopCapturer, ipcMain, screen, Menu, clipboard, Notification, Tray, nativeImage, net, webContents } = require("electron");
const zlib = require("zlib");
const path = require("path");
const fs = require("fs");

const NAME = "BelleCord";
const MAC = process.platform === "darwin";
const SHELL = path.join(__dirname, "shell.html");
const ICON = path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png");
const withIcon = () => (fs.existsSync(ICON) ? { icon: ICON } : {});
const CHROME_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const FIREFOX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";
const isGoogleSignIn = (u) => /^https:\/\/(accounts\.google\.com|accounts\.youtube\.com)\//i.test(u);
// sign-in and helper windows of these sites stay inside the app (so the sign-in sticks); other links open in your browser
// (fluxer.com too: Fluxer is moving its web app there from web.fluxer.app)
const STAYS_IN = /^https:\/\/([a-z0-9-]+\.)*(fluxer\.app|fluxer\.com|fluxer\.gg|discord\.com|discord\.gg|discordapp\.com|hcaptcha\.com|accounts\.google\.com|appleid\.apple\.com)(\/|$)/i;
const PARTS = ["persist:fluxer", "persist:discord", "persist:tiktok", "persist:pinterest", "persist:x", "persist:links"];
const PANEL_PARTS = ["persist:tiktok", "persist:pinterest", "persist:x", "persist:links"]; // the side panels (any website)

// (IntensiveWakeUpThrottling and AllowAggressiveThrottlingWithWebSocket off, like Fluxer's own desktop app: a side you're
//  not looking at was slowed down until its live connection dropped. All features go in this one switch.)
app.commandLine.appendSwitch("disable-features", "WebRtcAllowInputVolumeAdjustment,FedCm,FedCmButtonMode,IntensiveWakeUpThrottling,AllowAggressiveThrottlingWithWebSocket");
app.commandLine.appendSwitch("disable-blink-features", "FedCm");
app.userAgentFallback = CHROME_UA;
app.setAppUserModelId(NAME);
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

let win = null;
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

// ---- your settings (look, countdown, last side): a small file in the app's own folder, never shared ----
const prefsFile = () => path.join(app.getPath("userData"), "prefs.json");
let prefs = null;
function readPrefs() { if (prefs) return prefs; try { prefs = JSON.parse(fs.readFileSync(prefsFile(), "utf-8")); } catch { prefs = {}; } return prefs; }
function writePrefs(changes) {
  prefs = { ...readPrefs(), ...changes };
  for (const k of Object.keys(prefs)) if (prefs[k] === null) delete prefs[k];
  try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch {}
  return prefs;
}
ipcMain.handle("prefs:get", () => readPrefs());
// ---- Performance (dashboard): what BelleCord is using, and the switches that make it lighter ----
// (the graphics card switch only works from the start, so it's read here, before anything is drawn)
try { if (readPrefs().noGpu) app.disableHardwareAcceleration(); } catch {}
const partOfWc = (wc) => { try { if (wc.session === session.fromPartition("persist:fluxer")) return "fluxer"; if (wc.session === session.fromPartition("persist:discord")) return "discord"; if (PANEL_PARTS.some((p) => wc.session === session.fromPartition(p))) return "links"; } catch {} return "app"; };
ipcMain.handle("perf:usage", () => {
  const cores = Math.max(1, require("os").cpus().length);
  const byPid = new Map();
  for (const wc of webContents.getAllWebContents()) { try { byPid.set(wc.getOSProcessId(), partOfWc(wc)); } catch {} }
  const parts = { app: { cpu: 0, mem: 0 }, fluxer: { cpu: 0, mem: 0 }, discord: { cpu: 0, mem: 0 }, links: { cpu: 0, mem: 0 }, gpu: { cpu: 0, mem: 0 } };
  for (const m of app.getAppMetrics()) {
    const k = m.type === "GPU" ? "gpu" : byPid.get(m.pid) || "app";
    parts[k].cpu += (m.cpu?.percentCPUUsage || 0) / cores;
    parts[k].mem += (m.memory?.workingSetSize || 0) / 1024; // (MB)
  }
  const total = Object.values(parts).reduce((a, p) => ({ cpu: a.cpu + p.cpu, mem: a.mem + p.mem }), { cpu: 0, mem: 0 });
  return { parts, total, gpu: !readPrefs().noGpu };
});
ipcMain.handle("perf:spell", (e, on) => { for (const p of ["persist:fluxer", "persist:discord"]) { try { session.fromPartition(p).setSpellCheckerEnabled(!!on); } catch {} } return true; });
// lighter memory: the sites' saved copies of pictures and files (sign-ins and settings stay)
ipcMain.handle("perf:clean", async () => {
  let freed = 0;
  for (const p of PARTS) { try { const ses = session.fromPartition(p); freed += await ses.getCacheSize(); await ses.clearCache(); await ses.clearCodeCaches({}).catch(() => {}); } catch {} }
  return { mb: Math.round(freed / 1048576) };
});
// ---- Performance > "On your computer": every program running on the computer, grouped by name (all of Chrome's
// processes are one "Chrome"), with its memory and CPU. Only asked for while that part of the dashboard is on screen.
// Windows: one small hidden PowerShell that stays open while it's being asked (starting one every time costs more)
// and closes after 20 seconds of nobody looking. Mac and Linux: "ps".
const sysTop = (() => {
  const os = require("os");
  const cp = require("child_process");
  const WIN = process.platform === "win32", LINUX = process.platform === "linux";
  const cores = Math.max(1, os.cpus().length);
  let ps = null, buf = "", waiting = null, idleT = null, chain = Promise.resolve();
  let lastCpu = new Map(), lastAt = 0, lastTimes = null;
  const names = new Map(); // (Windows: "chrome" -> "Google Chrome", from the program's own description)
  // (PowerShell reads its commands one line at a time from us: "-Command -", the way that works on every Windows.
  //  The two helpers are sent once, each on one line; then each question is just "bcS" or "bcD 'a|b'".)
  const SETUP = [
    "$ErrorActionPreference='SilentlyContinue'; $ProgressPreference='SilentlyContinue'; $bcIc=[Globalization.CultureInfo]::InvariantCulture",
    "function bcS { $sb=New-Object Text.StringBuilder; foreach($p in [Diagnostics.Process]::GetProcesses()){ $c=0.0; try{ $c=$p.TotalProcessorTime.TotalSeconds }catch{}; $m=0; try{ $m=$p.WorkingSet64 }catch{}; [void]$sb.Append($p.Id).Append('|').Append($p.ProcessName).Append('|').Append($c.ToString('0.000',$bcIc)).Append('|').Append($m).Append([char]10) }; [Console]::Out.Write($sb.ToString()); [Console]::Out.WriteLine('END'); [Console]::Out.Flush() }",
    "function bcD($l) { $sb=New-Object Text.StringBuilder; foreach($n in $l.Split('|')){ $d=''; try{ $d=(Get-Process -Name $n | Where-Object { $_.Description } | Select-Object -First 1).Description }catch{}; [void]$sb.Append($n).Append('|').Append($d).Append([char]10) }; [Console]::Out.Write($sb.ToString()); [Console]::Out.WriteLine('END'); [Console]::Out.Flush() }",
  ].join("\n") + "\n";
  let why = ""; // (the last thing that went wrong, shown under "Details")
  const PS = () => { const root = process.env.SystemRoot || process.env.windir || "C:\\Windows"; const full = require("path").join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"); return require("fs").existsSync(full) ? full : "powershell.exe"; };
  function start() {
    try {
      ps = cp.spawn(PS(), ["-NoProfile", "-NoLogo", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "-"], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      ps.stdout.setEncoding("utf8");
      ps.stdout.on("data", (d) => {
        buf += d;
        const m = buf.match(/(^|\n)END\r?\n/);
        if (m && waiting) { const out = buf.slice(0, m.index); buf = buf.slice(m.index + m[0].length); const w = waiting; waiting = null; w(out); }
      });
      ps.stderr.setEncoding("utf8");
      ps.stderr.on("data", (d) => { why = ("PowerShell: " + String(d).trim()).slice(0, 300); });
      ps.on("exit", (code) => { if (!why) why = "PowerShell closed (" + code + ")"; ps = null; if (waiting) { const w = waiting; waiting = null; w(null); } });
      ps.on("error", (e) => { why = "PowerShell didn't start: " + (e && e.message); });
      ps.stdin.on("error", () => {});
      ps.stdin.write(SETUP);
    } catch (e) { why = "PowerShell didn't start: " + (e && e.message); ps = null; }
  }
  function ask(line) {
    chain = chain.then(() => new Promise((resolve) => {
      if (!ps) start();
      if (!ps) return resolve(null);
      clearTimeout(idleT);
      idleT = setTimeout(() => { try { ps && ps.kill(); } catch {} ps = null; }, 20000);
      const t = setTimeout(() => { if (waiting) { waiting = null; why = why || "PowerShell took too long"; try { ps && ps.kill(); } catch {} ps = null; resolve(null); } }, 10000);
      buf = "";
      waiting = (out) => { clearTimeout(t); resolve(out); };
      try { ps.stdin.write(line + "\n"); } catch { waiting = null; clearTimeout(t); resolve(null); }
    }));
    return chain;
  }
  // (if PowerShell can't be used at all, "tasklist" still gives every program and its memory, just no CPU)
  async function tasklist() {
    const out = await run("tasklist", ["/fo", "csv", "/nh"]);
    if (!out) return null;
    return out.split(/\r?\n/).map((l) => l.match(/^"([^"]*)","(\d+)","[^"]*","[^"]*","([^"]*)"/)).filter(Boolean).map((m) => ({ pid: Number(m[2]), name: m[1].replace(/\.exe$/i, ""), pct: 0, noCpu: true, mem: Number(m[3].replace(/[^\d]/g, "")) / 1024 }));
  }
  const run = (cmd, args) => new Promise((resolve) => { try { cp.execFile(cmd, args, { maxBuffer: 8 << 20, windowsHide: true }, (e, out) => resolve(e ? null : String(out))); } catch { resolve(null); } });
  // [{pid, name, sec (CPU seconds so far) or pct, mem (MB)}]
  async function sample() {
    if (WIN) {
      let out = await ask("bcS");
      if (!out) out = await ask("bcS"); // (once more: the first start can be slow)
      if (!out) return await tasklist();
      return out.split(/\r?\n/).map((l) => l.split("|")).filter((a) => a.length >= 4).map((a) => ({ pid: Number(a[0]), name: a[1], sec: Number(String(a[2]).replace(",", ".")) || 0, mem: (Number(a[3]) || 0) / 1048576 }));
    }
    if (LINUX) {
      const out = await run("ps", ["-A", "-o", "pid=,rss=,times=,comm="]);
      if (!out) return null;
      return out.split("\n").map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)).filter(Boolean).map((m) => ({ pid: Number(m[1]), mem: Number(m[2]) / 1024, sec: Number(m[3]), name: m[4] }));
    }
    const out = await run("ps", ["-A", "-o", "pid=,pcpu=,rss=,comm="]);
    if (!out) return null;
    return out.split("\n").map((l) => l.trim().match(/^(\d+)\s+([\d.,]+)\s+(\d+)\s+(.+)$/)).filter(Boolean).map((m) => {
      const full = m[4], app = full.match(/\/([^/]+)\.app\//);
      return { pid: Number(m[1]), pct: Number(m[2].replace(",", ".")) / cores, mem: Number(m[3]) / 1024, name: app ? app[1] : full.split("/").pop() };
    });
  }
  const pretty = (n) => { const s = String(n).replace(/\.exe$/i, ""); return s.charAt(0).toUpperCase() + s.slice(1); };
  const SKIP = /^(idle|system idle process|_total)$/i;
  function cpuTotal() {
    let idle = 0, total = 0;
    for (const c of os.cpus()) { for (const k in c.times) total += c.times[k]; idle += c.times.idle; }
    const prev = lastTimes; lastTimes = { idle, total };
    if (!prev || total <= prev.total) return null;
    return Math.max(0, Math.min(100, 100 * (1 - (idle - prev.idle) / (total - prev.total))));
  }
  function memUsed() {
    if (LINUX) { try { const t = require("fs").readFileSync("/proc/meminfo", "utf8"); const g = (k) => Number((t.match(new RegExp(k + ":\\s+(\\d+)")) || [])[1] || 0) / 1024; return { used: g("MemTotal") - g("MemAvailable"), total: g("MemTotal") }; } catch {} }
    if (process.platform === "darwin") return null; // (macOS counts its file cache as used, so the number would look scary and mean little)
    return { used: (os.totalmem() - os.freemem()) / 1048576, total: os.totalmem() / 1048576 };
  }
  // ownPids: this app's own processes (shown together as "BelleCord"); ownNames: program names that are BelleCord too
  return async function top(ownPids, ownNames) {
    const list = await sample();
    if (ps && ps.pid && ownPids) ownPids.add(ps.pid); // (the little PowerShell helper is BelleCord's too)
    if (!list || !list.length) return { list: null, why: why || "Couldn't list the programs" };
    const now = Date.now(), wall = lastAt ? (now - lastAt) / 1000 : 0;
    const prev = lastCpu, cur = new Map();
    const groups = new Map();
    for (const p of list) {
      if (SKIP.test(p.name) || p.pid === 0) continue;
      let cpu = 0;
      if (p.pct != null) cpu = p.pct;
      else { cur.set(p.pid, p.sec); const was = prev.get(p.pid); if (wall > 0 && was != null && p.sec >= was) cpu = (100 * (p.sec - was)) / (wall * cores); }
      const me = !!((ownPids && ownPids.has(p.pid)) || (ownNames && ownNames.test(p.name)));
      const key = me ? "\u0000me" : String(p.name).toLowerCase();
      const g = groups.get(key) || { key, raw: p.name, me, mem: 0, cpu: 0, count: 0 };
      g.mem += p.mem; g.cpu += cpu; g.count++;
      groups.set(key, g);
    }
    const first = !lastAt && list.some((p) => p.pct == null);
    lastCpu = cur; lastAt = now;
    const all = [...groups.values()];
    // nicer names for the biggest ones (Windows knows "Google Chrome" for "chrome"); asked in the background
    if (WIN) {
      const want = all.sort((a, b) => b.mem - a.mem).slice(0, 25).filter((g) => !g.me && !names.has(g.raw.toLowerCase())).map((g) => g.raw);
      if (want.length) { for (const n of want) names.set(n.toLowerCase(), ""); ask("bcD '" + want.join("|").replace(/'/g, "''") + "'").then((out) => { for (const l of String(out || "").split(/\r?\n/)) { const [n, d] = l.split("|"); if (n && d && d.trim()) names.set(n.toLowerCase(), d.trim()); } }); }
    }
    const out = all.map((g) => ({ name: g.me ? "BelleCord" : names.get(g.raw.toLowerCase()) || pretty(g.raw), mem: Math.round(g.mem), cpu: Math.round(g.cpu * 10) / 10, count: g.count, me: g.me }));
    return { list: out, cpu: cpuTotal(), mem: memUsed(), cpuReady: !first && !list.some((p) => p.noCpu), cores, why: list.some((p) => p.noCpu) ? why : "" };
  };
})();
ipcMain.handle("perf:system", async () => { try { return await sysTop(new Set(app.getAppMetrics().map((m) => m.pid)), /^bellecord(\.exe)?$/i); } catch { return null; } });
ipcMain.handle("prefs:set", (e, changes) => (changes && typeof changes === "object" ? writePrefs(changes) : readPrefs()));
// pictures (skin pictures, wallpapers, banners): one small file each, next to the settings
const imgDir = () => path.join(app.getPath("userData"), "pictures");
const imgFile = (key) => path.join(imgDir(), String(key).replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) + ".txt");
ipcMain.handle("img:get", (e, key) => { try { return fs.readFileSync(imgFile(key), "utf-8"); } catch { return null; } });
ipcMain.handle("img:set", (e, key, data) => {
  try {
    if (data == null || data === "") { fs.rmSync(imgFile(key), { force: true }); return true; }
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(String(data)) || String(data).length > 22_000_000) return false;
    fs.mkdirSync(imgDir(), { recursive: true }); fs.writeFileSync(imgFile(key), String(data)); return true;
  } catch { return false; }
});
ipcMain.handle("notify", (e, { title, body }) => { try { if (Notification.isSupported()) new Notification({ title: String(title || NAME), body: String(body || ""), ...withIcon() }).show(); } catch {} });
ipcMain.handle("open-external", (e, url) => { if (/^https?:\/\//i.test(String(url))) shell.openExternal(String(url)); });

// ---- Fix Fluxer: one button for whatever keeps Fluxer from working here (DNS, a hosts-file block, a proxy, a
// broken saved copy of Fluxer, Fluxer's move to fluxer.com...). The work is in fluxer-fix.cjs; its settings are
// kept in fluxer-fix.json next to your other settings. Every network change it makes is tested first and undone
// if it doesn't help. (This replaces Update 6's "Fix DNS" button.) ----
const fixFile = () => path.join(app.getPath("userData"), "fluxer-fix.json");
const fixStore = {
  get() {
    try { return JSON.parse(fs.readFileSync(fixFile(), "utf-8")) || {}; } catch {}
    // first time: carry over Update 6's "secure DNS" switch (it's re-checked at start, and switched off if it doesn't work)
    return readPrefs().secureDns ? { secureDns: true } : {};
  },
  set(ch) {
    try { const next = { ...fixStore.get(), ...ch }; fs.mkdirSync(path.dirname(fixFile()), { recursive: true }); fs.writeFileSync(fixFile(), JSON.stringify(next, null, 1)); } catch {}
    if ("secureDns" in readPrefs() || "dohProvider" in readPrefs()) writePrefs({ secureDns: null, dohProvider: null }); // (the old switch now lives here)
  },
};
// (safety net: if the Fix Fluxer part ever fails to load, BelleCord still opens normally, just without the button's fixes)
let fluxerFix = null, fluxerFixError = "";
try {
  fluxerFix = require("./fluxer-fix.cjs")({ app, session, webContents, BrowserWindow, shell, store: fixStore, log: (m) => { try { console.log("[Fix Fluxer] " + m); } catch {} } });
  fluxerFix.beforeReady(); // (the hosts-file workaround has to be in place before anything connects)
} catch (e) { fluxerFix = null; fluxerFixError = String((e && e.message) || e); try { console.error("[Fix Fluxer] couldn't start: " + fluxerFixError); } catch {} }
const fixMissing = () => ({ ok: false, restartNeeded: false, home: "https://web.fluxer.app", page: null, youDo: [], steps: [{ id: "app", label: "Fix Fluxer couldn't start in BelleCord", status: "fail", detail: fluxerFixError }], tech: "Fix Fluxer didn't load: " + fluxerFixError });
ipcMain.handle("fluxer:fix", (e) => (fluxerFix ? fluxerFix.fix((step) => { try { if (!e.sender.isDestroyed()) e.sender.send("fluxer-progress", step); } catch {} }) : fixMissing()));
ipcMain.handle("fluxer:diagnose", () => (fluxerFix ? fluxerFix.diagnose() : { error: fluxerFixError }));
ipcMain.handle("fluxer:reset", () => (fluxerFix ? fluxerFix.reset() : { ok: false }));
ipcMain.handle("fluxer:clean", () => (fluxerFix ? fluxerFix.openClean() : { ok: false }));
ipcMain.handle("fluxer:help", (e, what) => { if (fluxerFix) fluxerFix.openHelp(String(what || "")); return true; });
ipcMain.handle("fluxer:home", () => (fluxerFix ? fluxerFix.home() : "https://web.fluxer.app"));
ipcMain.handle("fluxer:last", () => { try { return fixStore.get().lastFix || null; } catch { return null; } });
ipcMain.handle("app:restart", () => { flushAll(); setTimeout(() => { app.relaunch(); quitting = true; app.exit(0); }, 300); return true; });
// ---- game badges: everyone's badges live on the badge hub (its address is in hub.json next to this file) ----
function hubAddress() {
  try { const a = String(JSON.parse(fs.readFileSync(path.join(__dirname, "hub.json"), "utf-8")).address || "").trim().replace(/\/+$/, ""); if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(a) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(a)) return a; } catch {}
  return null;
}
ipcMain.handle("hub", async (e, method, route, payload) => {
  const base = hubAddress();
  if (!base) return { ok: false, status: 0, error: "offline" };
  if (!/^\/v1\/[a-z0-9/]+(\?[^#\s]*)?$/i.test(String(route)) || !["GET", "POST"].includes(method)) return { ok: false, status: 400, error: "bad request" };
  try {
    const r = await fetch(base + route, { method, headers: { "content-type": "application/json", "ngrok-skip-browser-warning": "1", "user-agent": "BelleCord" }, body: method === "POST" ? JSON.stringify(payload || {}) : undefined, signal: AbortSignal.timeout(/^\/v1\/live\//.test(String(route)) ? 25000 : 12000) }); // (live stats can take a moment: Roblox is several lookups)
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data, error: r.ok ? null : data.error || "hub error " + r.status };
  } catch { return { ok: false, status: 0, error: "offline" }; }
});
// the window's own buttons (minimize, maximize, close) take the theme's colors too
ipcMain.handle("titlebar", (e, c) => {
  const hex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));
  if (!win || win.isDestroyed() || !c || !hex(c.color) || !hex(c.symbol)) return;
  try { if (!MAC) win.setTitleBarOverlay({ color: c.color, symbolColor: c.symbol, height: 32 }); win.setBackgroundColor(c.color); } catch {}
});

// ---- where the window was last time ----
const placeFile = () => path.join(app.getPath("userData"), "window.json");
function lastPlace() {
  try {
    const p = JSON.parse(fs.readFileSync(placeFile(), "utf-8"));
    const onScreen = screen.getAllDisplays().some((d) => p.x >= d.bounds.x - 50 && p.y >= d.bounds.y - 50 && p.x < d.bounds.x + d.bounds.width && p.y < d.bounds.y + d.bounds.height);
    return onScreen ? p : null;
  } catch { return null; }
}
function savePlace() { try { if (win && !win.isMinimized()) fs.writeFileSync(placeFile(), JSON.stringify({ ...win.getNormalBounds(), max: win.isMaximized() })); } catch {} }

// ---- voice, camera, screen sharing, notifications: allowed (it's your own app) ----
const ALLOWED = new Set(["media", "display-capture", "notifications", "clipboard-read", "clipboard-sanitized-write", "fullscreen", "pointerLock", "speaker-selection"]);
function setUp(ses) {
  if (ses.__bcSetUp) return;
  ses.__bcSetUp = true;
  try { if (readPrefs().noSpell) ses.setSpellCheckerEnabled(false); } catch {} // (Performance: spellcheck off)
  ses.setPermissionRequestHandler((wc, perm, ok) => ok(ALLOWED.has(perm)));
  ses.setPermissionCheckHandler((wc, perm) => ALLOWED.has(perm));
  ses.setDisplayMediaRequestHandler(async (req, answer) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"], thumbnailSize: { width: 320, height: 180 }, fetchWindowIcons: true });
      const chosen = await pickSource(sources);
      if (!chosen) return answer({});
      answer({ video: chosen, ...(process.platform === "win32" ? { audio: "loopback" } : {}) });
    } catch { answer({}); }
  });
  // Google's sign-in refuses "embedded browsers" but accepts Firefox: only Google's own sign-in pages see Firefox
  ses.webRequest.onBeforeSendHeaders({ urls: ["https://accounts.google.com/*", "https://accounts.youtube.com/*"] }, (d, cb) => {
    if (d.resourceType !== "mainFrame") return cb({ requestHeaders: d.requestHeaders });
    const h = { ...d.requestHeaders, "User-Agent": FIREFOX_UA };
    for (const k of Object.keys(h)) if (/^sec-ch-ua/i.test(k)) delete h[k];
    cb({ requestHeaders: h });
  });
  downloads(ses);
  if (ses === session.fromPartition("persist:discord")) { // no passkey box popping up on its own (see discord-page.cjs)
    const file = path.join(__dirname, "discord-page.cjs");
    try { if (ses.registerPreloadScript) ses.registerPreloadScript({ type: "frame", id: "bc-discord", filePath: file }); else ses.setPreloads([file]); } catch {}
  }
  if (ses === session.fromPartition("persist:pinterest")) {
    // Pinterest's "Continue with Google" can't work inside an app (Google refuses embedded sign-in). Its button and
    // pop-up are stopped here, and the app tells you to use the QR code or your email instead.
    ses.webRequest.onBeforeRequest({ urls: ["https://accounts.google.com/gsi/*", "https://accounts.google.com/o/oauth2/*", "https://accounts.google.com/signin/*", "https://accounts.google.com/v3/signin/*"] }, (d, cb) => {
      tellShell(d.resourceType === "mainFrame" ? "pinterest-google" : "pinterest-google-button");
      cb({ cancel: true });
    });
  }
}
function tellShell(what) { try { if (win && !win.isDestroyed()) win.webContents.send("notice", what); } catch {} }

function pickSource(sources) {
  return new Promise((resolve) => {
    const picker = new BrowserWindow({
      parent: win, modal: true, width: 760, height: 560, resizable: false, minimizable: false, maximizable: false,
      title: "Share your screen", backgroundColor: "#313338", autoHideMenuBar: true, ...withIcon(),
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    let done = false;
    const finish = (id) => { if (done) return; done = true; resolve(sources.find((s) => s.id === id) || null); if (!picker.isDestroyed()) picker.close(); };
    const onPick = (e, id) => { if (e.sender === picker.webContents) finish(id); };
    ipcMain.on("bc-pick", onPick);
    picker.on("closed", () => { ipcMain.removeListener("bc-pick", onPick); finish(null); });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const tiles = sources.map((s) => `<div class="t" data-id="${esc(s.id)}"><img src="${s.thumbnail.toDataURL()}"><b>${esc(s.name)}</b></div>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Share your screen</title><style>
      body{margin:0;background:#313338;color:#f2f3f5;font:14px "Segoe UI",sans-serif;padding:18px}h2{margin:0 0 12px}
      .g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-height:420px;overflow:auto}
      .t{background:#2b2d31;border-radius:8px;padding:8px;cursor:pointer;border:2px solid transparent}.t:hover{border-color:#5865f2}
      .t img{width:100%;border-radius:4px;display:block;background:#000}.t b{display:block;margin-top:6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .r{display:flex;justify-content:flex-end;margin-top:14px}button{background:#4e5058;color:#fff;border:0;border-radius:4px;padding:8px 16px;cursor:pointer}
      </style><h2>Share your screen</h2><div class="g">${tiles}</div><div class="r"><button id="x">Cancel</button></div>
      <script>const { ipcRenderer } = require("electron");
      document.querySelectorAll(".t").forEach((t) => (t.onclick = () => ipcRenderer.send("bc-pick", t.dataset.id)));
      document.getElementById("x").onclick = () => ipcRenderer.send("bc-pick", null);
      addEventListener("keydown", (e) => { if (e.key === "Escape") ipcRenderer.send("bc-pick", null); });</script>`;
    picker.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
}

// ---- right-click: save or copy pictures and videos, open or copy links, cut/copy/paste, spelling ----
function rightClick(wc) {
  wc.on("context-menu", (e, p) => {
    const items = [];
    if (p.misspelledWord && p.dictionarySuggestions?.length) { for (const w of p.dictionarySuggestions.slice(0, 5)) items.push({ label: w, click: () => wc.replaceMisspelling(w) }); items.push({ type: "separator" }); }
    if (p.mediaType === "image" && p.srcURL && !p.srcURL.startsWith("file:")) items.push({ label: "Save image as...", click: () => wc.downloadURL(p.srcURL) }, { label: "Copy image", click: () => wc.copyImageAt(p.x, p.y) }, { label: "Copy image address", click: () => clipboard.writeText(p.srcURL) }, { type: "separator" });
    if (p.mediaType === "video" && p.srcURL && !p.srcURL.startsWith("blob:")) items.push({ label: "Save video as...", click: () => wc.downloadURL(p.srcURL) }, { label: "Copy video address", click: () => clipboard.writeText(p.srcURL) }, { type: "separator" });
    if (p.linkURL && /^https?:/i.test(p.linkURL)) items.push({ label: "Open link in your browser", click: () => shell.openExternal(p.linkURL) }, { label: "Copy link", click: () => clipboard.writeText(p.linkURL) }, { type: "separator" });
    if (p.isEditable) items.push({ role: "cut" }, { role: "copy" }, { role: "paste" }, { type: "separator" }, { role: "selectAll" });
    else if (p.selectionText) items.push({ role: "copy" });
    while (items.length && items[items.length - 1].type === "separator") items.pop();
    if (items.length) Menu.buildFromTemplate(items).popup();
  });
}
// ---- downloads: one save box per file, already set to the right kind ----
const lastDownload = new Map();
function downloads(ses) {
  if (ses.__bcDownloads) return;
  ses.__bcDownloads = true;
  ses.on("will-download", (e, item) => {
    const url = item.getURL(), now = Date.now();
    let name = item.getFilename() || "download";
    if (now - (lastDownload.get(url) ?? 0) < 4000) { item.cancel(); return; }
    lastDownload.set(url, now);
    let ext = path.extname(name).slice(1).toLowerCase();
    if (!ext) { ext = (item.getMimeType().split("/")[1] || "").split(";")[0].replace("jpeg", "jpg").replace("quicktime", "mov"); if (ext) name += "." + ext; }
    item.setSaveDialogOptions({ title: "Save", defaultPath: path.join(app.getPath("downloads"), name), filters: ext ? [{ name: ext.toUpperCase() + " file", extensions: [ext] }, { name: "All files", extensions: ["*"] }] : [] });
  });
}

const siteOf = (u) => { try { return new URL(u).hostname.split(".").slice(-2).join("."); } catch { return ""; } };
const sameSite = (wc, url) => { try { return siteOf(wc.getURL()) === siteOf(url); } catch { return false; } };

app.on("web-contents-created", (e, wc) => {
  rightClick(wc);
  if (wc.getType() !== "webview" && wc.getType() !== "window") return;
  wc.setUserAgent(CHROME_UA);
  wc.on("did-start-navigation", (ev, url, inPlace, isMain) => { if (!isMain || inPlace) return; const want = isGoogleSignIn(url) ? FIREFOX_UA : CHROME_UA; if (wc.getUserAgent() !== want) wc.setUserAgent(want); });
  if (wc.getType() !== "webview") return;
  // Ctrl+1 to Ctrl+4 switch sides even while you're typing inside Fluxer or Discord
  wc.on("before-input-event", (ev, input) => {
    if (input.type === "keyDown" && (MAC ? input.meta : input.control) && !input.alt && !input.shift && /^[1-4]$/.test(input.key) && win) { ev.preventDefault(); win.webContents.send("switch", Number(input.key)); }
    // Alt+Left and Alt+Right (Cmd+[ and Cmd+] on a Mac): back and forward through the places you've been
    const back = MAC ? input.meta && input.key === "[" : input.alt && !input.control && input.key === "ArrowLeft";
    const fwd = MAC ? input.meta && input.key === "]" : input.alt && !input.control && input.key === "ArrowRight";
    if (input.type === "keyDown" && (back || fwd) && win) { ev.preventDefault(); win.webContents.send("nav", back ? "back" : "forward"); }
  });
  const inPanel = () => { try { return PANEL_PARTS.some((p) => wc.session === session.fromPartition(p)); } catch { return false; } };
  const inPinterest = () => { try { return wc.session === session.fromPartition("persist:pinterest"); } catch { return false; } };
  wc.setWindowOpenHandler(({ url }) => {
    if (isGoogleSignIn(url) && inPinterest()) { tellShell("pinterest-google"); return { action: "deny" }; }
    if (STAYS_IN.test(url) || isGoogleSignIn(url) || (inPanel() && /^https:\/\//i.test(url) && sameSite(wc, url))) return { action: "allow", overrideBrowserWindowOptions: { width: 560, height: 760, autoHideMenuBar: true, backgroundColor: "#313338", ...withIcon() } };
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // a site trying to leave itself for somewhere else opens that place in your browser instead
  wc.on("will-navigate", (ev, url) => { if (isGoogleSignIn(url) && inPinterest()) { ev.preventDefault(); tellShell("pinterest-google"); return; } if (inPanel()) return; if (!STAYS_IN.test(url) && /^https?:\/\//i.test(url)) { ev.preventDefault(); shell.openExternal(url); } });
});

function open() {
  const p = lastPlace();
  win = new BrowserWindow({
    width: p?.width ?? 1400, height: p?.height ?? 900, x: p?.x, y: p?.y, minWidth: 940, minHeight: 600,
    title: NAME, backgroundColor: "#1e1f22", autoHideMenuBar: true, show: false,
    titleBarStyle: "hidden", ...(MAC ? { trafficLightPosition: { x: 12, y: 9 } } : { titleBarOverlay: { color: "#1e1f22", symbolColor: "#b5bac1", height: 32 } }),
    ...withIcon(),
    webPreferences: { webviewTag: true, contextIsolation: true, sandbox: true, spellcheck: true, preload: path.join(__dirname, "preload.cjs") },
  });
  if (p?.max) win.maximize();
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: "deny" }; });
  // the two sites run with no outside code, each in its own saved sign-in; nothing else can be put in a webview
  win.webContents.on("will-attach-webview", (e, prefs2, params) => {
    delete prefs2.preload;
    prefs2.nodeIntegration = false;
    prefs2.contextIsolation = true;
    prefs2.sandbox = true;
    const src = params.src || "", part = params.partition;
    const ok = PANEL_PARTS.includes(part) ? /^https:\/\//i.test(src) : (part === "persist:fluxer" && /^https:\/\/([a-z0-9-]+\.)*fluxer\.(app|com)\//i.test(src)) || (part === "persist:discord" && /^https:\/\/([a-z0-9-]+\.)*discord\.com\//i.test(src));
    if (part === "persist:fluxer" || part === "persist:discord") prefs2.backgroundThrottling = false; // (each side stays connected while it's out of sight)
    if (!ok) e.preventDefault();
  });
  win.webContents.on("will-navigate", (e) => e.preventDefault()); // the app's own page never turns into a website
  win.once("ready-to-show", () => win.show());
  // the back and forward buttons on the side of a mouse
  win.on("app-command", (e, cmd) => { if (cmd === "browser-backward" || cmd === "browser-forward") win.webContents.send("nav", cmd === "browser-backward" ? "back" : "forward"); });
  win.on("swipe", (e, dir) => { if (dir === "left" || dir === "right") win.webContents.send("nav", dir === "right" ? "back" : "forward"); }); // (a Mac trackpad: swiping right goes back, like Safari)
  win.on("close", (e) => { savePlace(); flushAll(); if (!quitting && keepInTray() && tray) { e.preventDefault(); win.hide(); } });
  win.on("closed", () => { win = null; });
  win.loadFile(SHELL);
}

app.whenReady().then(async () => {
  // Mac: the menu bar (copy, paste, undo and quitting need it there)
  if (MAC) Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
  // Fix Fluxer's saved settings (and a quick check that secure DNS, if it's on, still works on this network)
  if (fluxerFix) { try { await Promise.race([fluxerFix.afterReady().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]); } catch {} }
  setUp(session.defaultSession);
  for (const p of PARTS) setUp(session.fromPartition(p));
  makeTray();
  open();
});
// sign-ins are written to disk often and before quitting (Discord forgot you when the app closed before it did)
function flushAll() { for (const p of PARTS) { try { const ses = session.fromPartition(p); ses.flushStorageData(); ses.cookies.flushStore().catch(() => {}); } catch {} } }
setInterval(flushAll, 60000);
let quitting = false;
app.on("before-quit", () => { quitting = true; flushAll(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin" || quitting) app.quit(); });
app.on("activate", () => { if (win) { win.show(); win.focus(); } });

// ---- the tray: closing the window keeps BelleCord running there (you can turn that off on the dashboard) ----
let tray = null;
function makeTray() {
  if (tray) return;
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, process.platform === "darwin" ? "tray.png" : "tray.png"));
    tray = new Tray(process.platform === "darwin" ? img.resize({ width: 18, height: 18 }) : img);
    tray.setToolTip(NAME);
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Open BelleCord", click: () => { if (win) { win.show(); win.focus(); } } }, { type: "separator" }, { label: "Quit", click: () => { quitting = true; app.quit(); } }]));
    tray.on("click", () => { if (win) { if (win.isVisible() && win.isFocused()) win.hide(); else { win.show(); win.focus(); } } });
  } catch {}
}
const keepInTray = () => readPrefs().tray !== false;

// ---- updates: a new version on GitHub shows an Update button; one click puts it in and restarts ----
const UPDATE_FILE = path.join(__dirname, "update.json");
// (when I fix something in an update that's already out, I put the fix into that same update instead of making a
// new one: its zip changes, so "asset" (which zip you have) tells the app there's something new to get)
// ("version" is GitHub's counter, from the release tag, and only goes up; "name" is the update number people see,
// from the release title, "BelleCord Update 8". I renumbered the updates once, so the two don't match.)
const updateInfo = () => { try { const u = JSON.parse(fs.readFileSync(UPDATE_FILE, "utf-8")); return { repo: String(u.repo || "").trim(), version: Number(u.version) || 0, asset: Number(u.asset) || 0, name: Number(u.name) || 0 }; } catch { return { repo: "", version: 0, asset: 0, name: 0 }; } };
const saveUpdateInfo = (u) => { try { fs.writeFileSync(UPDATE_FILE, JSON.stringify({ repo: u.repo, version: u.version, ...(u.name ? { name: u.name } : {}), ...(u.asset ? { asset: u.asset } : {}) }, null, 2)); } catch {} };
const titleNumber = (t) => { const m = String(t || "").match(/Update (\d+)/i); return m ? Number(m[1]) : 0; };
const tagNumber = (t) => { const m = String(t || "").match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };
let found = null;
async function getJson(url) { const r = await net.fetch(url, { headers: { "user-agent": "BelleCord", accept: "application/vnd.github+json" } }); if (!r.ok) throw new Error("GitHub said " + r.status); return r.json(); }
// What's new (dashboard): every release's notes, from GitHub
ipcMain.handle("whatsnew", async () => {
  const u = updateInfo();
  if (!/^[\w.-]+\/[\w.-]+$/.test(u.repo)) return { list: [] };
  try {
    const all = await getJson("https://api.github.com/repos/" + u.repo + "/releases?per_page=100");
    return { list: (Array.isArray(all) ? all : []).filter((r) => !r.draft).map((r) => ({ tag: r.tag_name, title: r.name || r.tag_name, notes: String(r.body || ""), at: r.published_at || r.created_at })) };
  } catch (e) { return { list: [], error: String(e.message || e) }; }
});
ipcMain.handle("update:check", async () => {
  const u = updateInfo();
  if (!/^[\w.-]+\/[\w.-]+$/.test(u.repo)) return { available: false, version: u.version };
  try {
    const rel = await getJson("https://api.github.com/repos/" + u.repo + "/releases/latest");
    const asset = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
    const v = tagNumber(rel.tag_name);
    // (same update, and I don't know yet which zip you have: the one you have counts as this one)
    if (asset && v === u.version && !u.asset) saveUpdateInfo({ ...u, asset: asset.id });
    const fixed = !!asset && v === u.version && !!u.asset && asset.id !== u.asset;
    const shown = titleNumber(rel.name) || v;
    found = asset && (v > u.version || fixed) ? { url: asset.browser_download_url, version: v, asset: asset.id, name: shown } : null;
    return { available: !!found, fixes: !!found && v === u.version, version: u.name || u.version, latest: shown, notes: String(rel.body || "").slice(0, 600) };
  } catch (e) { return { available: false, version: u.version, error: String(e.message || e) }; }
});
// the smallest zip reader that does the job (zip files: a list at the end says where each file is)
function unzip(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip");
  const count = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("broken zip");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString("utf-8");
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), data = buf.slice(start, start + csize);
    out.push({ name, data: method === 0 ? data : method === 8 ? zlib.inflateRawSync(data) : null });
  }
  return out;
}
ipcMain.handle("update:apply", async () => {
  if (!found) return { ok: false, error: "No update found" };
  try {
    const r = await net.fetch(found.url, { headers: { "user-agent": "BelleCord" } });
    if (!r.ok) throw new Error("download failed (" + r.status + ")");
    const files = unzip(Buffer.from(await r.arrayBuffer()));
    const root = path.join(__dirname, ".."), keep = new Set(["app/hub.json"]); // (your own hub address stays)
    let n = 0;
    for (const f of files) {
      if (!f.data) continue;
      const i = f.name.indexOf("app/"), rel = i >= 0 ? f.name.slice(i) : /(^|\/)(package\.json|START [^/]+)$/.test(f.name) ? f.name.split("/").pop() : null;
      if (!rel || rel.includes("..") || (keep.has(rel) && fs.existsSync(path.join(root, rel)))) continue;
      const to = path.join(root, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, f.data); if (/^START /.test(rel)) { try { fs.chmodSync(to, 0o755); } catch {} } n++;
    }
    const u = updateInfo(); saveUpdateInfo({ repo: u.repo, version: Math.max(found.version, u.version), asset: found.asset, name: found.name || u.name });
    flushAll();
    setTimeout(() => { app.relaunch(); quitting = true; app.exit(0); }, 400);
    return { ok: true, files: n };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
