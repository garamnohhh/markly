/* Theme and language, settled BEFORE first paint.
   Applying them from a component's mount is what makes page-to-page
   navigation flash. Loaded with a plain <script src> in <head> so it is
   synchronous: the attributes are on <html> before the first frame.
   Storage keys are shared across every page of the system. */
(function () {
  var r = document.documentElement, t, l;
  try { t = localStorage.getItem("garamnoh-system-mode"); } catch (e) {}
  try { l = localStorage.getItem("garamnoh-system-lang"); } catch (e) {}
  var l0 = l;
  r.setAttribute("data-theme", t === "light" || t === "dark" ? t : "light");
  l = l === "ko" || l === "en" ? l : "en";
  r.setAttribute("data-lang", l);
  r.setAttribute("lang", l === "ko" ? "ko" : "en");

  /* This site keeps its two languages in two folders rather than in one page,
     so the default cannot be an attribute. A first visit — nothing stored —
     lands on the English twin of whatever was asked for. Choosing a language
     in the header stores it, and nobody is moved again. */
  var TWINS = { "/": "/en/", "/index.html": "/en/index.html",
                "/docs": "/en/docs", "/docs.html": "/en/docs.html",
                "/changelog": "/en/changelog", "/changelog.html": "/en/changelog.html" };
  if (!l0 && TWINS[location.pathname]) {
    location.replace(TWINS[location.pathname] + location.search + location.hash);
  }
})();
