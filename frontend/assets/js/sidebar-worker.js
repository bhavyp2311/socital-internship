function renderSidebar(activePage) {
  const html = `
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">${I.building}</div>
      <div>
        <div class="logo-text">Municipal</div>
        <div class="logo-sub">Worker Portal</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">Main</div>
      <a href="dashboard.html" class="nav-item ${activePage==='dashboard'?'active':''}">
        <span class="icon">${I.barChart}</span> Dashboard
      </a>
      <a href="complaints.html" class="nav-item ${activePage==='complaints'?'active':''}">
        <span class="icon">${I.clipboard}</span> My Complaints
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="avatar" id="user-avatar">W</div>
      <div>
        <div class="user-name" id="user-name">Worker</div>
        <div class="user-role" id="user-role">worker</div>
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

window.renderSidebar = renderSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
