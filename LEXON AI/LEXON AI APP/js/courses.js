const CoursesPage = (() => {
  const supabase = window.LexonSupabase?.client();

  const state = {
    courses: [],
    filtered: [],
    query: "",
    category: "all"
  };

  const elements = {
    grid: document.querySelector("#coursesGrid"),
    search: document.querySelector("#courseSearch"),
    filters: document.querySelector("#courseFilters"),
    loading: document.querySelector("#coursesLoading"),
    empty: document.querySelector("#coursesEmpty"),
    error: document.querySelector("#coursesError"),
    count: document.querySelector("#coursesCount")
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

  function getCourseTitle(course) {
    return course.title || course.name || "Untitled course";
  }

  function getCourseDescription(course) {
    return course.description || "Explore this AI learning resource.";
  }

  function getCourseCategory(course) {
    return course.category || course.topic || "AI";
  }

  function getCourseLevel(course) {
    return course.level || course.experience || "";
  }

  function getCourseImage(course) {
    return course.thumbnail_url ||
      course.image_url ||
      course.cover_url ||
      "";
  }

  function getCourseUrl(course) {
    return course.url ||
      course.course_url ||
      course.external_url ||
      "";
  }

  function showLoading(show) {
    if (!elements.loading) return;
    elements.loading.hidden = !show;
  }

  function showEmpty(show) {
    if (!elements.empty) return;
    elements.empty.hidden = !show;
  }

  function showError(show, text = "") {
    if (!elements.error) return;

    elements.error.hidden = !show;

    if (text) {
      elements.error.textContent = text;
    }
  }

  function renderCount() {
    if (!elements.count) return;

    const count = state.filtered.length;
    elements.count.textContent = `${count} ${count === 1 ? "course" : "courses"}`;
  }

  function createCourseCard(course) {
    const title = escapeHTML(getCourseTitle(course));
    const description = escapeHTML(getCourseDescription(course));
    const category = escapeHTML(getCourseCategory(course));
    const level = escapeHTML(getCourseLevel(course));
    const image = getCourseImage(course);
    const url = getCourseUrl(course);

    const article = document.createElement("article");
    article.className = "course-card";

    const imageHTML = image
      ? `
        <div class="course-card-media">
          <img
            src="${escapeHTML(image)}"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
          >
        </div>
      `
      : `
        <div class="course-card-media course-card-placeholder">
          <span>AI</span>
        </div>
      `;

    const metaHTML = `
      <div class="course-card-meta">
        <span>${category}</span>
        ${level ? `<span>${level}</span>` : ""}
      </div>
    `;

    const actionHTML = url
      ? `
        <a
          class="course-card-action"
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          View course
          <i data-lucide="arrow-up-right"></i>
        </a>
      `
      : `
        <span class="course-card-action disabled">
          Coming soon
        </span>
      `;

    article.innerHTML = `
      ${imageHTML}

      <div class="course-card-body">
        ${metaHTML}

        <h3>${title}</h3>

        <p>${description}</p>

        <div class="course-card-footer">
          ${actionHTML}
        </div>
      </div>
    `;

    return article;
  }

  function render() {
    if (!elements.grid) return;

    elements.grid.innerHTML = "";

    if (!state.filtered.length) {
      showEmpty(true);
      renderCount();
      return;
    }

    showEmpty(false);

    const fragment = document.createDocumentFragment();

    state.filtered.forEach(course => {
      fragment.appendChild(createCourseCard(course));
    });

    elements.grid.appendChild(fragment);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    renderCount();
  }

  function filterCourses() {
    const query = normalize(state.query);
    const category = normalize(state.category);

    state.filtered = state.courses.filter(course => {
      const searchable = [
        getCourseTitle(course),
        getCourseDescription(course),
        getCourseCategory(course),
        getCourseLevel(course),
        course.author_name,
        course.tags
      ]
        .flat()
        .map(normalize)
        .join(" ");

      const matchesQuery =
        !query || searchable.includes(query);

      const matchesCategory =
        category === "all" ||
        normalize(getCourseCategory(course)) === category;

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
      filterCourses();
    });
  }

  function bindFilters() {
    if (!elements.filters) return;

    elements.filters.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");

      if (!button) return;

      document
        .querySelectorAll("[data-category]")
        .forEach(item => item.classList.remove("active"));

      button.classList.add("active");

      state.category = button.dataset.category || "all";

      filterCourses();
    });
  }

  async function loadCourses() {
    if (!supabase) {
      showLoading(false);
      showError(true, "LEXON AI database is not configured.");
      return;
    }

    showLoading(true);
    showEmpty(false);
    showError(false);

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      state.courses = Array.isArray(data) ? data : [];
      filterCourses();

    } catch (error) {
      console.error(error);

      state.courses = [];
      state.filtered = [];

      showError(
        true,
        error?.message || "Unable to load courses right now."
      );

      showEmpty(false);
      renderCount();

    } finally {
      showLoading(false);
    }
  }

  function init() {
    bindSearch();
    bindFilters();
    loadCourses();
  }

  return {
    init,
    loadCourses,
    filterCourses
  };
})();

window.LexonCourses = CoursesPage;

document.addEventListener("DOMContentLoaded", () => {
  CoursesPage.init();
});