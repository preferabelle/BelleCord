// Themes: one look for Fluxer, Discord and this app.
// A theme is a stack of pieces (colors, background, corners, font, text size, spacing, effects). Picking a piece or
// a template puts it on top of what you already have; anything you didn't pick stays as it was. The bottom of the
// stack is Fluxer's own theme (whatever you set up in Fluxer), which is carried over to Discord.
// Fluxer is styled through its own theme settings and data-flx hooks (from Fluxer's open-source code); Discord
// through its design-system color settings (the ones Discord's own themes use).
(function () {
  "use strict";

  // ---------------- color sets ----------------
  // frame: server list / darkest · panel: channel list, member list · chat: the chat · raised: cards, hover rows
  // input: the message box · floating: menus · line: dividers · text/strong/muted/faint · accent (+ text on it) · link
  const P = (name, dark, c) => ({ name, dark, ...c });
  const PALETTES = {
    fluxer: { name: "Fluxer's own", own: true },
    discord: P("Discord", true, { frame: "#1e1f22", panel: "#2b2d31", chat: "#313338", raised: "#383a40", input: "#383a40", floating: "#111214", hover: "rgba(78,80,88,.30)", selected: "rgba(78,80,88,.60)", line: "#3f4147", text: "#dbdee1", strong: "#f2f3f5", muted: "#949ba4", faint: "#6d6f78", accent: "#5865f2", onAccent: "#ffffff", link: "#00a8fc" }),
    midnight: P("Midnight ink", true, { frame: "#07090d", panel: "#0d1117", chat: "#11161f", raised: "#19202b", input: "#161c26", floating: "#05070a", hover: "rgba(120,160,255,.06)", selected: "rgba(120,160,255,.13)", line: "#1f2733", text: "#c9d4e5", strong: "#eef3fb", muted: "#7d8aa0", faint: "#4f5a6c", accent: "#5ec8ff", onAccent: "#04121c", link: "#7fd4ff" }),
    sakura: P("Sakura", true, { frame: "#24161d", panel: "#2e1c25", chat: "#33212a", raised: "#3f2833", input: "#3d2631", floating: "#1c1117", hover: "rgba(255,170,205,.07)", selected: "rgba(255,170,205,.16)", line: "#4a3040", text: "#f3dce6", strong: "#fff3f8", muted: "#c294a9", faint: "#8c6676", accent: "#ff8fb8", onAccent: "#2b0f1b", link: "#ffb3d0" }),
    forest: P("Forest cabin", true, { frame: "#111a14", panel: "#17231b", chat: "#1b2a20", raised: "#24362a", input: "#213226", floating: "#0c130e", hover: "rgba(170,220,160,.06)", selected: "rgba(170,220,160,.13)", line: "#2b3f30", text: "#d6e4d3", strong: "#f1f7ee", muted: "#8fa58e", faint: "#5f735f", accent: "#d9a05b", onAccent: "#1b1206", link: "#e8b878" }),
    ocean: P("Deep ocean", true, { frame: "#06141f", panel: "#0a1d2b", chat: "#0d2434", raised: "#123045", input: "#102b3e", floating: "#041019", hover: "rgba(90,200,220,.07)", selected: "rgba(90,200,220,.16)", line: "#173a52", text: "#cfe8f2", strong: "#effafe", muted: "#7fa7b8", faint: "#4f7486", accent: "#2ed3c6", onAccent: "#032623", link: "#6fe3d9" }),
    neon: P("Neon arcade", true, { frame: "#07040c", panel: "#0e0817", chat: "#120a1e", raised: "#1d1030", input: "#1a0e2b", floating: "#050208", hover: "rgba(255,60,200,.08)", selected: "rgba(0,240,255,.13)", line: "#2c1748", text: "#e6dcff", strong: "#ffffff", muted: "#9a86c4", faint: "#5f4d85", accent: "#ff3cc8", onAccent: "#1a0016", link: "#00f0ff" }),
    terminal: P("Terminal", true, { frame: "#000000", panel: "#040704", chat: "#060a06", raised: "#0d160d", input: "#0a120a", floating: "#000000", hover: "rgba(51,255,102,.06)", selected: "rgba(51,255,102,.14)", line: "#123012", text: "#33ff66", strong: "#a6ffbf", muted: "#1fa847", faint: "#137a32", accent: "#33ff66", onAccent: "#001a08", link: "#66ffcc" }),
    paper: P("Paper", false, { frame: "#e7e0d1", panel: "#f2ece0", chat: "#faf7f0", raised: "#ebe4d5", input: "#efe8da", floating: "#ffffff", hover: "rgba(60,40,20,.06)", selected: "rgba(196,85,45,.13)", line: "#dbd1bf", text: "#2b2b2b", strong: "#111111", muted: "#6b6359", faint: "#9a9185", accent: "#c4552d", onAccent: "#ffffff", link: "#a8431f" }),
    candy: P("Candy pop", false, { frame: "#ece0ff", panel: "#f6eeff", chat: "#fffaff", raised: "#f0e5ff", input: "#f3eaff", floating: "#ffffff", hover: "rgba(150,90,220,.08)", selected: "rgba(255,111,165,.17)", line: "#e2d3fa", text: "#3d2b56", strong: "#24163a", muted: "#8a74a8", faint: "#b3a3c9", accent: "#ff6fa5", onAccent: "#ffffff", link: "#7a5cff" }),
    ember: P("Ember", true, { frame: "#120c0a", panel: "#1a1210", chat: "#1f1512", raised: "#2b1d18", input: "#281b16", floating: "#0c0807", hover: "rgba(255,140,60,.07)", selected: "rgba(255,110,40,.16)", line: "#3a2620", text: "#f1ddd2", strong: "#fff4ec", muted: "#b38b78", faint: "#7c5d50", accent: "#ff7a2f", onAccent: "#1f0b02", link: "#ffad66" }),
    royal: P("Royal velvet", true, { frame: "#120b1d", panel: "#1a1029", chat: "#1f1330", raised: "#2a1b40", input: "#261839", floating: "#0c0714", hover: "rgba(212,175,55,.07)", selected: "rgba(212,175,55,.16)", line: "#36234f", text: "#e8dcf5", strong: "#fbf5ff", muted: "#a993c4", faint: "#6f5c8a", accent: "#d4af37", onAccent: "#1a1205", link: "#e9cd6f" }),
    aurora: P("Aurora", true, { frame: "#0a0f1e", panel: "#0f1629", chat: "#121a30", raised: "#1a2440", input: "#18213a", floating: "#070b16", hover: "rgba(140,255,220,.07)", selected: "rgba(140,200,255,.15)", line: "#23304f", text: "#dfe8ff", strong: "#ffffff", muted: "#93a3c8", faint: "#5d6b8f", accent: "#7cf5c8", onAccent: "#04201a", link: "#9ad9ff" }),
    mono: P("Mono", true, { frame: "#0e0e0e", panel: "#151515", chat: "#1a1a1a", raised: "#242424", input: "#202020", floating: "#0a0a0a", hover: "rgba(255,255,255,.05)", selected: "rgba(255,255,255,.11)", line: "#2a2a2a", text: "#d9d9d9", strong: "#ffffff", muted: "#8c8c8c", faint: "#5c5c5c", accent: "#f2f2f2", onAccent: "#000000", link: "#cfcfcf" }),
    crimson: P("Crimson", true, { frame: "#140608", panel: "#1c0a0d", chat: "#230d11", raised: "#331419", input: "#2c1015", floating: "#0d0405", hover: "rgba(255,60,75,.08)", selected: "rgba(255,45,60,.2)", line: "#41181f", text: "#f3dcde", strong: "#fff1f2", muted: "#c48b92", faint: "#87545b", accent: "#e8303f", onAccent: "#ffffff", link: "#ff7a87" }),
    slate: P("Slate", true, { frame: "#0f141a", panel: "#151b23", chat: "#1a222c", raised: "#232d3a", input: "#1f2833", floating: "#0a0e12", hover: "rgba(110,168,254,.07)", selected: "rgba(110,168,254,.15)", line: "#2a3643", text: "#cdd6e3", strong: "#f0f4fa", muted: "#8595a8", faint: "#566273", accent: "#6ea8fe", onAccent: "#04101f", link: "#8fc0ff" }),
    dracula: P("Dracula", true, { frame: "#1e1f29", panel: "#242530", chat: "#282a36", raised: "#343746", input: "#2f313d", floating: "#15161e", hover: "rgba(189,147,249,.08)", selected: "rgba(189,147,249,.18)", line: "#3b3d4e", text: "#e4e4ef", strong: "#f8f8f2", muted: "#8b8fa8", faint: "#5b5f78", accent: "#bd93f9", onAccent: "#1a1326", link: "#8be9fd" }),
    coffee: P("Coffee", true, { frame: "#140f0b", panel: "#1c1510", chat: "#231a13", raised: "#30241a", input: "#2b2017", floating: "#0d0907", hover: "rgba(200,145,90,.07)", selected: "rgba(200,145,90,.16)", line: "#3b2c20", text: "#ecdcc9", strong: "#fbf0e2", muted: "#b39a82", faint: "#7c6450", accent: "#c8915a", onAccent: "#1f1206", link: "#e0b07a" }),
    sunset: P("Sunset", true, { frame: "#1a0f16", panel: "#231320", chat: "#2a1827", raised: "#3a2236", input: "#341d30", floating: "#120a10", hover: "rgba(255,126,107,.08)", selected: "rgba(255,126,107,.17)", line: "#45283f", text: "#f3d9e6", strong: "#fff0f6", muted: "#c08fa6", faint: "#85607a", accent: "#ff7e6b", onAccent: "#2a0b0a", link: "#ffb37a" }),
    lavender: P("Lavender", true, { frame: "#14121f", panel: "#1b1829", chat: "#201d31", raised: "#2b2742", input: "#272239", floating: "#0d0b14", hover: "rgba(179,157,255,.07)", selected: "rgba(179,157,255,.16)", line: "#38324f", text: "#e3ddf2", strong: "#f7f3ff", muted: "#a195c2", faint: "#6a5f88", accent: "#b39dff", onAccent: "#130a2a", link: "#c7b3ff" }),
    matcha: P("Matcha", false, { frame: "#dde7d4", panel: "#e9f0e2", chat: "#f4f8ef", raised: "#e2ebd8", input: "#e6eedd", floating: "#ffffff", hover: "rgba(60,110,40,.07)", selected: "rgba(90,158,75,.17)", line: "#cfdcc2", text: "#2d3a28", strong: "#16210f", muted: "#5f7054", faint: "#8ea384", accent: "#5a9e4b", onAccent: "#ffffff", link: "#3f8a3a" }),
    rosegold: P("Rose gold", false, { frame: "#f3e3e0", panel: "#faeeec", chat: "#fff8f6", raised: "#f4e4e1", input: "#f7e9e6", floating: "#ffffff", hover: "rgba(190,90,70,.07)", selected: "rgba(217,138,122,.18)", line: "#ecd4cf", text: "#4a3230", strong: "#2f1d1b", muted: "#a07f7a", faint: "#c7a9a4", accent: "#d98a7a", onAccent: "#ffffff", link: "#c06a58" }),
    arctic: P("Arctic", false, { frame: "#dce6f0", panel: "#e9f1f8", chat: "#f5f9fd", raised: "#e1ebf4", input: "#e6eff7", floating: "#ffffff", hover: "rgba(47,143,208,.07)", selected: "rgba(47,143,208,.16)", line: "#cdddea", text: "#243442", strong: "#0f1e2b", muted: "#5e7384", faint: "#92a7b7", accent: "#2f8fd0", onAccent: "#ffffff", link: "#1f78b8" }),
  };

  // ---------------- Update 12: the theme pack (games, anime, Soulbound, moods) ----------------
  // These are made from just a few colors each (the background, the accent, a second color, the text); the rest
  // (the darker frame, lighter cards, lines, dimmer text) is worked out from those, so they all hang together.
  const hx = (h) => { h = String(h).replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const blend = (a, b, p) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * p)); };
  const rgba = (h, a) => { const c = hx(h); return "rgba(" + c.join(",") + "," + a + ")"; };
  // (each one's whole look leans into its own colors: the panels take a little of the accent, the server list a
  // little of the second color, so two dark themes never look like the same gray)
  const MK = (name, dark, bg, accent, link, text) => (dark
    ? P(name, true, { frame: blend(blend(bg, "#000000", 0.42), link, 0.05), panel: blend(blend(bg, "#000000", 0.2), accent, 0.04), chat: bg, raised: blend(blend(bg, "#ffffff", 0.06), accent, 0.1), input: blend(blend(bg, "#ffffff", 0.04), accent, 0.06), floating: blend(bg, "#000000", 0.55), hover: rgba(accent, 0.1), selected: rgba(accent, 0.24), line: blend(blend(bg, "#ffffff", 0.1), accent, 0.12), text: blend(text, accent, 0.06), strong: blend(text, "#ffffff", 0.65), muted: blend(text, bg, 0.42), faint: blend(text, bg, 0.64), accent, onAccent: readable(accent), link })
    : P(name, false, { frame: blend(blend(bg, "#000000", 0.08), accent, 0.08), panel: blend(blend(bg, "#000000", 0.04), accent, 0.05), chat: bg, raised: blend(blend(bg, "#000000", 0.05), accent, 0.06), input: blend(bg, "#000000", 0.04), floating: "#ffffff", hover: rgba(accent, 0.1), selected: rgba(accent, 0.2), line: blend(blend(bg, "#000000", 0.1), accent, 0.12), text, strong: blend(text, "#000000", 0.5), muted: blend(text, bg, 0.4), faint: blend(text, bg, 0.62), accent, onAccent: readable(accent), link }));
  Object.assign(PALETTES, {
    // games
    osu: MK("osu!", true, "#2b1a30", "#ff66aa", "#66ccff", "#f3e6ee"),
    overworld: MK("Overworld", true, "#22331a", "#7bc043", "#e0c068", "#e6eedd"),
    payload: MK("Payload", true, "#14233d", "#f99e1a", "#4fc1e9", "#e6edf5"),
    trainer: MK("Pocket trainer", true, "#301318", "#ee1515", "#ffcb05", "#f2e9e9"),
    bit8: MK("8-bit", true, "#1d1a40", "#ff004d", "#29adff", "#fff1e8"),
    // anime
    abyss: MK("The Abyss", true, "#0c223c", "#e8b04b", "#7fd1d9", "#e3ecf2"),
    walls: MK("Beyond the walls", true, "#2b2a1c", "#c8a46e", "#6f9fd8", "#e4e2d6"),
    hunter: MK("Hunter green", true, "#0c2c1b", "#3ddc84", "#f2c14e", "#e2efe7"),
    madness: MK("Madness moon", true, "#200a10", "#e0262f", "#f2d03b", "#efe6e6"),
    breath: MK("Breath of flame", true, "#0c2a1f", "#e2583e", "#3fae7a", "#ece6dc"),
    notebook: MK("Death's notebook", true, "#111111", "#c41e3a", "#d9d9d9", "#e2dfdf"),
    lustrous: MK("Gem shore", true, "#08302f", "#7ef0d0", "#f6e27f", "#e0f5f1"),
    labmem: MK("Lab member", true, "#1c1309", "#ff8a1f", "#7ed957", "#d9e0d0"),
    hollow: MK("Hollow night", true, "#161c1b", "#3fd4a4", "#e9ecef", "#e7ece9"),
    reborn: MK("Reincarnation", false, "#f5ecd7", "#b5523b", "#2f6f8f", "#3b2f22"),
    devil: MK("Devil hunter", true, "#27100a", "#ff5a1f", "#ffd23f", "#efe2da"),
    elements: MK("Four elements", true, "#0f2737", "#4fb3d9", "#f08a3c", "#e8eef2"),
    // Soulbound
    anima: MK("Anima", true, "#16143a", "#9f8cff", "#7ff0ff", "#e4e6f5"),
    lion: MK("Lion of Gold", true, "#251a08", "#f2c14e", "#ffde85", "#f1e8d4"),
    olin: MK("Olin's flame", true, "#2b0f06", "#ff6b2b", "#8fd0ff", "#f4e2d8"),
    ray: MK("Ray", true, "#121d3a", "#fff3b0", "#9fd8ff", "#e9eef7"),
    nullking: MK("The Null King", true, "#110723", "#a64dff", "#6a6af5", "#ddd3ea"),
    umbra: MK("Umbra", true, "#24060c", "#b3122e", "#e05f7a", "#ead7da"),
    glassroots: MK("Glass roots", true, "#0b2619", "#7fe0a0", "#b8f2e6", "#dfeee5"),
    soulforge: MK("Soul Forge", true, "#2e1406", "#ff9a3c", "#ffd27f", "#f2e3d6"),
    threemarks: MK("Three marks", true, "#1d181a", "#e8e3da", "#c43b3b", "#e6e1e3"),
    // moods
    vaporwave: MK("Vaporwave", true, "#26114d", "#ff71ce", "#01cdfe", "#f0e6ff"),
    gothic: MK("Gothic", true, "#1d0a15", "#a3224a", "#c9a0dc", "#e6dde6"),
    nebula: MK("Nebula", true, "#130c33", "#c77dff", "#64dfdf", "#e8e4ff"),
    cyber: MK("Cyber rain", true, "#041821", "#00f5d4", "#f15bb5", "#d6f6ff"),
    lofi: MK("Lo-fi night", true, "#2a2138", "#f4a6a6", "#a6c8f4", "#ece3ea"),
    spooky: MK("Spooky", true, "#22122a", "#ff7a1a", "#9d7cff", "#efe5f2"),
    winter: MK("Winter night", true, "#11223d", "#cfe3ff", "#ff5c5c", "#e6eef9"),
    cottage: MK("Cottage", false, "#f4efe4", "#6f9452", "#c0705a", "#3a3329"),
    y2k: MK("Y2K chrome", false, "#eef1f8", "#7b6cff", "#ff5fa2", "#2a2d3a"),
    strawberry: MK("Strawberry milk", false, "#fff0f4", "#ff6f9f", "#c9507f", "#4a2b36"),
  });
  // which group each color set belongs to (the Colors tab shows them by group)
  const PALETTE_GROUP = { osu: "games", overworld: "games", payload: "games", trainer: "games", bit8: "games", abyss: "anime", walls: "anime", hunter: "anime", madness: "anime", breath: "anime", notebook: "anime", lustrous: "anime", labmem: "anime", hollow: "anime", reborn: "anime", devil: "anime", elements: "anime", anima: "soulbound", lion: "soulbound", olin: "soulbound", ray: "soulbound", nullking: "soulbound", umbra: "soulbound", glassroots: "soulbound", soulforge: "soulbound", threemarks: "soulbound", vaporwave: "moods", gothic: "moods", nebula: "moods", cyber: "moods", lofi: "moods", spooky: "moods", winter: "moods", cottage: "moods", y2k: "moods", strawberry: "moods" };

  // ---------------- backgrounds (drawn behind the chat; behind everything with the Glass effect) ----------------
  // Rain: drops at three depths. Far drops are small, dim and slow; near drops are long, bright and fast. Every drop
  // has a tile of its own (no two the same size, so the drops never line up in rows), and every loop slides each
  // tile straight down by a whole number of tiles, so the rain never jumps when the loop starts over.
  const RAIN = (() => {
    const depths = [
      { fall: 400, r: [0.7, 8], s: 34, drops: [[113, 197, 31, 22], [149, 131, 72, 61], [181, 101, 14, 77], [223, 163, 55, 40], [89, 233, 83, 9]] },
      { fall: 800, r: [1, 13], s: 46, drops: [[137, 271, 18, 64], [167, 211, 66, 27], [199, 307, 41, 83], [241, 239, 89, 46], [103, 359, 7, 15]] },
      { fall: 1400, r: [1.4, 21], s: 60, drops: [[271, 383, 24, 33], [211, 457, 71, 70], [157, 419, 52, 8], [317, 347, 88, 56]] },
    ];
    const drops = [];
    depths.forEach((d) => d.drops.forEach(([w, h, x, y]) => drops.push({ w, h, x, y, r: d.r, s: d.s, to: h * Math.max(1, Math.round(d.fall / h)) })));
    return {
      name: "Rain",
      css: (t) => {
        const c = (p) => "color-mix(in srgb,color-mix(in srgb," + (t.link || t.accent || "#8fc0ff") + " 40%," + (t.strong || "#ffffff") + ") " + Math.round(p) + "%,transparent)";
        return drops.map((d) => "radial-gradient(" + d.r[0] + "px " + d.r[1] + "px at " + d.x + "% " + d.y + "%," + c(d.s) + "," + c(d.s * 0.45) + " 55%,transparent)").join(",") +
          ",linear-gradient(180deg," + c(5) + ",transparent 40%,transparent 65%," + mix(t.accent || "#8fc0ff", 8) + ")";
      },
      size: drops.map((d) => d.w + "px " + d.h + "px").join(",") + ",100% 100%",
      moving: true,
      anim: "bcRain 2.2s linear infinite",
      keyframes: "@keyframes bcRain{from{background-position:" + drops.map(() => "0 0").join(",") + ",0 0}to{background-position:" + drops.map((d) => "0 " + d.to + "px").join(",") + ",0 0}}",
    };
  })();
  const BACKGROUNDS = {
    none: { name: "None", css: () => "" },
    wallpaper: { name: "Your skin's wallpaper", css: (t, x) => (x.wall ? 'url("' + x.wall + '") center/cover no-repeat' : "") },
    stars: { name: "Stars", css: (t) => "radial-gradient(1.5px 1.5px at 12% 22%,#fff9,transparent 60%),radial-gradient(1px 1px at 68% 8%,#fff8,transparent 60%),radial-gradient(1.2px 1.2px at 38% 64%,#fffa,transparent 60%),radial-gradient(1px 1px at 84% 52%,#fff7,transparent 60%),radial-gradient(1.6px 1.6px at 55% 88%,#fff9,transparent 60%),radial-gradient(1px 1px at 22% 80%,#fff6,transparent 60%),radial-gradient(ellipse at 70% 0%," + mix(t.accent, 18) + ",transparent 55%) 0 0/100% 100%" },
    petals: { name: "Petals", css: (t) => "radial-gradient(ellipse 9px 5px at 20% 30%," + mix(t.accent, 34) + ",transparent 70%),radial-gradient(ellipse 6px 9px at 70% 18%," + mix(t.accent, 26) + ",transparent 70%),radial-gradient(ellipse 8px 4px at 55% 70%," + mix(t.link, 30) + ",transparent 70%),radial-gradient(ellipse 5px 8px at 12% 82%," + mix(t.accent, 22) + ",transparent 70%),radial-gradient(ellipse 7px 5px at 88% 60%," + mix(t.link, 24) + ",transparent 70%)" , size: "260px 260px" },
    leaves: { name: "Leaves", css: (t) => "radial-gradient(ellipse 14px 6px at 18% 24%," + mix("#7fb069", 22) + ",transparent 70%),radial-gradient(ellipse 6px 14px at 64% 40%," + mix("#5c8a4a", 22) + ",transparent 70%),radial-gradient(ellipse 12px 5px at 40% 78%," + mix(t.accent, 18) + ",transparent 70%),radial-gradient(ellipse 5px 12px at 86% 84%," + mix("#7fb069", 18) + ",transparent 70%)", size: "300px 300px" },
    waves: { name: "Waves", css: (t) => "repeating-radial-gradient(circle at 50% 120%," + mix(t.accent, 0) + " 0 26px," + mix(t.accent, 9) + " 27px 28px," + mix(t.accent, 0) + " 29px 54px),linear-gradient(180deg,transparent," + mix(t.accent, 10) + ")" },
    grid: { name: "Synth grid", css: (t) => "linear-gradient(180deg,transparent 0 55%," + mix(t.accent, 22) + " 100%),repeating-linear-gradient(90deg," + mix(t.link, 16) + " 0 1px,transparent 1px 48px),repeating-linear-gradient(0deg," + mix(t.accent, 16) + " 0 1px,transparent 1px 48px)" },
    dots: { name: "Confetti", css: (t) => "radial-gradient(circle at 15% 25%," + mix(t.accent, 40) + " 0 3px,transparent 4px),radial-gradient(circle at 65% 15%," + mix(t.link, 40) + " 0 2.5px,transparent 3.5px),radial-gradient(circle at 40% 60%,#ffd16655 0 3px,transparent 4px),radial-gradient(circle at 85% 70%," + mix(t.accent, 34) + " 0 2px,transparent 3px),radial-gradient(circle at 25% 85%,#7ee8c855 0 2.5px,transparent 3.5px)", size: "180px 180px" },
    embers: { name: "Embers", css: (t) => "radial-gradient(ellipse 120% 60% at 50% 110%," + mix(t.accent, 30) + ",transparent 60%),radial-gradient(2px 2px at 20% 70%,#ffb36688,transparent 70%),radial-gradient(1.5px 1.5px at 70% 40%,#ff8a3d77,transparent 70%),radial-gradient(2px 2px at 45% 85%,#ffd27f77,transparent 70%),radial-gradient(1.5px 1.5px at 85% 75%,#ff7a2f88,transparent 70%)" },
    damask: { name: "Damask", css: (t) => "repeating-conic-gradient(from 45deg at 50% 50%," + mix(t.accent, 7) + " 0 25%,transparent 0 50%),radial-gradient(circle at 50% 50%," + mix(t.accent, 10) + " 0 6px,transparent 7px)", size: "56px 56px" },
    aurora: { name: "Aurora", css: () => "linear-gradient(125deg,#0b1d3a,#11506b,#2b6b5f,#5b3f8c,#8a2f6b,#0b1d3a)", size: "400% 400%", moving: true },
    bokeh: { name: "Bokeh", css: (t) => "radial-gradient(22px 22px at 18% 28%," + mix(t.accent, 22) + ",transparent 70%),radial-gradient(34px 34px at 72% 20%," + mix(t.link, 16) + ",transparent 70%),radial-gradient(16px 16px at 40% 66%," + mix(t.accent, 26) + ",transparent 70%),radial-gradient(44px 44px at 86% 74%," + mix(t.link, 14) + ",transparent 70%),radial-gradient(14px 14px at 26% 86%," + mix(t.accent, 20) + ",transparent 70%)", size: "320px 320px" },
    honeycomb: { name: "Honeycomb", css: (t) => "radial-gradient(circle at 50% 0," + mix(t.accent, 10) + " 0 9px,transparent 10px),radial-gradient(circle at 0 50%," + mix(t.accent, 10) + " 0 9px,transparent 10px),radial-gradient(circle at 100% 50%," + mix(t.accent, 10) + " 0 9px,transparent 10px),radial-gradient(circle at 50% 100%," + mix(t.accent, 10) + " 0 9px,transparent 10px)", size: "48px 48px" },
    rain: RAIN,
    mesh: { name: "Mesh", css: (t) => "radial-gradient(40% 50% at 18% 22%," + mix(t.accent, 26) + ",transparent 70%),radial-gradient(45% 55% at 82% 28%," + mix(t.link, 22) + ",transparent 70%),radial-gradient(50% 55% at 30% 82%," + mix(t.link, 18) + ",transparent 70%),radial-gradient(45% 50% at 78% 80%," + mix(t.accent, 22) + ",transparent 70%)", size: "240% 240%", moving: true },
  };
  const mix = (c, pct) => "color-mix(in srgb," + c + " " + pct + "%,transparent)";

  // ---------------- Update 12: more backgrounds ----------------
  // (the drawn ones are little pictures made right here, in your theme's own colors)
  // osu! gameplay, drawn and timed like the real thing: hit circles fade in while their approach circles close in,
  // pop on the beat with a 300, a slider's ball rolls along it, and the cursor (with its trail) plays them all;
  // the score, combo and health bar go up as it goes. (One 7-second loop, moving on its own: SVG animation.)
  const OSU_PLAY = '<g opacity="0.45"><rect x="428" y="46" width="200" height="8" rx="4" fill="#ffffff" fill-opacity="0.15"/><rect x="428" y="46" height="8" rx="4" fill="%%A%%" width="160"><animate attributeName="width" dur="7.0s" repeatCount="indefinite" values="128;120;188;180;196;190;200;128" keyTimes="0.0000;0.1286;0.1429;0.3214;0.3429;0.6214;0.6429;1.0000"/></rect></g><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0000000<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="1;0" keyTimes="0;0.1357"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0000300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.1357;0.2214"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0000900<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.2214;0.4500"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0001800<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.4500;0.5357"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0003000<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.5357;0.6286"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0004500<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.6286;0.7214"/></text><text x="628" y="36" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#ffffff" fill-opacity="0.45" opacity="0">0006300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.7214;1.0000"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">0x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="1;0" keyTimes="0;0.1357"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">1x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.1357;0.2214"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">2x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.2214;0.4500"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">3x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.4500;0.5357"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">4x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.5357;0.6286"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">5x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.6286;0.7214"/></text><text x="626" y="468" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="24" fill="#ffffff" fill-opacity="0.45" opacity="0">6x<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;0.7214;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.2071;0.2500;0.4500;0.4857;1.0000"/><path d="M455 150 Q585 215 505 330" fill="none" stroke="#ffffff" stroke-width="66" stroke-linecap="round" stroke-opacity="0.9"/><path d="M455 150 Q585 215 505 330" fill="none" stroke="%%B%%" stroke-width="60" stroke-linecap="round" stroke-opacity="0.9"/><path d="M455 150 Q585 215 505 330" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="52" stroke-linecap="round"/><circle cx="505" cy="330" r="28" fill="none" stroke="#ffffff" stroke-width="3"/></g><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0.0000;0.3286;0.4500"/><g><animateMotion dur="7.0s" repeatCount="indefinite" path="M0 0 Q130 65 50 180" keyPoints="0;0;1;1" keyTimes="0.0000;0.3286;0.4500;1.0000" calcMode="linear"/><circle cx="455" cy="150" r="57" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.8"/><circle cx="455" cy="150" r="24" fill="%%B%%" stroke="#ffffff" stroke-width="4"/></g></g><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.0143;0.0571;0.1357;0.1614;1.0000"/><circle cx="150" cy="150" r="30" fill="%%A%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.1357;0.1614;1.0000"/></circle><text x="150" y="160" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">1</text></g><circle cx="150" cy="150" r="90" fill="none" stroke="%%A%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.0143;0.1357;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.0143;0.0500;0.1329;0.1357;1.0000"/></circle><text x="150" y="112" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.1357;0.1429;0.1929;0.2286;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="120;120;102;102" keyTimes="0.0000;0.1357;0.2286;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.1000;0.1429;0.2214;0.2471;1.0000"/><circle cx="305" cy="110" r="30" fill="%%A%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.2214;0.2471;1.0000"/></circle><text x="305" y="120" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">2</text></g><circle cx="305" cy="110" r="90" fill="none" stroke="%%A%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.1000;0.2214;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.1000;0.1357;0.2186;0.2214;1.0000"/></circle><text x="305" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.2214;0.2286;0.2786;0.3143;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="80;80;62;62" keyTimes="0.0000;0.2214;0.3143;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.2071;0.2500;0.3286;0.3543;1.0000"/><circle cx="455" cy="150" r="30" fill="%%B%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.3286;0.3543;1.0000"/></circle><text x="455" y="160" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">3</text></g><circle cx="455" cy="150" r="90" fill="none" stroke="%%B%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.2071;0.3286;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.2071;0.2429;0.3257;0.3286;1.0000"/></circle><text x="505" y="292" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.4500;0.4571;0.5071;0.5429;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="300;300;282;282" keyTimes="0.0000;0.4500;0.5429;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.4143;0.4571;0.5357;0.5614;1.0000"/><circle cx="330" cy="335" r="30" fill="%%A%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.5357;0.5614;1.0000"/></circle><text x="330" y="345" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">4</text></g><circle cx="330" cy="335" r="90" fill="none" stroke="%%A%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.4143;0.5357;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.4143;0.4500;0.5329;0.5357;1.0000"/></circle><text x="330" y="297" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.5357;0.5429;0.5929;0.6286;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="305;305;287;287" keyTimes="0.0000;0.5357;0.6286;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.5071;0.5500;0.6286;0.6543;1.0000"/><circle cx="170" cy="300" r="30" fill="%%A%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.6286;0.6543;1.0000"/></circle><text x="170" y="310" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">5</text></g><circle cx="170" cy="300" r="90" fill="none" stroke="%%A%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.5071;0.6286;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.5071;0.5429;0.6257;0.6286;1.0000"/></circle><text x="170" y="262" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.6286;0.6357;0.6857;0.7214;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="270;270;252;252" keyTimes="0.0000;0.6286;0.7214;1.0000"/></text><g opacity="0"><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.6000;0.6429;0.7214;0.7471;1.0000"/><circle cx="250" cy="215" r="30" fill="%%B%%" fill-opacity="0.85" stroke="#ffffff" stroke-width="5"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="30;30;44;44" keyTimes="0.0000;0.7214;0.7471;1.0000"/></circle><text x="250" y="225" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#ffffff">6</text></g><circle cx="250" cy="215" r="90" fill="none" stroke="%%B%%" stroke-width="4" opacity="0"><animate attributeName="r" dur="7.0s" repeatCount="indefinite" values="90;90;30;30" keyTimes="0.0000;0.6000;0.7214;1.0000"/><animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes="0.0000;0.6000;0.6357;0.7186;0.7214;1.0000"/></circle><text x="250" y="177" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%%J%%" opacity="0">300<animate attributeName="opacity" dur="7.0s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0.0000;0.7214;0.7286;0.7786;0.8143;1.0000"/><animate attributeName="y" dur="7.0s" repeatCount="indefinite" values="185;185;167;167" keyTimes="0.0000;0.7214;0.8143;1.0000"/></text><g><circle r="4" fill="%%A%%" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0.15s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0.15s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle><circle r="5" fill="%%A%%" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0.12s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0.12s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle><circle r="6" fill="%%A%%" fill-opacity="0.23" stroke="#ffffff" stroke-opacity="0.23" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0.09s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0.09s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle><circle r="7" fill="%%A%%" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.32" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0.06s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0.06s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle><circle r="8" fill="%%A%%" fill-opacity="0.41" stroke="#ffffff" stroke-opacity="0.41" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0.03s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0.03s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle><circle r="11" fill="%%A%%" fill-opacity="1" stroke="#ffffff" stroke-opacity="1" stroke-width="2"><animate attributeName="cx" dur="7.0s" begin="0s" repeatCount="indefinite" values="250.0;150.0;305.0;455.0;484.2;506.9;523.0;532.5;535.5;531.9;521.7;505.0;330.0;170.0;250.0;250.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/><animate attributeName="cy" dur="7.0s" begin="0s" repeatCount="indefinite" values="215.0;150.0;110.0;150.0;167.0;185.6;205.8;227.5;250.8;275.6;302.0;330.0;335.0;300.0;215.0;215.0" keyTimes="0.0000;0.1357;0.2214;0.3286;0.3438;0.3589;0.3741;0.3893;0.4045;0.4196;0.4348;0.4500;0.5357;0.6286;0.7214;1.0000" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/></circle></g>';
  // (one that stretches to fill the whole area, kept in proportion and centered: no size or position needed)
  const svgFit = (w, h, body, par, pad) => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (pad ? -w * pad + " " + -h * pad + " " + w * (1 + pad * 2) + " " + h * (1 + pad * 2) : "0 0 " + w + " " + h) + '" preserveAspectRatio="' + par + '">' + body + "</svg>") + '")';
  const svgUrl = (w, h, body) => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' + body + "</svg>") + '")';
  const hexish = (c, d) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) || /^rgba?\(/i.test(String(c || "")) ? c : d);
  const A = (t) => hexish(t.accent, "#ff66aa"), Bc = (t) => hexish(t.link, "#66ccff"), W = (t) => hexish(t.strong, "#ffffff");
  // falling things (snow): like Rain, each flake on a tile of its own, and every loop moves each tile down by whole tiles
  const fall = (name, flakes, speed, look) => {
    const list = flakes.map(([w, h, x, y, r, a]) => ({ w, h, x, y, r, a, to: h * Math.max(1, Math.round(speed / h)) }));
    const id = "bcFall" + name.replace(/\W/g, "");
    return {
      name, moving: true,
      css: (t) => list.map((d) => "radial-gradient(" + d.r + "px " + d.r + "px at " + d.x + "% " + d.y + "%," + look(t, d.a) + ",transparent)").join(",") + ",linear-gradient(180deg,transparent 60%," + mix(Bc(t), 8) + ")",
      size: list.map((d) => d.w + "px " + d.h + "px").join(",") + ",100% 100%",
      anim: id + " 9s linear infinite",
      keyframes: "@keyframes " + id + "{from{background-position:" + list.map(() => "0 0").join(",") + ",0 0}to{background-position:" + list.map((d) => "0 " + d.to + "px").join(",") + ",0 0}}",
    };
  };
  Object.assign(BACKGROUNDS, {
    osucircles: { name: "osu! gameplay", size: "100% 100%", css: (t) => svgFit(640, 480, '<g opacity="0.6">' + OSU_PLAY.replace(/%%A%%/g, A(t)).replace(/%%B%%/g, Bc(t)).replace(/%%J%%/g, "#8fd9ff") + "</g>", "xMidYMid meet", 0.04) },
    osutriangles: { name: "Triangles", moving: true, size: "320px 320px", anim: "bcTriUp 26s linear infinite", keyframes: "@keyframes bcTriUp{from{background-position:0 0}to{background-position:0 -640px}}", css: (t) => {
      const tri = (x, y, s, col, o) => '<path d="M' + x + " " + (y - s) + " L" + (x + s * 0.87) + " " + (y + s * 0.5) + " L" + (x - s * 0.87) + " " + (y + s * 0.5) + 'Z" fill="' + col + '" fill-opacity="' + o + '"/>';
      return svgUrl(320, 320, tri(40, 60, 30, A(t), 0.16) + tri(150, 30, 18, Bc(t), 0.14) + tri(260, 90, 42, A(t), 0.1) + tri(90, 170, 22, A(t), 0.2) + tri(210, 200, 34, Bc(t), 0.12) + tri(30, 270, 40, Bc(t), 0.09) + tri(160, 290, 26, A(t), 0.15) + tri(290, 270, 16, A(t), 0.18));
    } },
    checker: { name: "Checkered", size: "64px 64px", css: (t) => "repeating-conic-gradient(" + mix(A(t), 13) + " 0 25%," + mix(Bc(t), 9) + " 0 50%)" },
    nebula: { name: "Nebula", moving: true, size: "180% 180%", css: (t) => "radial-gradient(1.5px 1.5px at 12% 22%,#fff9,transparent 60%),radial-gradient(1px 1px at 68% 8%,#fff8,transparent 60%),radial-gradient(1.2px 1.2px at 38% 64%,#fffa,transparent 60%),radial-gradient(1px 1px at 84% 52%,#fff7,transparent 60%),radial-gradient(1.4px 1.4px at 55% 88%,#fff9,transparent 60%),radial-gradient(35% 45% at 25% 30%," + mix(A(t), 28) + ",transparent 70%),radial-gradient(40% 40% at 75% 60%," + mix(Bc(t), 22) + ",transparent 70%),radial-gradient(30% 35% at 55% 15%,#ff7ad933,transparent 70%),radial-gradient(45% 40% at 40% 85%," + mix(A(t), 16) + ",transparent 70%)" },
    snow: fall("Snowfall", [[97, 151, 20, 30, 1.6, 70], [131, 113, 70, 60, 1.2, 55], [173, 197, 40, 10, 2.2, 80], [211, 167, 85, 80, 1.4, 50], [149, 239, 55, 45, 2.8, 85], [251, 281, 15, 70, 3.2, 75]], 900, (t, a) => "color-mix(in srgb," + W(t) + " " + a + "%,transparent)"),
    fireflies: { name: "Fireflies", moving: true, size: "260px 260px", css: (t) => [[18, 30, 3], [62, 12, 2], [80, 64, 3.5], [35, 72, 2.5], [52, 44, 2], [10, 88, 3]].map(([x, y, r]) => "radial-gradient(" + r * 4 + "px " + r * 4 + "px at " + x + "% " + y + "%,color-mix(in srgb," + Bc(t) + " 55%,transparent),color-mix(in srgb," + Bc(t) + " 12%,transparent) 30%,transparent 70%)").join(",") },
    magic: { name: "Magic circle", size: "100% 100%", css: (t) => {
      const runes = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, x = 200 + Math.cos(a) * 158, y = 200 + Math.sin(a) * 158; return '<rect x="' + (x - 4) + '" y="' + (y - 7) + '" width="8" height="14" rx="2" transform="rotate(' + ((i / 24) * 360 + 90) + " " + x + " " + y + ')" fill="' + A(t) + '"/>'; }).join("");
      const hex = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return (200 + Math.cos(a) * 120).toFixed(1) + "," + (200 + Math.sin(a) * 120).toFixed(1); });
      return svgFit(400, 400, '<g fill="none" stroke="' + A(t) + '" stroke-opacity="0.3"><circle cx="200" cy="200" r="190" stroke-width="3"/><circle cx="200" cy="200" r="172" stroke-width="1.5"/><circle cx="200" cy="200" r="140" stroke-width="2"/><circle cx="200" cy="200" r="60" stroke-width="2"/><polygon points="' + [hex[0], hex[2], hex[4]].join(" ") + '" stroke-width="2"/><polygon points="' + [hex[1], hex[3], hex[5]].join(" ") + '" stroke-width="2"/></g><g fill-opacity="0.28">' + runes + '</g><circle cx="200" cy="200" r="8" fill="' + Bc(t) + '" fill-opacity="0.45"/>', "xMidYMid meet", 0.12) + ",radial-gradient(circle at 50% 50%," + mix(A(t), 10) + ",transparent 55%)";
    } },
    moon: { name: "Crescent moon", css: (t) => "radial-gradient(circle at calc(82% + 22px) calc(22% - 14px)," + t.chat + " 0 66px,transparent 67px),radial-gradient(circle at 82% 22%,color-mix(in srgb," + W(t) + " 80%," + A(t) + ") 0 70px,transparent 71px),radial-gradient(circle at 82% 22%," + mix(A(t), 22) + ",transparent 230px),radial-gradient(1.2px 1.2px at 12% 22%,#fff9,transparent 60%),radial-gradient(1px 1px at 48% 8%,#fff8,transparent 60%),radial-gradient(1.2px 1.2px at 28% 64%,#fffa,transparent 60%),radial-gradient(1px 1px at 64% 52%,#fff7,transparent 60%),radial-gradient(1.4px 1.4px at 45% 88%,#fff9,transparent 60%)" },
    circuit: { name: "Circuit", size: "240px 240px", css: (t) => svgUrl(240, 240, '<g fill="none" stroke="' + A(t) + '" stroke-opacity="0.22" stroke-width="2"><path d="M0 40 H60 L80 60 H150 L170 40 H240"/><path d="M40 0 V90 L60 110 V240"/><path d="M0 180 H90 L110 160 H240"/><path d="M180 0 V70 L200 90 V150"/><path d="M130 240 V200 L150 180 H190"/></g><g fill="' + Bc(t) + '" fill-opacity="0.4"><circle cx="80" cy="60" r="4"/><circle cx="60" cy="110" r="4"/><circle cx="110" cy="160" r="4"/><circle cx="200" cy="90" r="4"/><circle cx="190" cy="180" r="4"/><circle cx="170" cy="40" r="4"/></g>') },
    crystals: { name: "Crystals", size: "280px 280px", css: (t) => svgUrl(280, 280, '<g stroke="' + W(t) + '" stroke-opacity="0.12"><path d="M60 20 L90 70 L60 130 L30 70Z" fill="' + A(t) + '" fill-opacity="0.13"/><path d="M60 20 L60 130" /><path d="M200 60 L240 100 L210 170 L170 110Z" fill="' + Bc(t) + '" fill-opacity="0.1"/><path d="M200 60 L210 170"/><path d="M120 170 L150 210 L130 260 L100 215Z" fill="' + A(t) + '" fill-opacity="0.1"/><path d="M250 200 L270 230 L250 275 L232 232Z" fill="' + Bc(t) + '" fill-opacity="0.12"/></g>') },
    wisps: { name: "Soul wisps", moving: true, size: "200% 200%", css: (t) => [[20, 70], [45, 30], [70, 75], [85, 35], [35, 55]].map(([x, y], i) => "radial-gradient(" + (18 + i * 4) + "px " + (60 + i * 10) + "px at " + x + "% " + y + "%," + mix(i % 2 ? Bc(t) : A(t), 34) + ",transparent 75%)").join(",") + ",radial-gradient(ellipse at 50% 120%," + mix(A(t), 18) + ",transparent 60%)" },
    gold: { name: "Gold dust", size: "220px 220px", css: (t) => [[15, 20, 1.6], [48, 66, 1.2], [80, 30, 2], [30, 88, 1.4], [66, 12, 1], [90, 80, 1.8], [58, 46, 1.1]].map(([x, y, r]) => "radial-gradient(" + r + "px " + r + "px at " + x + "% " + y + "%,color-mix(in srgb," + A(t) + " 85%,#fff),transparent 70%)").join(",") + ",radial-gradient(ellipse at 50% 0%," + mix(A(t), 9) + ",transparent 70%)" },
    abyssrings: { name: "The deep", css: (t) => "repeating-radial-gradient(ellipse 140% 90% at 50% -10%,transparent 0 46px," + mix(A(t), 10) + " 47px 49px,transparent 50px 96px),linear-gradient(180deg," + mix(A(t), 12) + ",transparent 40%,rgba(0,0,0,.35))" },
    pixels: { name: "Pixels", size: "96px 96px", css: (t) => svgUrl(96, 96, '<g shape-rendering="crispEdges"><rect x="0" y="0" width="12" height="12" fill="' + A(t) + '" fill-opacity="0.16"/><rect x="36" y="12" width="12" height="12" fill="' + Bc(t) + '" fill-opacity="0.13"/><rect x="72" y="36" width="12" height="12" fill="' + A(t) + '" fill-opacity="0.1"/><rect x="24" y="60" width="12" height="12" fill="' + Bc(t) + '" fill-opacity="0.16"/><rect x="60" y="72" width="12" height="12" fill="' + A(t) + '" fill-opacity="0.13"/><rect x="84" y="84" width="12" height="12" fill="' + Bc(t) + '" fill-opacity="0.09"/><rect x="12" y="36" width="12" height="12" fill="' + A(t) + '" fill-opacity="0.07"/></g>') },
    streaks: { name: "Light streaks", moving: true, size: "420px 420px", css: (t) => "repeating-linear-gradient(115deg,transparent 0 60px," + mix(A(t), 16) + " 61px 62px,transparent 63px 140px," + mix(Bc(t), 12) + " 141px 143px,transparent 144px 210px)" },
    void: { name: "Void", css: (t) => "radial-gradient(circle at 50% 45%,#000 0 70px," + mix(A(t), 55) + " 74px," + mix(Bc(t), 18) + " 110px,transparent 260px),radial-gradient(ellipse at 50% 45%," + mix(A(t), 10) + ",transparent 70%)" },
    sparks: { name: "Forge sparks", moving: true, size: "240px 240px", css: (t) => "radial-gradient(ellipse 140% 50% at 50% 120%," + mix(A(t), 34) + ",transparent 60%)," + [[20, 70, 2], [70, 40, 1.6], [45, 85, 2.2], [85, 75, 1.5], [30, 20, 1.2], [60, 60, 1.8]].map(([x, y, r]) => "radial-gradient(" + r + "px " + r * 3 + "px at " + x + "% " + y + "%,color-mix(in srgb," + A(t) + " 70%,#ffd27f),transparent 70%)").join(",") },
    bricks: { name: "Stone wall", size: "120px 60px", css: (t) => svgUrl(120, 60, '<g fill="none" stroke="' + W(t) + '" stroke-opacity="0.07" stroke-width="2"><rect x="1" y="1" width="58" height="28"/><rect x="61" y="1" width="58" height="28"/><rect x="-29" y="31" width="58" height="28"/><rect x="31" y="31" width="58" height="28"/><rect x="91" y="31" width="58" height="28"/></g>') + ",linear-gradient(180deg,transparent," + mix(A(t), 8) + ")" },
    roots: { name: "Roots", size: "360px 360px", css: (t) => svgUrl(360, 360, '<g fill="none" stroke="' + A(t) + '" stroke-opacity="0.2" stroke-linecap="round"><path d="M180 0 C180 60 150 90 120 140 S70 230 40 360" stroke-width="5"/><path d="M150 90 C200 130 240 170 250 240 S300 330 330 360" stroke-width="3.5"/><path d="M120 140 C100 170 60 180 20 190" stroke-width="2.5"/><path d="M250 240 C270 220 310 220 350 200" stroke-width="2"/><path d="M90 230 C120 260 130 300 140 360" stroke-width="2"/></g><g fill="' + Bc(t) + '" fill-opacity="0.18"><path d="M240 170 l10 -16 l10 16 l-10 16Z"/><path d="M60 180 l8 -12 l8 12 l-8 12Z"/></g>') },
    marks: { name: "Three marks", size: "260px 260px", css: (t) => svgUrl(260, 260, '<g stroke="' + Bc(t) + '" stroke-opacity="0.2" stroke-width="5" stroke-linecap="round"><path d="M40 40 L80 110"/><path d="M62 34 L102 104"/><path d="M84 28 L124 98"/></g><g stroke="' + A(t) + '" stroke-opacity="0.08" stroke-width="3" stroke-linecap="round"><path d="M170 150 L200 210"/><path d="M188 146 L218 206"/><path d="M206 142 L236 202"/></g>') },
    sun: { name: "Retro sun", size: "100% 100%", css: (t) => { const stripes = [0, 1, 2, 3, 4, 5].map((i) => '<rect x="0" y="' + (262 + i * 16) + '" width="800" height="' + (3 + i * 1.4) + '" fill="' + hexish(t.chat, "#000000") + '"/>').join(""); const grid = Array.from({ length: 17 }, (_, i) => '<path d="M' + (400 + (i - 8) * 22) + " 330 L" + (400 + (i - 8) * 120) + ' 500" stroke="' + Bc(t) + '" stroke-opacity="0.3"/>').join("") + [345, 365, 395, 435, 485].map((y) => '<path d="M0 ' + y + " H800" + '" stroke="' + Bc(t) + '" stroke-opacity="0.25"/>').join(""); return svgFit(800, 500, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36e"/><stop offset="1" stop-color="' + A(t) + '"/></linearGradient></defs><circle cx="400" cy="250" r="150" fill="url(#g)" fill-opacity="0.75"/>' + stripes + '<rect x="0" y="330" width="800" height="170" fill="' + A(t) + '" fill-opacity="0.08"/>' + grid, "xMidYMax slice"); } },
    hearts: { name: "Hearts", size: "120px 120px", css: (t) => svgUrl(120, 120, '<g fill="' + A(t) + '" fill-opacity="0.16"><path d="M30 44 C30 34 44 32 46 42 C48 32 62 34 62 44 C62 54 46 62 46 66 C46 62 30 54 30 44Z"/></g><g fill="' + Bc(t) + '" fill-opacity="0.12"><path d="M84 92 C84 86 92 85 93 91 C94 85 102 86 102 92 C102 98 93 103 93 105 C93 103 84 98 84 92Z"/></g>') },
  });

  const CORNERS = { site: { name: "As the site has it", r: null }, sharp: { name: "Sharp", r: 0 }, subtle: { name: "Subtle", r: 4 }, normal: { name: "Rounded", r: 8 }, soft: { name: "Soft", r: 14 }, bubbly: { name: "Bubbly", r: 22 } };
  const FONTS = {
    site: { name: "As the site has it", stack: null },
    noto: { name: "Noto Sans", g: "Noto Sans", stack: "'Noto Sans',sans-serif" },
    inter: { name: "Inter", g: "Inter", stack: "'Inter',sans-serif" },
    nunito: { name: "Nunito", g: "Nunito", stack: "'Nunito',sans-serif" },
    lora: { name: "Lora", g: "Lora", stack: "'Lora',Georgia,serif" },
    rubik: { name: "Rubik", g: "Rubik", stack: "'Rubik',sans-serif" },
    grotesk: { name: "Space Grotesk", g: "Space Grotesk", stack: "'Space Grotesk',sans-serif" },
    mono: { name: "JetBrains Mono", g: "JetBrains Mono", stack: "'JetBrains Mono',Consolas,monospace" },
    atkinson: { name: "Atkinson Hyperlegible", g: "Atkinson Hyperlegible", stack: "'Atkinson Hyperlegible',sans-serif" },
    fredoka: { name: "Fredoka", g: "Fredoka", stack: "'Fredoka',sans-serif" },
    outfit: { name: "Outfit", g: "Outfit", stack: "'Outfit',sans-serif" },
    garamond: { name: "EB Garamond", g: "EB Garamond", stack: "'EB Garamond',Garamond,serif" },
    manrope: { name: "Manrope", g: "Manrope", stack: "'Manrope',sans-serif" },
    worksans: { name: "Work Sans", g: "Work Sans", stack: "'Work Sans',sans-serif" },
  };

  // ---------------- Update 12: more fonts ("w": the weights it comes in, when it isn't regular and bold) ----------------
  Object.assign(FONTS, {
    // osu!: the game's own font (Torus) is a paid font osu! has a license for, so it can't come with BelleCord. If
    // Torus is installed on your computer it's used; otherwise Exo 2, the font osu!'s website used before Torus.
    osu: { name: "osu!", g: "Exo 2", stack: "'Torus','Torus Pro','Exo 2',sans-serif" },
    exo: { name: "osu!", g: "Exo 2", stack: "'Exo 2',sans-serif" }, // (Exo 2: the font osu! uses on its menus and site)
    quicksand: { name: "Quicksand", g: "Quicksand", stack: "'Quicksand',sans-serif" },
    comfortaa: { name: "Comfortaa", g: "Comfortaa", stack: "'Comfortaa',sans-serif" },
    barlow: { name: "Barlow", g: "Barlow", stack: "'Barlow',sans-serif" },
    oswald: { name: "Oswald", g: "Oswald", stack: "'Oswald',sans-serif" },
    righteous: { name: "Righteous", g: "Righteous", w: "400", stack: "'Righteous',sans-serif" },
    orbitron: { name: "Orbitron", g: "Orbitron", stack: "'Orbitron',sans-serif" },
    techmono: { name: "Share Tech Mono", g: "Share Tech Mono", w: "400", stack: "'Share Tech Mono',Consolas,monospace" },
    vt323: { name: "VT323", g: "VT323", w: "400", stack: "'VT323',Consolas,monospace" },
    pixelify: { name: "Pixelify Sans", g: "Pixelify Sans", stack: "'Pixelify Sans',sans-serif" },
    pressstart: { name: "Press Start 2P", g: "Press Start 2P", w: "400", stack: "'Press Start 2P',monospace" },
    cinzel: { name: "Cinzel", g: "Cinzel", stack: "'Cinzel',Georgia,serif" },
    cormorant: { name: "Cormorant Garamond", g: "Cormorant Garamond", stack: "'Cormorant Garamond',Garamond,serif" },
    playfair: { name: "Playfair Display", g: "Playfair Display", stack: "'Playfair Display',Georgia,serif" },
    fell: { name: "IM Fell English", g: "IM Fell English", w: "400", stack: "'IM Fell English',Georgia,serif" },
    mincho: { name: "Shippori Mincho", g: "Shippori Mincho", stack: "'Shippori Mincho',Georgia,serif" },
    maru: { name: "Zen Maru Gothic", g: "Zen Maru Gothic", stack: "'Zen Maru Gothic',sans-serif" },
    caveat: { name: "Caveat", g: "Caveat", stack: "'Caveat',cursive" },
    patrick: { name: "Patrick Hand", g: "Patrick Hand", w: "400", stack: "'Patrick Hand',cursive" },
    typewriter: { name: "Special Elite", g: "Special Elite", w: "400", stack: "'Special Elite',monospace" },
    creepster: { name: "Creepster", g: "Creepster", w: "400", stack: "'Creepster',cursive" },
    lexend: { name: "Lexend", g: "Lexend", stack: "'Lexend',sans-serif" },
  });

  { const o = { ...FONTS }; for (const k of Object.keys(FONTS)) delete FONTS[k]; FONTS.site = o.site; FONTS.exo = o.exo; Object.assign(FONTS, o); } // (osu! first, after Normal)

  // ---------------- Update 12: cursors (drawn in your theme's colors; typing spots keep the normal text cursor) ----------------
  const cur = (body, hx2, hy) => (t) => svgUrl(32, 32, body(t)) + " " + hx2 + " " + hy;
  const CURSORS = {
    site: { name: "As the site has it" },
    osu: { name: "osu! circle", url: cur((t) => '<circle cx="16" cy="16" r="13" fill="' + A(t) + '" fill-opacity="0.35"/><circle cx="16" cy="16" r="11" fill="none" stroke="#ffffff" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="' + A(t) + '"/>', 16, 16) },
    ring: { name: "Approach ring", url: cur((t) => '<circle cx="16" cy="16" r="12" fill="none" stroke="' + A(t) + '" stroke-width="2.5"/><circle cx="16" cy="16" r="2.5" fill="#ffffff"/>', 16, 16) },
    flame: { name: "Flame", url: cur((t) => '<path d="M16 2 C20 9 25 12 24 19 C23 26 18 30 16 30 C12 30 8 26 8 20 C8 15 12 13 12 8 C14 11 15 12 16 2Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/><path d="M16 14 C18 18 20 20 19 24 C18 27 14 27 13 24 C12 21 15 19 16 14Z" fill="#ffe08a"/>', 10, 4) },
    soul: { name: "Soul orb", url: cur((t) => '<circle cx="16" cy="16" r="10" fill="' + A(t) + '" fill-opacity="0.25"/><circle cx="16" cy="16" r="6" fill="' + A(t) + '"/><circle cx="14" cy="14" r="2" fill="#ffffff"/>', 16, 16) },
    star: { name: "Star", url: cur((t) => '<path d="M16 2 L19.5 12 L30 12 L21.5 18.5 L24.5 29 L16 22.5 L7.5 29 L10.5 18.5 L2 12 L12.5 12Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/>', 16, 4) },
    heart: { name: "Heart", url: cur((t) => '<path d="M16 28 C16 26 4 20 4 11 C4 5 12 3 16 10 C20 3 28 5 28 11 C28 20 16 26 16 28Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/>', 16, 8) },
    cross: { name: "Crosshair", url: cur((t) => '<g stroke="' + A(t) + '" stroke-width="2.5" stroke-linecap="round"><path d="M16 3 V11"/><path d="M16 21 V29"/><path d="M3 16 H11"/><path d="M21 16 H29"/></g><circle cx="16" cy="16" r="1.8" fill="#ffffff"/>', 16, 16) },
    pixel: { name: "Pixel arrow", url: cur((t) => '<g shape-rendering="crispEdges" fill="' + A(t) + '" stroke="#000000" stroke-width="1"><path d="M2 2 H6 V6 H10 V10 H14 V14 H18 V18 H12 V22 H10 V26 H6 V30 H2Z"/></g>', 2, 2) },
    sword: { name: "Sword", url: cur((t) => '<path d="M3 3 L19 19" stroke="#000000" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round"/><path d="M3 3 L19 19" stroke="' + W(t) + '" stroke-width="3" stroke-linecap="round"/><path d="M15 23 L23 15" stroke="' + A(t) + '" stroke-width="4" stroke-linecap="round"/><path d="M20 20 L28 28" stroke="' + A(t) + '" stroke-width="4" stroke-linecap="round"/>', 3, 3) },
    wand: { name: "Magic wand", url: cur((t) => '<path d="M6 26 L22 10" stroke="#000000" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round"/><path d="M6 26 L22 10" stroke="' + W(t) + '" stroke-width="3" stroke-linecap="round"/><path d="M24 2 L25.6 6.4 L30 8 L25.6 9.6 L24 14 L22.4 9.6 L18 8 L22.4 6.4Z" fill="' + A(t) + '"/>', 24, 8) },
    sparkle: { name: "Sparkle", url: cur((t) => '<path d="M16 1 L19 13 L31 16 L19 19 L16 31 L13 19 L1 16 L13 13Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1"/><circle cx="16" cy="16" r="2.5" fill="#ffffff"/>', 16, 16) },
    paw: { name: "Paw", url: cur((t) => '<g fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1"><ellipse cx="16" cy="21" rx="7" ry="6"/><ellipse cx="7" cy="13" rx="3" ry="4"/><ellipse cx="13" cy="8" rx="3" ry="4"/><ellipse cx="19.5" cy="8" rx="3" ry="4"/><ellipse cx="25.5" cy="13" rx="3" ry="4"/></g>', 13, 6) },
    moon: { name: "Moon", url: cur((t) => '<path d="M20 3 A13 13 0 1 0 29 22 A10 10 0 1 1 20 3Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1.2"/>', 8, 6) },
    bolt: { name: "Lightning", url: cur((t) => '<path d="M18 1 L5 18 L14 18 L11 31 L27 12 L17 12Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/>', 18, 2) },
    snowflake: { name: "Snowflake", url: cur((t) => '<g stroke="' + A(t) + '" stroke-width="2.5" stroke-linecap="round"><path d="M16 2 V30"/><path d="M3.9 9 L28.1 23"/><path d="M3.9 23 L28.1 9"/><path d="M12 5 L16 9 L20 5"/><path d="M12 27 L16 23 L20 27"/></g>', 16, 16) },
    crown: { name: "Crown", url: cur((t) => '<path d="M3 24 L5 9 L11 16 L16 5 L21 16 L27 9 L29 24Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/><rect x="3" y="25" width="26" height="4" rx="1" fill="' + A(t) + '"/>', 16, 6) },
    gem: { name: "Gem", url: cur((t) => '<path d="M9 4 H23 L30 12 L16 29 L2 12Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1.2"/><path d="M2 12 H30 M9 4 L13 12 L16 29 L19 12 L23 4" fill="none" stroke="#ffffff" stroke-opacity="0.6"/>', 16, 4) },
    ghost: { name: "Ghost", url: cur((t) => '<path d="M6 29 V14 A10 10 0 0 1 26 14 V29 L22 26 L19 29 L16 26 L13 29 L10 26Z" fill="' + W(t) + '" stroke="' + A(t) + '" stroke-width="1.6"/><circle cx="12.5" cy="15" r="2" fill="' + A(t) + '"/><circle cx="19.5" cy="15" r="2" fill="' + A(t) + '"/>', 16, 4) },
    leaf: { name: "Leaf", url: cur((t) => '<path d="M4 28 C4 12 14 4 29 3 C28 18 20 28 4 28Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1.2"/><path d="M4 28 L22 10" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.4"/>', 4, 28) },
    bubble: { name: "Bubble", url: cur((t) => '<circle cx="16" cy="16" r="12" fill="' + A(t) + '" fill-opacity="0.18" stroke="' + A(t) + '" stroke-width="2"/><path d="M10 12 A7 7 0 0 1 15 8" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round"/>', 16, 16) },
    arrow: { name: "Colored arrow", url: cur((t) => '<path d="M3 2 L3 26 L9.5 20 L14 30 L18 28.2 L13.6 18.5 L22 18.5Z" fill="' + A(t) + '" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>', 3, 2) },
    osuclassic: { name: "osu! classic", url: cur((t) => '<circle cx="16" cy="16" r="14" fill="#ffcc22" fill-opacity="0.25"/><circle cx="16" cy="16" r="11" fill="none" stroke="#ffcc22" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="#ffffff"/>', 16, 16) },
    eye: { name: "Soul eye", url: cur((t) => '<path d="M2 16 C8 7 24 7 30 16 C24 25 8 25 2 16Z" fill="#111111" stroke="' + A(t) + '" stroke-width="1.6"/><circle cx="16" cy="16" r="6" fill="' + A(t) + '"/><circle cx="16" cy="16" r="2.4" fill="#000000"/><circle cx="18" cy="14" r="1.4" fill="#ffffff"/>', 16, 16) },
    skull: { name: "Skull", url: cur((t) => '<path d="M16 3 C8 3 4 9 5 15 C5.5 18 7 19 8 20 V25 H12 V22 H14 V25 H18 V22 H20 V25 H24 V20 C25 19 26.5 18 27 15 C28 9 24 3 16 3Z" fill="' + W(t) + '" stroke="#000000" stroke-opacity="0.6" stroke-width="1.2"/><circle cx="11.5" cy="14" r="3" fill="' + A(t) + '"/><circle cx="20.5" cy="14" r="3" fill="' + A(t) + '"/>', 16, 4) },
    feather: { name: "Quill", url: cur((t) => '<path d="M3 29 C9 19 15 11 29 3 C27 15 19 23 9 25Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45" stroke-width="1.2"/><path d="M3 29 L22 10" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.4"/>', 3, 29) },
    dagger: { name: "Dagger", url: cur((t) => '<path d="M3 3 L17 9 L23 15 L15 23 L9 17Z" fill="' + W(t) + '" stroke="#000000" stroke-opacity="0.55" stroke-width="1.2"/><path d="M14 26 L26 14" stroke="' + A(t) + '" stroke-width="4" stroke-linecap="round"/><path d="M21 21 L29 29" stroke="' + A(t) + '" stroke-width="3.5" stroke-linecap="round"/>', 3, 3) },
    shuriken: { name: "Shuriken", url: cur((t) => '<path d="M16 1 L19 13 L31 16 L19 19 L16 31 L13 19 L1 16 L13 13Z" fill="#9aa3ad" stroke="#000000" stroke-opacity="0.6" stroke-width="1" transform="rotate(20 16 16)"/><circle cx="16" cy="16" r="3" fill="' + A(t) + '"/>', 16, 16) },
    butterfly: { name: "Butterfly", url: cur((t) => '<path d="M16 16 C10 4 2 6 4 13 C5 17 10 17 16 16 C10 18 5 21 8 26 C11 30 15 23 16 16Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.4" stroke-width="1"/><path d="M16 16 C22 4 30 6 28 13 C27 17 22 17 16 16 C22 18 27 21 24 26 C21 30 17 23 16 16Z" fill="' + Bc(t) + '" stroke="#000000" stroke-opacity="0.4" stroke-width="1"/>', 16, 16) },
    clover: { name: "Clover", url: cur((t) => '<g fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.4" stroke-width="1"><circle cx="16" cy="9" r="6"/><circle cx="9" cy="16" r="6"/><circle cx="23" cy="16" r="6"/></g><path d="M16 16 L18 30" stroke="' + A(t) + '" stroke-width="2.5" stroke-linecap="round"/>', 16, 9) },
    blossom: { name: "Cherry blossom", url: cur((t) => '<g fill="#ffc0d8" stroke="' + A(t) + '" stroke-width="1.2">' + [0, 72, 144, 216, 288].map((r) => '<ellipse cx="16" cy="8" rx="5" ry="7" transform="rotate(' + r + ' 16 16)"/>').join("") + '</g><circle cx="16" cy="16" r="3.2" fill="' + A(t) + '"/>', 16, 16) },
    note: { name: "Music note", url: cur((t) => '<path d="M12 24 V5 L27 2 V20" fill="none" stroke="' + A(t) + '" stroke-width="3" stroke-linejoin="round"/><ellipse cx="8" cy="25" rx="5.5" ry="4.5" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.4"/><ellipse cx="23" cy="21" rx="5.5" ry="4.5" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.4"/>', 12, 5) },
    planet: { name: "Planet", url: cur((t) => '<circle cx="16" cy="16" r="8" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.4"/><ellipse cx="16" cy="16" rx="15" ry="5" fill="none" stroke="' + Bc(t) + '" stroke-width="2" transform="rotate(-20 16 16)"/>', 16, 16) },
    cat: { name: "Cat", url: cur((t) => '<path d="M5 28 V10 L10 4 L13 10 H19 L22 4 L27 10 V28Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="17" r="2" fill="#000000"/><circle cx="20" cy="17" r="2" fill="#000000"/><path d="M14 22 L16 24 L18 22" fill="none" stroke="#000000" stroke-width="1.2"/>', 16, 6) },
    mushroom: { name: "Mushroom", url: cur((t) => '<path d="M3 16 C3 6 29 6 29 16Z" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.5" stroke-width="1.2"/><circle cx="10" cy="11" r="2.5" fill="#ffffff"/><circle cx="20" cy="9.5" r="2" fill="#ffffff"/><rect x="11" y="16" width="10" height="12" rx="3" fill="#f5ead6" stroke="#000000" stroke-opacity="0.4"/>', 16, 6) },
    candy: { name: "Candy", url: cur((t) => '<path d="M3 9 L9 13 L9 19 L3 23Z M29 9 L23 13 L23 19 L29 23Z" fill="' + Bc(t) + '" stroke="#000000" stroke-opacity="0.4"/><circle cx="16" cy="16" r="8" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45"/><path d="M11 12 C14 16 18 16 21 20" stroke="#ffffff" stroke-width="2" fill="none" stroke-opacity="0.8"/>', 16, 16) },
    rose: { name: "Rose", url: cur((t) => '<path d="M16 16 L14 30" stroke="#3d8c40" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="11" r="9" fill="' + A(t) + '" stroke="#000000" stroke-opacity="0.45"/><path d="M11 11 C13 6 19 6 20 11 C19 15 13 15 14 11 C15 9 17 9 17 11" fill="none" stroke="#000000" stroke-opacity="0.45" stroke-width="1.3"/>', 16, 4) },
    pickaxe: { name: "Pickaxe", url: cur((t) => '<g shape-rendering="crispEdges"><path d="M4 4 H16 V6 H20 V8 H22 V10 H24 V12 H26 V16 H24 V14 H22 V12 H20 V10 H18 V8 H16 V7 H4Z" fill="' + Bc(t) + '" stroke="#000000" stroke-width="1"/><path d="M14 12 L28 28" stroke="#8b5a2b" stroke-width="3.5"/></g>', 4, 4) },
  };
  // the CSS for one: everywhere on the page, except where you type
  function cursorCss(stack, t, root) {
    const c = CURSORS[stack.cursor];
    if (!c || !c.url) return "";
    const typing = ":is(input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),textarea,[contenteditable='true'],[role='textbox'])";
    return root + "," + root + " *{cursor:" + c.url(t) + ",auto!important}" + root + " " + typing + "," + root + " " + typing + " *{cursor:text!important}";
  }

  // (Update 12 effects: Film grain and Vignette are one see-through layer over the whole page; Neon names glow)
  const NOISE = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.13 0"/></filter><rect width="180" height="180" filter="url(#n)"/></svg>') + '")';
  function overlayFx(fx) {
    const layers = [], sizes = [];
    if (fx.has("vignette")) { layers.push("radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(0,0,0,.5) 100%)"); sizes.push("100% 100%"); }
    if (fx.has("grain")) { layers.push(NOISE); sizes.push("180px 180px"); }
    if (!layers.length) return "";
    return "html body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:2147483000;background:" + layers.join(",") + ";background-size:" + sizes.join(",") + "}";
  }
  const NEON = "{text-shadow:0 0 6px currentColor,0 0 14px color-mix(in srgb,currentColor 60%,transparent)!important}";
  const SIZES = { site: { name: "As the site has it", px: null }, small: { name: "Small", px: 14 }, normal: { name: "Normal", px: 16 }, large: { name: "Large", px: 18 }, huge: { name: "Huge", px: 20 } };
  const SPACING = { site: { name: "As the site has it", px: null }, compact: { name: "Compact", px: 4 }, normal: { name: "Normal", px: 16 }, roomy: { name: "Roomy", px: 26 } };
  const EFFECTS = {
    glass: { name: "Glass", hint: "See-through panels over the background" },
    glow: { name: "Glow", hint: "A soft glow on what's selected and on the message box" },
    bubbles: { name: "Bubbles", hint: "Messages in a rounded bubble (one per person\u2019s messages in a row)" },
    shadows: { name: "Soft shadows", hint: "Panels float a little" },
    scanlines: { name: "Scanlines", hint: "An old-monitor shimmer over the chat" },
    drift: { name: "Moving background", hint: "The background slowly drifts" },
      grain: { name: "Film grain", hint: "A soft, grainy film over everything" },
      vignette: { name: "Vignette", hint: "Darker edges, like an old photo" },
      neon: { name: "Neon names", hint: "Everyone's name glows in its own color" },
  };
  const CATS = [
    { key: "palette", name: "Colors", set: PALETTES },
    { key: "background", name: "Background", set: BACKGROUNDS },
    { key: "corners", name: "Corners", set: CORNERS },
    { key: "font", name: "Font", set: FONTS },
    { key: "size", name: "Text size", set: SIZES },
    { key: "spacing", name: "Spacing", set: SPACING },
    { key: "cursor", name: "Cursor", set: CURSORS },
  ];

  // ---------------- templates: full designs to click through (each one is a different look) ----------------
  const TEMPLATES = [
    { id: "own", name: "Fluxer as it is", blurb: "Your own Fluxer theme, on both sides.", pieces: { palette: "fluxer", background: "none", corners: "site", font: "site", size: "site", spacing: "site", effects: [] } },
    { id: "discord", name: "Discord classic", blurb: "Discord's grays and blurple everywhere.", pieces: { palette: "discord", background: "none", corners: "normal", font: "noto", size: "normal", spacing: "normal", effects: [] } },
    { id: "midnight", name: "Midnight ink", blurb: "Near-black blue with a cool cyan, under the stars.", pieces: { palette: "midnight", background: "stars", corners: "subtle", font: "inter", size: "normal", spacing: "normal", effects: ["shadows"] } },
    { id: "sakura", name: "Sakura", blurb: "Plum and petal pink, soft and round.", pieces: { palette: "sakura", background: "petals", corners: "soft", font: "nunito", size: "normal", spacing: "roomy", effects: ["bubbles"] } },
    { id: "forest", name: "Forest cabin", blurb: "Deep greens, warm wood, a storybook font.", pieces: { palette: "forest", background: "leaves", corners: "subtle", font: "lora", size: "normal", spacing: "roomy", effects: [] } },
    { id: "ocean", name: "Deep ocean", blurb: "Glass panels over slow teal waves.", pieces: { palette: "ocean", background: "waves", corners: "soft", font: "rubik", size: "normal", spacing: "normal", effects: ["glass"] } },
    { id: "neon", name: "Neon arcade", blurb: "Black, hot pink and cyan on a synth grid.", pieces: { palette: "neon", background: "grid", corners: "sharp", font: "grotesk", size: "normal", spacing: "normal", effects: ["glow"] } },
    { id: "terminal", name: "Terminal", blurb: "Green on black, monospace, scanlines.", pieces: { palette: "terminal", background: "none", corners: "sharp", font: "mono", size: "small", spacing: "compact", effects: ["scanlines"] } },
    { id: "paper", name: "Paper", blurb: "A light, warm page that's easy on the eyes.", pieces: { palette: "paper", background: "none", corners: "subtle", font: "atkinson", size: "large", spacing: "roomy", effects: [] } },
    { id: "candy", name: "Candy pop", blurb: "Light pastels, confetti and bubbly corners.", pieces: { palette: "candy", background: "dots", corners: "bubbly", font: "fredoka", size: "normal", spacing: "normal", effects: ["bubbles"] } },
    { id: "ember", name: "Ember", blurb: "Charcoal with a fire glow from below.", pieces: { palette: "ember", background: "embers", corners: "normal", font: "outfit", size: "normal", spacing: "normal", effects: ["glow"] } },
    { id: "royal", name: "Royal velvet", blurb: "Deep purple, gold trim, an old-book font.", pieces: { palette: "royal", background: "damask", corners: "normal", font: "garamond", size: "large", spacing: "normal", effects: ["shadows"] } },
    { id: "aurora", name: "Aurora glass", blurb: "Frosted glass over moving northern lights.", pieces: { palette: "aurora", background: "aurora", corners: "soft", font: "manrope", size: "normal", spacing: "normal", effects: ["glass", "drift"] } },
    { id: "mono", name: "Mono", blurb: "Only grays and white. Nothing else.", pieces: { palette: "mono", background: "none", corners: "sharp", font: "worksans", size: "normal", spacing: "compact", effects: [] } },
    { id: "crimson", name: "Crimson", blurb: "Deep red everywhere, with a soft glow.", pieces: { palette: "crimson", background: "damask", corners: "normal", font: "rubik", size: "normal", spacing: "normal", effects: ["glow", "shadows"] } },
    { id: "slate", name: "Slate", blurb: "Calm blue-gray with soft bokeh.", pieces: { palette: "slate", background: "bokeh", corners: "soft", font: "manrope", size: "normal", spacing: "normal", effects: ["shadows"] } },
    { id: "dracula", name: "Dracula", blurb: "The classic purple-and-pink dev look.", pieces: { palette: "dracula", background: "none", corners: "normal", font: "mono", size: "normal", spacing: "normal", effects: ["glow"] } },
    { id: "coffee", name: "Coffee house", blurb: "Warm browns and a honeycomb wall.", pieces: { palette: "coffee", background: "honeycomb", corners: "soft", font: "lora", size: "normal", spacing: "roomy", effects: [] } },
    { id: "sunset", name: "Sunset", blurb: "Coral and amber over a soft mesh.", pieces: { palette: "sunset", background: "mesh", corners: "soft", font: "outfit", size: "normal", spacing: "normal", effects: ["glass", "drift"] } },
    { id: "lavender", name: "Lavender", blurb: "Gentle purple with confetti.", pieces: { palette: "lavender", background: "dots", corners: "bubbly", font: "nunito", size: "normal", spacing: "roomy", effects: ["bubbles"] } },
    { id: "matcha", name: "Matcha", blurb: "A light, calm green tea room.", pieces: { palette: "matcha", background: "leaves", corners: "soft", font: "manrope", size: "large", spacing: "roomy", effects: [] } },
    { id: "rosegold", name: "Rose gold", blurb: "Soft pink daylight with bubbles.", pieces: { palette: "rosegold", background: "none", corners: "bubbly", font: "fredoka", size: "normal", spacing: "roomy", effects: ["bubbles"] } },
    { id: "arctic", name: "Arctic", blurb: "Crisp icy blue, bright and clean.", pieces: { palette: "arctic", background: "none", corners: "subtle", font: "inter", size: "normal", spacing: "normal", effects: ["shadows"] } },
  ];

  // ---------------- Update 12: the theme pack's full designs, in groups ----------------
  for (const tp of TEMPLATES) { tp.group = tp.group || "classic"; if (!tp.pieces.cursor) tp.pieces.cursor = "site"; }
  const T12 = (group, id, name, blurb, palette, background, corners, font, size, spacing, effects, cursor) => ({ id, group, name, blurb, pieces: { palette, background, corners, font, size, spacing, effects, cursor: cursor || "site" } });
  TEMPLATES.push(
    // games
    T12("games", "osu", "osu!", "Pink and sky blue on plum, hit circles and a slider behind the chat, and the circle cursor.", "osu", "osucircles", "soft", "osu", "normal", "normal", ["glow", "shadows"], "osu"),
    T12("games", "osulazer", "osu!lazer", "The newer look: drifting triangles, frosted glass, an approach-ring cursor.", "osu", "osutriangles", "soft", "osu", "normal", "normal", ["glass", "glow"], "ring"),
    T12("games", "overworld", "Overworld", "Grass green and gold, pixel blocks, a chunky pixel font.", "overworld", "pixels", "sharp", "pixelify", "normal", "normal", ["shadows"], "pixel"),
    T12("games", "payload", "Payload", "Hero-shooter orange and blue, light streaks, a crosshair.", "payload", "streaks", "subtle", "barlow", "normal", "normal", ["glow"], "cross"),
    T12("games", "trainer", "Pocket trainer", "Classic red and yellow on dark, confetti, nice and round.", "trainer", "dots", "bubbly", "rubik", "normal", "normal", ["bubbles"], "star"),
    T12("games", "bit8", "8-bit", "A tiny retro console: pixel font, pixel blocks, scanlines.", "bit8", "pixels", "sharp", "pressstart", "small", "compact", ["scanlines"], "pixel"),
    // anime
    T12("anime", "abyss", "The Abyss", "Deep blue layers going down forever, with a warm gold glow.", "abyss", "abyssrings", "soft", "lora", "normal", "roomy", ["glass"]),
    T12("anime", "walls", "Beyond the walls", "Leather tan and steel blue behind stone. Military plain.", "walls", "bricks", "subtle", "oswald", "normal", "normal", ["shadows"]),
    T12("anime", "hunter", "Hunter green", "Green aura, gold sparks, fireflies.", "hunter", "fireflies", "normal", "rubik", "normal", "normal", ["glow"], "soul"),
    T12("anime", "madness", "Madness moon", "Black and red under a crescent moon.", "madness", "moon", "sharp", "righteous", "normal", "normal", ["shadows"]),
    T12("anime", "breath", "Breath of flame", "Green-and-black checks with a flame-orange edge.", "breath", "checker", "subtle", "mincho", "normal", "normal", ["glow"], "flame"),
    T12("anime", "notebook", "Death's notebook", "Black, white and one red apple. Old print, steady rain.", "notebook", "rain", "sharp", "fell", "large", "normal", []),
    T12("anime", "lustrous", "Gem shore", "Mint and gold, crystals through frosted glass.", "lustrous", "crystals", "soft", "comfortaa", "normal", "normal", ["glass", "glow"]),
    T12("anime", "labmem", "Lab member", "Nixie-tube orange on lab-bench black, circuits in the walls.", "labmem", "circuit", "sharp", "techmono", "normal", "compact", ["scanlines", "glow"], "cross"),
    T12("anime", "hollow", "Hollow night", "White moon over a dark desert, with a cold green.", "hollow", "moon", "subtle", "inter", "normal", "normal", ["shadows"]),
    T12("anime", "reborn", "Reincarnation", "A spellbook page: parchment, ink, a magic circle.", "reborn", "magic", "subtle", "garamond", "large", "roomy", []),
    T12("anime", "devil", "Devil hunter", "Grime, orange and sparks.", "devil", "sparks", "sharp", "oswald", "normal", "normal", ["glow"]),
    T12("anime", "elements", "Four elements", "Water blue and fire orange over slow waves.", "elements", "waves", "soft", "quicksand", "normal", "normal", ["glass"]),
    // Soulbound
    T12("soulbound", "anima", "Anima", "Soul energy: violet and cyan wisps rising through glass.", "anima", "wisps", "soft", "manrope", "normal", "normal", ["glass", "glow"], "soul"),
    T12("soulbound", "lion", "Lion of Gold", "Golden eyes on black, gold dust in the air.", "lion", "gold", "subtle", "cinzel", "normal", "normal", ["glow", "shadows"], "star"),
    T12("soulbound", "olin", "Olin's flame", "Fire so hot it turns blue at the edges.", "olin", "sparks", "normal", "outfit", "normal", "normal", ["glow"], "flame"),
    T12("soulbound", "ray", "Ray", "Light and speed: bright streaks racing past.", "ray", "streaks", "soft", "exo", "normal", "normal", ["glow"]),
    T12("soulbound", "nullking", "The Null King", "A void that swallows the light, ringed in ultraviolet.", "nullking", "void", "sharp", "grotesk", "normal", "normal", ["glow", "shadows"]),
    T12("soulbound", "umbra", "Umbra", "Ancient, cursed, crimson. A blood-red moon.", "umbra", "moon", "sharp", "fell", "normal", "normal", ["shadows"]),
    T12("soulbound", "glassroots", "Glass roots", "Roots growing through green glass.", "glassroots", "roots", "soft", "lora", "normal", "roomy", ["glass"]),
    T12("soulbound", "soulforge", "Soul Forge", "Molten orange and a magic circle: the test.", "soulforge", "magic", "normal", "cinzel", "normal", "normal", ["glow", "shadows"], "flame"),
    T12("soulbound", "threemarks", "Three marks", "Bone white and red, three marks on stone.", "threemarks", "marks", "sharp", "fell", "normal", "normal", ["shadows"]),
    // moods
    T12("moods", "vaporwave", "Vaporwave", "Hot pink and cyan, a striped sunset over the grid.", "vaporwave", "sun", "sharp", "righteous", "normal", "normal", ["glow"]),
    T12("moods", "gothic", "Gothic", "Wine red and lilac, old print, damask walls.", "gothic", "damask", "subtle", "fell", "large", "normal", ["shadows"]),
    T12("moods", "nebula", "Nebula", "Drifting purple and teal clouds full of stars.", "nebula", "nebula", "soft", "manrope", "normal", "normal", ["glass", "drift"], "star"),
    T12("moods", "cyber", "Cyber rain", "Neon teal and pink in the rain.", "cyber", "rain", "sharp", "techmono", "normal", "normal", ["glow"], "cross"),
    T12("moods", "lofi", "Lo-fi night", "Soft pink and blue, fireflies, bubbles. Chill.", "lofi", "fireflies", "bubbly", "quicksand", "normal", "roomy", ["bubbles"], "heart"),
    T12("moods", "spooky", "Spooky", "Pumpkin orange and witchy purple under the moon.", "spooky", "moon", "normal", "righteous", "normal", "normal", ["glow"]),
    T12("moods", "winter", "Winter night", "Snow falling through frosted glass.", "winter", "snow", "soft", "nunito", "normal", "normal", ["glass"], "star"),
    T12("moods", "cottage", "Cottage", "A light, leafy kitchen-table look, handwritten.", "cottage", "leaves", "soft", "patrick", "large", "roomy", []),
    T12("moods", "y2k", "Y2K chrome", "Light and shiny, periwinkle and pink bubbles.", "y2k", "bokeh", "bubbly", "comfortaa", "normal", "normal", ["bubbles", "shadows"], "star"),
    T12("moods", "strawberry", "Strawberry milk", "Light pink everything, with hearts.", "strawberry", "hearts", "bubbly", "fredoka", "normal", "roomy", ["bubbles"], "heart"),
  );
  const TEMPLATE_GROUPS = [["all", "All"], ["mine", "Yours"], ["classic", "Classic"], ["games", "Games"], ["anime", "Anime"], ["soulbound", "Soulbound"], ["moods", "Moods"]];

  const DEFAULT_STACK = { palette: "fluxer", background: "none", corners: "site", font: "site", size: "site", spacing: "site", effects: [], accent: null, cursor: "site" };

  // the colors in use: a color set, or Fluxer's own (read from Fluxer's page), with your accent on top
  function tokens(stack, x) {
    const base = PALETTES[stack.palette] && !PALETTES[stack.palette].own ? PALETTES[stack.palette] : x.fluxer || PALETTES.discord;
    const t = { ...base };
    const acc = x.accent || stack.accent;
    if (acc) { t.accent = acc; t.link = t.link || acc; t.onAccent = readable(acc); }
    return t;
  }
  function readable(hex) {
    const m = String(hex || "").match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (!m) return "#ffffff";
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#111111" : "#ffffff";
  }
  const vars = (scope, obj) => scope + "{" + Object.entries(obj).filter(([, v]) => v != null && v !== "").map(([k, v]) => k + ":" + v + "!important").join(";") + "}";
  const bgLayer = (stack, t, x) => {
    const b = BACKGROUNDS[stack.background] || BACKGROUNDS.none;
    const css = b.css(t, x);
    if (!css) return null;
    return { css, size: b.size || "", anim: b.anim || "", moving: !!(b.moving || (stack.effects || []).includes("drift")), wall: stack.background === "wallpaper", strength: x.strength, blur: x.blur };
  };
  // moving backgrounds: a tiled pattern (like Damask) slides by exactly one tile and loops; anything else is
  // made a bit bigger than its box and pans slowly back and forth (a background exactly as big as its box
  // has nowhere to move, which is why "Moving background" did nothing before)
  const moveOf = (L) => {
    if (!L || !L.moving) return null;
    if (L.anim) return { size: L.size, anim: L.anim }; // a background with its own motion (Rain falls)
    const px = String(L.size || "").match(/^(\d+(?:\.\d+)?)px(?:\s+(\d+(?:\.\d+)?)px)?$/);
    if (px) { const w = +px[1], h = +(px[2] || px[1]); return { size: L.size, anim: "bcDriftT" + w + "x" + h + " " + Math.max(8, Math.round(w / 5)) + "s linear infinite" }; }
    return { size: /%/.test(L.size || "") ? L.size : "160% 160%", anim: "bcDrift 40s ease-in-out infinite alternate" };
  };
  const bgDecl = (L) => { const m = moveOf(L); return "background:" + L.css + ";" + (m ? "background-size:" + m.size + "!important;animation:" + m.anim + "!important;animation-play-state:running!important" : L.size ? "background-size:" + L.size : "") + (L.wall ? ";opacity:" + (Math.max(4, Math.min(80, Number(L.strength) || 30)) / 100).toFixed(2) + (L.blur ? ";filter:blur(" + L.blur + "px)" : "") : ""); };
  // while a video plays (the page marks it: see VIDEO_PAGE in shell.js), the moving background holds still and the
  // frosted glass goes plain, so the video gets the graphics chip to itself (with both busy, videos lagged and paused)
  const VID = ":root[data-bc-video]:not(#bcv1):not(#bcv2):not(#bcv3) ";
  const videoCalm = (moving, glass) => moving.map((x) => VID + x).join(",") + "{animation-play-state:paused!important;filter:none!important}" + (glass.length ? glass.map((x) => VID + x).join(",") + "{backdrop-filter:none!important}" : "");
  const KEYFRAMES = "@keyframes bcDrift{0%{background-position:0% 0%}100%{background-position:100% 100%}}" + Object.values(BACKGROUNDS).map((b) => { if (b.keyframes) return b.keyframes; const m = String(b.size || "").match(/^(\d+(?:\.\d+)?)px(?:\s+(\d+(?:\.\d+)?)px)?$/); if (!m) return ""; const w = +m[1], h = +(m[2] || m[1]); return "@keyframes bcDriftT" + w + "x" + h + "{from{background-position:0 0}to{background-position:" + w * 2 + "px " + h + "px}}"; }).join("");

  // ---------------- Fluxer ----------------
  // the selected channel row (its classes, as Fluxer's build names them)
  const SEL_CH = ":is([class*='ChannelItemSurface.module__channelItemSurfaceSelected'],[class*='ChannelItem.module__channelItemCoreSelected'])";
  function fluxerCss(stack, x) {
    const out = ["/* BelleCord theme: Fluxer */", KEYFRAMES,
      // the double server list replaces Fluxer's own (still on the page, out of sight, so it can be read)
      ":root,html[class],[data-flx='app.guilds-layout.guilds-layout']{--layout-guild-list-width:0px!important}",
      "[data-flx='app.guilds-layout.guild-list.guild-list-scroller-wrapper']{position:fixed!important;left:-400px!important;top:0!important;width:72px!important;height:100vh!important;--layout-guild-list-width:4.5rem;pointer-events:none!important}",
      "[data-flx='app.outline-frame.divider']{display:none!important}",
      "[data-flx='app.outline-frame.frame'],[data-flx='app.guilds-layout.content-container']{border-radius:0!important}"];
    const own = !PALETTES[stack.palette] || PALETTES[stack.palette].own;
    const t = tokens(stack, x), R = "html[data-bc-theme]";
    if (!own) out.push(vars(R + "," + R + " [data-flx='app.guilds-layout.guilds-layout']", {
      "--background-primary": t.floating, "--background-secondary": t.panel, "--background-secondary-lighter": t.chat, "--background-secondary-alt": t.raised,
      "--background-tertiary": t.raised, "--background-textarea": t.input, "--guild-list-foreground": t.raised, // (Fluxer's tertiary is its lightest background, used for cards and fields)
      "--text-primary": t.strong, "--text-chat": t.text, "--text-secondary": t.text, "--text-chat-muted": t.muted, "--text-primary-muted": t.muted,
      "--text-tertiary": t.muted, "--text-tertiary-muted": t.faint, "--text-tertiary-secondary": t.faint,
      "--user-area-divider-color": t.line, "--panel-control-bg": "color-mix(in srgb," + t.frame + " 50%," + t.panel + ")",
      "--background-modifier-hover": t.hover, "--background-modifier-selected": t.selected, "--background-modifier-accent": t.line,
      "--surface-interactive-hover-bg": t.hover, "--surface-interactive-selected-bg": t.selected, "--surface-interactive-selected-color": t.strong,
      "--scrollbar-thumb-bg": t.raised, "--scrollbar-thumb-bg-hover": t.raised, "--scrollbar-track-bg": "transparent",
    }));
    if (!own || x.accent || stack.accent) out.push(vars(R, { "--brand-primary": t.accent, "--brand-primary-light": t.link, "--brand-primary-fill": t.onAccent, "--accent-primary": t.accent, "--text-link": t.link }));
    if (!own) out.push(
      R + " [data-flx='app.guild-sidebar.guild-navbar']," + R + " [data-flx='channel.direct-message.dm-list.dm-list-container']," + R + " [data-flx='channel.member-list-container.member-list-container']," + R + " [data-flx='channel.member-list-container.member-list-scroller']{background:" + t.panel + "!important}",
      R + " [data-flx='app.guilds-layout.user-area-wrapper']," + R + " [data-flx='app.guilds-layout.user-area-wrapper'] [data-flx='app.user-area.user-area-inner.section']{background:color-mix(in srgb," + t.frame + " 50%," + t.panel + ")!important}",
      R + " " + SEL_CH + "{background:" + t.selected + "!important;color:" + t.strong + "!important}",
      R + " [data-flx='channel.lexical-channel-textarea-content.textarea-outer']{background:" + t.input + "!important}",
      R + " [data-flx='channel.lexical-channel-textarea-content.textarea-outer']::after{box-shadow:none!important}",
    );
    const r = (CORNERS[stack.corners] || {}).r;
    if (r != null) out.push(vars(R, { "--radius-sm": r * 0.5 + "px", "--radius-md": r * 0.75 + "px", "--radius-lg": r + "px", "--radius-xl": r * 1.5 + "px", "--footer-box-radius": r + "px", "--media-border-radius": Math.min(r, 12) + "px" }), R + " [data-flx='channel.lexical-channel-textarea-content.textarea-outer']{border-radius:" + r + "px!important}");
    const f = FONTS[stack.font];
    if (f && f.stack) out.push(vars(R, { "--font-sans": f.stack }), R + " body{font-family:" + f.stack + "}");
    const sz = (SIZES[stack.size] || {}).px;
    // (Fluxer puts its own text size and spacing on the message list itself, so these go there and win)
    if (sz) out.push(R + " [data-flx='channel.messages.messages-wrapper']{--message-line-height:" + Math.round(sz * 1.375) + "px!important}" + R + " [data-flx='channel.messages.messages-wrapper']," + R + " [data-flx='channel.message.article.alt-click']{font-size:" + sz + "px!important}" +
      R + " [data-flx='channel.message.article.alt-click'] :is([class*='Message.module__messageAuthorInfo'],[class*='Message.module__messageUsername']){font-size:" + sz + "px!important}" + R + " [data-flx='channel.message.article.alt-click'] [class*='Message.module__messageTimestamp']{font-size:" + Math.round(sz * 0.75) + "px!important}");
    const sp = (SPACING[stack.spacing] || {}).px;
    if (sp != null) out.push(R + " [data-flx='channel.messages.messages-wrapper']{--message-group-spacing:" + sp + "px!important}");
    const fx = new Set(stack.effects || []), L = bgLayer(stack, t, x);
    const grid = R + " [data-flx='channel.channel-view.channel-view-scaffold.channel-grid']:not([data-voice-text-split-view])";
    // Fluxer pauses every animation while its page isn't focused (inside the app, that's most of the time):
    // a moving background keeps moving anyway
    if (L && (L.moving || fx.has("drift"))) out.push(":root:not(#bc-a):not(#bc-b) body::before,:root:not(#bc-a):not(#bc-b) [data-flx='channel.channel-view.channel-view-scaffold.channel-grid']::before{animation-play-state:running!important}");
    const panels = [R + " [data-flx='app.guild-sidebar.guild-navbar']", R + " [data-flx='channel.direct-message.dm-list.dm-list-container']", R + " [data-flx='channel.member-list-container.member-list-container']", R + " [data-flx='channel.member-list-container.member-list-scroller']", R + " [data-flx='app.guilds-layout.user-area-wrapper']"].join(",");
    if (L && fx.has("glass")) { // behind everything, panels see-through
      out.push(R + " body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;" + bgDecl(L) + "}",
        R + " #root," + R + " [data-flx='app.guilds-layout.guilds-layout']{position:relative;z-index:1;background:transparent!important}",
        R + " [data-flx='app.guilds-layout.content-container']," + R + " [data-flx='app.guilds-layout.main-content']," + R + " [data-flx='app.outline-frame.frame']{background:transparent!important}",
        panels + "{background:color-mix(in srgb," + t.panel + " 62%,transparent)!important;backdrop-filter:blur(16px) saturate(1.15)}",
        grid + "{background:color-mix(in srgb," + t.chat + " 50%,transparent)!important;--composer-surface-color:transparent}",
        grid + " [data-flx='channel.channel-header.header-wrapper']," + grid + " [data-flx='channel.channel-header.header-container']{background:transparent!important}");
    } else if (L) { // behind the chat only
      out.push(grid + "{position:relative!important;background:" + (own ? "var(--background-secondary-lighter)" : t.chat) + "!important;--composer-surface-color:transparent}",
        grid + "::before{content:'';position:absolute;inset:" + (L.wall && L.blur ? -L.blur * 2 : 0) + "px;z-index:0;pointer-events:none;" + bgDecl(L) + "}",
        grid + ">*{position:relative;z-index:1}",
        grid + " [data-flx='channel.member-list-container.member-list-container']{position:relative;z-index:2}",
        grid + " [data-flx='channel.channel-header.header-wrapper']," + grid + " [data-flx='channel.channel-header.header-container']{background:transparent!important}",
        grid + " [class*='ChannelMessages.module__bottomFade']{display:none!important}");
    }
    if (fx.has("glow")) out.push(R + " " + SEL_CH + "{box-shadow:0 0 14px " + mix(t.accent, 45) + ",inset 0 0 0 1px " + mix(t.accent, 55) + "!important}",
      R + " [data-flx='channel.lexical-channel-textarea-content.textarea-outer']{box-shadow:0 0 0 1px " + mix(t.accent, 55) + ",0 0 22px " + mix(t.accent, 30) + "!important}");
    // bubbles: one bubble per run of messages (Fluxer already groups someone's messages in a row)
    if (fx.has("bubbles")) out.push(R + " [data-flx='channel.message-group.group']:not(:has([data-flx-system])){margin:3px 14px!important;padding-top:6px;padding-bottom:6px;border-radius:" + Math.max(10, r || 12) + "px;background:color-mix(in srgb," + t.raised + " 55%,transparent)}", R + " [data-flx='channel.message-group.group'] [class*='Message.module__messageGrouped']{padding-top:0!important;padding-bottom:0!important}");
    if (fx.has("shadows")) out.push(panels + "{box-shadow:0 0 28px rgba(0,0,0,.35)}");
    if (fx.has("scanlines")) out.push(grid + "::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}", grid + "{position:relative!important}");
    if (L) out.push(videoCalm(["body::before", "[data-flx='channel.channel-view.channel-view-scaffold.channel-grid']::before"], panels.split(",").map((x) => x.replace(R + " ", ""))));
    out.push(overlayFx(fx));
    if (fx.has("neon")) out.push(R + " [class*='Message.module__messageUsername']" + NEON);
    out.push(cursorCss(stack, t, "html[data-bc-theme]"));
    return out.join("\n");
  }

  // ---------------- Discord ----------------
  // Discord's class names look like "chat_f75fb0" / "message__5126c": match the name part, whatever comes after.
  const C = (n) => ':is([class^="' + n + '_"],[class*=" ' + n + '_"])';
  function discordCss(stack, x) {
    const out = ["/* BelleCord theme: Discord */", KEYFRAMES];
    const t = tokens(stack, x), S = "body,[class*='theme-']:not(.custom-user-profile-theme)";
    const ownUnread = (!PALETTES[stack.palette] || PALETTES[stack.palette].own) && !x.fluxer; // Fluxer's colors not read yet: leave Discord's
    if (!ownUnread) out.push(vars(S, {
      "--background-base-lowest": t.frame, "--background-base-lower": t.panel, "--background-base-low": t.panel, "--app-frame-background": t.frame,
      "--chat-background-default": t.chat, "--home-background": t.chat, "--background-surface-high": t.raised, "--background-surface-higher": t.raised,
      "--background-surface-highest": t.raised, "--bg-surface-raised": t.raised, "--bg-surface-overlay-tmp": t.floating, "--background-secondary-alt": t.frame,
      "--modal-background": t.panel, "--modal-footer-background": t.frame, "--card-background-default": t.raised, "--input-background-default": t.input,
      "--channeltextarea-background": t.input, "--background-mod-subtle": t.hover, "--background-mod-muted": t.hover, "--background-mod-normal": t.selected,
      "--background-mod-strong": t.selected, "--interactive-background-hover": t.hover, "--interactive-background-selected": t.selected,
      "--interactive-background-active": t.selected, "--border-subtle": t.line, "--border-normal": t.line, "--border-muted": t.line, "--border-strong": t.line, "--app-frame-border": t.line,
      "--text-default": t.text, "--text-strong": t.strong, "--text-muted": t.muted, "--text-subtle": t.muted, "--channels-default": t.muted,
      "--interactive-text-default": t.muted, "--interactive-text-hover": t.text, "--interactive-text-active": t.strong, "--interactive-icon-default": t.muted,
      "--interactive-icon-hover": t.text, "--interactive-icon-active": t.strong, "--icon-default": t.muted, "--icon-strong": t.text, "--icon-subtle": t.muted,
      "--icon-muted": t.faint, "--channel-icon": t.muted, "--chat-text-muted": t.faint, "--input-text-default": t.text, "--input-placeholder-text-default": t.faint,
      "--channel-text-area-placeholder": t.faint, "--scrollbar-thin-thumb": t.raised, "--scrollbar-auto-thumb": t.raised, "--scrollbar-auto-track": "transparent", "--scrollbar-thin-track": "transparent",
      // older names some parts still use
      "--background-primary": t.chat, "--background-secondary": t.panel, "--background-tertiary": t.frame, "--background-floating": t.floating,
      "--text-normal": t.text, "--header-primary": t.strong, "--header-secondary": t.muted, "--interactive-normal": t.muted, "--interactive-hover": t.text,
      "--interactive-active": t.strong, "--background-modifier-hover": t.hover, "--background-modifier-selected": t.selected, "--background-modifier-accent": t.line,
    }));
    if (!ownUnread || x.accent || stack.accent) out.push(vars(S, {
      "--brand-500": t.accent, "--brand-360": t.accent, "--brand-260": t.accent, "--background-brand": t.accent, "--control-brand-foreground": t.accent,
      "--control-primary-background-default": t.accent, "--control-primary-background-hover": t.accent, "--control-primary-background-active": t.accent,
      "--control-primary-text-default": t.onAccent, "--text-link": t.link, "--text-brand": t.accent, "--mention-foreground": t.link,
      "--mention-background": mix(t.accent, 22), "--message-mentioned-background-default": mix(t.accent, 10), "--message-mentioned-background-hover": mix(t.accent, 14),
      "--switch-background-selected-default": t.accent, "--checkbox-background-selected-default": t.accent, "--input-border-active": t.accent,
    }));
    // the double server list replaces Discord's own (still on the page, out of sight)
    out.push("nav[aria-label='Servers sidebar']," + C("guilds") + "{position:fixed!important;left:-400px!important;top:0!important;width:72px!important;height:100vh!important;pointer-events:none!important}");
    const r = (CORNERS[stack.corners] || {}).r;
    if (r != null) out.push(vars(S, { "--radius-xs": r * 0.35 + "px", "--radius-sm": r * 0.5 + "px", "--radius-md": r * 0.75 + "px", "--radius-lg": r + "px", "--radius-xl": r * 1.5 + "px" }), C("channelTextArea") + "," + C("scrollableContainer") + "{border-radius:" + r + "px!important}");
    const f = FONTS[stack.font];
    if (f && f.stack) out.push(vars(S, { "--font-primary": f.stack, "--font-display": f.stack, "--font-headline": f.stack }), "body{font-family:" + f.stack + "!important}");
    const sz = (SIZES[stack.size] || {}).px;
    if (sz) out.push("li[id^='chat-messages-'] [id^='message-content-'],li[id^='chat-messages-'] " + C("repliedTextContent") + "{font-size:" + sz + "px!important;line-height:1.4}");
    const sp = (SPACING[stack.spacing] || {}).px;
    if (sp != null) out.push("li[id^='chat-messages-'] " + C("groupStart") + "{margin-top:" + sp + "px!important}");
    const fx = new Set(stack.effects || []), L = bgLayer(stack, t, x);
    const panels = [C("sidebarList"), C("panels"), C("membersWrap"), C("privateChannels")].join(",");
    if (L && fx.has("glass")) {
      out.push(C("bg") + "{" + bgDecl(L).replace(/;opacity:[^;]+/, "") + "}",
        panels + "{background:color-mix(in srgb," + t.panel + " 62%,transparent)!important;backdrop-filter:blur(16px) saturate(1.15)}",
        C("chatContent") + "," + C("chat") + "," + C("subtitleContainer") + "{background:color-mix(in srgb," + t.chat + " 45%,transparent)!important}");
    } else if (L) {
      out.push(C("chat") + "{position:relative}",
        C("chat") + "::before{content:'';position:absolute;inset:" + (L.wall && L.blur ? -L.blur * 2 : 0) + "px;z-index:0;pointer-events:none;" + bgDecl(L) + "}",
        C("chat") + ">*{position:relative;z-index:1}",
        C("chatContent") + "," + C("subtitleContainer") + "," + C("messagesWrapper") + "{background:transparent!important}");
    }
    if (fx.has("glow")) out.push(C("modeSelected") + " " + C("link") + "{box-shadow:0 0 14px " + mix(t.accent, 45) + ",inset 0 0 0 1px " + mix(t.accent, 55) + "}",
      C("channelTextArea") + "{box-shadow:0 0 0 1px " + mix(t.accent, 55) + ",0 0 22px " + mix(t.accent, 30) + "!important}");
    // bubbles: someone's messages in a row share one bubble (rounded at the top of the run and at the bottom)
    if (fx.has("bubbles")) {
      const L = "li[id^='chat-messages-']", M = L + ">" + C("message"), rad = Math.max(10, r || 12) + "px";
      out.push(M + "{margin-left:14px!important;margin-right:14px!important;border-radius:0;background:color-mix(in srgb," + t.raised + " 55%,transparent)}",
        L + ">" + C("message") + C("groupStart") + "{border-top-left-radius:" + rad + ";border-top-right-radius:" + rad + "}",
        L + ":not(:has(+ " + L + ">" + C("message") + ":not(" + C("groupStart") + ")))>" + C("message") + "{border-bottom-left-radius:" + rad + ";border-bottom-right-radius:" + rad + ";margin-bottom:3px}");
    }
    if (fx.has("shadows")) out.push(panels + "{box-shadow:0 0 28px rgba(0,0,0,.35)}");
    if (fx.has("scanlines")) out.push(C("chat") + "{position:relative}", C("chat") + "::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}");
    if (L) out.push(videoCalm([C("bg"), C("chat") + "::before"], [C("sidebarList"), C("panels"), C("membersWrap"), C("privateChannels")]));
    out.push(overlayFx(fx));
    if (fx.has("neon")) out.push(C("username") + NEON);
    out.push(cursorCss(stack, t, "html"));
    return out.join("\n");
  }

  // ---------------- this app (server list, title bar, dashboard) ----------------
  function shellVars(stack, x) {
    const t = tokens(stack, x);
    const r = (CORNERS[stack.corners] || {}).r;
    const f = FONTS[stack.font];
    return { "--bg": t.frame, "--side": t.panel, "--main": t.chat, "--raised": t.raised, "--line": t.line, "--text": t.text, "--strong": t.strong, "--dim": t.muted, "--faint": t.faint, "--hover": t.hover, "--sel": t.selected, "--accent": t.accent, "--onaccent": t.onAccent, "--r": (r == null ? 8 : r) + "px", "--font": f && f.stack ? f.stack : "", "--light": t.dark === false ? "1" : "0" };
  }

  // Fluxer's own colors, read from Fluxer's page (runs there; our changes are switched off for that moment)
  const READ_FLUXER_COLORS = "(" + function () {
    var h = document.documentElement, had = h.hasAttribute("data-bc-theme");
    if (had) h.removeAttribute("data-bc-theme");
    var cs = getComputedStyle(h), probe = document.createElement("div");
    probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.appendChild(probe);
    var res = function (name, fallback) {
      var v = cs.getPropertyValue(name).trim() || fallback || "";
      if (!v) return null;
      probe.style.color = ""; probe.style.color = v;
      var c = getComputedStyle(probe).color;
      return c && c !== "rgba(0, 0, 0, 0)" ? c : null;
    };
    var out = {
      frame: res("--background-secondary"), panel: res("--background-secondary"), chat: res("--background-secondary-lighter"), raised: res("--background-secondary-alt"),
      input: res("--background-textarea"), floating: res("--background-primary"), hover: res("--background-modifier-hover"), selected: res("--background-modifier-selected"),
      line: res("--background-modifier-accent"), text: res("--text-chat"), strong: res("--text-primary"), muted: res("--text-chat-muted") || res("--text-tertiary"),
      faint: res("--text-tertiary-muted"), accent: res("--brand-primary"), onAccent: res("--brand-primary-fill"), link: res("--text-link") || res("--brand-primary-light"),
    };
    probe.remove();
    if (had) h.setAttribute("data-bc-theme", "");
    var m = String(out.chat || "").match(/\d+(\.\d+)?/g);
    out.dark = m ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < 0.5 : true;
    return out;
  }.toString() + ")()";

  // the colors, organized: "Fluxer's own" first, then the dark ones, then the light ones, each group in color order
  // (grays, reds, oranges and browns, greens, blues, purples, pinks). A color's family is its background's tint, or
  // its accent's when the background is plain gray.
  const PALETTE_GROUPS = (() => {
    const rgb = (h) => { const m = String(h || "").match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
    const chroma = (c) => Math.max(...c) - Math.min(...c);
    const hueOf = (c) => { const [r, g, b] = c.map((x) => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; return 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4); };
    const family = (p) => { const bg = rgb(p.chat), ac = rgb(p.accent); if (bg && chroma(bg) >= 10) return (hueOf(bg) + 15) % 360; if (ac && chroma(ac) >= 40) return (hueOf(ac) + 15) % 360; return -1; };
    const out = { own: [], dark: [], light: [] };
    for (const [k, p] of Object.entries(PALETTES)) (p.own ? out.own : p.dark === false ? out.light : out.dark).push(k);
    for (const g of ["dark", "light"]) out[g].sort((a, b) => family(PALETTES[a]) - family(PALETTES[b]));
    return out;
  })();

  window.bcThemes = { CURSORS, TEMPLATE_GROUPS, PALETTE_GROUP, cursorCss, PALETTES, PALETTE_GROUPS, BACKGROUNDS, CORNERS, FONTS, SIZES, SPACING, EFFECTS, CATS, TEMPLATES, DEFAULT_STACK, tokens, fluxerCss, discordCss, shellVars, READ_FLUXER_COLORS, bgLayer, bgDecl, mix, KEYFRAMES };
})();
