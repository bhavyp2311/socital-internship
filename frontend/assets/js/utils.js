/**
 * assets/js/utils.js — Shared UI utilities
 */

function toast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: I.check, error: I.x, warning: I.alertTriangle, info: I.info };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type] || I.info}<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function openModal(id)  { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) e.target.classList.remove("open");
});

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Loading...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || "Submit";
    btn.disabled = false;
  }
}

function emptyRow(colspan, message = "No data found") {
  return `<tr><td colspan="${colspan}">
    <div class="empty-state">
      <div class="empty-icon">${I.fileText}</div>
      <p>${message}</p>
    </div>
  </td></tr>`;
}

function initSidebar() {
  const profile = Auth.getProfile();
  if (!profile) return;
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const avatarEl = document.getElementById("user-avatar");
  if (nameEl) nameEl.textContent = profile.full_name;
  if (roleEl) roleEl.textContent = profile.role.replace("_", " ");
  if (avatarEl) avatarEl.textContent = profile.full_name?.charAt(0).toUpperCase();

  document.getElementById("logout-btn")?.addEventListener("click", () => Auth.logout());

  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-item").forEach((el) => {
    if (el.getAttribute("href")?.includes(currentPage)) el.classList.add("active");
  });
}

function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function confirmDelete(message = "Are you sure you want to delete this?") {
  return window.confirm(message);
}

function statusBadge(status) {
  const map = {
    pending: "badge-warning", assigned: "badge-info", in_progress: "badge-indigo",
    completed: "badge-success", verified: "badge-success", closed: "badge-muted",
    rejected: "badge-danger", duplicate: "badge-warning",
  };
  return `<span class="badge ${map[status] || "badge-muted"}">${(status || "unknown").replace("_", " ")}</span>`;
}

function priorityBadge(priority) {
  const map = { low: "badge-muted", medium: "badge-info", high: "badge-warning", critical: "badge-danger" };
  const pulse = priority === "critical" ? ' <span class="pulse" style="display:inline-block;width:6px;height:6px;background:var(--danger);border-radius:50%"></span>' : "";
  return `<span class="badge ${map[priority] || "badge-muted"}">${priority || "medium"}${pulse}</span>`;
}

function availabilityBadge(availability) {
  const map = { available: "badge-success", busy: "badge-warning", off_duty: "badge-muted", on_leave: "badge-danger" };
  return `<span class="badge ${map[availability] || "badge-muted"}">${(availability || "unknown").replace("_", " ")}</span>`;
}

function themeToggleHTML() {
  const sun = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  const moon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  return `<button class="theme-toggle" id="theme-toggle" onclick="Theme.toggle()" title="Toggle theme">${document.documentElement.getAttribute('data-theme')==='dark' ? sun : moon}</button>`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.setLoading = setLoading;
window.emptyRow = emptyRow;
window.initSidebar = initSidebar;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.confirmDelete = confirmDelete;
window.statusBadge = statusBadge;
window.priorityBadge = priorityBadge;
window.availabilityBadge = availabilityBadge;
window.themeToggleHTML = themeToggleHTML;
window.timeAgo = timeAgo;
