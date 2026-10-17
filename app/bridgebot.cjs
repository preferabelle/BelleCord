// BridgeCord, run from the app: your own Fluxer <-> Discord bridge bot, on this computer, while the app is open.
// It downloads the newest BridgeCord from its GitHub releases into the app's own folder, keeps your two bot tokens
// in its settings.txt there (they never leave this computer and the page never gets them back), installs its parts
// with Node.js, and starts and stops it. What it prints is kept so the dashboard can show it, along with the claim
// code and the invite links it gives out.
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const { spawn, execFile } = require("child_process");

const REPO = "preferabelle/BridgeCord";

module.exports = function startBridgeBot({ app, ipcMain, net, shell }) {
  const DIR = path.join(app.getPath("userData"), "bridgecord");
  const MINE = path.join(app.getPath("userData"), "bridgecord.json"); // { auto, tag, deps }
  const WIN = process.platform === "win32";
  const readMine = () => { try { return JSON.parse(fs.readFileSync(MINE, "utf-8")); } catch { return {}; } };
  const saveMine = (c) => { const m = { ...readMine(), ...c }; try { fs.writeFileSync(MINE, JSON.stringify(m)); } catch {} return m; };

  let child = null, phase = "off", note = "", lines = [], claim = null, invites = {}, latest = null, busy = false;
  const say = (t) => {
    for (const raw of String(t).split(/\r?\n/)) {
      // (the start window draws boxes around things: the words matter, the box doesn't)
      const l = raw.replace(/\x1b\[[0-9;]*m/g, "").replace(/[┏┓┗┛━┃]/g, "").trimEnd();
      if (!l.trim()) continue;
      lines.push(l.trim());
      const c = l.match(/\b(\S*claim)\s+(\d{4,8})\b/i);
      if (c) claim = c[1] + " " + c[2];
      const d = l.match(/https:\/\/discord(?:app)?\.com\/(?:api\/)?oauth2\/authorize\S+/i);
      if (d) invites.discord = d[0];
      const f = l.match(/https:\/\/\S*fluxer\S*\/oauth2\/authorize\S+/i);
      if (f) invites.fluxer = f[0];
      if (/\b(ready|logged in|online|connected)\b/i.test(l) && phase === "starting") phase = "running";
    }
    if (lines.length > 300) lines = lines.slice(-200);
  };

  // ---- Node.js: BridgeCord runs on it (it's free: nodejs.org) ----
  const NODE_SPOTS = WIN
    ? [path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"), path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs", "node.exe"), path.join(process.env.LOCALAPPDATA || "", "Programs", "nodejs", "node.exe")]
    : ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node", path.join(process.env.HOME || "", ".volta", "bin", "node")];
  const run = (file, args, opts = {}) => new Promise((ok) => execFile(file, args, { timeout: 15000, ...opts }, (e, out) => ok(e ? null : String(out).trim())));
  let nodeCache = null;
  async function findNode() {
    if (nodeCache && fs.existsSync(nodeCache.file)) return nodeCache;
    const tries = [];
    const where = await run(WIN ? "where" : "/bin/sh", WIN ? ["node"] : ["-lc", "command -v node"]);
    if (where) tries.push(...where.split(/\r?\n/));
    tries.push(...NODE_SPOTS);
    for (const file of tries) {
      if (!file || !fs.existsSync(file)) continue;
      const v = await run(file, ["--version"]);
      const m = v && v.match(/^v(\d+)\.(\d+)/);
      if (m && (Number(m[1]) > 20 || (Number(m[1]) === 20 && Number(m[2]) >= 10))) return (nodeCache = { file, version: v, dir: path.dirname(file) });
    }
    return null;
  }
  const envFor = (node) => {
    const env = { ...process.env, PATH: node.dir + path.delimiter + (process.env.PATH || ""), FORCE_COLOR: "0", NO_COLOR: "1" };
    delete env.ELECTRON_RUN_AS_NODE;
    return env;
  };

  // ---- getting BridgeCord ----
  async function getJson(url) {
    const r = await net.fetch(url, { headers: { "user-agent": "BelleCord", accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error("GitHub said " + r.status);
    return r.json();
  }
  async function newest() {
    // (BridgeCord's own repo first; until that's up, it's posted next to my BelleCord updates)
    let rel = null, asset = null;
    for (const url of ["https://api.github.com/repos/" + REPO + "/releases/latest", "https://api.github.com/repos/preferabelle/BelleCord/releases/tags/bridgecord"]) {
      try { rel = await getJson(url); asset = (rel.assets || []).find((a) => /\.zip$/i.test(a.name)); if (asset) break; } catch (e) {}
    }
    if (!asset) throw new Error("I couldn't find BridgeCord's download. Check your internet and try again.");
    latest = { tag: /^v\d+$/.test(rel.tag_name) ? rel.tag_name : rel.tag_name + "@" + (asset.updated_at || asset.id), title: rel.name || rel.tag_name, url: asset.browser_download_url, notes: String(rel.body || "").slice(0, 800) };
    return latest;
  }
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
  // BridgeCord comes with BelleCord (app/bridgecord/): installing it needs no internet. Only a newer one than the
  // one that came with the app is downloaded.
  const BUNDLED = path.join(__dirname, "bridgecord");
  const bundled = () => { try { const v = JSON.parse(fs.readFileSync(path.join(BUNDLED, "version.json"), "utf-8")); const zip = path.join(BUNDLED, "BridgeCord.zip"); return fs.existsSync(zip) ? { tag: String(v.tag || "bundled"), title: String(v.title || "BridgeCord"), zip } : null; } catch { return null; } };
  const tagNum = (t) => Number((/^v(\d+)$/.exec(String(t || "")) || [])[1] || 0);
  async function install() {
    const b = bundled();
    let rel = null; try { rel = await newest(); } catch (e) { if (!b) throw e; }
    let buf;
    if (b && (!rel || tagNum(rel.tag) <= tagNum(b.tag))) { rel = { tag: b.tag, title: b.title }; note = "Setting up " + b.title + "..."; buf = fs.readFileSync(b.zip); }
    else {
      note = "Downloading BridgeCord " + rel.title + "...";
      const r = await net.fetch(rel.url, { headers: { "user-agent": "BelleCord" } });
      if (!r.ok) { if (!b) throw new Error("The download didn't work (" + r.status + ")."); rel = { tag: b.tag, title: b.title }; buf = fs.readFileSync(b.zip); }
      else buf = Buffer.from(await r.arrayBuffer());
    }
    const files = unzip(buf).filter((f) => f.data);
    // (a zip with everything inside one folder: that folder is BridgeCord)
    const tops = new Set(files.map((f) => f.name.split("/")[0]));
    const strip = tops.size === 1 && files.every((f) => f.name.includes("/")) ? [...tops][0] + "/" : "";
    fs.mkdirSync(DIR, { recursive: true });
    for (const f of files) {
      const rel2 = f.name.slice(strip.length);
      // (your settings and the bot's saved data are never replaced)
      if (!rel2 || rel2.includes("..") || /^(settings\.txt|data\/|node_modules\/|config\/)/.test(rel2)) continue;
      const to = path.join(DIR, rel2);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, f.data);
      if (/\.(sh|command)$/.test(rel2)) { try { fs.chmodSync(to, 0o755); } catch {} }
    }
    saveMine({ tag: rel.tag, title: rel.title });
    note = "";
    return rel;
  }
  const installed = () => fs.existsSync(path.join(DIR, "launcher.js"));

  // ---- your tokens: settings.txt in BridgeCord's folder ----
  const SETTINGS = () => path.join(DIR, "settings.txt");
  function settingsText() {
    try { return fs.readFileSync(SETTINGS(), "utf-8"); } catch {}
    try { return fs.readFileSync(path.join(DIR, "settings.example.txt"), "utf-8"); } catch {}
    return "fluxer token:\ndiscord token:\n";
  }
  const hasLine = (text, key) => { const m = text.match(new RegExp("^\\s*" + key + "\\s*:[ \\t]*(\\S+)", "mi")); return !!(m && m[1] && !m[1].startsWith("#")); };
  function setTokens({ fluxer, discord }) {
    let t = settingsText();
    const put = (key, v) => {
      v = String(v || "").trim().replace(/^bot\s+/i, "");
      if (!v) return;
      if (!/^[\w.-]{20,}$/.test(v)) throw new Error("That doesn't look like a bot token. Copy it again from the developer page.");
      const re = new RegExp("^(\\s*" + key + "\\s*:).*$", "mi");
      t = re.test(t) ? t.replace(re, "$1 " + v) : t + "\n" + key + ": " + v + "\n";
    };
    put("fluxer token", fluxer);
    put("discord token", discord);
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(SETTINGS(), t);
    return tokens();
  }
  const tokens = () => { const t = settingsText(); return { fluxer: hasLine(t, "fluxer token"), discord: hasLine(t, "discord token") }; };

  // ---- running it ----
  function npmInstall(node) {
    return new Promise((ok, no) => {
      note = "Installing BridgeCord's parts (a minute or two, only the first time)...";
      say(note);
      const npm = WIN ? path.join(node.dir, "npm.cmd") : path.join(node.dir, "npm");
      const p = spawn(fs.existsSync(npm) ? npm : WIN ? "npm.cmd" : "npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], { cwd: DIR, env: envFor(node), shell: WIN, windowsHide: true });
      p.stdout.on("data", (d) => say(d)); p.stderr.on("data", (d) => say(d));
      p.on("error", (e) => no(e));
      p.on("close", (code) => { note = ""; code === 0 ? ok() : no(new Error("Installing its parts didn't finish. Check your internet and press Start again.")); });
    });
  }
  const depsKey = () => { try { const p = JSON.parse(fs.readFileSync(path.join(DIR, "package.json"), "utf-8")); return JSON.stringify(p.dependencies || {}); } catch { return ""; } };

  async function start() {
    if (child) return status();
    if (busy) return status();
    busy = true;
    try {
      lines = []; claim = null; invites = {};
      if (!installed()) { phase = "installing"; await install(); }
      const t = tokens();
      if (!t.fluxer || !t.discord) { phase = "off"; note = "Paste both bot tokens first."; return status(); }
      const node = await findNode();
      if (!node) { phase = "neednode"; note = ""; return status(); }
      if (!fs.existsSync(path.join(DIR, "node_modules")) || readMine().deps !== depsKey()) {
        phase = "installing";
        await npmInstall(node);
        saveMine({ deps: depsKey() });
      }
      phase = "starting"; note = "";
      const p = spawn(node.file, ["launcher.js"], { cwd: DIR, env: envFor(node), windowsHide: true, detached: !WIN });
      child = p;
      p.stdout.on("data", (d) => say(d)); p.stderr.on("data", (d) => say(d));
      p.on("error", (e) => { say("Couldn't start: " + (e.message || e)); });
      p.on("close", (code) => {
        if (child === p) child = null;
        phase = stopping ? "off" : "stopped";
        if (!stopping) say("BridgeCord stopped" + (code != null ? " (" + code + ")" : "") + ".");
        stopping = false;
      });
      setTimeout(() => { if (child === p && phase === "starting") phase = "running"; }, 20000);
    } catch (e) {
      phase = "error"; note = String(e.message || e);
      say(note);
    } finally { busy = false; }
    return status();
  }
  let stopping = false;
  function stop() {
    const p = child;
    if (!p) { phase = "off"; return status(); }
    stopping = true;
    try {
      if (WIN) execFile("taskkill", ["/pid", String(p.pid), "/T", "/F"], () => {});
      else { try { process.kill(-p.pid, "SIGTERM"); } catch { p.kill("SIGTERM"); } }
    } catch {}
    setTimeout(() => { if (child === p) { try { WIN ? p.kill() : process.kill(-p.pid, "SIGKILL"); } catch {} } }, 5000);
    return status();
  }
  async function update() {
    const was = !!child;
    if (was) { stop(); await new Promise((r) => setTimeout(r, 2500)); }
    phase = "installing";
    try { await install(); phase = "off"; } catch (e) { phase = "error"; note = String(e.message || e); }
    if (was && phase !== "error") return start();
    return status();
  }

  async function status() {
    const node = await findNode().catch(() => null);
    return {
      installed: installed(), tag: readMine().tag || null, title: readMine().title || null, latest: latest ? { tag: latest.tag, title: latest.title } : null,
      running: !!child, phase, note, tokens: tokens(), claim, invites, log: lines.slice(-60),
      node: node ? node.version : null, auto: !!readMine().auto,
    };
  }

  ipcMain.handle("bridgebot:status", () => status());
  ipcMain.handle("bridgebot:start", () => start());
  ipcMain.handle("bridgebot:stop", () => stop());
  ipcMain.handle("bridgebot:tokens", (e, t) => { try { return { ok: true, tokens: setTokens(t || {}) }; } catch (x) { return { ok: false, error: String(x.message || x) }; } });
  ipcMain.handle("bridgebot:check", async () => { try { const r = await newest(); return { ok: true, latest: { tag: r.tag, title: r.title, notes: r.notes }, tag: readMine().tag || null }; } catch (x) { return { ok: false, error: String(x.message || x) }; } });
  ipcMain.handle("bridgebot:update", () => update());
  ipcMain.handle("bridgebot:auto", (e, on) => { saveMine({ auto: !!on }); return status(); });
  ipcMain.handle("bridgebot:folder", () => { fs.mkdirSync(DIR, { recursive: true }); shell.openPath(DIR); return true; });
  ipcMain.handle("bridgebot:node", () => { shell.openExternal("https://nodejs.org/en/download"); nodeCache = null; return true; });

  // starts with the app if you asked it to, and stops when the app closes
  app.whenReady().then(() => { if (readMine().auto && installed()) setTimeout(() => start().catch(() => {}), 5000); });
  app.on("before-quit", () => { if (child) stop(); });
};
