function renderTopnav(activePage) {
  const profile = Auth.getProfile() || {};
  const html = `
  <nav class="topnav">
    <a href="dashboard.html" class="topnav-logo">
      <span class="logo-icon">${I.building}</span>
      Nagar AI
    </a>
    <div class="topnav-links">
      <a href="dashboard.html" class="${activePage==='dashboard'?'active':''}">Home</a>
      <a href="submit-complaint.html" class="${activePage==='submit'?'active':''}">Submit Complaint</a>
      <a href="my-complaints.html" class="${activePage==='my-complaints'?'active':''}">My Complaints</a>
      <a href="notifications.html" class="topnav-notif-link ${activePage==='notifications'?'active':''}">
        <span class="topnav-notif-icon">${I.bell}</span>
        <span>Notifications</span>
        <span class="topnav-notif-badge" id="notif-badge"></span>
      </a>
    </div>
    <div class="topnav-right">
      ${themeToggleHTML()}
      <div class="topnav-user">
        <div class="avatar" style="width:28px;height:28px;font-size:0.75rem">${(profile.full_name||"C").charAt(0)}</div>
        <span>${profile.full_name || "Citizen"}</span>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="Auth.logout()">Logout</button>
    </div>
  </nav>`;
  document.body.insertAdjacentHTML("afterbegin", html);
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

window.renderTopnav = renderTopnav;
window.loadNotifBadge = loadNotifBadge;
