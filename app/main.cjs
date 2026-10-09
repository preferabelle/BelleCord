// BelleCord (new): Fluxer and Discord in one window, each the real website, each signed in as you.
// No bot is needed to read or type: these are the sites themselves, in their own saved sign-ins.
// Nothing here reads, types or clicks for you on either site.
const { app, BrowserWindow, session, shell, desktopCapturer, ipcMain, screen, Menu, clipboard, Notification, Tray, nativeImage, net } = require("electron");
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
const STAYS_IN = /^https:\/\/([a-z0-9-]+\.)*(fluxer\.app|fluxer\.gg|discord\.com|discord\.gg|discordapp\.com|hcaptcha\.com|accounts\.google\.com|appleid\.apple\.com)(\/|$)/i;
const PARTS = ["persist:fluxer", "persist:discord", "persist:tiktok", "persist:pinterest", "persist:x", "persist:links"];
const PANEL_PARTS = ["persist:tiktok", "persist:pinterest", "persist:x", "persist:links"]; // the side panels (any website)

app.commandLine.appendSwitch("disable-features", "WebRtcAllowInputVolumeAdjustment,FedCm,FedCmButtonMode");
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
// ---- game badges: everyone's badges live on the badge hub (its address is in hub.json next to this file) ----
function hubAddress() {
  try { const a = String(JSON.parse(fs.readFileSync(path.join(__dirname, "hub.json"), "utf-8")).address || "").trim().replace(/\/+$/, ""); if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(a) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(a)) return a; } catch {}
  return null;
}
ipcMain.handle("hub", async (e, method, route, payload) => {
  const base = hubAddress();
  if (!base) return { ok: false, status: 0, error: "offline" };
  if (!/^\/v1\/[a-z/]+(\?[^#\s]*)?$/i.test(String(route)) || !["GET", "POST"].includes(method)) return { ok: false, status: 400, error: "bad request" };
  try {
    const r = await fetch(base + route, { method, headers: { "content-type": "application/json", "ngrok-skip-browser-warning": "1", "user-agent": "BelleCord" }, body: method === "POST" ? JSON.stringify(payload || {}) : undefined, signal: AbortSignal.timeout(12000) });
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
    if (p.mediaType === "image" && p.srcURL && !p.srcURL.startsWith("file:")) items.push({ label: "Save image as…", click: () => wc.downloadURL(p.srcURL) }, { label: "Copy image", click: () => wc.copyImageAt(p.x, p.y) }, { label: "Copy image address", click: () => clipboard.writeText(p.srcURL) }, { type: "separator" });
    if (p.mediaType === "video" && p.srcURL && !p.srcURL.startsWith("blob:")) items.push({ label: "Save video as…", click: () => wc.downloadURL(p.srcURL) }, { label: "Copy video address", click: () => clipboard.writeText(p.srcURL) }, { type: "separator" });
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
    const ok = PANEL_PARTS.includes(part) ? /^https:\/\//i.test(src) : (part === "persist:fluxer" && /^https:\/\/([a-z0-9-]+\.)*fluxer\.app\//i.test(src)) || (part === "persist:discord" && /^https:\/\/([a-z0-9-]+\.)*discord\.com\//i.test(src));
    if (!ok) e.preventDefault();
  });
  win.webContents.on("will-navigate", (e) => e.preventDefault()); // the app's own page never turns into a website
  win.once("ready-to-show", () => win.show());
  win.on("close", (e) => { savePlace(); flushAll(); if (!quitting && keepInTray() && tray) { e.preventDefault(); win.hide(); } });
  win.on("closed", () => { win = null; });
  win.loadFile(SHELL);
}

app.whenReady().then(() => {
  // Mac: the menu bar (copy, paste, undo and quitting need it there)
  if (MAC) Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }]));
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
const updateInfo = () => { try { const u = JSON.parse(fs.readFileSync(UPDATE_FILE, "utf-8")); return { repo: String(u.repo || "").trim(), version: Number(u.version) || 0 }; } catch { return { repo: "", version: 0 }; } };
const tagNumber = (t) => { const m = String(t || "").match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };
let found = null;
async function getJson(url) { const r = await net.fetch(url, { headers: { "user-agent": "BelleCord", accept: "application/vnd.github+json" } }); if (!r.ok) throw new Error("GitHub said " + r.status); return r.json(); }
ipcMain.handle("update:check", async () => {
  const u = updateInfo();
  if (!/^[\w.-]+\/[\w.-]+$/.test(u.repo)) return { available: false, version: u.version };
  try {
    const rel = await getJson("https://api.github.com/repos/" + u.repo + "/releases/latest");
    const asset = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
    const v = tagNumber(rel.tag_name);
    found = asset && v > u.version ? { url: asset.browser_download_url, version: v } : null;
    return { available: !!found, version: u.version, latest: v, notes: String(rel.body || "").slice(0, 600) };
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
    const u = updateInfo(); fs.writeFileSync(UPDATE_FILE, JSON.stringify({ repo: u.repo, version: Math.max(found.version, updateInfo().version) }, null, 2));
    flushAll();
    setTimeout(() => { app.relaunch(); quitting = true; app.exit(0); }, 400);
    return { ok: true, files: n };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
