const ToolsPage = (() => {
  const supabase = window.LexonSupabase?.client();

  const state = {
    tools: [],
    filtered: [],
    query: "",
    category: "all"
  };

  const elements = {
    grid: document.querySelector("#toolsGrid"),
    search: document.querySelector("#toolSearch"),
    filters: document.querySelector("#toolFilters"),
    loading: document.querySelector("#toolsLoading"),
    empty: document.querySelector("#toolsEmpty"),
    error: document.querySelector("#toolsError"),
    count: document.querySelector("#toolsCount")
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

  function getTitle(tool) {
    return tool.title || tool.name || "Untitled tool";
  }

  function getDescription(tool) {
    return tool.description || "Explore this AI tool.";
  }

  function getCategory(tool) {
    return tool.category || tool.topic || "AI";
  }

  function getImage(tool) {
    return tool.logo_url ||
      tool.image_url ||
      tool.thumbnail_url ||
      "";
  }

  function getUrl(tool) {
    return tool.url ||
      tool.website_url ||
      tool.tool_url ||
      tool.external_url ||
      "";
  }

  function getPricing(tool) {
    return tool.pricing || tool.price_type || "";
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

  function updateCount() {
    if (!elements.count) return;

    const count = state.filtered.length;

    elements.count.textContent =
      `${count} ${count === 1 ? "tool" : "tools"}`;
  }

  function createToolCard(tool) {
    const title = escapeHTML(getTitle(tool));
    const description = escapeHTML(getDescription(tool));
    const category = escapeHTML(getCategory(tool));
    const pricing = escapeHTML(getPricing(tool));
    const image = getImage(tool);
    const url = getUrl(tool);

    const article = document.createElement("article");
    article.className = "tool-card";

    const media = image
      ? `
        <div class="tool-card-media">
          <img
            src="${escapeHTML(image)}"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
          >
        </div>
      `
      : `
        <div class="tool-card-media tool-card-placeholder">
          <span>${escapeHTML(title.charAt(0).toUpperCase())}</span>
        </div>
      `;

    const action = url
      ? `
        <a
          class="tool-card-action"
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit tool
          <i data-lucide="arrow-up-right"></i>
        </a>
      `
      : `
        <span class="tool-card-action disabled">
          Coming soon
        </span>
      `;

    article.innerHTML = `
      ${media}

      <div class="tool-card-body">

        <div class="tool-card-meta">
          <span>${category}</span>
          ${pricing ? `<span>${pricing}</span>` : ""}
        </div>

        <h3>${title}</h3>

        <p>${description}</p>

        <div class="tool-card-footer">
          ${action}
        </div>

      </div>
    `;

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

    state.filtered.forEach(tool => {
      fragment.appendChild(createToolCard(tool));
    });

    elements.grid.appendChild(fragment);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function filterTools() {
    const query = normalize(state.query);
    const category = normalize(state.category);

    state.filtered = state.tools.filter(tool => {
      const searchable = [
        getTitle(tool),
        getDescription(tool),
        getCategory(tool),
        getPricing(tool),
        tool.tags,
        tool.author_name
      ]
        .flat()
        .map(normalize)
        .join(" ");

      const matchesQuery =
        !query || searchable.includes(query);

      const matchesCategory =
        category === "all" ||
        normalize(getCategory(tool)) === category;

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
      filterTools();
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

      filterTools();
    });
  }

  async function loadTools() {
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
        .from("tools")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      state.tools = Array.isArray(data) ? data : [];

      filterTools();

    } catch (error) {
      console.error(error);

      state.tools = [];
      state.filtered = [];

      setError(
        true,
        error?.message || "Unable to load AI tools right now."
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
    loadTools();
  }

  return {
    init,
    loadTools,
    filterTools
  };
})();

window.LexonTools = ToolsPage;

document.addEventListener("DOMContentLoaded", () => {
  ToolsPage.init();
});