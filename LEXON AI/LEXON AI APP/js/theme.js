(function () {
  "use strict";

  var STORAGE_KEY = "lexon-theme";
  var VALID_THEMES = ["light", "dark", "reader"];

  function getStoredTheme() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return VALID_THEMES.indexOf(value) !== -1 ? value : "light";
    } catch (error) {
      return "light";
    }
  }

  function applyTheme(theme) {
    if (VALID_THEMES.indexOf(theme) === -1) theme = "light";

    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* localStorage unavailable — theme just won't persist */
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  // Apply immediately so there is no flash of the wrong theme.
  applyTheme(getStoredTheme());

  window.LexonTheme = {
    apply: applyTheme,
    current: currentTheme,
    THEMES: VALID_THEMES
  };
})();
