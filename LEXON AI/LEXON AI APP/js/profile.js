const LexonProfile = (() => {
  const supabase = window.LexonSupabase?.client();

  let currentUser = null;
  let currentProfile = null;

  const selectors = {
    name: "#profileName",
    email: "#profileEmail",
    lexonId: "#profileLexonId",
    avatar: "#profileAvatar",
    profession: "#profileProfession",
    experience: "#profileExperience",
    mode: "#profileMode",
    interests: "#profileInterests",
    editButton: "#editProfileButton",
    logoutButton: "#logoutButton",
    modeButton: "#switchModeButton"
  };

  function get(selector) {
    return document.querySelector(selector);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getInitial(name) {
    const value = String(name || "").trim();
    return value ? value.charAt(0).toUpperCase() : "L";
  }

  function setText(selector, value, fallback = "—") {
    const element = get(selector);

    if (!element) return;

    element.textContent =
      value === null ||
      value === undefined ||
      String(value).trim() === ""
        ? fallback
        : String(value);
  }

  function renderAvatar(profile) {
    const element = get(selectors.avatar);

    if (!element) return;

    const name = profile?.name || "LEXON AI";
    const avatarURL = profile?.avatar_url;

    element.innerHTML = "";

    if (avatarURL) {
      const image = document.createElement("img");

      image.src = avatarURL;
      image.alt = `${name} profile avatar`;
      image.loading = "lazy";

      image.onerror = () => {
        element.innerHTML = "";

        const fallback = document.createElement("span");
        fallback.textContent = getInitial(name);

        element.appendChild(fallback);
      };

      element.appendChild(image);
      return;
    }

    const fallback = document.createElement("span");
    fallback.textContent = getInitial(name);

    element.appendChild(fallback);
  }

  function renderInterests(profile) {
    const element = get(selectors.interests);

    if (!element) return;

    const interests = Array.isArray(profile?.interests)
      ? profile.interests.filter(Boolean)
      : [];

    if (!interests.length) {
      element.innerHTML = `
        <span class="profile-empty-value">
          No interests selected
        </span>
      `;
      return;
    }

    element.innerHTML = interests
      .map(
        interest =>
          `<span class="profile-interest">${escapeHTML(interest)}</span>`
      )
      .join("");
  }

  function render(profile, user) {
    const name =
      profile?.name ||
      user?.user_metadata?.name ||
      "LEXON AI";

    const email =
      user?.email ||
      profile?.email ||
      "";

    setText(selectors.name, name);
    setText(selectors.email, email);
    setText(selectors.lexonId, profile?.lexon_id);
    setText(selectors.profession, profile?.profession);
    setText(selectors.experience, profile?.experience);
    setText(selectors.mode, profile?.mode);

    renderAvatar(profile);
    renderInterests(profile);

    const editButton = get(selectors.editButton);

    if (editButton) {
      editButton.href = "edit-profile.html";
    }

    updateModeButton(profile?.mode);
  }

  function updateModeButton(mode) {
    const button = get(selectors.modeButton);

    if (!button) return;

    const labels = {
      viewer: "Switch mode",
      creator: "Creator workspace",
      business: "Business workspace"
    };

    const iconNames = {
      viewer: "refresh-cw",
      creator: "pen-tool",
      business: "briefcase-business"
    };

    const label = labels[mode] || "Switch mode";
    const icon = iconNames[mode] || "refresh-cw";

    button.innerHTML = `
      <i data-lucide="${icon}"></i>
      ${label}
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function showMessage(text, type = "error") {
    let element = document.querySelector("#profileMessage");

    if (!element) {
      element = document.createElement("div");
      element.id = "profileMessage";
      element.className = "profile-message";

      const main = document.querySelector("main");

      if (main) {
        main.prepend(element);
      }
    }

    element.textContent = text;
    element.className = `profile-message ${type}`;

    setTimeout(() => {
      element.remove();
    }, 4000);
  }

  async function load() {
    try {
      if (!window.LexonAuth?.getUser) {
        throw new Error("Authentication service is unavailable.");
      }

      currentUser = await window.LexonAuth.getUser();

      if (!currentUser) {
        window.location.href = "login.html";
        return null;
      }

      if (!window.LexonAuth?.getProfile) {
        throw new Error("Profile service is unavailable.");
      }

      currentProfile =
        await window.LexonAuth.getProfile(currentUser.id);

      if (!currentProfile) {
        currentProfile = {
          id: currentUser.id,
          name: currentUser.user_metadata?.name || "",
          email: currentUser.email || "",
          interests: [],
          mode: "viewer"
        };
      }

      localStorage.setItem(
        "lexon_profile",
        JSON.stringify(currentProfile)
      );

      render(currentProfile, currentUser);

      return currentProfile;

    } catch (error) {
      console.error(error);

      const cached = localStorage.getItem("lexon_profile");

      if (cached) {
        try {
          currentProfile = JSON.parse(cached);
          render(currentProfile, currentUser);
          showMessage(
            "Showing your saved profile information.",
            "info"
          );
          return currentProfile;
        } catch {
          localStorage.removeItem("lexon_profile");
        }
      }

      showMessage(
        error?.message || "Unable to load your profile."
      );

      return null;
    }
  }

  async function logout() {
    const button = get(selectors.logoutButton);

    if (button) {
      button.disabled = true;
    }

    try {
      if (!window.LexonAuth?.logout) {
        throw new Error("Logout service is unavailable.");
      }

      await window.LexonAuth.logout();

      localStorage.removeItem("lexon_profile");
      localStorage.removeItem("lexon_mode");

      window.location.href = "login.html";

    } catch (error) {
      console.error(error);

      if (button) {
        button.disabled = false;
      }

      showMessage(
        error?.message || "Unable to log out."
      );
    }
  }

  function openModeWorkspace() {
    const mode = currentProfile?.mode || "viewer";

    if (mode === "creator") {
      window.location.href = "../creator/dashboard.html";
      return;
    }

    if (mode === "business") {
      window.location.href = "../business/dashboard.html";
      return;
    }

    if (window.LexonMode?.redirectByMode) {
      window.LexonMode.redirectByMode(mode);
      return;
    }

    window.location.href = "../index.html";
  }

  function bindEvents() {
    const logoutButton = get(selectors.logoutButton);
    const modeButton = get(selectors.modeButton);

    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }

    if (modeButton) {
      modeButton.addEventListener(
        "click",
        openModeWorkspace
      );
    }
  }

  function init() {
    bindEvents();

    if (window.lucide) {
      window.lucide.createIcons();
    }

    load();
  }

  return {
    init,
    load,
    logout,
    getProfile: () => currentProfile,
    getUser: () => currentUser
  };
})();

window.LexonProfile = LexonProfile;

document.addEventListener("DOMContentLoaded", () => {
  LexonProfile.init();
});