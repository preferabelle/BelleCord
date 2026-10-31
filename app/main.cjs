// BelleCord main process. Fluxer and Discord run as their real web apps in persistent partitions;
// neither site is automated.
const { app, BrowserWindow, session, shell, desktopCapturer, ipcMain, screen, Menu, clipboard, Notification, Tray, nativeImage, net, webContents } = require("electron");
const unzip = require("./unzip.cjs");
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
// auth/popup windows for these hosts stay in-app so cookies persist; everything else opens externally
// (fluxer.com included for the migration)
const STAYS_IN = /^https:\/\/([a-z0-9-]+\.)*(fluxer\.app|fluxer\.com|fluxer\.gg|discord\.com|discord\.gg|discordapp\.com|hcaptcha\.com|accounts\.google\.com|appleid\.apple\.com)(\/|$)/i;
// profiles: each one gets its own partitions (persist:fluxer~<id> etc.) and prefs.
// 'main' keeps the original unsuffixed partitions.
const BASES = ["fluxer", "discord", "tiktok", "pinterest", "x", "links"];
const PANEL_BASES = ["tiktok", "pinterest", "x", "links"]; // side panels
const profilesFile = () => path.join(app.getPath("userData"), "profiles.json");
let profilesMem = null;
function profiles() {
  if (profilesMem) return profilesMem;
  let p = null; try { p = JSON.parse(fs.readFileSync(profilesFile(), "utf-8")); } catch {}
  if (!p || !Array.isArray(p.list) || !p.list.length) p = { active: "main", list: [{ id: "main", name: "", color: "" }] };
  if (!p.list.some((x) => x.id === "main")) p.list.unshift({ id: "main", name: "", color: "" });
  if (!p.list.some((x) => x.id === p.active)) p.active = "main";
  return (profilesMem = p);
}
function saveProfiles(p) { profilesMem = p; try { fs.writeFileSync(profilesFile(), JSON.stringify(p)); } catch {} }
const suffixOf = (id) => (id && id !== "main" ? "~" + id : "");
const partFor = (base, id = profiles().active) => "persist:" + base + suffixOf(id);
const allParts = () => profiles().list.flatMap((x) => BASES.map((b) => partFor(b, x.id)));
// partition name -> site + profile
const parsePart = (part) => { const m = /^persist:([a-z]+)(?:~([a-z0-9]+))?$/.exec(String(part || "")); return m && BASES.includes(m[1]) && profiles().list.some((x) => x.id === (m[2] || "main")) ? { base: m[1], id: m[2] || "main" } : null; };
const SES_BASE = new WeakMap(); // session -> "fluxer" / "discord" / "tiktok"...
const baseOfSession = (ses) => SES_BASE.get(ses) || null;

// IntensiveWakeUpThrottling + AllowAggressiveThrottlingWithWebSocket off (same as fluxer desktop) so the hidden
// webview keeps its gateway connection. all in one --disable-features switch.
app.commandLine.appendSwitch("disable-features", "WebRtcAllowInputVolumeAdjustment,FedCm,FedCmButtonMode,IntensiveWakeUpThrottling,AllowAggressiveThrottlingWithWebSocket");
app.commandLine.appendSwitch("disable-blink-features", "FedCm");
app.userAgentFallback = CHROME_UA;
app.setAppUserModelId(NAME);
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

let win = null;
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

