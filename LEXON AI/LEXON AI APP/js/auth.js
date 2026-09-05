"use strict";

(function () {
  const supabase = window.LexonSupabase;

  if (!supabase) return;

  function message(text) {
    if (
      window.LexonApp &&
      typeof window.LexonApp.showToast === "function"
    ) {
      window.LexonApp.showToast(text);
    }
  }

  async function getUser() {
    try {
      return await supabase.getCurrentUser();
    } catch {
      return null;
    }
  }

  async function getSession() {
    try {
      return await supabase.getCurrentSession();
    } catch {
      return null;
    }
  }

  async function getProfile(userId) {
    const client = supabase.client();

    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return null;
      }

      return data || null;
    } catch {
      return null;
    }
  }

  function isOnboardingComplete(profile) {
    if (!profile) return false;

    // Single source of truth — set once, at the end of onboarding.
    // (Previously this guessed completion from whether every field
    // was filled in, which misfired for creator/business accounts
    // that don't fill every field, sending them back into onboarding
    // on every login.)
    return Boolean(profile.onboarding_completed);
  }

  async function signUp(email, password, name, captchaToken) {
    const client = supabase.client();

    if (!client) {
      return {
        success: false,
        error: "Supabase is not configured."
      };
    }

    if (!email || !password || !name) {
      return {
        success: false,
        error: "Please fill in all required fields."
      };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim()
          },
          captchaToken: captchaToken || undefined
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "Account creation failed."
        };
      }

      // Supabase's documented signal for "this email is already
      // registered": signUp() succeeds without an error, but the
      // returned user has an empty identities array. Without this
      // check, a duplicate signup would silently create a second,
      // inconsistent profile row for the same email.
      if (
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        return {
          success: false,
          accountExists: true,
          error: "An account with this email already exists. Please log in instead."
        };
      }

      const { data: profile, error: profileError } =
        await client
          .from("profiles")
          .upsert({
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            interests: [],
            profession: null,
            experience: null,
            age: null,
            mode: null,
            avatar_url: null
          })
          .select()
          .single();

      if (profileError) {
        return {
          success: false,
          error: profileError.message
        };
      }

      return {
        success: true,
        user: data.user,
        profile,
        confirmationRequired: !data.session
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.message ||
          "Unable to create account."
      };
    }
  }

  async function login(email, password, captchaToken) {
    const client = supabase.client();

    if (!client) {
      return {
        success: false,
        error: "Supabase is not configured."
      };
    }

    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required."
      };
    }

    try {
      const { data, error } =
        await client.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: captchaToken ? { captchaToken } : undefined
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "Login failed."
        };
      }

      const profile = await getProfile(data.user.id);

      return {
        success: true,
        user: data.user,
        profile,
        onboardingComplete:
          isOnboardingComplete(profile)
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.message ||
          "Unable to log in."
      };
    }
  }

  async function logout() {
    try {
      const result = await supabase.signOut();

      if (!result.success) {
        return {
          success: false,
          error:
            result.error?.message ||
            "Unable to sign out."
        };
      }

      try {
        localStorage.removeItem("lexon_profile");
        localStorage.removeItem("lexon_user");
      } catch {}

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.message ||
          "Unable to sign out."
      };
    }
  }

  async function requireAuth() {
    const user = await getUser();

    if (!user) {
      const page =
        window.location.pathname
          .split("/")
          .pop()
          .toLowerCase();

      if (
        page !== "login.html" &&
        page !== "signup.html"
      ) {
        window.location.href = "login.html";
      }

      return null;
    }

    return user;
  }

  async function redirectAuthenticatedUser() {
    const user = await getUser();

    if (!user) return false;

    const profile = await getProfile(user.id);

    if (!profile || !isOnboardingComplete(profile)) {
      window.location.href = "onboarding.html";
      return true;
    }

    window.location.href = "../index.html";
    return true;
  }

  function onAuthStateChange(callback) {
    if (typeof callback !== "function") return null;

    try {
      return supabase.onAuthStateChange(
        callback
      );
    } catch {
      return null;
    }
  }

  window.LexonAuth = {
    getUser,
    getSession,
    getProfile,
    signUp,
    login,
    logout,
    requireAuth,
    redirectAuthenticatedUser,
    isOnboardingComplete,
    onAuthStateChange,
    message
  };
})();