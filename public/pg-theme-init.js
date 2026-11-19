'use strict';

/* Applies the saved colour theme before first paint (light paper by default). Loaded synchronously in <head>. */
(function () {
  var root = document.documentElement, saved = null;
  try { saved = localStorage.getItem('pg_theme'); } catch (error) { /* storage unavailable */ }
  if (saved === 'dark') root.setAttribute('data-theme', 'dark');
  window.PGTheme = {
    get: function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    set: function (theme) {
      if (theme === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      try { localStorage.setItem('pg_theme', theme === 'dark' ? 'dark' : 'light'); } catch (error) { /* ignore */ }
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b110c' : '#efe8d2');
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); return this.get(); }
  };
}());
