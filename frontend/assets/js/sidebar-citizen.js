function renderTopnav(activePage) {
  const profile = Auth.getProfile() || {};
  const html = `
  <nav class="topnav">
    <a href="dashboard.html" class="topnav-logo">
      <span class="logo-icon">${I.building}</span>
      Municipal Services
    </a>
    <div class="topnav-links">
      <a href="dashboard.html" class="${activePage==='dashboard'?'active':''}">Home</a>
      <a href="submit-complaint.html" class="${activePage==='submit'?'active':''}">Submit Complaint</a>
      <a href="my-complaints.html" class="${activePage==='my-complaints'?'active':''}">My Complaints</a>
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
window.renderTopnav = renderTopnav;
