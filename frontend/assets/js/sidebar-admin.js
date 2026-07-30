function renderSidebar(activePage) {
  const html = `
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">${I.building}</div>
      <div>
        <div class="logo-text">Nagar AI</div>
        <div class="logo-sub">Admin Portal</div>
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
      <div class="nav-section">Setup</div>
      <a href="municipalities.html" class="nav-item ${activePage==='municipalities'?'active':''}">
        <span class="icon">${I.building2}</span> Municipalities
      </a>
      <a href="zones.html" class="nav-item ${activePage==='zones'?'active':''}">
        <span class="icon">${I.mapPin}</span> Zones
      </a>
      <a href="wards.html" class="nav-item ${activePage==='wards'?'active':''}">
        <span class="icon">${I.mapPin}</span> Wards
      </a>
      <a href="departments.html" class="nav-item ${activePage==='departments'?'active':''}">
        <span class="icon">${I.building2}</span> Departments
      </a>
      <div class="nav-section">People</div>
      <a href="users.html" class="nav-item ${activePage==='users'?'active':''}">
        <span class="icon">${I.users}</span> Users
      </a>
      <a href="invite.html" class="nav-item ${activePage==='invite'?'active':''}">
        <span class="icon">${I.mail}</span> Invite User
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="avatar" id="user-avatar">A</div>
      <div>
        <div class="user-name" id="user-name">Admin</div>
        <div class="user-role" id="user-role">admin</div>
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
