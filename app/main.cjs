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
// ---- people on this computer: each person has their own sign-ins (Fluxer, Discord, the side panels) and their own
// BelleCord settings, so a shared computer can swap between them in one click. The first person ("main") keeps the
// sign-ins that were there before; anyone added gets their own saved copies (persist:fluxer~<id> and so on). ----
const BASES = ["fluxer", "discord", "tiktok", "pinterest", "x", "links"];
const PANEL_BASES = ["tiktok", "pinterest", "x", "links"]; // the side panels (any website)
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
// what a partition is ("fluxer", "discord", a side panel...) and whose, from its name
const parsePart = (part) => { const m = /^persist:([a-z]+)(?:~([a-z0-9]+))?$/.exec(String(part || "")); return m && BASES.includes(m[1]) && profiles().list.some((x) => x.id === (m[2] || "main")) ? { base: m[1], id: m[2] || "main" } : null; };
const SES_BASE = new WeakMap(); // a session -> "fluxer" / "discord" / "tiktok"...
const baseOfSession = (ses) => SES_BASE.get(ses) || null;

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
const prefsFile = () => path.join(app.getPath("userData"), profiles().active === "main" ? "prefs.json" : "prefs~" + profiles().active + ".json"); // (each person's own)
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
const partOfWc = (wc) => { try { const b = baseOfSession(wc.session); if (b === "fluxer" || b === "discord") return b; if (PANEL_BASES.includes(b)) return "links"; } catch {} return "app"; };
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
// ---- Top apps on the computer (Performance): the 6 programs using the most memory, with their CPU ----
// (Windows: one quick look at its own process counters; Mac/Linux: ps. Read at most every 4 seconds.)
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
        ok(done(rows)); // (ps counts CPU per core, like Windows, so both get divided by the cores)
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
// lighter memory: the sites' saved copies of pictures and files (sign-ins and settings stay)
ipcMain.handle("perf:clean", async () => {
  let freed = 0;
  for (const p of allParts()) { try { const ses = session.fromPartition(p); freed += await ses.getCacheSize(); await ses.clearCache(); await ses.clearCodeCaches({}).catch(() => {}); } catch {} }
  return { mb: Math.round(freed / 1048576) };
});
ipcMain.handle("prefs:set", (e, changes) => (changes && typeof changes === "object" ? writePrefs(changes) : readPrefs()));
// pictures (skin pictures, wallpapers, banners): one small file each, next to the settings
const imgDir = () => path.join(app.getPath("userData"), profiles().active === "main" ? "pictures" : "pictures~" + profiles().active); // (each person's own)
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
// BridgeCord: your own bridge bot, run from here (bridgebot.cjs)
try { require("./bridgebot.cjs")({ app, ipcMain, net, shell }); } catch (e) { console.error("BridgeCord part didn't load:", e); }
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
  fluxerFix = require("./fluxer-fix.cjs")({ app, session, webContents, BrowserWindow, shell, store: fixStore, partition: () => partFor("fluxer"), log: (m) => { try { console.log("[Fix Fluxer] " + m); } catch {} } });
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
  if (baseOfSession(ses) === "discord") { // no passkey box popping up on its own (see discord-page.cjs)
    const file = path.join(__dirname, "discord-page.cjs");
    try { if (ses.registerPreloadScript) ses.registerPreloadScript({ type: "frame", id: "bc-discord", filePath: file }); else ses.setPreloads([file]); } catch {}
  }
  if (baseOfSession(ses) === "pinterest") {
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
  const inPanel = () => { try { return PANEL_BASES.includes(baseOfSession(wc.session)); } catch { return false; } };
  const inPinterest = () => { try { return baseOfSession(wc.session) === "pinterest"; } catch { return false; } };
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
    const src = params.src || "", pp = parsePart(params.partition), base = pp && pp.base;
    if (pp) setUpPart(params.partition); // (a person added since BelleCord opened)
    const ok = !!pp && (PANEL_BASES.includes(base) ? /^https:\/\//i.test(src) : (base === "fluxer" && /^https:\/\/([a-z0-9-]+\.)*fluxer\.(app|com)\//i.test(src)) || (base === "discord" && /^https:\/\/([a-z0-9-]+\.)*discord\.com\//i.test(src)));
    if (base === "fluxer" || base === "discord") prefs2.backgroundThrottling = false; // (each side stays connected while it's out of sight)
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

// a partition's session gets set up once (the same setup for every person's copy)
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
// ---- swapping people ----
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
  // (their name is already known, so BelleCord doesn't ask it again the first time)
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
// switching: everything is written to disk first, then the window reloads as the other person
ipcMain.handle("profiles:switch", (e, id) => {
  const p = profiles();
  if (!p.list.some((x) => x.id === id) || p.active === id) return { ok: false };
  flushAll();
  p.active = id; saveProfiles(p);
  prefs = null; // (the next read is that person's settings)
  for (const b of BASES) setUpPart(partFor(b, id));
  setTimeout(() => { try { if (win) win.webContents.reload(); } catch {} }, 60);
  return { ok: true };
});
// removing someone signs them out everywhere in BelleCord and forgets their settings (never the first person)
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
  // Mac: the menu bar (copy, paste, undo and quitting need it there)
  if (MAC) Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
  // Fix Fluxer's saved settings (and a quick check that secure DNS, if it's on, still works on this network)
  if (fluxerFix) { try { await Promise.race([fluxerFix.afterReady().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]); } catch {} }
  setUp(session.defaultSession);
  for (const p of allParts()) setUpPart(p);
  makeTray();
  open();
});
// sign-ins are written to disk often and before quitting (Discord forgot you when the app closed before it did)
function flushAll() { for (const p of allParts()) { try { const ses = session.fromPartition(p); ses.flushStorageData(); ses.cookies.flushStore().catch(() => {}); } catch {} } }
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
    const zips = (rel.assets || []).filter((a) => /\.zip$/i.test(a.name)), asset = zips.find((a) => /^bellecord/i.test(a.name)) || zips.find((a) => !/^bridgecord/i.test(a.name)); // (BridgeCord.zip rides along on every update now)
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