// prefs: json in userData
const prefsFile = () => path.join(app.getPath("userData"), profiles().active === "main" ? "prefs.json" : "prefs~" + profiles().active + ".json"); // per profile
let prefs = null;
function readPrefs() { if (prefs) return prefs; try { prefs = JSON.parse(fs.readFileSync(prefsFile(), "utf-8")); } catch { prefs = {}; } return prefs; }
function writePrefs(changes) {
  prefs = { ...readPrefs(), ...changes };
  for (const k of Object.keys(prefs)) if (prefs[k] === null) delete prefs[k];
  try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch {}
  return prefs;
}
ipcMain.handle("prefs:get", () => readPrefs());
// perf settings; gpu switch has to be read before ready
try { if (readPrefs().noGpu) app.disableHardwareAcceleration(); } catch {}
const partOfWc = (wc) => { try { const b = baseOfSession(wc.session); if (b === "fluxer" || b === "discord") return b; if (PANEL_BASES.includes(b)) return "links"; } catch {} return "app"; };
ipcMain.handle("perf:usage", () => {
  const cores = Math.max(1, require("os").cpus().length);
  const byPid = new Map();
  for (const wc of webContents.getAllWebContents()) { try { byPid.set(wc.getOSProcessId(), partOfWc(wc)); } catch {} }
  const parts = { app: { cpu: 0, mem: 0 }, fluxer: { cpu: 0, mem: 0 }, discord: { cpu: 0, mem: 0 }, links: { cpu: 0, mem: 0 }, gpu: { cpu: 0, mem: 0 } };
  for (const m of app.getAppMetrics()) {
    const k = m.type === "GPU" ? "gpu" : byPid.get(m.pid) || "app";
    parts[k].cpu += (m.cpu?.percentCPUUsage || 0) / cores;
    parts[k].mem += (m.memory?.workingSetSize || 0) / 1024; // MB
  }
  const total = Object.values(parts).reduce((a, p) => ({ cpu: a.cpu + p.cpu, mem: a.mem + p.mem }), { cpu: 0, mem: 0 });
  return { parts, total, gpu: !readPrefs().noGpu };
});
// top processes by memory, with cpu. windows: perf counters, mac/linux: ps. cached 4s
const osTop = { at: 0, last: null, busy: null };
function readTopApps() {
  const os = require("os"), { execFile } = require("child_process");
  const cores = Math.max(1, os.cpus().length);
  const done = (rows) => {
    const by = new Map();
    for (const r of rows) {
      let n = String(r.name || "").replace(/#\d+$/, "").replace(/\.exe$/i, "").split("/").pop().trim();
      if (!n || /^(_total|idle|system idle process)$/i.test(n)) continue;
      const g = by.get(n.toLowerCase()) || { name: n, cpu: 0, mem: 0, count: 0 };
      g.cpu += r.cpu || 0; g.mem += r.mem || 0; g.count++;
      by.set(n.toLowerCase(), g);
    }
    const apps = [...by.values()].map((a) => ({ ...a, cpu: Math.min(100, a.cpu / cores) })).sort((a, b) => b.mem - a.mem).slice(0, 6);
    return { apps, totalMem: os.totalmem() / 1048576, freeMem: os.freemem() / 1048576 };
  };
  return new Promise((ok) => {
    if (process.platform === "win32") {
      const ps = "Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Select-Object Name,PercentProcessorTime,WorkingSetPrivate | ConvertTo-Json -Compress";
      execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { windowsHide: true, timeout: 8000, maxBuffer: 8 << 20 }, (err, out) => {
        let list = []; try { list = JSON.parse(out); if (!Array.isArray(list)) list = [list]; } catch {}
        ok(done(list.map((p) => ({ name: p.Name, cpu: Number(p.PercentProcessorTime) || 0, mem: (Number(p.WorkingSetPrivate) || 0) / 1048576 }))));
      });
    } else {
      execFile("ps", ["-Ao", "%cpu=,rss=,comm="], { timeout: 5000, maxBuffer: 8 << 20 }, (err, out) => {
        const rows = String(out || "").split("\n").map((l) => l.trim().match(/^([\d.]+)\s+(\d+)\s+(.+)$/)).filter(Boolean)
          .map((m) => ({ name: m[3], cpu: Number(m[1]) * 1, mem: Number(m[2]) / 1024 }));
        ok(done(rows)); // ps cpu is per core; normalize by core count
      });
    }
  });
}
async function topApps() {
  if (osTop.last && Date.now() - osTop.at < 4000) return osTop.last;
  if (!osTop.busy) osTop.busy = readTopApps().then((r) => { osTop.last = r; osTop.at = Date.now(); osTop.busy = null; return r; }).catch(() => { osTop.busy = null; return osTop.last; });
  return osTop.busy;
}
ipcMain.handle("perf:top", () => topApps());
ipcMain.handle("perf:spell", (e, on) => { for (const p of allParts().filter((x) => /^persist:(fluxer|discord)\b/.test(x))) { try { session.fromPartition(p).setSpellCheckerEnabled(!!on); } catch {} } return true; });
// clear http cache for the site partitions (keeps cookies/storage)
ipcMain.handle("perf:clean", async () => {
  let freed = 0;
  for (const p of allParts()) { try { const ses = session.fromPartition(p); freed += await ses.getCacheSize(); await ses.clearCache(); await ses.clearCodeCaches({}).catch(() => {}); } catch {} }
  return { mb: Math.round(freed / 1048576) };
});
ipcMain.handle("prefs:set", (e, changes) => (changes && typeof changes === "object" ? writePrefs(changes) : readPrefs()));
// images (skins, wallpapers, banners) as separate files next to prefs
const imgDir = () => path.join(app.getPath("userData"), profiles().active === "main" ? "pictures" : "pictures~" + profiles().active); // per profile
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
// BridgeCord (bridgebot.cjs)
try { require("./bridgebot.cjs")({ app, ipcMain, net, shell }); } catch (e) { console.error("BridgeCord part didn't load:", e); }
ipcMain.handle("open-external", (e, url) => { if (/^https?:\/\//i.test(String(url))) shell.openExternal(String(url)); });

// Fix Fluxer (fluxer-fix.cjs), state in fluxer-fix.json. replaces the update 6 Fix DNS toggle.
const fixFile = () => path.join(app.getPath("userData"), "fluxer-fix.json");
const fixStore = {
  get() {
    try { return JSON.parse(fs.readFileSync(fixFile(), "utf-8")) || {}; } catch {}
    // migrate update 6's secure DNS pref (re-verified at startup)
    return readPrefs().secureDns ? { secureDns: true } : {};
  },
  set(ch) {
    try { const next = { ...fixStore.get(), ...ch }; fs.mkdirSync(path.dirname(fixFile()), { recursive: true }); fs.writeFileSync(fixFile(), JSON.stringify(next, null, 1)); } catch {}
    if ("secureDns" in readPrefs() || "dohProvider" in readPrefs()) writePrefs({ secureDns: null, dohProvider: null });
  },
};
// if fluxer-fix fails to load, start without it
let fluxerFix = null, fluxerFixError = "";
try {
  fluxerFix = require("./fluxer-fix.cjs")({ app, session, webContents, BrowserWindow, shell, store: fixStore, partition: () => partFor("fluxer"), log: (m) => { try { console.log("[Fix Fluxer] " + m); } catch {} } });
  fluxerFix.beforeReady(); // resolver rules have to be set before anything connects
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
// badge hub (address in hub.json)
function hubAddress() {
  try { const a = String(JSON.parse(fs.readFileSync(path.join(__dirname, "hub.json"), "utf-8")).address || "").trim().replace(/\/+$/, ""); if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(a) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(a)) return a; } catch {}
  return null;
}
// chess: my bot's games live at the hub address + /chess/ (my own hub's address when this BelleCord's hub.json has none)
const MY_HUB = "https://nebula-copper-unable.ngrok-free.dev";
const chessBase = () => hubAddress() || MY_HUB;
function isChessLink(url) {
  // Match the game route, not yesterday's ngrok address. My games link changes when the hub's tunnel changes.
  // Never redirect third-party web pages that just happen to have a word like "chess" in their title.
  try {
    const u = new URL(String(url || ""));
    return ["http:", "https:", "ws:", "wss:"].includes(u.protocol) && !u.username && !u.password &&
      /^\/chess(?:\/(?:g|golf|tanks|cards|a)(?:\/|$)|\/?$)/.test(u.pathname);
  } catch { return false; }
}
ipcMain.handle("chess:url", () => chessBase() + "/chess/");
let gameOwnsFullscreen = false;
ipcMain.handle("game:fullscreen", (e, on) => {
  if (e.sender !== win?.webContents || !win || win.isDestroyed()) return false;
  if (on) {
    if (!win.isFullScreen()) { gameOwnsFullscreen = true; win.setFullScreen(true); }
  } else if (gameOwnsFullscreen) {
    gameOwnsFullscreen = false;
    if (win.isFullScreen()) win.setFullScreen(false);
  }
  return true;
});
ipcMain.handle("hub", async (e, method, route, payload) => {
  const base = hubAddress();
  if (!base) return { ok: false, status: 0, error: "offline" };
  if (!/^\/v1\/[a-z0-9/]+(\?[^#\s]*)?$/i.test(String(route)) || !["GET", "POST"].includes(method)) return { ok: false, status: 400, error: "bad request" };
  try {
    const r = await fetch(base + route, { method, headers: { "content-type": "application/json", "ngrok-skip-browser-warning": "1", "user-agent": "BelleCord" }, body: method === "POST" ? JSON.stringify(payload || {}) : undefined, signal: AbortSignal.timeout(/^\/v1\/live\//.test(String(route)) ? 25000 : 12000) }); // live stats are slow (roblox = several requests)
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data, error: r.ok ? null : data.error || "hub error " + r.status };
  } catch { return { ok: false, status: 0, error: "offline" }; }
});
// titlebar overlay follows the theme
ipcMain.handle("titlebar", (e, c) => {
  const hex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));
  if (!win || win.isDestroyed() || !c || !hex(c.color) || !hex(c.symbol)) return;
  try { if (!MAC) win.setTitleBarOverlay({ color: c.color, symbolColor: c.symbol, height: 32 }); win.setBackgroundColor(c.color); } catch {}
});

// window bounds
const placeFile = () => path.join(app.getPath("userData"), "window.json");
function lastPlace() {
  try {
    const p = JSON.parse(fs.readFileSync(placeFile(), "utf-8"));
    const onScreen = screen.getAllDisplays().some((d) => p.x >= d.bounds.x - 50 && p.y >= d.bounds.y - 50 && p.x < d.bounds.x + d.bounds.width && p.y < d.bounds.y + d.bounds.height);
    return onScreen ? p : null;
  } catch { return null; }
}
function savePlace() { try { if (win && !win.isMinimized()) fs.writeFileSync(placeFile(), JSON.stringify({ ...win.getNormalBounds(), max: win.isMaximized() })); } catch {} }

// media / notification permissions
const ALLOWED = new Set(["media", "display-capture", "notifications", "clipboard-read", "clipboard-sanitized-write", "fullscreen", "pointerLock", "speaker-selection"]);
function setUp(ses) {
  if (ses.__bcSetUp) return;
  ses.__bcSetUp = true;
  try { if (readPrefs().noSpell) ses.setSpellCheckerEnabled(false); } catch {} // spellcheck pref
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
  // google blocks sign-in from embedded browsers but allows firefox; firefox UA on google auth pages only
  // (one listener per session, so chess shares it: ngrok's free plan shows a warning page instead of the game unless this header is there)
  const chessUrls = []; try { const b = chessBase(); if (b) { const u = new URL(b); chessUrls.push(u.protocol + "//" + u.hostname + "/chess*", (u.protocol === "https:" ? "wss:" : "ws:") + "//" + u.hostname + "/chess*"); } } catch {}
  ses.webRequest.onBeforeSendHeaders({ urls: ["https://accounts.google.com/*", "https://accounts.youtube.com/*", ...chessUrls] }, (d, cb) => {
    if (isChessLink(d.url)) return cb({ requestHeaders: { ...d.requestHeaders, "ngrok-skip-browser-warning": "1" } });
    if (d.resourceType !== "mainFrame") return cb({ requestHeaders: d.requestHeaders });
    const h = { ...d.requestHeaders, "User-Agent": FIREFOX_UA };
    for (const k of Object.keys(h)) if (/^sec-ch-ua/i.test(k)) delete h[k];
    cb({ requestHeaders: h });
  });
  downloads(ses);
  if (baseOfSession(ses) === "discord") { // no auto passkey prompt (discord-page.cjs)
    const file = path.join(__dirname, "discord-page.cjs");
    try { if (ses.registerPreloadScript) ses.registerPreloadScript({ type: "frame", id: "bc-discord", filePath: file }); else ses.setPreloads([file]); } catch {}
  }
  if (baseOfSession(ses) === "pinterest") {
    // pinterest 'continue with google' can't work embedded; block it, the shell shows a hint instead
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

// context menu
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
// downloads: save dialog per file with the right filter
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
  // ctrl+1..4 even when a webview has focus
  wc.on("before-input-event", (ev, input) => {
    // ctrl/cmd+shift+1..8: switch profile
    if (input.type === "keyDown" && (MAC ? input.meta : input.control) && input.shift && !input.alt && /^Digit[1-8]$/.test(input.code || "") && win) { ev.preventDefault(); win.webContents.send("profile-key", Number(input.code.slice(5))); }
    if (input.type === "keyDown" && (MAC ? input.meta : input.control) && !input.alt && !input.shift && /^[1-4]$/.test(input.key) && win) { ev.preventDefault(); win.webContents.send("switch", Number(input.key)); }
    // alt+left/right, cmd+[ / cmd+]: history
    const back = MAC ? input.meta && input.key === "[" : input.alt && !input.control && input.key === "ArrowLeft";
    const fwd = MAC ? input.meta && input.key === "]" : input.alt && !input.control && input.key === "ArrowRight";
    if (input.type === "keyDown" && (back || fwd) && win) { ev.preventDefault(); win.webContents.send("nav", back ? "back" : "forward"); }
  });
  const inPanel = () => { try { return PANEL_BASES.includes(baseOfSession(wc.session)); } catch { return false; } };
  const inPinterest = () => { try { return baseOfSession(wc.session) === "pinterest"; } catch { return false; } };
  wc.setWindowOpenHandler(({ url }) => {
    if (isChessLink(url)) { tellShell("chess:" + url); return { action: "deny" }; } // chess links open in the Chess side panel
    if (isGoogleSignIn(url) && inPinterest()) { tellShell("pinterest-google"); return { action: "deny" }; }
    if (STAYS_IN.test(url) || isGoogleSignIn(url) || (inPanel() && /^https:\/\//i.test(url) && sameSite(wc, url))) return { action: "allow", overrideBrowserWindowOptions: { width: 560, height: 760, autoHideMenuBar: true, backgroundColor: "#313338", ...withIcon() } };
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // off-site navigation opens externally
  wc.on("will-navigate", (ev, url) => { if (!inPanel() && isChessLink(url)) { ev.preventDefault(); tellShell("chess:" + url); return; } if (isGoogleSignIn(url) && inPinterest()) { ev.preventDefault(); tellShell("pinterest-google"); return; } if (inPanel()) return; if (!STAYS_IN.test(url) && /^https?:\/\//i.test(url)) { ev.preventDefault(); shell.openExternal(url); } });
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
  // webviews: no preload, sandboxed, known partitions and hosts only
  win.webContents.on("will-attach-webview", (e, prefs2, params) => {
    delete prefs2.preload;
    prefs2.nodeIntegration = false;
    prefs2.contextIsolation = true;
    prefs2.sandbox = true;
    const src = params.src || "", pp = parsePart(params.partition), base = pp && pp.base;
    if (pp) setUpPart(params.partition); // profile added after launch
    const ok = !!pp && (PANEL_BASES.includes(base) ? /^https:\/\//i.test(src) : (base === "fluxer" && /^https:\/\/([a-z0-9-]+\.)*fluxer\.(app|com)\//i.test(src)) || (base === "discord" && /^https:\/\/([a-z0-9-]+\.)*discord\.com\//i.test(src)));
    if (base === "fluxer" || base === "discord") prefs2.backgroundThrottling = false; // keep the gateway alive while hidden
    if (!ok) e.preventDefault();
  });
  win.webContents.on("will-navigate", (e) => e.preventDefault()); // shell never navigates
  win.once("ready-to-show", () => win.show());
  // mouse back/forward buttons
  win.on("app-command", (e, cmd) => { if (cmd === "browser-backward" || cmd === "browser-forward") win.webContents.send("nav", cmd === "browser-backward" ? "back" : "forward"); });
  win.on("swipe", (e, dir) => { if (dir === "left" || dir === "right") win.webContents.send("nav", dir === "right" ? "back" : "forward"); }); // mac trackpad swipe
  win.on("close", (e) => { savePlace(); flushAll(); if (!quitting && keepInTray() && tray) { e.preventDefault(); win.hide(); } });
  win.on("closed", () => { win = null; });
  win.loadFile(SHELL);
}

// set up each partition's session once
const setUpDone = new Set();
function setUpPart(part) {
  if (setUpDone.has(part)) return;
  const pp = parsePart(part); if (!pp) return;
  setUpDone.add(part);
  const ses = session.fromPartition(part);
  SES_BASE.set(ses, pp.base);
  setUp(ses);
  try { if (pp.base === "fluxer" || pp.base === "discord") ses.setSpellCheckerEnabled(!readPrefs().noSpell); } catch {}
}
// profile switching
const pub = () => { const p = profiles(); return { active: p.active, suffix: suffixOf(p.active), list: p.list.map((x) => ({ id: x.id, name: x.name || "", color: x.color || "", pic: x.pic || "" })) }; };
ipcMain.on("profiles:now", (e) => { e.returnValue = pub(); });
ipcMain.handle("profiles:get", () => pub());
ipcMain.handle("profiles:add", (e, a) => {
  const p = profiles();
  if (p.list.length >= 8) return { error: "That's the most people BelleCord can hold (8)." };
  const id = Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 5);
  p.list.push({ id, name: String((a && a.name) || "").trim().slice(0, 24), color: /^#[0-9a-f]{6}$/i.test((a && a.color) || "") ? a.color : "" });
  saveProfiles(p);
  for (const b of BASES) setUpPart(partFor(b, id));
  // name already known, skip the first-run name prompt
  try { const nm = p.list.find((x) => x.id === id).name; if (nm) fs.writeFileSync(path.join(app.getPath("userData"), "prefs~" + id + ".json"), JSON.stringify({ pilotName: nm })); } catch {}
  return { ok: true, id, ...pub() };
});
ipcMain.handle("profiles:edit", (e, a) => {
  const p = profiles(), x = p.list.find((y) => y.id === (a && a.id));
  if (!x) return { error: "not found" };
  if (a.name !== undefined) x.name = String(a.name || "").trim().slice(0, 24);
  if (a.color !== undefined) x.color = /^#[0-9a-f]{6}$/i.test(a.color || "") ? a.color : "";
  if (a.pic !== undefined) x.pic = /^data:image\/(png|jpeg|webp|gif);base64,/.test(a.pic || "") && a.pic.length < 400000 ? a.pic : "";
  saveProfiles(p);
  return { ok: true, ...pub() };
});
// flush everything to disk, then reload as the other profile
ipcMain.handle("profiles:switch", (e, id) => {
  const p = profiles();
  if (!p.list.some((x) => x.id === id) || p.active === id) return { ok: false };
  flushAll();
  p.active = id; saveProfiles(p);
  prefs = null; // next prefs read uses the new profile
  for (const b of BASES) setUpPart(partFor(b, id));
  setTimeout(() => { try { if (win) win.webContents.reload(); } catch {} }, 60);
  return { ok: true };
});
// remove: clear its partitions and prefs (not allowed for main)
ipcMain.handle("profiles:remove", async (e, id) => {
  const p = profiles();
  if (id === "main" || !p.list.some((x) => x.id === id)) return { error: "can't" };
  if (p.active === id) return { error: "Switch to someone else first." };
  for (const b of BASES) { try { await session.fromPartition(partFor(b, id)).clearStorageData(); } catch {} }
  try { fs.unlinkSync(path.join(app.getPath("userData"), "prefs~" + id + ".json")); } catch {}
  try { fs.rmSync(path.join(app.getPath("userData"), "pictures~" + id), { recursive: true, force: true }); } catch {}
  p.list = p.list.filter((x) => x.id !== id); saveProfiles(p);
  return { ok: true, ...pub() };
});

app.whenReady().then(async () => {
  // mac menu (needed for copy/paste/undo/quit shortcuts)
  if (MAC) Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
  // fix-fluxer startup check (DoH still working?)
  if (fluxerFix) { try { await Promise.race([fluxerFix.afterReady().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]); } catch {} }
  setUp(session.defaultSession);
  for (const p of allParts()) setUpPart(p);
  makeTray();
  open();
});
// flush cookies periodically and before quit
function flushAll() { for (const p of allParts()) { try { const ses = session.fromPartition(p); ses.flushStorageData(); ses.cookies.flushStore().catch(() => {}); } catch {} } }
setInterval(flushAll, 60000);
let quitting = false;
app.on("before-quit", () => { quitting = true; flushAll(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin" || quitting) app.quit(); });
app.on("activate", () => { if (win) { win.show(); win.focus(); } });

// tray
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

// self-update from GitHub releases
const UPDATE_FILE = path.join(__dirname, "update.json");
// hotfixes replace the zip on an existing release, so `asset` (installed zip) is compared too.
// `version` comes from the tag and only goes up; `name` is the display number from the title.
// they don't match because I renumbered the updates once.
const updateInfo = () => { try { const u = JSON.parse(fs.readFileSync(UPDATE_FILE, "utf-8")); return { repo: String(u.repo || "").trim(), version: Number(u.version) || 0, asset: Number(u.asset) || 0, name: Number(u.name) || 0 }; } catch { return { repo: "", version: 0, asset: 0, name: 0 }; } };
const saveUpdateInfo = (u) => { try { fs.writeFileSync(UPDATE_FILE, JSON.stringify({ repo: u.repo, version: u.version, ...(u.name ? { name: u.name } : {}), ...(u.asset ? { asset: u.asset } : {}) }, null, 2)); } catch {} };
const titleNumber = (t) => { const m = String(t || "").match(/Update (\d+)/i); return m ? Number(m[1]) : 0; };
const tagNumber = (t) => { const m = String(t || "").match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };
let found = null;
async function getJson(url) { const r = await net.fetch(url, { headers: { "user-agent": "BelleCord", accept: "application/vnd.github+json" } }); if (!r.ok) throw new Error("GitHub said " + r.status); return r.json(); }
// release notes for what's new
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
    const zips = (rel.assets || []).filter((a) => /\.zip$/i.test(a.name)), asset = zips.find((a) => /^bellecord/i.test(a.name)) || zips.find((a) => !/^bridgecord/i.test(a.name)); // BridgeCord.zip ships with every release
    const v = tagNumber(rel.tag_name);
    // same release, installed asset unknown: assume it's this one
    if (asset && v === u.version && !u.asset) saveUpdateInfo({ ...u, asset: asset.id });
    const fixed = !!asset && v === u.version && !!u.asset && asset.id !== u.asset;
    const shown = titleNumber(rel.name) || v;
    found = asset && (v > u.version || fixed) ? { url: asset.browser_download_url, version: v, asset: asset.id, name: shown } : null;
    return { available: !!found, fixes: !!found && v === u.version, version: u.name || u.version, latest: shown, notes: String(rel.body || "").slice(0, 600) };
  } catch (e) { return { available: false, version: u.version, error: String(e.message || e) }; }
});
ipcMain.handle("update:apply", async () => {
  if (!found) return { ok: false, error: "No update found" };
  try {
    const r = await net.fetch(found.url, { headers: { "user-agent": "BelleCord" } });
    if (!r.ok) throw new Error("download failed (" + r.status + ")");
    const files = unzip(Buffer.from(await r.arrayBuffer()));
    const root = path.join(__dirname, ".."), keep = new Set(["app/hub.json"]); // don't overwrite a custom hub address
    let n = 0;
    for (const f of files) {
      if (!f.data) continue;
      const i = f.name.indexOf("app/"), rel = i >= 0 ? f.name.slice(i) : /(^|\/)(package\.json|START [^/]+)$/.test(f.name) ? f.name.split("/").pop() : null;
      if (!rel || rel.includes("..") || (keep.has(rel) && fs.existsSync(path.join(root, rel)) && !(rel === "app/hub.json" && !hubAddress()))) continue; // (a hub.json with no address gets the update's)
      const to = path.join(root, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, f.data); if (/^START /.test(rel)) { try { fs.chmodSync(to, 0o755); } catch {} } n++;
    }
    const u = updateInfo(); saveUpdateInfo({ repo: u.repo, version: Math.max(found.version, u.version), asset: found.asset, name: found.name || u.name });
    flushAll();
    setTimeout(() => { app.relaunch(); quitting = true; app.exit(0); }, 400);
    return { ok: true, files: n };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
