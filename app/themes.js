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
  };

  // ---------------- backgrounds (drawn behind the chat; behind everything with the Glass effect) ----------------
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
  };
  const mix = (c, pct) => "color-mix(in srgb," + c + " " + pct + "%,transparent)";

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
  const SIZES = { site: { name: "As the site has it", px: null }, small: { name: "Small", px: 14 }, normal: { name: "Normal", px: 16 }, large: { name: "Large", px: 18 }, huge: { name: "Huge", px: 20 } };
  const SPACING = { site: { name: "As the site has it", px: null }, compact: { name: "Compact", px: 4 }, normal: { name: "Normal", px: 16 }, roomy: { name: "Roomy", px: 26 } };
  const EFFECTS = {
    glass: { name: "Glass", hint: "See-through panels over the background" },
    glow: { name: "Glow", hint: "A soft glow on what's selected and on the message box" },
    bubbles: { name: "Bubbles", hint: "Messages in a rounded bubble (one per person\u2019s messages in a row)" },
    shadows: { name: "Soft shadows", hint: "Panels float a little" },
    scanlines: { name: "Scanlines", hint: "An old-monitor shimmer over the chat" },
    drift: { name: "Moving background", hint: "The background slowly drifts" },
  };
  const CATS = [
    { key: "palette", name: "Colors", set: PALETTES },
    { key: "background", name: "Background", set: BACKGROUNDS },
    { key: "corners", name: "Corners", set: CORNERS },
    { key: "font", name: "Font", set: FONTS },
    { key: "size", name: "Text size", set: SIZES },
    { key: "spacing", name: "Spacing", set: SPACING },
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
  ];

  const DEFAULT_STACK = { palette: "fluxer", background: "none", corners: "site", font: "site", size: "site", spacing: "site", effects: [], accent: null };

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
    return { css, size: b.size || "", moving: !!(b.moving || (stack.effects || []).includes("drift")), wall: stack.background === "wallpaper", strength: x.strength, blur: x.blur };
  };
  // moving backgrounds: a tiled pattern (like Damask) slides by exactly one tile and loops; anything else is
  // made a bit bigger than its box and pans slowly back and forth (a background exactly as big as its box
  // has nowhere to move, which is why "Moving background" did nothing before)
  const moveOf = (L) => {
    if (!L || !L.moving) return null;
    const px = String(L.size || "").match(/^(\d+(?:\.\d+)?)px(?:\s+(\d+(?:\.\d+)?)px)?$/);
    if (px) { const w = +px[1], h = +(px[2] || px[1]); return { size: L.size, anim: "bcDriftT" + w + "x" + h + " " + Math.max(8, Math.round(w / 5)) + "s linear infinite" }; }
    return { size: /%/.test(L.size || "") ? L.size : "160% 160%", anim: "bcDrift 40s ease-in-out infinite alternate" };
  };
  const bgDecl = (L) => { const m = moveOf(L); return "background:" + L.css + ";" + (m ? "background-size:" + m.size + "!important;animation:" + m.anim + "!important;animation-play-state:running!important" : L.size ? "background-size:" + L.size : "") + (L.wall ? ";opacity:" + (Math.max(4, Math.min(80, Number(L.strength) || 30)) / 100).toFixed(2) + (L.blur ? ";filter:blur(" + L.blur + "px)" : "") : ""); };
  const KEYFRAMES = "@keyframes bcDrift{0%{background-position:0% 0%}100%{background-position:100% 100%}}" + Object.values(BACKGROUNDS).map((b) => { const m = String(b.size || "").match(/^(\d+(?:\.\d+)?)px(?:\s+(\d+(?:\.\d+)?)px)?$/); if (!m) return ""; const w = +m[1], h = +(m[2] || m[1]); return "@keyframes bcDriftT" + w + "x" + h + "{from{background-position:0 0}to{background-position:" + w * 2 + "px " + h + "px}}"; }).join("");

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

  window.bcThemes = { PALETTES, BACKGROUNDS, CORNERS, FONTS, SIZES, SPACING, EFFECTS, CATS, TEMPLATES, DEFAULT_STACK, tokens, fluxerCss, discordCss, shellVars, READ_FLUXER_COLORS, bgLayer, bgDecl, mix, KEYFRAMES };
})();
