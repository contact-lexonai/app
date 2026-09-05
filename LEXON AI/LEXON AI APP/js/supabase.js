const SUPABASE_URL = "https://mldhvtivrpdimtzdgiin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dzSNDnPU8FZa2Zy7nxj_pQ_J8lV4dQ2";

/* ---------------------------------------------------------
   Supabase Client
   --------------------------------------------------------- */

let supabaseClient = null;

function initializeSupabase() {
  if (
    SUPABASE_URL === "YOUR_SUPABASE_URL" ||
    SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    console.warn(
      "LEXON AI: Supabase credentials have not been configured yet."
    );

    return null;
  }

  if (
    typeof window.supabase === "undefined" ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error(
      "LEXON AI: Supabase library is not loaded."
    );

    return null;
  }

  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    return supabaseClient;
  } catch (error) {
    console.error(
      "LEXON AI: Failed to initialize Supabase.",
      error
    );

    return null;
  }
}

/* ---------------------------------------------------------
   Get Client
   --------------------------------------------------------- */

function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  return initializeSupabase();
}

/* ---------------------------------------------------------
   Authentication Helpers
   --------------------------------------------------------- */

async function getCurrentUser() {
  const client = getSupabase();

  if (!client) {
    return null;
  }

  try {
    const result = await client.auth.getUser();

    if (result.error) {
      console.warn(
        "LEXON AI: Could not get current user.",
        result.error
      );

      return null;
    }

    return result.data?.user || null;
  } catch (error) {
    console.error(
      "LEXON AI: User lookup failed.",
      error
    );

    return null;
  }
}

/* ---------------------------------------------------------
   Get Session
   --------------------------------------------------------- */

async function getCurrentSession() {
  const client = getSupabase();

  if (!client) {
    return null;
  }

  try {
    const result = await client.auth.getSession();

    if (result.error) {
      console.warn(
        "LEXON AI: Could not get session.",
        result.error
      );

      return null;
    }

    return result.data?.session || null;
  } catch (error) {
    console.error(
      "LEXON AI: Session lookup failed.",
      error
    );

    return null;
  }
}

/* ---------------------------------------------------------
   Sign Out
   --------------------------------------------------------- */

async function signOutUser() {
  const client = getSupabase();

  if (!client) {
    return {
      success: false,
      error: "Supabase is not configured."
    };
  }

  try {
    const result = await client.auth.signOut();

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error
    };
  }
}

/* ---------------------------------------------------------
   Auth State Listener
   --------------------------------------------------------- */

function onAuthStateChange(callback) {
  const client = getSupabase();

  if (!client || typeof callback !== "function") {
    return null;
  }

  try {
    return client.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session);
      }
    );
  } catch (error) {
    console.error(
      "LEXON AI: Auth listener failed.",
      error
    );

    return null;
  }
}

/* ---------------------------------------------------------
   Public API
   --------------------------------------------------------- */

window.LexonSupabase = {
  client: getSupabase,
  getCurrentUser: getCurrentUser,
  getCurrentSession: getCurrentSession,
  signOut: signOutUser,
  onAuthStateChange: onAuthStateChange
};

/* ---------------------------------------------------------
   Initialize
   --------------------------------------------------------- */

initializeSupabase();