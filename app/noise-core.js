// BelleCord's own noise suppression, inside the Fluxer and Discord pages (noise-page.cjs puts it there).
// Every microphone the page opens goes through DeepFilterNet 3 (a small speech model that runs on your own PC) before
// the page gets it. The page never knows: it just gets a cleaner mic.
// Why it doesn't crackle like Fluxer's: the filter runs in its own background thread, not in the audio thread, and
// a short buffer (20 ms, more if your PC gets busy, like while gaming) keeps the sound steady. Fluxer's own filter
// is switched off while this one is on, so they never stack.
// Levels: "max" takes out everything that isn't voice, "balanced" leaves a little room (more natural), "off".
// If anything goes wrong, the page gets your normal mic. A call is never broken by this.
(function () {
  "use strict";
  if (window.__bcNoise) return;
  const host = window.__bcNoiseHost;
  const md = navigator.mediaDevices;
  if (!host || !md || !md.getUserMedia || !window.AudioWorkletNode) return;
  window.__bcNoise = 1;

  const ATTEN = { max: 100, balanced: 24 }; // how far noise is turned down, in dB
  let level = "max";
  const live = new Set(); // { worker, node, setLevel, stop }
  // (how it's going, for the dashboard: how many mics are being cleaned right now, and the last thing that went wrong)
  const state = { running: 0, worked: 0, problem: "" };
  window.__bcNoiseState = () => ({ running: live.size, worked: state.worked, problem: state.problem, level });

  // ---------------------------------------------------------------- the audio thread: keeps the sound steady
  // It only collects 10 ms of mic at a time for the background thread and plays back what comes back.
  const WORKLET = `
class BcNoise extends AudioWorkletProcessor {
  constructor() {
    super();
    this.f = 480; this.buf = new Float32Array(480); this.n = 0;
    this.q = []; this.qi = 0; this.have = 0; this.ready = false; this.on = true;
    this.target = 960; this.primed = false; this.lastOut = 0; this.underruns = 0;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.port) { this.w = d.port; this.w.onmessage = (m) => this.got(m.data); }
      if (d.on != null) this.on = !!d.on;
    };
  }
  got(d) {
    if (d && d.ready) { this.ready = true; return; }
    if (d instanceof Float32Array) {
      this.q.push(d); this.have += d.length;
      // (it never runs further behind than it has to: if a hiccup let sound pile up, the oldest goes, so your voice
      //  doesn't stay delayed for the rest of the call)
      if (this.have > this.target + 1440) while (this.have > this.target + 480 && this.q.length > 1) { const x = this.q.shift(); this.have -= x.length - this.qi; this.qi = 0; }
    }
  }
  process(inputs, outputs) {
    const x = inputs[0] && inputs[0][0], y = outputs[0] && outputs[0][0];
    if (!y) return true;
    if (!x) { y.fill(0); return true; }
    if (!this.on || !this.ready || !this.w) { y.set(x); return true; }
    for (let i = 0; i < x.length; i++) {
      this.buf[this.n++] = x[i];
      if (this.n === this.f) { this.w.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(this.f); this.n = 0; }
    }
    if (!this.primed) { if (this.have >= this.target) this.primed = true; else { y.fill(0); return true; } }
    let o = 0;
    while (o < y.length && this.q.length) {
      const c = this.q[0], take = Math.min(c.length - this.qi, y.length - o);
      y.set(c.subarray(this.qi, this.qi + take), o);
      o += take; this.qi += take; this.have -= take;
      if (this.qi >= c.length) { this.q.shift(); this.qi = 0; }
    }
    if (o < y.length) {
      // the background thread fell behind (the PC got busy): fade out instead of a click, and keep a bigger buffer
      // from now on (up to 60 ms)
      const last = o ? y[o - 1] : this.lastOut;
      for (let i = o, k = 0; i < y.length; i++, k++) y[i] = last * Math.max(0, 1 - k / 32);
      this.primed = false;
      if (++this.underruns > 2 && this.target < 2880) { this.target += 480; this.underruns = 0; }
    }
    this.lastOut = y[y.length - 1];
    return true;
  }
}
registerProcessor("bc-noise", BcNoise);`;

  // ---------------------------------------------------------------- the background thread: DeepFilterNet
  const WORKER = `
let df = null, state = 0, port = null;
async function load(module, model) {
  let w = null, f32 = null, u8 = null;
  const F32 = () => (f32 && f32.buffer === w.memory.buffer ? f32 : (f32 = new Float32Array(w.memory.buffer)));
  const U8 = () => (u8 && u8.buffer === w.memory.buffer ? u8 : (u8 = new Uint8Array(w.memory.buffer)));
  const imp = {};
  for (const i of WebAssembly.Module.imports(module)) {
    const n = i.name;
    let fn;
    if (n.startsWith("__wbg_new_from_slice")) fn = (p, l) => F32().slice(p >>> 2, (p >>> 2) + l);
    else if (n.startsWith("__wbg_getRandomValues")) fn = (p, l) => { crypto.getRandomValues(U8().subarray(p, p + l)); };
    else if (n.indexOf("wbindgen_throw") >= 0) fn = (p, l) => { throw new Error(new TextDecoder().decode(U8().slice(p, p + l))); };
    else if (n === "__wbindgen_init_externref_table") fn = () => { const t = w.__wbindgen_externrefs; const o = t.grow(4); t.set(0, undefined); t.set(o, undefined); t.set(o + 1, null); t.set(o + 2, true); t.set(o + 3, false); };
    else fn = () => { throw new Error("missing " + n); };
    (imp[i.module] = imp[i.module] || {})[n] = fn;
  }
  w = (await WebAssembly.instantiate(module, imp)).exports;
  w.__wbindgen_start();
  const malloc = w.__wbindgen_malloc_command_export;
  return {
    create(m, db) { const p = malloc(m.length, 1); U8().set(m, p); return w.df_create(p, m.length, db); },
    process(s, x) { const p = malloc(x.length * 4, 4); F32().set(x, p >>> 2); return w.df_process_frame(s, p, x.length); },
    atten(s, db) { w.df_set_atten_lim(s, db); },
  };
}
onmessage = async (e) => {
  const d = e.data || {};
  if (d.start) {
    try {
      df = await load(d.module, new Uint8Array(d.model));
      state = df.create(new Uint8Array(d.model), d.atten);
      port = d.port;
      port.onmessage = (m) => {
        const x = m.data;
        if (!(x instanceof Float32Array)) return;
        let y;
        try { y = df.process(state, x); } catch (err) { y = x; }
        for (let i = 0; i < y.length; i++) if (!(y[i] === y[i])) y[i] = 0; // (never let a broken number through)
        port.postMessage(y, [y.buffer]);
      };
      port.postMessage({ ready: true });
      postMessage({ ready: true });
    } catch (err) { postMessage({ failed: String(err && err.message || err) }); }
  }
  if (d.atten != null && df && state && !d.start) df.atten(state, d.atten);
};`;

  // ---------------------------------------------------------------- loading (once per page)
  let assets = null, ctx = null, added = null;
  const url = (code, type) => URL.createObjectURL(new Blob([code], { type }));
  const workletUrl = url(WORKLET, "text/javascript"), workerUrl = url(WORKER, "text/javascript");
  async function getAssets() {
    if (!assets) assets = (async () => {
      const a = await host.assets();
      return { module: await WebAssembly.compile(a.wasm), model: a.model };
    })();
    try { return await assets; } catch (e) { assets = null; throw e; }
  }
  async function getCtx() {
    if (!ctx || ctx.state === "closed") { ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" }); added = null; }
    if (!added) added = ctx.audioWorklet.addModule(workletUrl);
    await added;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  async function clean(real) {
    const [a, c] = await Promise.all([getAssets(), getCtx()]);
    // (sound that isn't allowed to play yet would make the mic silent: then the normal mic is used instead)
    if (c.state !== "running") { await Promise.race([c.resume().catch(() => {}), new Promise((r) => setTimeout(r, 800))]); if (c.state !== "running") throw new Error("audio isn't running yet"); }
    const src = c.createMediaStreamSource(new MediaStream([real]));
    const node = new AudioWorkletNode(c, "bc-noise", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: "explicit" });
    const dest = c.createMediaStreamDestination();
    dest.channelCount = 1;
    src.connect(node).connect(dest);
    const worker = new Worker(workerUrl);
    const ch = new MessageChannel();
    node.port.postMessage({ port: ch.port1 }, [ch.port1]);
    const started = new Promise((ok, no) => {
      worker.onmessage = (e) => { if (e.data && e.data.ready) ok(); if (e.data && e.data.failed) no(new Error(e.data.failed)); };
      setTimeout(() => no(new Error("the filter took too long to start")), 15000);
    });
    worker.postMessage({ start: true, module: a.module, model: a.model, atten: ATTEN[level] || 100, port: ch.port2 }, [ch.port2]);
    const out = dest.stream.getAudioTracks()[0];
    let stopped = false;
    const me = {
      setLevel(l) { if (l === "off") node.port.postMessage({ on: false }); else { node.port.postMessage({ on: true }); worker.postMessage({ atten: ATTEN[l] || 100 }); } },
      stop() {
        if (stopped) return; stopped = true; live.delete(me);
        try { real.stop(); } catch (e) {}
        try { src.disconnect(); node.disconnect(); } catch (e) {}
        try { worker.terminate(); } catch (e) {}
      },
    };
    live.add(me);
    started.then(() => { state.worked++; state.problem = ""; }, (e) => { node.port.postMessage({ on: false }); state.problem = String(e && e.message || e); }); // (it couldn't start: your normal mic, as it is)
    // the page sees the cleaned track as if it were the mic itself
    const realStop = out.stop.bind(out);
    out.stop = function () { realStop(); me.stop(); };
    out.getSettings = function () { return Object.assign({}, real.getSettings(), { noiseSuppression: false }); };
    out.getConstraints = function () { return real.getConstraints(); };
    out.getCapabilities = function () { return real.getCapabilities ? real.getCapabilities() : {}; };
    out.applyConstraints = function (k) { return real.applyConstraints(k); };
    try { Object.defineProperty(out, "label", { get: () => real.label }); } catch (e) {}
    real.addEventListener("ended", () => { try { out.dispatchEvent(new Event("ended")); } catch (e) {} me.stop(); });
    return out;
  }

  // ---------------------------------------------------------------- the page's mic
  const real = md.getUserMedia.bind(md);
  md.getUserMedia = async function (c) {
    if (!c || !c.audio) return real(c);
    try { level = (await host.level()) || level; } catch (e) {}
    if (level === "off") return real(c);
    const audio = Object.assign({}, typeof c.audio === "object" ? c.audio : {}, { noiseSuppression: false, channelCount: 1 });
    const stream = await real(Object.assign({}, c, { audio }));
    const mic = stream.getAudioTracks()[0];
    if (!mic) return stream;
    try {
      const out = await clean(mic);
      const s = new MediaStream([out, ...stream.getVideoTracks()]);
      return s;
    } catch (e) {
      state.problem = String(e && e.message || e);
      try { console.warn("[BelleCord] Noise suppression couldn't start, using your normal mic:", e && e.message); } catch (x) {}
      return stream;
    }
  };
  // the dashboard changed the level: every mic that's open switches right away
  window.__bcNoiseSet = function (l) { level = l; live.forEach((x) => x.setLevel(l)); return live.size; };
})();
