"use strict";

/* =========================================================
   LEXON AI
   Main Application JavaScript
   ========================================================= */

(function () {

  /* -------------------------------------------------------
     Helpers
     ------------------------------------------------------- */

  function getElement(selector) {
    return document.querySelector(selector);
  }

  function getElements(selector) {
    return document.querySelectorAll(selector);
  }

  /* -------------------------------------------------------
     Current Year
     ------------------------------------------------------- */

  function setCurrentYear() {
    var yearElements = getElements("[data-current-year], #currentYear");
    var currentYear = new Date().getFullYear();

    yearElements.forEach(function (element) {
      element.textContent = currentYear;
    });
  }

  /* -------------------------------------------------------
     User Profile
     ------------------------------------------------------- */

  function getUserProfile() {
    var keys = [
      "lexon_profile",
      "lexon_user",
      "user",
      "profile"
    ];

    for (var i = 0; i < keys.length; i++) {
      try {
        var savedData = localStorage.getItem(keys[i]);

        if (!savedData) {
          continue;
        }

        var data = JSON.parse(savedData);

        if (!data || typeof data !== "object") {
          continue;
        }

        if (data.profile && typeof data.profile === "object") {
          return data.profile;
        }

        if (data.user && typeof data.user === "object") {
          return data.user;
        }

        return data;

      } catch (error) {
        continue;
      }
    }

    return null;
  }

  function getUserName(profile) {
    if (!profile) {
      return "";
    }

    if (profile.name) {
      return String(profile.name).trim();
    }

    if (profile.full_name) {
      return String(profile.full_name).trim();
    }

    if (profile.display_name) {
      return String(profile.display_name).trim();
    }

    if (
      profile.user_metadata &&
      profile.user_metadata.name
    ) {
      return String(profile.user_metadata.name).trim();
    }

    if (
      profile.user_metadata &&
      profile.user_metadata.full_name
    ) {
      return String(profile.user_metadata.full_name).trim();
    }

    return "";
  }

  function updateUserUI() {
    var profile = getUserProfile();
    var name = getUserName(profile);

    var greeting = getElement("#userGreeting");

    if (greeting) {
      if (name) {
        var firstName = name.split(/\s+/)[0];
        greeting.textContent = "Hi " + firstName;
      } else {
        greeting.textContent = "Welcome back";
      }
    }

    updateAvatar(name);
  }

  function updateAvatar(name) {
    var avatarElements = getElements(
      "[data-user-avatar], .header-avatar, .profile-avatar"
    );

    if (!avatarElements.length) {
      return;
    }

    var initials = "L";

    if (name) {
      var parts = name.split(/\s+/);

      if (parts.length === 1) {
        initials = parts[0].charAt(0).toUpperCase();
      } else {
        initials =
          parts[0].charAt(0).toUpperCase() +
          parts[parts.length - 1].charAt(0).toUpperCase();
      }
    }

    avatarElements.forEach(function (avatar) {

      if (avatar.tagName === "IMG") {
        avatar.alt = "Profile";
        return;
      }

      avatar.textContent = initials;
    });
  }

  /* -------------------------------------------------------
     Search
     ------------------------------------------------------- */

  function setupSearch() {
    var form = getElement("#globalSearchForm");
    var input = getElement("#globalSearchInput");

    if (!form || !input) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var query = input.value.trim();

      if (!query) {
        input.focus();
        showToast("Please enter something to search.");
        return;
      }

      try {
        sessionStorage.setItem(
          "lexon_search_query",
          query
        );
      } catch (error) {
        // Session storage is optional.
      }

      var searchURL =
        "pages/search.html?q=" +
        encodeURIComponent(query);

      window.location.href = searchURL;
    });
  }

  /* -------------------------------------------------------
     Search Suggestions
     ------------------------------------------------------- */

  function setupSearchSuggestions() {
    var suggestions = getElements(
      "[data-search-suggestion], .search-suggestion"
    );

    var input = getElement("#globalSearchInput");

    if (!suggestions.length || !input) {
      return;
    }

    suggestions.forEach(function (suggestion) {

      suggestion.addEventListener("click", function () {

        var query =
          suggestion.getAttribute(
            "data-search-suggestion"
          ) ||
          suggestion.getAttribute("data-query") ||
          suggestion.textContent.trim();

        if (!query) {
          return;
        }

        input.value = query;

        var form = getElement("#globalSearchForm");

        if (form) {
          form.requestSubmit();
        }
      });

    });
  }

  /* -------------------------------------------------------
     Notifications
     ------------------------------------------------------- */

  /* -------------------------------------------------------
     Header profile (avatar + greeting)
     ------------------------------------------------------- */

  async function loadHeaderProfile() {

    var client =
      window.LexonSupabase &&
      window.LexonSupabase.client();

    if (!client) {
      return;
    }

    try {

      var user =
        await window.LexonSupabase.getCurrentUser();

      if (!user) {
        return;
      }

      var result = await client
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      var profile = result && result.data;

      var name =
        (profile && profile.name) ||
        user.user_metadata &&
        (
          user.user_metadata.name ||
          user.user_metadata.full_name
        ) ||
        user.email ||
        "";

      var avatarUrl =
        (profile && profile.avatar_url) ||
        (user.user_metadata &&
          user.user_metadata.avatar_url) ||
        "";

      var initial =
        name.trim()
          ? name.trim().charAt(0).toUpperCase()
          : "?";

      var initialEl =
        getElement("#headerAvatarInitial");

      var avatarEl =
        getElement("#headerAvatar");

      if (avatarUrl && avatarEl) {

        avatarEl.innerHTML =
          '<img src="' +
          avatarUrl +
          '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';

      } else if (initialEl) {

        initialEl.textContent = initial;

      }

      var greetingNameEl =
        getElement("#userGreeting");

      var firstName =
        name.trim().split(" ")[0];

      if (
        greetingNameEl &&
        firstName &&
        firstName.indexOf("@") === -1
      ) {

        var hour =
          new Date().getHours();

        var timeGreeting =
          hour >= 5 && hour < 12
            ? "Good morning"
            : hour >= 12 && hour < 17
            ? "Good afternoon"
            : hour >= 17 && hour < 21
            ? "Good evening"
            : "Good night";

        greetingNameEl.textContent =
          timeGreeting + ", " + firstName;
      }

    } catch (error) {
      /* Not logged in yet, or profile not created — keep the defaults */
    }
  }

  function setupNotifications() {
    var notificationButtons = getElements(
      "[data-notifications], .notification-btn"
    );

    if (!notificationButtons.length) {
      return;
    }

    notificationButtons.forEach(function (button) {

      button.addEventListener("click", function () {
        showToast(
          "Notifications will be available soon."
        );
      });

    });
  }

  /* -------------------------------------------------------
     Toast
     ------------------------------------------------------- */

  function showToast(message) {

    var container =
      getElement("#toastContainer");

    if (!container) {
      container =
        document.createElement("div");

      container.id =
        "toastContainer";

      container.className =
        "toast-container";

      document.body.appendChild(container);
    }

    var toast =
      document.createElement("div");

    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("show");
    }, 10);

    setTimeout(function () {

      toast.classList.remove("show");

      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);

    }, 3000);
  }

  /* -------------------------------------------------------
     Mobile Bottom Navigation
     ------------------------------------------------------- */

  function setupMobileNavigation() {

    var links =
      getElements(".mobile-bottom-nav a");

    if (!links.length) {
      return;
    }

    var currentPage =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (!currentPage) {
      currentPage = "index.html";
    }

    links.forEach(function (link) {

      var href =
        link.getAttribute("href");

      if (!href) {
        return;
      }

      var targetPage =
        href
          .split("?")[0]
          .split("#")[0]
          .split("/")
          .pop()
          .toLowerCase();

      link.classList.remove("active");
      link.removeAttribute("aria-current");

      if (
        targetPage === currentPage ||
        (
          currentPage === "index.html" &&
          targetPage === ""
        )
      ) {
        link.classList.add("active");

        link.setAttribute(
          "aria-current",
          "page"
        );
      }

    });
  }

  /* -------------------------------------------------------
     Service Worker
     ------------------------------------------------------- */

  function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) {
      return;
    }

    /*
     * Service Workers do not work on file:// pages.
     * Only try to register on http:// or https://.
     */

    if (
      window.location.protocol !== "http:" &&
      window.location.protocol !== "https:"
    ) {
      return;
    }

    window.addEventListener("load", function () {

      navigator.serviceWorker
        .register("service-worker.js")
        .then(function () {
          console.log(
            "LEXON AI: Service worker registered."
          );
        })
        .catch(function (error) {
          console.warn(
            "LEXON AI: Service worker registration failed.",
            error
          );
        });

    });
  }

  /* -------------------------------------------------------
     PWA Install
     ------------------------------------------------------- */

  var deferredInstallPrompt = null;

  function setupInstallPrompt() {

    window.addEventListener(
      "beforeinstallprompt",
      function (event) {

        event.preventDefault();

        deferredInstallPrompt = event;

        window.dispatchEvent(
          new CustomEvent(
            "lexon-install-available"
          )
        );
      }
    );

    window.addEventListener(
      "appinstalled",
      function () {

        deferredInstallPrompt = null;

        showToast(
          "LEXON AI installed successfully."
        );
      }
    );
  }

  function installApp() {

    if (!deferredInstallPrompt) {
      showToast(
        "Install is not available right now."
      );

      return;
    }

    deferredInstallPrompt
      .prompt()
      .then(function () {
        return deferredInstallPrompt.userChoice;
      })
      .then(function () {
        deferredInstallPrompt = null;
      })
      .catch(function () {
        deferredInstallPrompt = null;
      });
  }

  /* -------------------------------------------------------
     Public LEXON API
     ------------------------------------------------------- */

  window.LexonApp = {

    showToast: showToast,

    installApp: installApp,

    getUserProfile: getUserProfile,

    getUserName: getUserName

  };

  /* -------------------------------------------------------
     Initialize
     ------------------------------------------------------- */

  function init() {

    setCurrentYear();

    updateUserUI();

    setupSearch();

    setupSearchSuggestions();

    setupMobileNavigation();

    setupInstallPrompt();

    registerServiceWorker();

    loadHeaderProfile();

  }

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();