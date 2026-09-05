"use strict";

(function () {
  const searchInput = document.querySelector(
    "#globalSearchInput"
  );

  const searchForm = document.querySelector(
    "#globalSearchForm"
  );

  function getQuery() {
    const params = new URLSearchParams(
      window.location.search
    );

    return (
      params.get("search") ||
      params.get("query") ||
      ""
    ).trim();
  }

  function saveQuery(query) {
    if (!query) return;

    try {
      const history =
        JSON.parse(
          localStorage.getItem(
            "lexon_search_history"
          ) || "[]"
        );

      const filtered = history.filter(
        (item) =>
          String(item).toLowerCase() !==
          query.toLowerCase()
      );

      filtered.unshift(query);

      localStorage.setItem(
        "lexon_search_history",
        JSON.stringify(filtered.slice(0, 20))
      );
    } catch {}
  }

  function submitSearch(query) {
    const value = String(query || "").trim();

    if (!value) return;

    saveQuery(value);

    const url =
      "tools.html?search=" +
      encodeURIComponent(value);

    window.location.href = url;
  }

  function initializeInput() {
    if (!searchInput) return;

    const query = getQuery();

    if (query) {
      searchInput.value = query;
    }
  }

  function initializeForm() {
    if (!searchForm || !searchInput) return;

    searchForm.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();

        submitSearch(searchInput.value);
      }
    );
  }

  function getSearchHistory() {
    try {
      const history =
        JSON.parse(
          localStorage.getItem(
            "lexon_search_history"
          ) || "[]"
        );

      return Array.isArray(history)
        ? history
        : [];
    } catch {
      return [];
    }
  }

  function clearSearchHistory() {
    try {
      localStorage.removeItem(
        "lexon_search_history"
      );
    } catch {}
  }

  window.LexonSearch = {
    getQuery,
    submitSearch,
    getSearchHistory,
    clearSearchHistory
  };

  initializeInput();
  initializeForm();
})();