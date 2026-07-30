function renderSidebar(activePage) {
  const html = `
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">${I.building}</div>
      <div>
        <div class="logo-text">Nagar AI</div>
        <div class="logo-sub">Area Admin</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">Main</div>
      <a href="dashboard.html" class="nav-item ${activePage==='dashboard'?'active':''}">
        <span class="icon">${I.barChart}</span> Dashboard
      </a>
      <a href="notifications.html" class="nav-item ${activePage==='notifications'?'active':''}">
        <span class="icon">${I.bell}</span> Notifications
        <span class="nav-badge" id="notif-badge"></span>
      </a>
      <a href="complaints.html" class="nav-item ${activePage==='complaints'?'active':''}">
        <span class="icon">${I.clipboard}</span> Complaints
      </a>
      <a href="workers.html" class="nav-item ${activePage==='workers'?'active':''}">
        <span class="icon">${I.hardHat}</span> Workers
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="avatar" id="user-avatar">A</div>
      <div>
        <div class="user-name" id="user-name">Admin</div>
        <div class="user-role" id="user-role">Area Admin</div>
      </div>
      <button class="logout-btn" id="logout-btn" title="Logout">${I.logOut}</button>
    </div>
  </aside>`;
  document.body.insertAdjacentHTML("afterbegin", html);
}

function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebar-overlay")?.classList.add("open");
}
function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-overlay")?.classList.remove("open");
}

async function loadNotifBadge() {
  try {
    const data = await API.notifications.getAll({ is_read: "false", limit: 1 });
    const badge = document.getElementById("notif-badge");
    if (badge && data.unread_count > 0) {
      badge.textContent = data.unread_count > 99 ? "99+" : data.unread_count;
      badge.style.display = "flex";
    } else if (badge) {
      badge.style.display = "none";
    }
  } catch {}
}

window.renderSidebar = renderSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.loadNotifBadge = loadNotifBadge;
