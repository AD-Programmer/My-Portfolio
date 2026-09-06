/* ============================================================
   site.js — reveal, nav, mail obfuscation, theme toggle.
   rel="noopener noreferrer" is hardcoded in the HTML, not added here.
   Templating happens at build time (build.js), not here.
   No third-party code. No inline handlers. Strict-CSP safe.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- scroll reveal ---------- */
  function reveal() {
    var els = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add("in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }

  /* ---------- nav ---------- */
  function nav() {
    var burger = document.querySelector(".nav__burger");
    var links = document.querySelector(".nav__links");
    if (burger && links) {
      burger.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    // current page highlight — normalise both sides so "/", "/index.html",
    // "/work" and "/work.html" all resolve to a bare slug ("" means home).
    var here = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
    if (here === "index") here = "";
    var as = document.querySelectorAll(".nav__links a[href]");
    for (var i = 0; i < as.length; i++) {
      var href = as[i].getAttribute("href");
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) continue;   // external / mailto
      var target = href.replace(/^\//, "").replace(/\.html$/, "");
      if (target === "index") target = "";
      if (target === here) as[i].setAttribute("aria-current", "page");
    }
  }

  /* ---------- email obfuscation (anti-scrape) ---------- */
  function mail() {
    var els = document.querySelectorAll("[data-mail]");
    for (var i = 0; i < els.length; i++) {
      var parts = els[i].getAttribute("data-mail").split("|");
      if (parts.length !== 2) continue;
      var addr = parts[0] + "@" + parts[1];
      els[i].setAttribute("href", "mailto:" + addr);
      if (els[i].hasAttribute("data-mail-text")) els[i].textContent = addr;
      els[i].removeAttribute("data-mail");
    }
  }

  /* ---------- theme toggle (theme.js sets the initial value pre-paint) ---------- */
  function theme() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    var root = document.documentElement;
    var sync = function () { btn.setAttribute("aria-pressed", root.getAttribute("data-theme") === "light" ? "true" : "false"); };
    sync();
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      sync();
    });
  }

  /* ---------- boot ---------- */
  function boot() { mail(); nav(); reveal(); theme(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
