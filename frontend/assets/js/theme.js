/**
 * assets/js/theme.js
 * Light/dark theme toggle. Must be loaded FIRST in <head> to prevent flash.
 */

const sunSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const moonSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

window.Theme = {
  apply() {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    this._updateIcon();
  },

  toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    this._updateIcon();
  },

  _updateIcon() {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.innerHTML = isDark ? sunSVG : moonSVG;
      btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    }
  },
};

Theme.apply();
