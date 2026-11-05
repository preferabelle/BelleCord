// Streams across my bridge. My bot can't carry streams between Fluxer and Discord by itself (Discord doesn't let bots
// watch or send streams), so BelleCord does it, for anyone in my bridged call who uses BelleCord:
//  - Go live on Discord, and the same screen shows in the Fluxer call too, as your bridge bot. Everyone on Fluxer can
//    watch it, BelleCord or not.
//  - Someone streams on Fluxer: a "Watch" button shows up here, and the stream plays in a little window over Discord
//    (drag it around, resize it from the corner, fullscreen with ⛶).
// My bot sets it up (it asks Fluxer for a second connection for your bridge bot, through my badge hub, which knows
// it's really you because you proved your Discord account with Asuka's code). The video itself goes straight between
// your PC and Fluxer: it never goes through my PC. Dashboard > App has the switches.
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

  // ---------------------------------------------------------------- the little bar (bottom left)
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

  let info = null; // { inCall, canStream, hasMirror, channel, streams: [{ identity, name, audio }] }
  let pub = null;  // { room, track, connectionId, timer }
  let watch = null; // { room, connectionId, identity, name, timer }
  function draw() {
    const rows = [];
    if (pub) rows.push('<div class="row"><span class="live"></span><span class="t">Your Discord stream is on Fluxer too.</span><button class="x" data-a="stoppub">Stop</button></div>');
    if (info && info.inCall && on("watchFluxer")) {
      for (const s of (info.streams || []).slice(0, 3)) {
        if (watch && watch.identity === s.identity) continue;
        rows.push('<div class="row"><span class="live"></span><span class="t"><b>' + esc(s.name) + "</b> is streaming on Fluxer</span><button data-a=\"watch\" data-id=\"" + esc(s.identity) + '" data-n="' + esc(s.name) + '">Watch</button></div>');
      }
    }
    if (note) rows.push('<div class="row"><span class="t">' + esc(note) + "</span></div>");
    bar.innerHTML = rows.join("");
    bar.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      if (b.dataset.a === "stoppub") stopPublish("Stopped showing it on Fluxer.");
      if (b.dataset.a === "watch") startWatch(b.dataset.id, b.dataset.n).catch((e) => say("Couldn't open their stream: " + (e && e.message ? e.message : e)));
    }));
  }

  // ---------------------------------------------------------------- who's streaming (every 15 seconds)
  async function refresh() {
    await getPrefs();
    if (!prefs.hubKey) { info = null; return draw(); }
    const r = await hub("info");
    info = r.ok ? r.data : null;
    // (left the call: everything stops)
    if (info && !info.inCall) { if (pub) stopPublish(); if (watch) stopWatch(); }
    draw();
  }
  setInterval(() => { if (document.visibilityState === "visible" || pub || watch) refresh(); }, 15000);
  setTimeout(refresh, 5000);

  const keepAlive = (o) => setInterval(async () => {
    const r = await hub("ping", { connectionId: o.connectionId });
    if (!r.ok || (r.data && r.data.ok === false)) { if (o === pub) stopPublish("Your Fluxer copy stopped (the bridged call changed)."); if (o === watch) stopWatch("The stream window closed (the bridged call changed)."); }
  }, 30000);

  // ---------------------------------------------------------------- your Discord stream, on Fluxer too
  async function startPublish(sourceId) {
    await getPrefs();
    if (!on("streamToFluxer") || pub) return;
    if (!prefs.hubKey) return;
    const i = await hub("info");
    if (!i.ok || !i.data || !i.data.inCall) return; // (not in my bridged call: nothing to do)
    if (!i.data.canStream) return say(i.data.hasMirror ? "Your bridge bot isn't in the Fluxer call yet, so your stream isn't on Fluxer." : "You don't have a bridge bot on Fluxer yet, so your stream can't show there. Tell me and I'll set one up.");
    let ms = null, room = null, opened = null;
    try {
      const L = await loadLk();
      await host.share.arm(sourceId);
      ms = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      const track = ms.getVideoTracks()[0];
      if (!track) throw new Error("couldn't capture the same screen");
      const r = await hub("open", { purpose: "publish" });
      if (!r.ok) throw new Error((r.data && r.data.error) || r.error || "my bot didn't answer");
      opened = r.data;
      room = new L.Room({ dynacast: true });
      await room.connect(opened.url, opened.token, { autoSubscribe: false });
      await room.localParticipant.publishTrack(track, { source: L.Track.Source.ScreenShare, name: "screen", simulcast: false, videoEncoding: { maxBitrate: 3000000, maxFramerate: 30 } });
      pub = { room, track, stream: ms, connectionId: opened.connectionId };
      pub.timer = keepAlive(pub);
      track.addEventListener("ended", () => stopPublish());
      room.on(L.RoomEvent.Disconnected, () => { if (pub && pub.room === room) stopPublish("Your Fluxer copy stopped (Fluxer hung up)."); });
      draw();
    } catch (e) {
      try { ms && ms.getTracks().forEach((t) => t.stop()); } catch (x) {}
      try { room && room.disconnect(); } catch (x) {}
      if (opened) hub("close", { connectionId: opened.connectionId });
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
    hub("close", { connectionId: p.connectionId });
    if (why) say(why); else draw();
  }
  if (host.share) {
    host.share.onShare((d) => { if (d && d.side === "discord" && d.sourceId) startPublish(d.sourceId); });
    host.share.onState((what) => { if (what === "ended") stopPublish(); });
  }

  // ---------------------------------------------------------------- watching a Fluxer stream
  async function startWatch(identity, name) {
    if (watch) stopWatch();
    const L = await loadLk();
    const r = await hub("open", { purpose: "watch" });
    if (!r.ok) throw new Error((r.data && r.data.error) || r.error || "my bot didn't answer");
    const box = document.createElement("div");
    box.id = "bcbw";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", name + "'s stream");
    box.innerHTML = '<div class="hd"><span class="n">📺 ' + esc(name) + ' <span style="opacity:.6">on Fluxer</span></span><input type="range" min="0" max="100" value="80" aria-label="Stream volume" title="Volume"><button data-f title="Fullscreen" aria-label="Fullscreen">⛶</button><button data-c title="Close" aria-label="Close the stream">✕</button></div><video autoplay playsinline muted></video><div class="msg">Connecting...</div>';
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
    const isScreen = (p) => p && (p.source === L.Track.Source.ScreenShare || p.source === L.Track.Source.ScreenShareAudio);
    watch = { room, connectionId: r.data.connectionId, identity, name, box };
    watch.timer = keepAlive(watch);
    room.on(L.RoomEvent.TrackSubscribed, (track, p, participant) => {
      if (participant.identity !== identity) return;
      if (track.kind === "video") { track.attach(video); msg.style.display = "none"; }
      else if (track.kind === "audio") { const a = track.attach(); a.volume = Number(vol.value) / 100; audios.push(a); box.appendChild(a); }
    });
    room.on(L.RoomEvent.TrackPublished, (p, participant) => { if (participant.identity === identity && isScreen(p)) p.setSubscribed(true); });
    room.on(L.RoomEvent.TrackUnpublished, (p, participant) => { if (participant.identity === identity && p.source === L.Track.Source.ScreenShare) stopWatch(name + " stopped streaming."); });
    room.on(L.RoomEvent.ParticipantDisconnected, (participant) => { if (participant.identity === identity) stopWatch(name + " left the call."); });
    room.on(L.RoomEvent.Disconnected, () => { if (watch && watch.room === room) stopWatch(); });
    try {
      await room.connect(r.data.url, r.data.token, { autoSubscribe: false });
      const p = room.remoteParticipants.get(identity) || [...room.remoteParticipants.values()].find((x) => x.identity === identity);
      if (!p) return stopWatch(name + " isn't streaming any more.");
      let any = false;
      for (const pp of p.trackPublications.values()) if (isScreen(pp)) { pp.setSubscribed(true); any = true; }
      if (!any) return stopWatch(name + " isn't streaming any more.");
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
    hub("close", { connectionId: w.connectionId });
    if (why) say(why); else draw();
  }
  addEventListener("beforeunload", () => { stopPublish(); stopWatch(); });

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
    const verified = !!prefs.hubKey;
    box.innerHTML = '<h3>Streams across my bridge</h3><p class="dim small">In my bridged call, streams cross between Fluxer and Discord for everyone who uses BelleCord. The video goes straight between you and Fluxer.</p>' +
      '<label class="keep"><input type="checkbox" id="bs-pub"' + (on("streamToFluxer") ? " checked" : "") + "> When I go live on Discord, show it on Fluxer too</label><br>" +
      '<label class="keep"><input type="checkbox" id="bs-watch"' + (on("watchFluxer") ? " checked" : "") + "> Offer Fluxer streams to watch while I'm on Discord</label>" +
      (verified ? "" : '<p class="dim small">This needs your Discord account proven once: set up your game badges (it sends you a code from Asuka).</p>') +
      (info ? '<p class="dim small" role="status">' + (info.inCall ? "You're in the bridged call" + (info.channel ? " (" + esc(info.channel) + ")" : "") + (info.canStream ? "." : ", but your bridge bot isn't in the Fluxer call yet.") : "You're not in the bridged call right now.") + "</p>" : "");
    box.querySelector("#bs-pub").onchange = async (e) => { await host.setPrefs?.({ streamToFluxer: e.target.checked }); await getPrefs(); if (!e.target.checked) stopPublish(); };
    box.querySelector("#bs-watch").onchange = async (e) => { await host.setPrefs?.({ watchFluxer: e.target.checked }); await getPrefs(); draw(); };
  }
  setInterval(() => { if (document.querySelector(".appcard") && !document.activeElement?.closest?.("#bscard")) card(); }, 4000);
})();
