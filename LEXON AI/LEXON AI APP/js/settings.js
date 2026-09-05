const SettingsManager = (() => {
    const STORAGE_KEYS = {
        theme: "lexon_theme",
        notifications: "lexon_notifications",
        personalized: "lexon_personalized",
        autoplay: "lexon_autoplay",
        language: "lexon_language"
    };

    const defaults = {
        theme: "system",
        notifications: true,
        personalized: true,
        autoplay: false,
        language: "en"
    };

    function getSettings() {
        return {
            theme: localStorage.getItem(STORAGE_KEYS.theme) || defaults.theme,
            notifications: getBoolean(STORAGE_KEYS.notifications, defaults.notifications),
            personalized: getBoolean(STORAGE_KEYS.personalized, defaults.personalized),
            autoplay: getBoolean(STORAGE_KEYS.autoplay, defaults.autoplay),
            language: localStorage.getItem(STORAGE_KEYS.language) || defaults.language
        };
    }

    function getBoolean(key, fallback) {
        const value = localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        return value === "true";
    }

    function setSetting(key, value) {
        if (!Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
            return false;
        }

        localStorage.setItem(STORAGE_KEYS[key], String(value));
        return true;
    }

    function resetSettings() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        applySettings(getSettings());
    }

    function applyTheme(theme) {
        const root = document.documentElement;

        if (theme === "dark") {
            root.setAttribute("data-theme", "dark");
            return;
        }

        if (theme === "light") {
            root.setAttribute("data-theme", "light");
            return;
        }

        root.removeAttribute("data-theme");
    }

    function applySettings(settings) {
        applyTheme(settings.theme);

        document.dispatchEvent(
            new CustomEvent("lexon:settingschange", {
                detail: settings
            })
        );
    }

    function bindControls() {
        const settings = getSettings();

        const themeControl = document.querySelector("[data-setting='theme']");
        const notificationsControl = document.querySelector("[data-setting='notifications']");
        const personalizedControl = document.querySelector("[data-setting='personalized']");
        const autoplayControl = document.querySelector("[data-setting='autoplay']");
        const languageControl = document.querySelector("[data-setting='language']");

        if (themeControl) {
            themeControl.value = settings.theme;

            themeControl.addEventListener("change", event => {
                setSetting("theme", event.target.value);
                applySettings(getSettings());
            });
        }

        if (notificationsControl) {
            notificationsControl.checked = settings.notifications;

            notificationsControl.addEventListener("change", event => {
                setSetting("notifications", event.target.checked);
                applySettings(getSettings());
            });
        }

        if (personalizedControl) {
            personalizedControl.checked = settings.personalized;

            personalizedControl.addEventListener("change", event => {
                setSetting("personalized", event.target.checked);
                applySettings(getSettings());
            });
        }

        if (autoplayControl) {
            autoplayControl.checked = settings.autoplay;

            autoplayControl.addEventListener("change", event => {
                setSetting("autoplay", event.target.checked);
                applySettings(getSettings());
            });
        }

        if (languageControl) {
            languageControl.value = settings.language;

            languageControl.addEventListener("change", event => {
                setSetting("language", event.target.value);
                applySettings(getSettings());
            });
        }

        const resetButton = document.querySelector("[data-action='reset-settings']");

        if (resetButton) {
            resetButton.addEventListener("click", () => {
                resetSettings();
                bindControls();

                if (window.LexonApp?.showToast) {
                    window.LexonApp.showToast("Settings restored to default");
                }
            });
        }
    }

    function initialize() {
        applySettings(getSettings());
        bindControls();
    }

    return {
        getSettings,
        setSetting,
        resetSettings,
        applySettings,
        initialize
    };
})();

window.LexonSettings = SettingsManager;

document.addEventListener("DOMContentLoaded", () => {
    SettingsManager.initialize();
});