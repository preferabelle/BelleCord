// Streams between Fluxer and Discord in a bridged call. A bridge bot can't carry streams by itself (Discord doesn't let
// bots watch or send streams), so BelleCord does it, for anyone in the bridged call who uses BelleCord:
//  - Go live on Discord, and the same screen shows in the Fluxer call too, as your mirror (or the bridge's bot).
//    Everyone on Fluxer can watch it, BelleCord or not. The box where you pick what to share has the switch ("Also
//    show it on Fluxer").
//  - Someone streams on Fluxer: a "Watch" button shows up in Discord's own call panel (bottom left, under the call
//    buttons), and the stream plays in a little window over Discord (drag it around, resize it from the corner,
//    fullscreen with ⛶).
// The bridge's bot sets each one up: it asks Fluxer for one more connection and hands it here. The video itself goes
// straight between this PC and Fluxer, never through the bridge. Bridges it can ask (sources() below): your own
// BridgeCord on this computer, a friend's BridgeCord (the link its stream command DMs you), and a bridge behind the
// badge hub (it knows it's really you from your game badges). Dashboard > App has the switches.
// (Update 21) No game badges needed any more: when Belle is in your call and you go live (here, or in the real Discord
// app), a small "Show it to Belle too?" row comes up (and a quiet notification if BelleCord is in the tray). The first
// time on a second computer, Asuka DMs a "Yes, it's me" button instead (the first BelleCord needs nothing). Your
// camera works the same way, and cameras on Fluxer get a Watch button too.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const host = window.bcApp || {};
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let prefs = {};
  const getPrefs = async () => { try { prefs = (await host.getPrefs?.()) || {}; } catch (e) {} return prefs; };
  const on = (k) => prefs[k] !== false; // (both switches start on)
  const hub = async (op, extra = {}) => {
    if (!host.hub || !prefs.hubKey) return { ok: false, error: "verify" };
    const r = await host.hub("POST", "/v1/stream", { key: prefs.hubKey, op, ...extra }).catch(() => null);
    return r || { ok: false, error: "offline" };
  };
  // (the bridges to ask, in this order; the one whose call you're in sets your streams up)
  const myDiscordId = () => (prefs.me && prefs.me.discord && prefs.me.discord.id) || "";
  const links = () => (Array.isArray(prefs.streamLinks) ? prefs.streamLinks : []).filter((l) => l && l.address && l.key);
  function sources() {
    const out = [];
    if (host.bridgeBot && host.bridgeBot.stream && myDiscordId()) out.push({ id: "own", call: (op, extra) => host.bridgeBot.stream({ op, discordUserId: myDiscordId(), ...extra }) });
    if (host.streamLink) for (const l of links()) out.push({ id: "link:" + l.address, link: l, call: (op, extra) => host.streamLink(l.address, { key: l.key, op, ...extra }) });
    if (prefs.hubKey && host.hub) out.push({ id: "hub", call: (op, extra) => hub(op, extra) });
    // (not proven yet: the hub still says whether you're in Belle's call, live, and whether she's there, so the
    //  one-tap proof can be offered right when it's useful)
    // (no game badges key: the hub knows this BelleCord by its install id, so it just works, no setup. Only an
    //  older hub, or a second copy of BelleCord on another computer, answers "verify" and gets the one-tap DM.)
    else if (host.hub && myDiscordId()) out.push({ id: "hub", noSetup: true, call: (op, extra) => host.hub("POST", "/v1/stream", { ids: { discord: myDiscordId() }, install: prefs.installId || "", noSetup: true, op, ...extra }) });
    return out;
  }
  const ask = async (src, op, extra = {}) => (src ? (await src.call(op, extra).catch(() => null)) || { ok: false, error: "offline" } : { ok: false, error: "none" });

  // ---------------------------------------------------------------- LiveKit (only loaded when it's needed)
  let lk = null;
  const loadLk = () => lk || (lk = new Promise((ok, no) => {
    if (window.LivekitClient) return ok(window.LivekitClient);
    const s = document.createElement("script");
    s.src = "livekit-client.umd.js";
    s.onload = () => (window.LivekitClient ? ok(window.LivekitClient) : no(new Error("the stream part didn't load")));
    s.onerror = () => { lk = null; no(new Error("the stream part didn't load")); };
    document.head.appendChild(s);
  }));

  // ---------------------------------------------------------------- in Discord's own call panel
  // (drawn inside Discord's page, under its call buttons, where you go live; if Discord's panel isn't there, a small
  //  pill at the top of the page instead. A click comes back here as a console line.)
  const ROW_PAGE = "(" + function () {
    if (window.__bcBridgeRow) return 1;
    var state = { rows: [] };
    var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var css = document.createElement("style");
    css.textContent = "#bc-bridge-row{display:flex;flex-direction:column;gap:4px;margin:6px 8px 4px;font:500 13px/1.3 var(--font-primary,'gg sans','Noto Sans',sans-serif);color:var(--text-normal,#dbdee1)}" +
      "#bc-bridge-row .r{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:var(--background-modifier-hover,rgba(255,255,255,.06))}" +
      "#bc-bridge-row .r span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#bc-bridge-row .r b{font-weight:650}" +
      "#bc-bridge-row .dot{width:8px;height:8px;border-radius:50%;background:#f23f43;box-shadow:0 0 0 3px rgba(242,63,67,.22);flex:none}" +
      "#bc-bridge-row .tag{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.04em;color:#fff;background:#f23f43;border-radius:4px;padding:1px 5px;flex:none}" +
      "#bc-bridge-row button{border:0;border-radius:6px;padding:4px 10px;font:inherit;font-weight:600;cursor:pointer;background:var(--button-filled-brand-background,#5865f2);color:#fff;flex:none}" +
      "#bc-bridge-row button.x{background:var(--button-secondary-background,#4e5058)}#bc-bridge-row .note{color:var(--text-muted,#949ba4)}" +
      "#bc-bridge-row.float{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:1000;margin:0;min-width:260px;max-width:min(460px,80vw);box-shadow:0 8px 24px rgba(0,0,0,.4);border-radius:10px;background:var(--background-floating,#111214);padding:4px}";
    document.head.appendChild(css);
    var anchor = function () {
      var area = document.querySelector('section[aria-label="User area"]') || document.querySelector('section[class*="panels"]');
      if (!area) return null;
      var bs = area.querySelectorAll("button[aria-label]");
      for (var i = 0; i < bs.length; i++) if (/share (your )?screen|go live|screen share|stream/i.test(bs[i].getAttribute("aria-label"))) return bs[i].parentElement;
      return null;
    };
    var draw = function () {
      var el = document.getElementById("bc-bridge-row");
      if (!state.rows || !state.rows.length) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement("div"); el.id = "bc-bridge-row"; el.setAttribute("role", "status");
        el.addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("[data-a]") : null; if (!b) return; console.log("__bcbr:" + JSON.stringify({ a: b.getAttribute("data-a"), id: b.getAttribute("data-id") || "", n: b.getAttribute("data-n") || "" })); });
      }
      var html = state.rows.map(function (r) {
        if (r.kind === "pub") return '<div class="r"><i class="dot"></i><span>Your stream is on Fluxer too</span><button class="x" data-a="stoppub">Stop</button></div>';
        if (r.kind === "campub") return '<div class="r"><i class="dot"></i><span>Your camera is on Fluxer too</span><button class="x" data-a="stopcam">Stop</button></div>';
        if (r.kind === "stream") return '<div class="r"><i class="tag">LIVE</i><span><b>' + esc(r.name) + '</b> on Fluxer</span><button data-a="watch" data-id="' + esc(r.id) + '" data-n="' + esc(r.name) + '">Watch</button></div>';
        if (r.kind === "cam") return '<div class="r"><i class="tag" style="background:#5865f2">CAM</i><span><b>' + esc(r.name) + '</b>\'s camera on Fluxer</span><button data-a="watchcam" data-id="' + esc(r.id) + '" data-n="' + esc(r.name) + '">Watch</button></div>';
        if (r.kind === "offer") return '<div class="r"><i class="dot"></i><span>' + esc(r.text) + '</span><button data-a="' + esc(r.a) + '">Show it</button><button class="x" data-a="nooffer" title="Not now" aria-label="Not now">✕</button></div>';
        if (r.kind === "verify") return '<div class="r"><span>Check your Discord DMs: tap <b>Yes, it\'s me (' + esc(r.pin) + ')</b> from Asuka</span><button class="x" data-a="noverify">Cancel</button></div>';
        return '<div class="r note"><span title="' + esc(r.text) + '">' + esc(r.text) + "</span></div>";
      }).join("");
      if (el.__html !== html) { el.innerHTML = html; el.__html = html; }
      var a = anchor();
      if (a) { if (a.nextElementSibling !== el) a.after(el); el.classList.remove("float"); }
      else { if (el.parentElement !== document.body) document.body.appendChild(el); el.classList.add("float"); }
    };
    window.__bcBridgeRow = function (s) { state = s || { rows: [] }; draw(); return 1; };
    setInterval(draw, 1000); // (Discord redraws its panel now and then: the row goes back in)
    return 1;
  }.toString() + ")()";
  const page = () => $("wv-discord");
  let inPage = false;
  const pushRows = (rows) => {
    const v = page();
    if (!v || !v.executeJavaScript) { inPage = false; return; }
    v.executeJavaScript(ROW_PAGE + ";window.__bcBridgeRow(" + JSON.stringify({ rows }) + ")").then(() => { inPage = true; }).catch(() => { inPage = false; });
  };
  const wireUp = () => {
    const v = page();
    if (!v || v.__bcbr) return;
    v.__bcbr = true;
    v.addEventListener("console-message", (e) => {
      const m = String(e.message || "");
      if (!m.startsWith("__bcbr:")) return;
      let o = null; try { o = JSON.parse(m.slice(7)); } catch (x) { return; }
      if (o.a === "stoppub") stopPublish("Stopped showing it on Fluxer.");
      if (o.a === "stopcam") stopCamera("Your camera is off on Fluxer.");
      if (o.a === "watch" && o.id) startWatch(String(o.id), String(o.n || "Someone")).catch((x) => say("Couldn't open their stream: " + (x && x.message ? x.message : x)));
      if (o.a === "watchcam" && o.id) startWatch(String(o.id), String(o.n || "Someone"), "camera").catch((x) => say("Couldn't open their camera: " + (x && x.message ? x.message : x)));
      offerClick(o.a);
    });
    v.addEventListener("dom-ready", () => draw());
  };
  setInterval(wireUp, 3000); setTimeout(wireUp, 800);

  // ---------------------------------------------------------------- the little bar (only when Discord's page can't show it)
  const css = document.createElement("style");
  css.textContent = [
    "#bcbs{position:fixed;left:84px;bottom:14px;z-index:99990;display:flex;flex-direction:column;gap:6px;max-width:min(420px,60vw);pointer-events:none}",
    "#bcbs .row{pointer-events:auto;display:flex;align-items:center;gap:8px;background:rgba(24,25,31,.94);color:#e6e6ef;border:1px solid #3a3b48;border-radius:12px;padding:8px 10px;font:13px/1.3 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4)}",
    "#bcbs .row b{font-weight:650}#bcbs .row .t{flex:1;min-width:0}",
    "#bcbs button{border:0;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer;background:#5865f2;color:#fff}#bcbs button.x{background:#4e5058}",
    "#bcbs .live{width:9px;height:9px;border-radius:50%;background:#f23f43;box-shadow:0 0 0 3px rgba(242,63,67,.25);flex:none}",
    "#bcbw{position:fixed;right:24px;bottom:24px;width:520px;height:330px;min-width:240px;min-height:160px;z-index:99991;background:#000;border:1px solid #3a3b48;border-radius:12px;overflow:hidden;resize:both;box-shadow:0 16px 48px rgba(0,0,0,.55);display:flex;flex-direction:column}",
    "#bcbw .hd{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#18191f;color:#e6e6ef;font:12px system-ui,sans-serif;cursor:move;user-select:none}",
    "#bcbw .hd .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#bcbw .hd button{border:0;background:#2b2d31;color:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit}",
    "#bcbw .hd input{width:80px}",
    "#bcbw video{flex:1;min-height:0;width:100%;background:#000;object-fit:contain}",
    "#bcbw .msg{position:absolute;inset:34px 0 0 0;display:flex;align-items:center;justify-content:center;color:#b5bac1;font:13px system-ui,sans-serif;text-align:center;padding:16px;pointer-events:none}",
  ].join("");
  document.head.appendChild(css);
  const bar = document.createElement("div");
  bar.id = "bcbs";
  bar.setAttribute("role", "status");
  document.body.appendChild(bar);
  let note = null, noteTimer = 0;
  const say = (text, ms = 7000) => { note = text; clearTimeout(noteTimer); noteTimer = setTimeout(() => { note = null; draw(); }, ms); draw(); };

  let info = null; // { inCall, canStream, as, hasMirror, channel, streams: [{ identity, name, audio }], warn }
  let active = null; // the bridge whose call you're in: { src, info }
  let pub = null;  // { room, track, connectionId, src, timer }
  let watch = null; // { room, connectionId, src, identity, name, timer, kind }
  let cam = null;  // your camera on Fluxer too: { room, track, stream, connectionId, src, timer }
  let offer = null; // { what: "screen"|"camera" } while Belle's in the call and you're live / your camera's on
  let verifying = null; // { token, pin, at, then }
  const dismissed = { screen: false, camera: false }; // ("not now": until you stop and start again)
  const told = { screen: false, camera: false };
  function draw() {
    const list = [];
    if (pub) list.push({ kind: "pub" });
    if (cam) list.push({ kind: "campub" });
    if (info && info.inCall && on("watchFluxer")) {
      for (const s of (info.streams || []).slice(0, 3)) {
        if (watch && watch.identity === s.identity) continue;
        list.push({ kind: "stream", id: s.identity, name: s.name });
      }
    }
    if (info && info.inCall && on("watchFluxer")) {
      for (const c of (info.cameras || []).slice(0, 3)) {
        if (watch && watch.identity === c.identity && watch.kind === "camera") continue;
        list.push({ kind: "cam", id: c.identity, name: c.name });
      }
    }
    if (verifying) list.push({ kind: "verify", pin: verifying.pin });
    else if (offer) list.push({ kind: "offer", a: offer.what === "camera" ? "offercam" : "offer", text: offer.what === "camera" ? "Belle's in this call. Show her your camera too?" : "Belle's in this call. Show her your stream too?" });
    if (note) list.push({ kind: "note", text: note });
    pushRows(list);
    // (the little bar over the window only when Discord's page didn't take it)
    const rows = inPage ? [] : list.map((r) => r.kind === "pub" ? '<div class="row"><span class="live"></span><span class="t">Your Discord stream is on Fluxer too.</span><button class="x" data-a="stoppub">Stop</button></div>'
      : r.kind === "campub" ? '<div class="row"><span class="live"></span><span class="t">Your camera is on Fluxer too.</span><button class="x" data-a="stopcam">Stop</button></div>'
      : r.kind === "stream" ? '<div class="row"><span class="live"></span><span class="t"><b>' + esc(r.name) + '</b> is streaming on Fluxer</span><button data-a="watch" data-id="' + esc(r.id) + '" data-n="' + esc(r.name) + '">Watch</button></div>'
      : r.kind === "cam" ? '<div class="row"><span class="t"><b>' + esc(r.name) + '</b>\'s camera is on, on Fluxer</span><button data-a="watchcam" data-id="' + esc(r.id) + '" data-n="' + esc(r.name) + '">Watch</button></div>'
      : r.kind === "offer" ? '<div class="row"><span class="live"></span><span class="t">' + esc(r.text) + '</span><button data-a="' + esc(r.a) + '">Show it</button><button class="x" data-a="nooffer" aria-label="Not now">✕</button></div>'
      : r.kind === "verify" ? '<div class="row"><span class="t">Check your Discord DMs: tap <b>Yes, it\'s me (' + esc(r.pin) + ')</b> from Asuka.</span><button class="x" data-a="noverify">Cancel</button></div>'
      : '<div class="row"><span class="t">' + esc(r.text) + "</span></div>");
    bar.innerHTML = rows.join("");
    bar.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      if (b.dataset.a === "stoppub") stopPublish("Stopped showing it on Fluxer.");
      if (b.dataset.a === "stopcam") stopCamera("Your camera is off on Fluxer.");
      if (b.dataset.a === "watch") startWatch(b.dataset.id, b.dataset.n).catch((e) => say("Couldn't open their stream: " + (e && e.message ? e.message : e)));
      if (b.dataset.a === "watchcam") startWatch(b.dataset.id, b.dataset.n, "camera").catch((e) => say("Couldn't open their camera: " + (e && e.message ? e.message : e)));
      offerClick(b.dataset.a);
    }));
  }

  // ---------------------------------------------------------------- who's streaming (every 15 seconds)
  let lastAnswers = [];
  async function refresh() {
    await getPrefs();
    const list = sources();
    const answers = await Promise.all(list.map(async (src) => ({ src, r: await ask(src, "info") })));
    lastAnswers = answers;
    const hit = answers.find((a) => a.r.ok && a.r.data && a.r.data.inCall);
    active = hit ? { src: hit.src, info: hit.r.data } : null;
    const any = answers.find((a) => a.r.ok && a.r.data);
    info = hit ? hit.r.data : any ? any.r.data : null;
    try { host.share && host.share.setCall && host.share.setCall({ inCall: !!active }); } catch (e) {}
    // (left the call: everything from that bridge stops. A bridge that didn't answer this time isn't "left".)
    const left = (o) => { const a = o && answers.find((x) => x.src.id === o.src.id); return !!(a && a.r.ok && a.r.data && !a.r.data.inCall); };
    if (left(pub)) stopPublish();
    if (left(cam)) stopCamera();
    if (left(watch)) stopWatch();
    lookForOffer(answers);
    draw();
  }
  // (every 15 seconds while the window is open; every 30 while BelleCord sits in the tray, so it still notices you
  //  going live in the real Discord app with Belle in the call)
  let tick15 = 0;
  setInterval(() => { tick15++; if (document.visibilityState === "visible" || pub || cam || watch || tick15 % 2 === 0) refresh(); }, 15000);
  setTimeout(refresh, 5000);

  async function checkIn(o) {
    if (o !== pub && o !== watch) return;
    const r = await ask(o.src, "ping", { connectionId: o.connectionId });
    if (!r.ok || (r.data && r.data.ok === false)) { if (o === pub) stopPublish("Your Fluxer copy stopped (the bridged call changed)."); if (o === watch) stopWatch("The stream window closed (the bridged call changed)."); return; }
    if (o === pub && r.data && r.data.warn === "no-stream-permission" && !o.warned) { o.warned = true; say(NO_STREAM, 15000); }
  }
  // (every 30 seconds, and once soon after it starts: that's when Fluxer says whether it shows the stream as live)
  const keepAlive = (o) => { setTimeout(() => checkIn(o), 6000); return setInterval(() => checkIn(o), 30000); };
  const NO_STREAM = "Fluxer isn't showing your stream: your mirror (or the bridge's bot) needs the Stream permission in that voice channel.";

  // ---------------------------------------------------------------- your Discord stream, on Fluxer too
  async function startPublish(sourceId, asked, tries) {
    await getPrefs();
    if (pub || asked === false || (asked !== true && !on("streamToFluxer"))) return;
    if (!active) await refresh();
    const src = active && active.src;
    if (!src) return; // (not in a bridged call: nothing to do)
    const i = await ask(src, "info");
    if (!i.ok || !i.data || !i.data.inCall) return;
    if (!i.data.canStream) {
      // (the call may be getting its Fluxer side right now: a few more tries before giving up)
      if (i.data.hasMirror && (tries || 0) < 5) { setTimeout(() => startPublish(sourceId, asked === undefined ? true : asked, (tries || 0) + 1), 6000); return; }
      return say(i.data.hasMirror ? "Your mirror isn't in the Fluxer call yet, so your stream isn't on Fluxer."
        : i.data.as === null ? "The bridge isn't in the Fluxer call right now, so your stream isn't on Fluxer." // (BridgeCord: it would use its own bot)
        : "You don't have a mirror on Fluxer in this bridge yet, so your stream can't show there. Ask whoever runs the bridge for one.");
    }
    let ms = null, room = null, opened = null;
    try {
      const L = await loadLk();
      if (sourceId) await host.share.arm(sourceId); // (no source: you went live in the real Discord app, so you pick it here)
      // (with its sound now: before, Fluxer got the picture only. The app's own sound, like the Discord call, is left out
      //  where Windows allows it, so people on Fluxer don't hear the call twice.)
      ms = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: { restrictOwnAudio: true, suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).catch(() => navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false }));
      const track = ms.getVideoTracks()[0];
      if (!track) throw new Error("couldn't capture the same screen");
      const r = await ask(src, "open", { purpose: "publish" });
      if (!r.ok) throw new Error((r.data && r.data.error) || r.error || "the bridge didn't answer");
      opened = r.data;
      room = new L.Room({ dynacast: true });
      await room.connect(opened.url, opened.token, { autoSubscribe: false });
      await room.localParticipant.publishTrack(track, { source: L.Track.Source.ScreenShare, name: "screen", simulcast: false, videoEncoding: { maxBitrate: 3000000, maxFramerate: 30 } });
      const sound = ms.getAudioTracks()[0];
      if (sound) await room.localParticipant.publishTrack(sound, { source: L.Track.Source.ScreenShareAudio, name: "screen-audio", dtx: false, red: false, audioPreset: { maxBitrate: 128000 } }).catch(() => {});
      pub = { room, track, stream: ms, connectionId: opened.connectionId, src };
      offer = null;
      pub.timer = keepAlive(pub);
      if (opened.as === "bridge") say("Your stream is on Fluxer too, as the bridge's bot (you don't have a mirror there).", 9000);
      track.addEventListener("ended", () => stopPublish());
      room.on(L.RoomEvent.Disconnected, () => { if (pub && pub.room === room) stopPublish("Your Fluxer copy stopped (Fluxer hung up)."); });
      draw();
    } catch (e) {
      try { ms && ms.getTracks().forEach((t) => t.stop()); } catch (x) {}
      try { room && room.disconnect(); } catch (x) {}
      if (opened) ask(src, "close", { connectionId: opened.connectionId });
      say("Couldn't show your stream on Fluxer: " + (e && e.message ? e.message : e));
    }
  }
  function stopPublish(why) {
    const p = pub;
    if (!p) return;
    pub = null;
    clearInterval(p.timer);
    try { p.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { p.room.disconnect(); } catch (e) {}
    ask(p.src, "close", { connectionId: p.connectionId });
    if (why) say(why); else draw();
  }
  if (host.share) {
    host.share.onShare((d) => { if (d && d.side === "discord" && d.sourceId) { lastShare = { id: d.sourceId, at: Date.now() }; startPublish(d.sourceId, typeof d.toFluxer === "boolean" ? d.toFluxer : undefined); } });
    host.share.onState((what) => { if (what === "ended") stopPublish(); });
  }

  // ---------------------------------------------------------------- watching a Fluxer stream
  async function startWatch(identity, name, kind) {
    kind = kind === "camera" ? "camera" : "screen";
    if (watch) stopWatch();
    const L = await loadLk();
    const src = active && active.src;
    if (!src) throw new Error("you're not in a bridged call");
    const r = await ask(src, "open", { purpose: "watch", identity });
    if (!r.ok) throw new Error((r.data && r.data.error) || r.error || "the bridge didn't answer");
    const box = document.createElement("div");
    box.id = "bcbw";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", name + "'s stream");
    box.innerHTML = '<div class="hd"><span class="n">' + (kind === "camera" ? "📷 " : "📺 ") + esc(name) + ' <span style="opacity:.6">on Fluxer</span></span><input type="range" min="0" max="100" value="80" aria-label="Stream volume" title="Volume"><button data-f title="Fullscreen" aria-label="Fullscreen">⛶</button><button data-c title="Close" aria-label="Close the stream">✕</button></div><video autoplay playsinline muted></video><div class="msg">Connecting...</div>';
    document.body.appendChild(box);
    const video = box.querySelector("video"), msg = box.querySelector(".msg"), vol = box.querySelector("input");
    const audios = [];
    vol.oninput = () => audios.forEach((a) => (a.volume = Number(vol.value) / 100));
    box.querySelector("[data-c]").onclick = () => stopWatch();
    box.querySelector("[data-f]").onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : box.requestFullscreen(); } catch (e) {} };
    // (drag it by its top bar)
    const hd = box.querySelector(".hd");
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button,input")) return;
      const r0 = box.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
      const move = (ev) => { box.style.left = Math.max(0, r0.left + ev.clientX - x0) + "px"; box.style.top = Math.max(0, r0.top + ev.clientY - y0) + "px"; box.style.right = "auto"; box.style.bottom = "auto"; };
      const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
      addEventListener("pointermove", move); addEventListener("pointerup", up);
    });
    const room = new L.Room({ adaptiveStream: true, dynacast: false });
    const isScreen = (p) => p && (kind === "camera" ? p.source === L.Track.Source.Camera : p.source === L.Track.Source.ScreenShare || p.source === L.Track.Source.ScreenShareAudio);
    watch = { room, connectionId: r.data.connectionId, src, identity, name, box, kind };
    watch.timer = keepAlive(watch);
    room.on(L.RoomEvent.TrackSubscribed, (track, p, participant) => {
      if (participant.identity !== identity) return;
      if (track.kind === "video") { track.attach(video); msg.style.display = "none"; }
      else if (track.kind === "audio") { const a = track.attach(); a.volume = Number(vol.value) / 100; audios.push(a); box.appendChild(a); }
    });
    room.on(L.RoomEvent.TrackPublished, (p, participant) => { if (participant.identity === identity && isScreen(p)) p.setSubscribed(true); });
    room.on(L.RoomEvent.TrackUnpublished, (p, participant) => { if (participant.identity === identity && p.source === (kind === "camera" ? L.Track.Source.Camera : L.Track.Source.ScreenShare)) stopWatch(name + (kind === "camera" ? " turned their camera off." : " stopped streaming.")); });
    room.on(L.RoomEvent.ParticipantDisconnected, (participant) => { if (participant.identity === identity) stopWatch(name + " left the call."); });
    room.on(L.RoomEvent.Disconnected, () => { if (watch && watch.room === room) stopWatch(); });
    try {
      await room.connect(r.data.url, r.data.token, { autoSubscribe: false });
      const p = room.remoteParticipants.get(identity) || [...room.remoteParticipants.values()].find((x) => x.identity === identity);
      const gone = name + (kind === "camera" ? "'s camera is off now." : " isn't streaming any more.");
      if (!p) return stopWatch(gone);
      let any = false;
      for (const pp of p.trackPublications.values()) if (isScreen(pp)) { pp.setSubscribed(true); any = true; }
      if (!any) return stopWatch(gone);
      draw();
    } catch (e) { stopWatch("Couldn't open " + name + "'s stream: " + (e && e.message ? e.message : e)); }
  }
  function stopWatch(why) {
    const w = watch;
    if (!w) return;
    watch = null;
    clearInterval(w.timer);
    try { w.room.disconnect(); } catch (e) {}
    try { w.box.remove(); } catch (e) {}
    ask(w.src, "close", { connectionId: w.connectionId });
    if (why) say(why); else draw();
  }
  addEventListener("beforeunload", () => { stopPublish(); stopCamera(); stopWatch(); });

  // ---------------------------------------------------------------- (Update 21) offering it to Belle, and the one-tap proof
  let lastShare = null; // (the screen you last went live with here, so "Show it" doesn't have to ask again)
  function lookForOffer(answers) {
    const h = answers.find((a) => a.src.id === "hub");
    const d = h && h.r && h.r.data;
    const here = !!(d && d.inCall && d.belleHere);
    const live = here && !!d.liveOnDiscord, camOn = here && !!d.cameraOnDiscord;
    if (!(d && d.liveOnDiscord)) dismissed.screen = told.screen = false;
    if (!(d && d.cameraOnDiscord)) dismissed.camera = told.camera = false;
    let want = null;
    if (on("offerBelle")) {
      if (live && !pub && !d.publishing && !dismissed.screen) want = "screen";
      else if (camOn && !cam && !d.cameraPublishing && !dismissed.camera) want = "camera";
    }
    offer = want ? { what: want } : null;
    // (BelleCord isn't in front: one quiet notification per time you go live)
    if (want && !told[want] && (document.visibilityState !== "visible" || !document.hasFocus())) {
      told[want] = true;
      try { host.notifyClick ? host.notifyClick("Belle's in your call", want === "camera" ? "Show her your camera too? Click to open BelleCord." : "Show her your stream too? Click to open BelleCord.", "offer") : host.notify && host.notify("Belle's in your call", "Open BelleCord to show her your " + (want === "camera" ? "camera" : "stream") + " too."); } catch (e) {}
    }
  }
  function offerClick(a) {
    if (a === "nooffer") { if (offer) dismissed[offer.what] = true; offer = null; draw(); }
    if (a === "noverify") { verifying = null; draw(); }
    if (a === "offer" || a === "offercam") {
      const go = a === "offer" ? () => startPublish(lastShare && Date.now() - lastShare.at < 6 * 3600000 ? lastShare.id : null, true) : () => startCamera();
      offer = null; draw();
      const h = lastAnswers.find((x) => x.src.id === "hub");
      const needProof = !prefs.hubKey && h && h.r && h.r.status === 401;
      if (needProof) verify(go); else go();
    }
  }
  async function verify(then) {
    if (verifying) return;
    const r = await host.hub("POST", "/v1/verify", { ids: { discord: myDiscordId() }, why: "stream" }).catch(() => null);
    if (!r || !r.ok || !r.data || !r.data.token) return say((r && r.data && r.data.error) || (r && r.error) || "Belle's hub isn't answering right now. Try again in a bit.", 10000);
    verifying = { token: r.data.token, pin: r.data.pin, at: Date.now(), then };
    draw();
    const poll = async () => {
      const v = verifying;
      if (!v) return;
      if (Date.now() - v.at > 10 * 60000) { verifying = null; return say("That ran out. Click Show it again to get a new one."); }
      const p = await host.hub("POST", "/v1/verify/poll", { token: v.token }).catch(() => null);
      if (verifying !== v) return;
      if (p && p.ok && p.data && p.data.key) {
        verifying = null;
        await host.setPrefs?.({ hubKey: p.data.key });
        try { dispatchEvent(new CustomEvent("bc-hubkey", { detail: p.data.key })); } catch (e) {}
        await getPrefs();
        say("That's you. You won't be asked again.", 6000);
        await refresh();
        if (v.then) v.then();
        return;
      }
      if (p && p.status === 404) { verifying = null; return say("That one ran out or was turned down. Click Show it to try again."); }
      setTimeout(poll, 2500);
    };
    setTimeout(poll, 2500);
  }
  if (host.onNotice) host.onNotice((what) => { if (what === "click:offer") { refresh(); } });

  // ---------------------------------------------------------------- your camera, on Fluxer too
  async function startCamera() {
    await getPrefs();
    if (cam) return;
    if (!active) await refresh();
    const src = active && active.src;
    if (!src) return say("You're not in Belle's bridged call right now.");
    let ms = null, room = null, opened = null;
    try {
      const L = await loadLk();
      ms = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
      const track = ms.getVideoTracks()[0];
      if (!track) throw new Error("no camera found");
      const r = await ask(src, "open", { purpose: "camera" });
      if (!r.ok) throw new Error((r.data && r.data.error) || r.error || "the bridge didn't answer");
      opened = r.data;
      room = new L.Room({ dynacast: true });
      await room.connect(opened.url, opened.token, { autoSubscribe: false });
      await room.localParticipant.publishTrack(track, { source: L.Track.Source.Camera, name: "camera", simulcast: false, videoEncoding: { maxBitrate: 1500000, maxFramerate: 30 } });
      cam = { room, track, stream: ms, connectionId: opened.connectionId, src };
      cam.timer = setInterval(async () => { const c = cam; if (!c) return; const p = await ask(c.src, "ping", { connectionId: c.connectionId }); if (!p.ok || (p.data && p.data.ok === false)) stopCamera("Your camera on Fluxer stopped (the bridged call changed)."); }, 30000);
      track.addEventListener("ended", () => stopCamera());
      room.on(L.RoomEvent.Disconnected, () => { if (cam && cam.room === room) stopCamera("Your camera on Fluxer stopped (Fluxer hung up)."); });
      say("Your camera is on Fluxer too. Turning it off on Discord doesn't stop this one: use Stop.", 9000);
      draw();
    } catch (e) {
      try { ms && ms.getTracks().forEach((t) => t.stop()); } catch (x) {}
      try { room && room.disconnect(); } catch (x) {}
      if (opened) ask(src, "close", { connectionId: opened.connectionId });
      say("Couldn't show your camera on Fluxer: " + (e && e.message ? e.message : e));
    }
  }
  function stopCamera(why) {
    const c = cam;
    if (!c) return;
    cam = null;
    clearInterval(c.timer);
    try { c.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { c.room.disconnect(); } catch (e) {}
    ask(c.src, "close", { connectionId: c.connectionId });
    if (why) say(why); else draw();
  }

  // ---------------------------------------------------------------- a friend's bridge: the link its stream command DMs you
  // (clicking it anywhere in BelleCord lands here; the key is after the #, and it only works for your Discord account)
  async function addLink(url) {
    let u = null;
    try { u = new URL(url); } catch (e) { return; }
    const h = new URLSearchParams(u.hash.slice(1));
    const key = h.get("k") || "", name = (h.get("n") || "").replace(/[\u0000-\u001f]/g, "").slice(0, 60) || u.hostname;
    if (!/^[\w-]{20,}$/.test(key)) return;
    await getPrefs();
    const list = links().filter((l) => l.address !== u.origin);
    list.unshift({ address: u.origin, key, name, at: Date.now() });
    await host.setPrefs?.({ streamLinks: list.slice(0, 8) });
    await getPrefs();
    say("Added " + name + " for streams. In its bridged call, your streams can show on Fluxer and Fluxer streams get a Watch button.", 9000);
    refresh();
    card();
  }
  async function removeLink(address) {
    await getPrefs();
    await host.setPrefs?.({ streamLinks: links().filter((l) => l.address !== address) });
    await getPrefs();
    if (pub && pub.src.id === "link:" + address) stopPublish();
    if (watch && watch.src.id === "link:" + address) stopWatch();
    refresh();
    card();
  }
  if (host.onNotice) host.onNotice((what) => { if (String(what).startsWith("streamlink:")) addLink(String(what).slice(11)); });

  // ---------------------------------------------------------------- Dashboard > App: the switches
  function card() {
    const app = document.querySelector(".appcard");
    if (!app) return;
    let box = $("bscard");
    if (!box) {
      box = document.createElement("div");
      box.className = "card"; box.id = "bscard";
      ($("noisecard") || $("volcard") || app).after(box);
    }
    const own = lastAnswers.find((a) => a.src.id === "own");
    const ownOn = !!(own && own.r.ok);
    const linkRows = links().map((l) => {
      const a = lastAnswers.find((x) => x.src.id === "link:" + l.address);
      const st = !a ? "" : a.r.status === 401 ? "this link doesn't work any more, ask its bridge for a new one" : a.r.ok ? (a.r.data && a.r.data.inCall ? "you're in its call" : "ready") : "not answering right now";
      return '<div class="keep" style="display:flex;gap:8px;align-items:center;margin:4px 0"><span style="flex:1;min-width:0">' + esc(l.name || l.address) + (st ? ' <span class="dim small">(' + esc(st) + ")</span>" : "") + '</span><button data-rm="' + esc(l.address) + '" aria-label="Remove ' + esc(l.name || l.address) + '">Remove</button></div>';
    }).join("");
    const where = active && active.info;
    box.innerHTML = '<h3>Streams between Fluxer and Discord</h3><p class="dim small">In a bridged call, streams cross between Fluxer and Discord for everyone who uses BelleCord. The video goes straight between you and Fluxer.</p>' +
      '<label class="keep"><input type="checkbox" id="bs-pub"' + (on("streamToFluxer") ? " checked" : "") + "> When I go live on Discord, show it on Fluxer too (the share box asks each time, with this as the answer it starts on)</label><br>" +
      '<label class="keep"><input type="checkbox" id="bs-watch"' + (on("watchFluxer") ? " checked" : "") + "> Offer Fluxer streams to watch while I'm on Discord</label>" +
      '<p class="dim small">Your own bridge (Your bridge bot) does it by itself' + (ownOn ? ", and it's running." : " while it's running.") +
      " A friend's BridgeCord sends you a link when you type its stream command on Discord (b!stream, unless they changed the b!). Click it here and it's added.</p>" +
      (linkRows ? '<div role="list" aria-label="Friends\' bridges">' + linkRows + "</div>" : "") +
      '<p class="dim small" role="status">' + (where ? "You're in a bridged call" + (where.channel ? " (" + esc(where.channel) + ")" : "") + (where.canStream ? "." : where.hasMirror ? ", but your mirror isn't in the Fluxer call yet." : ".") + (where.warn === "no-stream-permission" ? " " + esc(NO_STREAM) : "") : "You're not in a bridged call right now.") + "</p>";
    box.querySelector("#bs-pub").onchange = async (e) => { await host.setPrefs?.({ streamToFluxer: e.target.checked }); await getPrefs(); if (!e.target.checked) stopPublish(); };
    box.querySelector("#bs-watch").onchange = async (e) => { await host.setPrefs?.({ watchFluxer: e.target.checked }); await getPrefs(); draw(); };
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => removeLink(b.getAttribute("data-rm"))));
  }
  setInterval(() => { if (document.querySelector(".appcard") && !document.activeElement?.closest?.("#bscard")) card(); }, 4000);
})();
