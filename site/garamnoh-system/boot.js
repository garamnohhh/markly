/* Theme and language, settled BEFORE first paint.
   Applying them from a component's mount is what makes page-to-page
   navigation flash. Loaded with a plain <script src> in <head> so it is
   synchronous: the attributes are on <html> before the first frame.
   Storage keys are shared across every page of the system. */
(function () {
  var r = document.documentElement, t, l;
  try { t = localStorage.getItem("garamnoh-system-mode"); } catch (e) {}
  try { l = localStorage.getItem("garamnoh-system-lang"); } catch (e) {}
  r.setAttribute("data-theme", t === "light" || t === "dark" ? t : "dark");
  l = l === "ko" || l === "en" ? l : "en";
  r.setAttribute("data-lang", l);
  r.setAttribute("lang", l === "ko" ? "ko" : "en");
})();
