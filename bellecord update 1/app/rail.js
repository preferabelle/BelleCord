// Reading both sites: their server lists (for the double list), unread DMs, voice channels and who's in them,
// people online, messages you can see, and their notifications (for the inbox). Everything comes from what each
// page already shows you; nothing is sent anywhere and nothing is done for you.
// Fluxer's hooks come from Fluxer's own code (its data-flx attributes); Discord's from its page as Discord's
// community themes use it (data-list-item-id, chat-messages ids, design class names).
(function () {
  "use strict";

  // ---------------- runs inside Fluxer's page ----------------
  const READ_FLUXER = "(" + function () {
    var bgUrl = function (el) { if (!el) return null; var s = el.style && el.style.backgroundImage || getComputedStyle(el).backgroundImage || ""; var m = s.match(/url\(["']?([^"')]+)["']?\)/); return m ? m[1] : null; };
    var num = function (t) { t = String(t || "").trim(); return /^\d{1,4}\+?$/.test(t) ? parseInt(t, 10) : 0; };
    var mentionsIn = function (label) { var m = String(label || "").match(/(\d+)\s+(unread\s+)?mentions?/i); return m ? +m[1] : 0; };
    var out = { ok: false, path: location.pathname, servers: [], dms: 0, voice: [], people: [], msgs: [], title: document.title };
    var col = document.querySelector('[data-flx="app.guilds-layout.guild-list.guild-list-scroller-wrapper"]');
    if (col) {
      out.ok = true;
      var seen = {}, fi = 0, nodes = col.querySelectorAll('[data-guild-id],[data-flx="app.sidebar-nav.guild-folder-item.folder-header.toggle-expanded"]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i], label = (el.getAttribute("aria-label") || "").trim();
        if (el.hasAttribute("data-guild-id")) {
          var id = el.getAttribute("data-guild-id"); if (!id || seen[id]) continue; seen[id] = 1;
          var host = el.parentElement || el, badge = el.querySelector('[data-flx$="guild-list-item-badges.guild-badge"]') || host.querySelector('[data-flx$="guild-list-item-badges.guild-badge"]');
          var m = Math.max(mentionsIn(label), badge ? num(badge.textContent) : 0);
          var icon = bgUrl(el.querySelector('[data-flx="app.sidebar-nav.guild-list-item-presentation.guild-icon"]'));
          var ini = el.querySelector('[data-flx="app.sidebar-nav.guild-list-item-presentation.guild-icon-initials"]');
          var sel = el.getAttribute("aria-current") === "page";
          var unread = !sel && (!!el.querySelector('[data-flx="app.sidebar-nav.guild-list-item-presentation.guild-indicator"]') || /\bunread\b/i.test(label));
          var name = label.split(",")[0].trim() || (ini ? ini.textContent : "Server");
          var inF = el.closest('[data-flx="app.sidebar-nav.guild-folder-item.render-expanded-guilds.expanded-guilds"]'), fbox = inF && inF.closest('[data-flx="app.sidebar-nav.guild-folder-item.folder-container"]');
          out.servers.push({ k: "g", id: id, name: name, icon: icon, ini: ini ? ini.textContent.trim() : "", m: m, u: unread ? 1 : 0, sel: sel ? 1 : 0, f: inF ? 1 : 0, color: fbox && fbox.style ? fbox.style.getPropertyValue("--folder-accent").trim() : "" });
        } else {
          var box = el.closest('[data-flx="app.sidebar-nav.guild-folder-item.folder-container"]') || el.parentElement, minis = [];
          var ms = box ? box.querySelectorAll('[data-flx^="app.sidebar-nav.guild-folder-item.mini-guild-icon.mini-guild-icon"]') : [];
          for (var j = 0; j < ms.length && minis.length < 4; j++) minis.push(bgUrl(ms[j]) || "ini:" + (ms[j].textContent || "").trim());
          var fb = box && box.querySelector('[data-flx="app.sidebar-nav.guild-folder-item.render-collapsed-folder.folder-badge"]');
          var fcolor = box && box.style ? box.style.getPropertyValue("--folder-accent").trim() : ""; // (the folder's own color)
          fi++; // folders are known by their place among folders, so opening one doesn't change the others
          var fopen = el.getAttribute("aria-expanded") === "true"; // (an open folder's servers show their own numbers)
          out.servers.push({ k: "f", id: "folder:" + fi, name: label.split(",")[0].replace(/\s*folder\s*$/i, "").trim() || "Folder", minis: minis, color: fcolor, m: fopen ? 0 : Math.max(mentionsIn(label), fb ? num(fb.textContent) : 0), u: !fopen && /,\s*unread/i.test(label) ? 1 : 0, open: fopen ? 1 : 0 });
        }
      }
      var dmItems = col.querySelectorAll('[data-flx="app.sidebar-nav.guild-list-dm-item.dm-list-item.button.select"]');
      for (var d = 0; d < dmItems.length; d++) out.dms += Math.max(1, mentionsIn(dmItems[d].getAttribute("aria-label")));
    }
    // the open server: its name, its voice channels and who's in them
    var gm = location.pathname.match(/^\/channels\/(\d+)/), gid = gm ? gm[1] : null;
    var gname = document.querySelector('[data-flx="app.guild-header.guild-name"]');
    out.guild = gid ? { id: gid, name: gname ? gname.textContent.trim() : "" } : null;
    // a channel row (the clickable part; Fluxer puts its name in data-dnd-name and "name, voice channel, selected" in its label)
    var CH = '[data-flx="app.generic-channel-item.long-pressable.click"][data-dnd-name],[data-channel-list-focus-item="true"][data-dnd-name]';
    var chSel = document.querySelector('[data-flx="app.generic-channel-item.long-pressable.click"][aria-current="page"],[data-channel-list-focus-item="true"][aria-current="page"]');
    out.channel = chSel ? (chSel.getAttribute("data-dnd-name") || "") : "";
    if (gid) {
      var items = document.querySelectorAll(CH);
      for (var v = 0; v < items.length; v++) {
        var lab = items[v].getAttribute("aria-label") || "";
        if (!/,\s*voice channel/i.test(lab)) continue;
        var vname = items[v].getAttribute("data-dnd-name") || lab.split(",")[0];
        var users = [], next = items[v].closest('[data-flx="app.generic-channel-item.div"]') || items[v];
        var list = null;
        for (var hop = next.nextElementSibling, n2 = 0; hop && n2 < 3; hop = hop.nextElementSibling, n2++) { if (hop.matches && hop.matches('[data-flx="app.voice-participants-list.container"]')) { list = hop; break; } var inner = hop.querySelector && hop.querySelector('[data-flx="app.voice-participants-list.container"]'); if (inner) { list = inner; break; } if (hop.querySelector && hop.querySelector('[data-flx="app.channel-item.generic-channel-item.select"]')) break; }
        if (list) {
          var ps = list.querySelectorAll('[data-flx-user-id]'), pseen = {};
          for (var p = 0; p < ps.length && users.length < 12; p++) { var uid = ps[p].getAttribute("data-flx-user-id"); if (pseen[uid]) continue; pseen[uid] = 1; var img = ps[p].querySelector("img"); users.push({ name: ps[p].getAttribute("data-flx-user-name") || "", avatar: img ? img.currentSrc || img.src : bgUrl(ps[p]) }); }
        }
        out.voice.push({ guild: gid, guildName: out.guild.name, name: vname, users: users, connected: /,\s*connected/i.test(lab) ? 1 : 0 });
      }
    }
    // people online you can see (member list, DMs, friends, voice)
    var avs = document.querySelectorAll('[data-flx-user-id][data-flx-status]'), seenP = {};
    for (var a = 0; a < avs.length && out.people.length < 80; a++) {
      var av = avs[a], st = av.getAttribute("data-flx-status");
      if (!/^(online|idle|dnd)$/.test(st) || av.getAttribute("data-flx-user-self") === "true" || av.getAttribute("data-flx-user-bot") === "true") continue;
      var pid = av.getAttribute("data-flx-user-id"); if (seenP[pid]) continue; seenP[pid] = 1;
      var pim = av.querySelector("img");
      out.people.push({ id: pid, name: av.getAttribute("data-flx-user-name") || av.getAttribute("data-flx-user-username") || "", status: st, avatar: pim ? pim.currentSrc || pim.src : bgUrl(av) });
    }
    // you (for your game badges)
    var meEl = document.querySelector('[data-flx-user-self="true"][data-flx-user-id]');
    if (meEl) { var mim = meEl.querySelector("img"); out.me = { id: meEl.getAttribute("data-flx-user-id"), name: meEl.getAttribute("data-flx-user-name") || "", avatar: mim ? mim.currentSrc || mim.src : null }; }
    // messages you can see (each with its own author's picture, not the one of a message it replies to)
    var arts = document.querySelectorAll('[data-flx-message-id][data-flx-author-id]'), avBy = {};
    for (var q2 = 0; q2 < arts.length; q2++) { var aid0 = arts[q2].getAttribute("data-flx-author-id"), ai = arts[q2].querySelector('[data-flx-user-id="' + aid0 + '"] img'); if (ai && !avBy[aid0]) avBy[aid0] = ai.currentSrc || ai.src; }
    for (var k = Math.max(0, arts.length - 60); k < arts.length; k++) {
      var e = arts[k];
      if (e.getAttribute("data-flx-system") === "true") continue;
      var txt = e.querySelector('[data-search-highlight-scope="message"]'); // (the message's own text, not the reply preview above it)
      out.msgs.push({ id: e.getAttribute("data-flx-message-id"), ch: e.getAttribute("data-flx-channel-id"), g: e.getAttribute("data-flx-guild-id") || "@me", author: e.getAttribute("data-flx-author-name") || "", aid: e.getAttribute("data-flx-author-id"), self: e.getAttribute("data-flx-author-self") === "true" ? 1 : 0, bot: e.getAttribute("data-flx-author-bot") === "true" ? 1 : 0, mention: e.getAttribute("data-flx-mentioned") === "true" ? 1 : 0, text: txt ? txt.textContent.slice(0, 160) : "", avatar: avBy[e.getAttribute("data-flx-author-id")] || null });
    }
    if (window.__bcN && window.__bcN.length) out.notes = window.__bcN.splice(0);
    return out;
  }.toString() + ")()";

  // ---------------- runs inside Discord's page ----------------
  const READ_DISCORD = "(" + function () {
    var has = function (el, name) { var c = el && el.getAttribute && el.getAttribute("class") || ""; return new RegExp("(^|\\s)" + name + "_").test(c); };
    var q = function (root, name) { return root.querySelector('[class^="' + name + '_"],[class*=" ' + name + '_"]'); };
    var qa = function (root, name) { return root.querySelectorAll('[class^="' + name + '_"],[class*=" ' + name + '_"]'); };
    var num = function (t) { t = String(t || "").trim(); return /^\d{1,4}\+?$/.test(t) ? parseInt(t, 10) : 0; };
    var out = { ok: false, path: location.pathname, servers: [], dms: 0, voice: [], people: [], msgs: [], title: document.title };
    var nav = document.querySelector('nav[aria-label="Servers sidebar"]') || q(document, "guilds");
    if (nav) {
      out.ok = true;
      var sep = q(nav, "guildSeparator"), seen = {};
      var nodes = nav.querySelectorAll('[data-list-item-id^="guildsnav___"]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i], key = el.getAttribute("data-list-item-id").slice(12);
        var label = (el.getAttribute("aria-label") || "").trim(), img = el.querySelector("img"), src = img ? img.currentSrc || img.src : null;
        var li = el.closest('[class^="listItem_"],[class*=" listItem_"]') || el.parentElement;
        var am = label.match(/(\d+)\s+mentions?/i), m = am ? +am[1] : 0;
        if (li) { var bs = li.querySelectorAll('[class^="numberBadge_"],[class*=" numberBadge_"]'); for (var b = 0; b < bs.length; b++) m = Math.max(m, num(bs[b].textContent)); }
        if (el.hasAttribute("aria-expanded")) { // a folder
          var imgs = el.querySelectorAll("img"), minis = [];
          for (var j = 0; j < imgs.length && minis.length < 4; j++) minis.push(imgs[j].currentSrc || imgs[j].src);
          var dopen = el.getAttribute("aria-expanded") === "true";
          out.servers.push({ k: "f", id: "folder:" + key, key: key, name: label.replace(/,?\s*folder.*$/i, "") || "Folder", minis: minis, m: dopen ? 0 : m, open: dopen ? 1 : 0 });
          continue;
        }
        if (!/^\d{5,25}$/.test(key) || seen[key]) continue;
        var beforeSep = sep && (sep.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
        if (beforeSep || (src && /\/(avatars|channel-icons)\//.test(src))) { out.dms += m || 1; continue; } // an unread DM bubble, not a server
        seen[key] = 1;
        var pill = li && li.querySelector('[class^="pill_"] [class^="item_"],[class*=" pill_"] [class*=" item_"],[class^="pill_"] span,[class*=" pill_"] span');
        var ph = pill ? parseFloat(pill.style.height || getComputedStyle(pill).height) || 0 : 0;
        var sel = has(el, "selected") || ph >= 30 || el.getAttribute("aria-selected") === "true";
        out.servers.push({ k: "g", id: key, name: label.replace(/^\d+\s+mentions?,\s*/i, "").replace(/,?\s*unread.*$/i, "").replace(/,.*$/, "") || "Server", icon: src, ini: img ? "" : (el.textContent || "").trim().slice(0, 4), m: m, u: !sel && ph > 0 && ph < 30 ? 1 : 0, sel: sel ? 1 : 0, f: el.closest('[class^="folderGroup_"],[class*=" folderGroup_"]') ? 1 : 0 });
      }
    }
    var gm = location.pathname.match(/^\/channels\/(\d+)\/(\d+)?/), gid = gm ? gm[1] : null;
    var parts = String(document.title || "").replace(/^\(\d+\+?\)\s*/, "").replace(/^[•●]\s*/, "").split(/\s+\|\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s && !/^discord$/i.test(s); });
    var chPart = parts.filter(function (s) { return /^[#@]/.test(s); })[0] || "";
    var gName = parts.filter(function (s) { return !/^[#@]/.test(s); })[0] || "";
    out.guild = gid ? { id: gid, name: gName } : null;
    out.channel = chPart.replace(/^[#@]/, "");
    // voice channels in the open server and who's in them
    if (gid) {
      var chans = document.querySelectorAll('[data-list-item-id^="channels___"]');
      for (var v = 0; v < chans.length; v++) {
        var c = chans[v], lab = (c.getAttribute("aria-label") || "").toLowerCase();
        if (lab.indexOf("voice") < 0 && lab.indexOf("stage") < 0) continue;
        var cid = c.getAttribute("data-list-item-id").slice(11);
        var holder = c.closest("li") || c.parentElement, users = [];
        var us = holder ? holder.querySelectorAll('[class^="voiceUser_"],[class*=" voiceUser_"]') : [];
        for (var u = 0; u < us.length && users.length < 12; u++) {
          var nm = us[u].querySelector('[class^="username_"],[class*=" username_"],[class*="usernameFont"]'), uav = us[u].querySelector('[class^="avatar_"],[class*=" avatar_"]');
          var avs = uav ? (uav.style.backgroundImage || "").match(/url\(["']?([^"')]+)/) : null;
          users.push({ name: (nm || us[u]).textContent.trim().split("\n")[0], avatar: avs ? avs[1] : (us[u].querySelector("img") || {}).src || null });
        }
        var nameEl = c.querySelector('[class^="name_"],[class*=" name_"]');
        out.voice.push({ guild: gid, guildName: gName, cid: cid, name: (nameEl ? nameEl.textContent : (c.getAttribute("aria-label") || "").split(/[,(]/)[0]).trim(), users: users });
      }
    }
    // people online you can see (member list, DMs, friends)
    var marks = document.querySelectorAll('rect[mask*="svg-mask-status-"],[class*="status_"][aria-label]'), seenP = {};
    for (var s = 0; s < marks.length && out.people.length < 80; s++) {
      var mk = marks[s], mask = mk.getAttribute("mask") || "", stt = (mask.match(/status-(online|idle|dnd|streaming)/) || [])[1];
      if (!stt) continue;
      var row = mk.closest('[class^="member_"],[class*=" member_"],[class^="peopleListItem_"],[class*=" peopleListItem_"],[class^="channel__"],[class*=" channel__"],[class^="channel_"],[class*=" channel_"],li');
      if (!row || row.closest('[class^="panels_"],[class*=" panels_"]')) continue; // (not yourself in the bottom bar)
      var nameEl2 = row.querySelector('[class^="name_"],[class*=" name_"],[class^="username_"],[class*=" username_"],[class*="nameAndDecorators"]');
      var pn = nameEl2 ? nameEl2.textContent.trim().split("\n")[0] : ""; if (!pn || seenP[pn]) continue; seenP[pn] = 1;
      var pim = row.querySelector("img");
      out.people.push({ id: pn, name: pn, status: stt === "streaming" ? "online" : stt, avatar: pim ? pim.currentSrc || pim.src : null });
    }
    // you (for your game badges): the picture in the bottom bar carries your account number
    var pan = q(document, "panels");
    if (pan) { var pims = pan.querySelectorAll("img"); for (var pi = 0; pi < pims.length; pi++) { var mm = (pims[pi].currentSrc || pims[pi].src || "").match(/\/avatars\/(\d{5,25})\//); if (mm) { out.me = { id: mm[1], name: "", avatar: pims[pi].currentSrc || pims[pi].src }; break; } } }
    // messages you can see
    var lis = document.querySelectorAll('li[id^="chat-messages-"]'), last = null, avByName = {};
    var ownAv = function (L) { var ims = L.querySelectorAll('img[class^="avatar_"],img[class*=" avatar_"]'); for (var z = 0; z < ims.length; z++) if (!ims[z].closest('[class^="repliedMessage_"],[class*=" repliedMessage_"]')) return ims[z].currentSrc || ims[z].src; return null; };
    for (var k = 0; k < lis.length; k++) {
      var L = lis[k], idp = L.id.split("-");
      var mid = idp[idp.length - 1], chid = idp[idp.length - 2];
      var un = L.querySelector('[id^="message-username-"]');
      var author = un ? un.textContent.trim().split("\n")[0] : last;
      if (un) { last = author; var oa = ownAv(L); if (oa) avByName[author] = oa; }
      if (k < lis.length - 60) continue;
      var body = L.querySelector('[id^="message-content-"]'), av3 = un ? ownAv(L) : null;
      if (av3 && author) avByName[author] = av3;
      var mdiv = L.firstElementChild;
      out.msgs.push({ id: mid, ch: chid, g: gid || "@me", author: author || "", self: 0, mention: mdiv && /(^|\s)mentioned_/.test(mdiv.getAttribute("class") || "") ? 1 : 0, text: body ? body.textContent.slice(0, 160) : "", avatar: av3 || avByName[author] || null });
    }
    if (window.__bcN && window.__bcN.length) out.notes = window.__bcN.splice(0);
    return out;
  }.toString() + ")()";

  // notifications from either site land in the inbox too (it keeps them, then shows them as usual)
  const HOOK_NOTIFS = "(" + function () {
    if (window.__bcHooked) return 1;
    window.__bcHooked = 1; window.__bcN = []; window.__bcNObj = {};
    var keep = function (title, opts, obj) {
      try {
        var key = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
        var o = opts || {}, data = o.data || {};
        window.__bcN.push({ key: key, title: String(title || ""), body: String(o.body || ""), icon: o.icon || "", url: data.url || "", path: location.pathname, at: Date.now() });
        if (obj) window.__bcNObj[key] = obj;
        if (window.__bcN.length > 50) window.__bcN.splice(0, window.__bcN.length - 50);
      } catch (e) {}
    };
    try {
      var N = window.Notification;
      if (N) {
        var W = function (title, opts) { var n = new N(title, opts); keep(title, opts, n); return n; };
        W.prototype = N.prototype;
        Object.defineProperty(W, "permission", { get: function () { return N.permission; } });
        W.requestPermission = function () { return N.requestPermission.apply(N, arguments); };
        Object.defineProperty(W, "maxActions", { get: function () { return N.maxActions; } });
        window.Notification = W;
      }
    } catch (e) {}
    try {
      var SR = window.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype;
      if (SR && SR.showNotification && !SR.__bc) { var orig = SR.showNotification; SR.showNotification = function (title, opts) { keep(title, opts, null); return orig.apply(this, arguments); }; SR.__bc = 1; }
    } catch (e) {}
    return 1;
  }.toString() + ")()";

  // ---------------- do something on the site's page (a click you made on the app) ----------------
  const ACT = function (side, what, arg) {
    var tap = function (el) { var r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + 4, clientY: r.top + 4, button: 0 }; try { el.dispatchEvent(new PointerEvent("pointerdown", o)); el.dispatchEvent(new MouseEvent("mousedown", o)); el.dispatchEvent(new PointerEvent("pointerup", o)); el.dispatchEvent(new MouseEvent("mouseup", o)); } catch (e) {} el.click(); return 1; };
    var toggle = function (fe) { var before = fe.getAttribute("aria-expanded"); tap(fe); return new Promise(function (res) { setTimeout(function () { if (fe.isConnected && fe.getAttribute("aria-expanded") === before) fe.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true })); res(1); }, 150); }); };
    var go = function (path) { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate", { state: {} })); return 1; };
    if (what === "path") return go(arg);
    if (what === "note") { var n = window.__bcNObj && window.__bcNObj[arg]; if (n) { try { if (typeof n.onclick === "function") n.onclick({ preventDefault: function () {}, target: n }); else n.dispatchEvent(new Event("click")); return 1; } catch (e) {} } return 0; }
    if (side === "fluxer") {
      var col = document.querySelector('[data-flx="app.guilds-layout.guild-list.guild-list-scroller-wrapper"]');
      if (what === "dm") return go("/channels/@me");
      if (what === "add") { var ab = document.querySelector('[data-flx="app.sidebar-nav.add-guild-button.button.add-guild"]'); if (ab) { ab.click(); return 1; } return 0; }
      if (what === "g") { var g = col && col.querySelector('[data-guild-id="' + arg + '"]'); if (g) return tap(g); return go("/channels/" + arg); }
      if (what === "f") { var fs = col ? col.querySelectorAll('[data-flx="app.sidebar-nav.guild-folder-item.folder-header.toggle-expanded"]') : []; var fe = fs[parseInt(String(arg).split(":")[1], 10) - 1]; if (fe) return toggle(fe); return 0; }
      if (what === "voice") { var items = document.querySelectorAll('[data-flx="app.generic-channel-item.long-pressable.click"][data-dnd-name],[data-channel-list-focus-item="true"][data-dnd-name]'); for (var v = 0; v < items.length; v++) if ((items[v].getAttribute("data-dnd-name") || "") === arg && /voice channel/i.test(items[v].getAttribute("aria-label") || "")) { items[v].click(); return 1; } return 0; }
    } else {
      var nav = document.querySelector('nav[aria-label="Servers sidebar"]') || document.querySelector('[class^="guilds_"],[class*=" guilds_"]');
      var press = function (key) { var el = nav && nav.querySelector('[data-list-item-id="guildsnav___' + key + '"]'); if (!el) return 0; return el.hasAttribute("aria-expanded") ? toggle(el) : tap(el); };
      if (what === "dm") return press("home") || go("/channels/@me");
      if (what === "add") return press("create-join-button");
      if (what === "g") return press(arg) || go("/channels/" + arg);
      if (what === "f") return press(String(arg).replace(/^folder:/, ""));
      if (what === "voice") { var c = document.querySelector('[data-list-item-id="channels___' + arg + '"]'); if (c) { c.click(); return 1; } return 0; }
    }
    return 0;
  }.toString();

  // ---------------- the server lists in the app ----------------
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join("").slice(0, 3);
  const FOLDER_SVG = '<svg class="fold" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4.1c.6 0 1.2.3 1.6.7L12.6 6H18.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z"/></svg>';
  const blank = () => ({ items: [], path: "", dms: 0, sig: "", voice: [], people: [], msgs: [], guild: null, channel: "", ok: false });
  const state = { fluxer: blank(), discord: blank() };

  function itemEl(side, it) {
    const b = document.createElement("button");
    b.className = "ri"; b.dataset.side = side; b.dataset.kind = it.k; b.dataset.id = it.id;
    b.innerHTML = '<span class="pic"></span><i class="ping"></i><i class="pill"></i>';
    b.addEventListener("click", () => window.bcRail.press(side, it.k === "f" ? "f" : "g", b.dataset.id));
    return b;
  }
  function paint(b, it) {
    const look = (it.k === "f" ? "f:" + (it.open ? "open" : (it.minis || []).join("|")) : "g:" + (it.icon || "") + ":" + it.name) + ":" + (it.color || "");
    if (b.dataset.look !== look) {
      b.dataset.look = look;
      const pic = b.querySelector(".pic");
      if (it.k === "f") {
        // an open folder (or one with its own icon) shows a folder; a closed one shows its first four servers
        pic.innerHTML = it.open || !(it.minis || []).length ? FOLDER_SVG : '<span class="minis">' + it.minis.map((s) => (String(s).startsWith("ini:") ? '<span class="mini">' + esc(s.slice(4)) + "</span>" : '<img src="' + esc(s) + '" alt="">')).join("") + "</span>";
      } else pic.innerHTML = it.icon ? '<img src="' + esc(it.icon) + '" alt="">' : '<span class="ini">' + esc(it.ini || initials(it.name)) + "</span>";
      if (it.color) b.style.setProperty("--fcol", it.color); else b.style.removeProperty("--fcol"); // (a folder's own color)
      b.title = it.name; b.setAttribute("aria-label", it.name);
    }
    b.classList.toggle("folder", it.k === "f");
    b.classList.toggle("open", !!it.open);
    b.classList.toggle("infolder", !!it.f);
    b.classList.toggle("sel", !!it.sel);
    b.classList.toggle("unread", !!it.u && !it.sel);
    const ping = b.querySelector(".ping"), t = it.m ? (it.m > 99 ? "99+" : String(it.m)) : "";
    if (ping.textContent !== t) ping.textContent = t;
    ping.classList.toggle("on", !!it.m);
  }
  const place = (box, kids) => { kids.forEach((k, i) => { if (box.children[i] !== k) box.insertBefore(k, box.children[i] || null); }); while (box.children.length > kids.length) box.lastElementChild.remove(); }; // (only moves what moved)
  function draw(side) {
    const list = document.querySelector('#rail .col[data-side="' + side + '"] .list');
    if (!list) return;
    const st = state[side];
    const have = new Map([...list.querySelectorAll(".ri")].map((c) => [c.dataset.id, c]));
    const boxes = new Map([...list.querySelectorAll(".fgroup")].map((c) => [c.dataset.id, c]));
    const top = [], inBox = new Map(); let open = null;
    for (const it of st.items) {
      const b = have.get(it.id) || itemEl(side, it); paint(b, it);
      if (it.k === "f" && it.open) {
        let g = boxes.get(it.id); if (!g) { g = document.createElement("div"); g.className = "fgroup"; g.dataset.id = it.id; }
        if (it.color) g.style.setProperty("--fcol", it.color); else g.style.removeProperty("--fcol");
        open = g; inBox.set(g, [b]); top.push(g);
      } else if (it.f && open) inBox.get(open).push(b);
      else { open = null; top.push(b); }
    }
    for (const [g, kids] of inBox) place(g, kids);
    place(list, top);
    const col = document.querySelector('#rail .col[data-side="' + side + '"]');
    if (col) col.classList.toggle("empty", !st.items.length);
  }

  // ---------------- reading loop ----------------
  const wv = (side) => document.getElementById("wv-" + side);
  const ready = { fluxer: false, discord: false };
  async function read(side) {
    const v = wv(side);
    if (!ready[side] || !v || !v.executeJavaScript) return;
    let r = null;
    try { r = await v.executeJavaScript(side === "fluxer" ? READ_FLUXER : READ_DISCORD); } catch { return; }
    if (!r || typeof r !== "object") return;
    const notes = r.notes || []; delete r.notes;
    const items = Array.isArray(r.servers) ? r.servers : [];
    const sig = JSON.stringify([items, r.path, r.dms]);
    const st = state[side];
    Object.assign(st, { path: r.path || "", dms: r.dms || 0, voice: r.voice || [], people: r.people || [], msgs: r.msgs || [], guild: r.guild || null, channel: r.channel || "", ok: !!r.ok, title: r.title || "", me: r.me || st.me || null });
    if (sig !== st.sig) { st.sig = sig; st.items = items; draw(side); }
    window.dispatchEvent(new CustomEvent("bc-read", { detail: { side, notes } }));
  }
  const visible = (side) => { const m = document.body.dataset.mode; return m === side || m === "both"; };
  let n = 0;
  setInterval(() => { n++; for (const s of ["fluxer", "discord"]) if (visible(s) || n % 3 === 0) read(s); }, 2000);
  for (const s of ["fluxer", "discord"]) {
    const v = wv(s);
    if (!v) continue;
    v.addEventListener("dom-ready", () => { ready[s] = true; v.executeJavaScript(HOOK_NOTIFS).catch(() => {}); setTimeout(() => read(s), 800); });
    v.addEventListener("did-navigate-in-page", () => setTimeout(() => read(s), 200));
  }

  async function act(side, what, arg) {
    const v = wv(side);
    if (!v || !v.executeJavaScript) return 0;
    try { return await v.executeJavaScript("(" + ACT + ")(" + JSON.stringify(side) + "," + JSON.stringify(what) + "," + JSON.stringify(arg ?? null) + ")"); } catch { return 0; }
  }
  window.bcRail = {
    state, read, act,
    async press(side, kind, id) {
      if (window.bcOnServer) window.bcOnServer(side, kind);
      await act(side, kind, id);
      setTimeout(() => read(side), 250); setTimeout(() => read(side), 900);
    },
    // join a voice channel: open its server first, then press the channel (both are your clicks, passed on)
    async joinVoice(side, guild, nameOrId) {
      if (window.bcOnServer) window.bcOnServer(side, "g");
      if (!state[side].path.startsWith("/channels/" + guild)) { await act(side, "g", guild); await new Promise((r) => setTimeout(r, 900)); }
      const ok = await act(side, "voice", nameOrId);
      setTimeout(() => read(side), 600);
      return ok;
    },
    waiting() { const out = []; for (const s of ["fluxer", "discord"]) for (const it of state[s].items) if (it.k === "g" && it.m) out.push({ side: s, ...it }); return out.sort((a, b) => b.m - a.m); },
  };
})();
