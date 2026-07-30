/**
 * assets/js/api.js — Central API layer
 */

const BASE_URLad = "/api";

function getToken() {
  return localStorage.getItem("access_token");
}

function buildQuery(params) {
  if (!params) return "";
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "undefined" && v !== "null") {
      filtered[k] = v;
    }
  }
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
}

async function request(method, path, body = null, isMultipart = false) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const config = { method, headers };
  if (body) {
    config.body = isMultipart ? body : JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Request failed");
  return data.data;
}

const auth = {
  login:      (body) => request("POST", "/auth/login", body),
  register:   (body) => request("POST", "/auth/register", body),
  verifyOtp:  (body) => request("POST", "/auth/verify-otp", body),
  me:         ()     => request("GET",  "/auth/me"),
  updateMe:   (body) => request("PUT",  "/auth/me", body),
  refresh:    (body) => request("POST", "/auth/refresh", body),
  logout:     (body) => request("POST", "/auth/logout", body),
  setPassword:(body) => request("POST", "/auth/set-password", body),
};

const admin = {
  dashboard:            ()          => request("GET",    "/admin/dashboard"),
  getMunicipalities:    ()          => request("GET",    "/admin/municipalities"),
  createMunicipality:   (body)      => request("POST",   "/admin/municipalities", body),
  updateMunicipality:   (id, body)  => request("PUT",    `/admin/municipalities/${id}`, body),
  deleteMunicipality:   (id)        => request("DELETE", `/admin/municipalities/${id}`),
  getZones:             ()          => request("GET",    "/admin/zones"),
  createZone:           (body)      => request("POST",   "/admin/zones", body),
  updateZone:           (id, body)  => request("PUT",    `/admin/zones/${id}`, body),
  deleteZone:           (id)        => request("DELETE", `/admin/zones/${id}`),
  getWards:             ()          => request("GET",    "/admin/wards"),
  createWard:           (body)      => request("POST",   "/admin/wards", body),
  updateWard:           (id, body)  => request("PUT",    `/admin/wards/${id}`, body),
  deleteWard:           (id)        => request("DELETE", `/admin/wards/${id}`),
  getDepartments:       ()          => request("GET",    "/admin/departments"),
  createDepartment:     (body)      => request("POST",   "/admin/departments", body),
  updateDepartment:     (id, body)  => request("PUT",    `/admin/departments/${id}`, body),
  deleteDepartment:     (id)        => request("DELETE", `/admin/departments/${id}`),
  getUsers:             (role)      => request("GET",    `/admin/users${role ? `?role=${role}` : ""}`),
  getUser:              (id)        => request("GET",    `/admin/users/${id}`),
  activateUser:         (id)        => request("PATCH",  `/admin/users/${id}/activate`),
  deactivateUser:       (id)        => request("PATCH",  `/admin/users/${id}/deactivate`),
  invite:               (body)      => request("POST",   "/invites", body),
  getInvited:           ()          => request("GET",    "/invites"),
};

const areaAdmin = {
  dashboard:            ()              => request("GET",    "/area-admin/dashboard"),
  getComplaints:        (params)        => request("GET",    `/area-admin/complaints${buildQuery(params)}`),
  getComplaint:         (id)            => request("GET",    `/area-admin/complaints/${id}`),
  assignComplaint:      (id, body)      => request("PATCH",  `/area-admin/complaints/${id}/assign`, body),
  updateStatus:         (id, body)      => request("PATCH",  `/area-admin/complaints/${id}/status`, body),
  getWorkers:           ()              => request("GET",    "/area-admin/workers"),
  createWorker:         (body)          => request("POST",   "/area-admin/workers", body),
};

const worker = {
  dashboard:            ()              => request("GET",    "/worker/dashboard"),
  getComplaints:        (params)        => request("GET",    `/worker/complaints${buildQuery(params)}`),
  getComplaint:         (id)            => request("GET",    `/worker/complaints/${id}`),
  accept:               (id)            => request("PATCH",  `/worker/complaints/${id}/accept`),
  start:                (id)            => request("PATCH",  `/worker/complaints/${id}/start`),
  complete:             (id, body)      => request("PATCH",  `/worker/complaints/${id}/complete`, body),
  uploadImage:          (id, formData)  => request("POST",   `/worker/complaints/${id}/images`, formData, true),
  setAvailability:      (body)          => request("PATCH",  "/worker/availability", body),
};

const citizen = {
  submitComplaint:  (body)      => request("POST",   "/citizen/complaints", body),
  uploadImage:      (id, formData) => request("POST", `/citizen/complaints/${id}/images`, formData, true),
  getComplaints:    (params)    => request("GET",    `/citizen/complaints${buildQuery(params)}`),
  getComplaint:     (id)        => request("GET",    `/citizen/complaints/${id}`),
  submitFeedback:   (id, body)  => request("POST",   `/citizen/complaints/${id}/feedback`, body),
};

const notifications = {
  getAll:        (params)    => request("GET",    `/notifications${buildQuery(params)}`),
  markRead:      (id)        => request("PATCH",  `/notifications/${id}/read`),
  markAllRead:   ()          => request("PATCH",  "/notifications/read-all"),
};

window.API = { auth, admin, areaAdmin, worker, citizen, notifications };
