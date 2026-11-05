// Easier to use with a keyboard, a screen reader, or less movement:
//  - whatever has keyboard focus always shows a ring (the mouse doesn't show it)
//  - buttons that are only an icon get a name a screen reader can say (from their tooltip)
//  - things you can click that aren't real buttons can be reached with Tab and pressed with Enter or Space
//  - with "Animation effects" off in Windows (or "Reduce motion" on a Mac), BelleCord's own moving backgrounds and
//    animations stop too
(function () {
  "use strict";
  const css = document.createElement("style");
  css.textContent = [
    ":focus-visible{outline:2px solid #00a8fc !important;outline-offset:2px !important}",
    "@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}",
  ].join("");
  document.head.appendChild(css);
  const done = new WeakSet();
  const fix = () => {
    for (const el of document.querySelectorAll("button,[data-id],[data-g],[data-side],[onclick],.chip,.tile")) {
      if (done.has(el)) continue;
      done.add(el);
      const text = (el.textContent || "").trim();
      const tip = el.getAttribute("title") || "";
      if (!el.getAttribute("aria-label") && tip && (!text || text.length <= 2)) el.setAttribute("aria-label", tip);
      if (!/^(BUTTON|A|INPUT|SELECT|TEXTAREA|WEBVIEW)$/.test(el.tagName) && !el.hasAttribute("tabindex") && (el.onclick || el.hasAttribute("onclick") || el.matches("[data-id],[data-g],.chip,.tile"))) {
        el.setAttribute("tabindex", "0");
        if (!el.getAttribute("role")) el.setAttribute("role", "button");
      }
    }
  };
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if ((e.key === "Enter" || e.key === " ") && t && t.getAttribute && t.getAttribute("role") === "button" && t.tagName !== "BUTTON") { e.preventDefault(); t.click(); }
  });
  let timer = 0;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(fix, 400); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(fix, 1500);
})();
