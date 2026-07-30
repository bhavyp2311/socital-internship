/**
 * assets/js/auth.js
 * Token management, role checking, and route protection.
 * Include this on every page.
 */

const Auth = {
  save(tokens, profile) {
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    localStorage.setItem("profile", JSON.stringify(profile));
  },

  getProfile() {
    try { return JSON.parse(localStorage.getItem("profile")); }
    catch { return null; }
  },

  getRole() {
    return this.getProfile()?.role || null;
  },

  isLoggedIn() {
    return !!localStorage.getItem("access_token");
  },

  logout() {
    localStorage.clear();
    window.location.href = "/auth/login.html";
  },

  // Call at top of every protected page with the allowed roles
  require(...roles) {
    if (!this.isLoggedIn()) {
      window.location.href = "/auth/login.html";
      return false;
    }
    if (roles.length && !roles.includes(this.getRole())) {
      window.location.href = "/auth/login.html";
      return false;
    }
    return true;
  },

  // Redirect logged-in user to their dashboard
  redirectToDashboard() {
    const role = this.getRole();
    const map = {
      super_admin: "/admin/dashboard.html",
      admin:       "/admin/dashboard.html",
      area_admin:  "/area_admin/dashboard.html",
      worker:      "/worker/dashboard.html",
      citizen:     "/citizen/dashboard.html",
    };
    if (map[role]) window.location.href = map[role];
  },
};

window.Auth = Auth;
