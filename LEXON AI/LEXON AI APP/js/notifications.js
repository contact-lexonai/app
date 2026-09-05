/* =========================================================================
   LEXON AI — Notification Center
   =========================================================================
   Self-contained: finds the existing #notificationButton on the page,
   injects the dropdown panel + badge markup next to it, and wires up
   fetching/rendering/mark-as-read against Supabase. Include this script
   (after supabase.js) on any page that already has a #notificationButton
   in its header — no other markup changes needed.
   ========================================================================= */

(function () {
  "use strict";

  var CATEGORY_ICONS = {
    courses: "🎓",
    tools: "🛠️",
    prompts: "✨",
    videos: "🎥",
    guides: "📘",
    updates: "🚀"
  };

  var CATEGORY_LABELS = {
    all: "All",
    courses: "Courses",
    tools: "Tools",
    prompts: "Prompts",
    videos: "Videos",
    guides: "Guides",
    updates: "Updates"
  };

  var state = {
    notifications: [],
    readIds: new Set(),
    activeCategory: "all",
    open: false
  };

  function timeAgo(dateStr) {
    var diffMs = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    return new Date(dateStr).toLocaleDateString();
  }

  function escapeHTML(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function unreadCount() {
    return state.notifications.filter(function (n) {
      return !state.readIds.has(n.id);
    }).length;
  }

  function badgeText(count) {
    if (count <= 0) return "";
    if (count > 9) return "9+";
    return String(count);
  }

  function injectStyles() {
    if (document.getElementById("lexonNotificationStyles")) return;

    var style = document.createElement("style");
    style.id = "lexonNotificationStyles";
    style.textContent =
      ".lexon-notif-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#e5484d;color:#fff;font-size:9.5px;font-weight:800;display:none;align-items:center;justify-content:center;line-height:1;}" +
      ".lexon-notif-badge.visible{display:flex;}" +
      ".lexon-notif-panel{position:absolute;top:calc(100% + 10px);right:0;z-index:400;width:min(360px, 92vw);max-height:70vh;display:none;flex-direction:column;background:var(--lexon-surface);border:1px solid var(--lexon-border);border-radius:16px;box-shadow:var(--lexon-shadow-lg);overflow:hidden;}" +
      ".lexon-notif-panel.open{display:flex;}" +
      ".lexon-notif-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--lexon-border);}" +
      ".lexon-notif-header h3{margin:0;font-size:14px;font-weight:800;}" +
      ".lexon-notif-header button{font-size:11.5px;font-weight:700;color:var(--lexon-accent);}" +
      ".lexon-notif-tabs{display:flex;gap:6px;padding:10px 14px;overflow-x:auto;border-bottom:1px solid var(--lexon-border);}" +
      ".lexon-notif-tab{flex-shrink:0;padding:5px 11px;border-radius:999px;border:1px solid var(--lexon-border-strong);background:transparent;color:var(--lexon-text-secondary);font-size:11px;font-weight:700;white-space:nowrap;}" +
      ".lexon-notif-tab.active{border-color:var(--lexon-accent);background:var(--lexon-accent-soft);color:var(--lexon-accent);}" +
      ".lexon-notif-list{overflow-y:auto;flex:1;}" +
      ".lexon-notif-item{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--lexon-border);text-align:left;width:100%;background:transparent;}" +
      ".lexon-notif-item:last-child{border-bottom:0;}" +
      ".lexon-notif-item.unread{background:var(--lexon-accent-soft);}" +
      ".lexon-notif-item-icon{flex-shrink:0;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--lexon-surface-soft);font-size:15px;}" +
      ".lexon-notif-item-body{flex:1;min-width:0;}" +
      ".lexon-notif-item-title{margin:0 0 2px;font-size:12.5px;font-weight:750;color:var(--lexon-text);}" +
      ".lexon-notif-item-desc{margin:0 0 4px;font-size:11.5px;color:var(--lexon-text-secondary);line-height:1.4;}" +
      ".lexon-notif-item-time{font-size:10px;color:var(--lexon-text-muted);}" +
      ".lexon-notif-empty{padding:40px 16px;text-align:center;color:var(--lexon-text-secondary);font-size:12.5px;}";
    document.head.appendChild(style);
  }

  function renderList(container) {
    var filtered = state.activeCategory === "all"
      ? state.notifications
      : state.notifications.filter(function (n) { return n.category === state.activeCategory; });

    if (!filtered.length) {
      container.innerHTML = '<div class="lexon-notif-empty">No notifications here yet.</div>';
      return;
    }

    container.innerHTML = filtered.map(function (n) {
      var isUnread = !state.readIds.has(n.id);
      var icon = CATEGORY_ICONS[n.category] || "🔔";

      return (
        '<button type="button" class="lexon-notif-item' + (isUnread ? " unread" : "") + '" data-id="' + n.id + '" data-link="' + escapeHTML(n.link_url || "") + '">' +
          '<span class="lexon-notif-item-icon">' + icon + '</span>' +
          '<span class="lexon-notif-item-body">' +
            '<p class="lexon-notif-item-title">' + escapeHTML(n.title) + '</p>' +
            (n.description ? '<p class="lexon-notif-item-desc">' + escapeHTML(n.description) + '</p>' : "") +
            '<span class="lexon-notif-item-time">' + timeAgo(n.created_at) + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join("");
  }

  async function markAsRead(client, userId, notificationId) {
    if (state.readIds.has(notificationId)) return;
    state.readIds.add(notificationId);

    try {
      await client.from("notification_reads").insert({
        notification_id: notificationId,
        user_id: userId
      });
    } catch (error) {
      // Best-effort — even if this fails, the UI already reflects "read".
    }
  }

  async function markAllAsRead(client, userId) {
    var unread = state.notifications.filter(function (n) { return !state.readIds.has(n.id); });
    unread.forEach(function (n) { state.readIds.add(n.id); });

    try {
      await client.from("notification_reads").upsert(
        unread.map(function (n) {
          return { notification_id: n.id, user_id: userId };
        })
      );
    } catch (error) {
      // Best-effort.
    }
  }

  async function init() {
    var button = document.getElementById("notificationButton");
    if (!button) return;

    injectStyles();

    var wrapper = button.parentElement;
    if (wrapper && getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    } else if (getComputedStyle(button).position === "static") {
      button.style.position = "relative";
    }

    var badge = document.createElement("span");
    badge.className = "lexon-notif-badge";
    button.appendChild(badge);

    var panel = document.createElement("div");
    panel.className = "lexon-notif-panel";
    panel.innerHTML =
      '<div class="lexon-notif-header">' +
        '<h3>Notifications</h3>' +
        '<button type="button" id="lexonMarkAllRead">Mark all as read</button>' +
      '</div>' +
      '<div class="lexon-notif-tabs" id="lexonNotifTabs"></div>' +
      '<div class="lexon-notif-list" id="lexonNotifList"></div>';
    (button.parentElement || document.body).appendChild(panel);

    var tabsEl = panel.querySelector("#lexonNotifTabs");
    var listEl = panel.querySelector("#lexonNotifList");

    tabsEl.innerHTML = Object.keys(CATEGORY_LABELS).map(function (key) {
      return '<button type="button" class="lexon-notif-tab' + (key === "all" ? " active" : "") + '" data-category="' + key + '">' + CATEGORY_LABELS[key] + '</button>';
    }).join("");

    var client = window.LexonSupabase && window.LexonSupabase.client();
    var user = client ? await window.LexonSupabase.getCurrentUser() : null;

    async function loadNotifications() {
      if (!client) return;

      var notifResult = await client
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      state.notifications = notifResult.data || [];

      if (user) {
        var readResult = await client
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id);

        state.readIds = new Set((readResult.data || []).map(function (r) { return r.notification_id; }));
      }

      updateBadge();
      renderList(listEl);
    }

    function updateBadge() {
      var count = unreadCount();
      var text = badgeText(count);
      badge.textContent = text;
      badge.classList.toggle("visible", Boolean(text));
    }

    function closePanel() {
      panel.classList.remove("open");
      state.open = false;
    }

    function openPanel() {
      panel.classList.add("open");
      state.open = true;
    }

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (state.open) {
        closePanel();
      } else {
        openPanel();
      }
    });

    document.addEventListener("click", function (event) {
      if (state.open && !panel.contains(event.target) && event.target !== button) {
        closePanel();
      }
    });

    tabsEl.addEventListener("click", function (event) {
      var tab = event.target.closest(".lexon-notif-tab");
      if (!tab) return;

      tabsEl.querySelectorAll(".lexon-notif-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      state.activeCategory = tab.dataset.category;
      renderList(listEl);
    });

    listEl.addEventListener("click", function (event) {
      var item = event.target.closest(".lexon-notif-item");
      if (!item) return;

      var id = item.dataset.id;
      var link = item.dataset.link;

      if (client && user) {
        markAsRead(client, user.id, id);
      }
      item.classList.remove("unread");
      updateBadge();

      if (link) {
        window.location.href = link;
      }
    });

    panel.querySelector("#lexonMarkAllRead").addEventListener("click", function () {
      if (client && user) {
        markAllAsRead(client, user.id);
      }
      renderList(listEl);
      updateBadge();
    });

    await loadNotifications();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
