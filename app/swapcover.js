// runs before first paint during a profile switch: covers the reload with the swap color (profiles.js removes it)
(function () {
  try {
    const s = JSON.parse(sessionStorage.getItem("bcSwapTo") || "null");
    if (!s || Date.now() - s.at > 15000) return;
    const d = document.documentElement;
    d.classList.add("bc-swapping");
    d.style.setProperty("--swapc", s.color || "#ff6fa5");
    const st = document.createElement("style");
    st.textContent = "html.bc-swapping::after{content:'';position:fixed;inset:0;z-index:2147483600;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--swapc) 70%,#fff 10%),var(--swapc) 60%,color-mix(in srgb,var(--swapc) 55%,#000))}";
    d.appendChild(st);
  } catch (e) {}
})();
