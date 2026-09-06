/* ============================================================
   theme.js — sets data-theme before first paint. No FOUC.
   Must load render-blocking, before main.css, in <head>.
   Strict-CSP safe (same-origin, no inline script needed).
   ============================================================ */
(function () {
  "use strict";
  var t;
  try {
    t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
  } catch (e) { t = "dark"; }
  document.documentElement.setAttribute("data-theme", t);
})();
