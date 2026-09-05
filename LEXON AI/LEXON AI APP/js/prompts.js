const PromptsPage = (() => {
  const supabase = window.LexonSupabase?.client();

  const state = {
    prompts: [],
    filtered: [],
    query: "",
    category: "all"
  };

  const elements = {
    grid: document.querySelector("#promptsGrid"),
    search: document.querySelector("#promptSearch"),
    filters: document.querySelector("#promptFilters"),
    loading: document.querySelector("#promptsLoading"),
    empty: document.querySelector("#promptsEmpty"),
    error: document.querySelector("#promptsError"),
    count: document.querySelector("#promptsCount")
  };

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getTitle(prompt) {
    return prompt.title || prompt.name || "Untitled prompt";
  }

  function getPromptText(prompt) {
    return prompt.prompt ||
      prompt.content ||
      prompt.prompt_text ||
      "";
  }

  function getDescription(prompt) {
    return prompt.description || "Useful prompt for an AI workflow.";
  }

  function getCategory(prompt) {
    return prompt.category || prompt.topic || "AI";
  }

  function getLevel(prompt) {
    return prompt.level || prompt.experience || "";
  }

  function updateCount() {
    if (!elements.count) return;

    const count = state.filtered.length;

    elements.count.textContent =
      `${count} ${count === 1 ? "prompt" : "prompts"}`;
  }

  function setLoading(show) {
    if (elements.loading) {
      elements.loading.hidden = !show;
    }
  }

  function setEmpty(show) {
    if (elements.empty) {
      elements.empty.hidden = !show;
    }
  }

  function setError(show, text = "") {
    if (!elements.error) return;

    elements.error.hidden = !show;

    if (text) {
      elements.error.textContent = text;
    }
  }

  async function copyPrompt(text, button) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);

      const original = button.innerHTML;

      button.innerHTML = `
        <i data-lucide="check"></i>
        Copied
      `;

      if (window.lucide) {
        window.lucide.createIcons();
      }

      setTimeout(() => {
        button.innerHTML = original;

        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, 1400);

    } catch (error) {
      console.error(error);
    }
  }

  function createPromptCard(prompt) {
    const title = escapeHTML(getTitle(prompt));
    const description = escapeHTML(getDescription(prompt));
    const category = escapeHTML(getCategory(prompt));
    const level = escapeHTML(getLevel(prompt));
    const promptText = getPromptText(prompt);

    const article = document.createElement("article");
    article.className = "prompt-card";

    const preview = promptText
      ? escapeHTML(promptText)
      : "No prompt text available.";

    article.innerHTML = `
      <div class="prompt-card-header">

        <div class="prompt-card-meta">
          <span>${category}</span>
          ${level ? `<span>${level}</span>` : ""}
        </div>

        <div class="prompt-card-icon">
          <i data-lucide="sparkles"></i>
        </div>

      </div>

      <div class="prompt-card-body">
        <h3>${title}</h3>

        <p>${description}</p>

        <div class="prompt-preview">
          ${preview}
        </div>
      </div>

      <div class="prompt-card-footer">
        <button
          type="button"
          class="prompt-copy-button"
          data-copy-prompt
        >
          <i data-lucide="copy"></i>
          Copy prompt
        </button>
      </div>
    `;

    const copyButton = article.querySelector("[data-copy-prompt]");

    copyButton.addEventListener("click", () => {
      copyPrompt(promptText, copyButton);
    });

    return article;
  }

  function render() {
    if (!elements.grid) return;

    elements.grid.innerHTML = "";

    updateCount();

    if (!state.filtered.length) {
      setEmpty(true);
      return;
    }

    setEmpty(false);

    const fragment = document.createDocumentFragment();

    state.filtered.forEach(prompt => {
      fragment.appendChild(createPromptCard(prompt));
    });

    elements.grid.appendChild(fragment);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function filterPrompts() {
    const query = normalize(state.query);
    const category = normalize(state.category);

    state.filtered = state.prompts.filter(prompt => {
      const searchable = [
        getTitle(prompt),
        getDescription(prompt),
        getPromptText(prompt),
        getCategory(prompt),
        getLevel(prompt),
        prompt.tags,
        prompt.author_name
      ]
        .flat()
        .map(normalize)
        .join(" ");

      const matchesQuery =
        !query || searchable.includes(query);

      const matchesCategory =
        category === "all" ||
        normalize(getCategory(prompt)) === category;

      return matchesQuery && matchesCategory;
    });

    render();
  }

  function bindSearch() {
    if (!elements.search) return;

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("search") || "";

    elements.search.value = initialQuery;
    state.query = initialQuery;

    elements.search.addEventListener("input", event => {
      state.query = event.target.value;
      filterPrompts();
    });
  }

  function bindFilters() {
    if (!elements.filters) return;

    elements.filters.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");

      if (!button) return;

      elements.filters
        .querySelectorAll("[data-category]")
        .forEach(item => {
          item.classList.remove("active");
        });

      button.classList.add("active");

      state.category =
        button.dataset.category || "all";

      filterPrompts();
    });
  }

  async function loadPrompts() {
    if (!supabase) {
      setLoading(false);
      setError(true, "LEXON AI database is not configured.");
      return;
    }

    setLoading(true);
    setEmpty(false);
    setError(false);

    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      state.prompts = Array.isArray(data) ? data : [];

      filterPrompts();

    } catch (error) {
      console.error(error);

      state.prompts = [];
      state.filtered = [];

      setError(
        true,
        error?.message || "Unable to load prompts right now."
      );

      setEmpty(false);
      updateCount();

    } finally {
      setLoading(false);
    }
  }

  function init() {
    bindSearch();
    bindFilters();
    loadPrompts();
  }

  return {
    init,
    loadPrompts,
    filterPrompts
  };
})();

window.LexonPrompts = PromptsPage;

document.addEventListener("DOMContentLoaded", () => {
  PromptsPage.init();
});