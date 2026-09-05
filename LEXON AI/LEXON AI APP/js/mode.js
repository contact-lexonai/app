"use strict";

(function () {
  const MODES = ["viewer", "creator", "business"];

  function normalizeMode(mode) {
    const value = String(mode || "").toLowerCase().trim();
    return MODES.includes(value) ? value : null;
  }

  function getStoredMode() {
    try {
      const mode = localStorage.getItem("lexon_mode");
      return normalizeMode(mode);
    } catch {
      return null;
    }
  }

  function saveMode(mode) {
    const normalizedMode = normalizeMode(mode);

    if (!normalizedMode) {
      return false;
    }

    try {
      localStorage.setItem(
        "lexon_mode",
        normalizedMode
      );

      return true;
    } catch {
      return false;
    }
  }

  async function getProfileMode() {
    if (
      !window.LexonAuth ||
      typeof window.LexonAuth.getUser !== "function"
    ) {
      return null;
    }

    try {
      const user = await window.LexonAuth.getUser();

      if (!user) {
        return null;
      }

      const profile =
        await window.LexonAuth.getProfile(user.id);

      return normalizeMode(profile?.mode);
    } catch {
      return null;
    }
  }

  async function getCurrentMode() {
    const storedMode = getStoredMode();

    if (storedMode) {
      return storedMode;
    }

    const profileMode = await getProfileMode();

    if (profileMode) {
      saveMode(profileMode);
      return profileMode;
    }

    return "viewer";
  }

  async function setMode(mode) {
    const normalizedMode = normalizeMode(mode);

    if (!normalizedMode) {
      return {
        success: false,
        error: "Invalid mode."
      };
    }

    if (!saveMode(normalizedMode)) {
      return {
        success: false,
        error: "Unable to save mode."
      };
    }

    if (
      window.LexonAuth &&
      typeof window.LexonAuth.getUser === "function"
    ) {
      try {
        const user =
          await window.LexonAuth.getUser();

        if (user) {
          const client =
            window.LexonSupabase?.client();

          if (client) {
            const { error } = await client
              .from("profiles")
              .update({
                mode: normalizedMode,
                updated_at: new Date().toISOString()
              })
              .eq("id", user.id);

            if (error) {
              console.error(error);

              return {
                success: false,
                error: error.message
              };
            }
          }
        }
      } catch (error) {
        return {
          success: false,
          error:
            error.message ||
            "Unable to update mode."
        };
      }
    }

    document.dispatchEvent(
      new CustomEvent("lexon:modechange", {
        detail: {
          mode: normalizedMode
        }
      })
    );

    return {
      success: true,
      mode: normalizedMode
    };
  }

  function isValidMode(mode) {
    return Boolean(normalizeMode(mode));
  }

  function getModes() {
    return [...MODES];
  }

  function redirectByMode(mode) {
    const normalizedMode = normalizeMode(mode);

    if (!normalizedMode) {
      return;
    }

    if (normalizedMode === "creator") {
      window.location.href =
        "../creator/dashboard.html";
      return;
    }

    if (normalizedMode === "business") {
      window.location.href =
        "../business/dashboard.html";
      return;
    }

    window.location.href = "../index.html";``
  }

  window.LexonMode = {
    modes: getModes,
    getCurrentMode,
    getProfileMode,
    setMode,
    isValidMode,
    redirectByMode
  };
})();