# Nagar AI — Screenshots & Workflow Documentation

---

## System Overview

Nagar AI is a full-stack municipal complaint management system with 5 roles: **super_admin**, **admin**, **area_admin**, **worker**, and **citizen**. Complaints are auto-classified by AI (Groq/LLaMA) and auto-assigned to available workers.

---

## 1. Authentication Flow

### Set Password (Invite-based)

![Set Password](images/area-admin/set-pass.png)

**Workflow:**
1. Admin/area_admin sends invite via email
2. Invited user receives email with a link: `/frontend/auth/set-password.html?token=...`
3. User creates password (min 8 chars, uppercase, number, special char)
4. After setting password, redirects to login page

---

## 2. Admin Portal

The **admin** manages the municipality structure: zones, wards, departments, and users.

### 2.1 Admin Dashboard

![Admin Dashboard](images/Admin/dashboard.png)

**Shows:**
- Total complaints, pending, in progress, completed
- Total workers, total wards, area admins, citizens
- Quick links: Manage Wards, Departments, Users, Invite User

**Workflow:** Admin gets an overview of the entire municipality at a glance.

---

### 2.2 Manage Zones

![Zones](images/Admin/zones.png)

**Shows:**
- List of zones with ward count, created date
- Add, edit, delete zones

**Workflow:** When a municipality is created, 2 zones (Zone A, Zone B) are auto-created. Admin can add more.

---

### 2.3 Manage Wards

![Wards](images/Admin/wards.png)

**Shows:**
- Ward number, name, zone, admin count, worker count
- Search, add, edit, delete wards

**Workflow:** When a municipality is created, 4 wards (2 per zone) are auto-created. Each ward gets an area_admin assigned.

---

### 2.4 Manage Departments

![Departments](images/Admin/departments.png)

**Shows:**
- Department name, description, worker count
- Add, edit, delete departments

**Workflow:** Admin creates departments (Sanitation, Roads, Water, etc.) to categorize complaints and assign workers.

---

### 2.5 Invite User

![Invite User](images/Admin/invite.png)

**Shows:**
- Form: Full Name, Phone, Email, Role (dropdown), Ward (dropdown)
- Send Invite button
- Recent Invites list below

**Workflow:**
1. Admin fills form and selects role (Area Admin, Worker, etc.)
2. System sends email with set-password link
3. User clicks link, sets password, can then login

---

### 2.6 Manage Users

![Users](images/Admin/users.png)

**Shows:**
- User list with Name, Email, Role, Ward/Dept, Verified status, Status
- Search by name/email, filter by role
- Activate/Deactivate toggle

**Workflow:** Admin can view all users, activate or deactivate accounts.

---

## 3. Area Admin Portal

The **area_admin** manages complaints and workers in their assigned ward.

### 3.1 Area Admin Dashboard

![Area Admin Dashboard](images/area-admin/dashboard.png)

**Shows:**
- Ward info: "Ward 1 (North Zone)"
- Total complaints, pending, in progress, completed
- Workers available, workers busy
- Recent complaints table

**Workflow:** Area admin monitors their ward's complaint status and worker availability.

---

### 3.2 Ward Complaints

![Area Admin Complaints](images/area-admin/complaints.png)

**Shows:**
- Complaint list with No., Title, Citizen, Status, Priority, Worker, Date
- Filter by status, priority, search
- View action button

**Workflow:** Area admin views all complaints in their ward, can filter and assign workers.

---

### 3.3 Manage Workers

![Area Admin Workers](images/area-admin/worker.png)

**Shows:**
- Worker cards with name, email, availability badge, department
- Workload progress bar (e.g., 1/10)
- Star rating (5.0)
- Completed complaints count
- "+ Add Worker" button

**Workflow:**
1. Area admin can add workers directly to their ward
2. Can filter by availability (available, busy, off duty)
3. Worker workload and rating are tracked

---

## 4. Citizen Portal

The **citizen** submits complaints and tracks their resolution.

### 4.1 Citizen Dashboard

![Citizen Dashboard](images/user/dashboard.png)

**Shows:**
- Welcome message with user name
- Stats: Submitted, Pending, In Progress, Resolved
- "Submit New Complaint" card
- Recent complaints list

**Workflow:** Citizen lands here after login, can quickly submit a new complaint or view existing ones.

---

### 4.2 Submit Complaint — Step 1: Details

![Submit Step 1](images/user/submit-complain-s1.png)

**Shows:**
- 3-step wizard: Details > Location > Photos
- Title field
- Description field (min 20 chars)
- Priority selector: Low, Medium, High, Critical
- "Next: Location" button

**Workflow:** Citizen fills in complaint details and selects priority.

---

### 4.3 Submit Complaint — Step 2: Location

![Submit Step 2](images/user/submit-complain-s2.png)

**Shows:**
- Interactive Leaflet/OpenStreetMap
- Click on map to set location
- "Use My Location" button (GPS)
- Auto-filled Latitude/Longitude
- Back and "Next: Photos" buttons

**Workflow:**
1. Citizen clicks on map or uses GPS to set complaint location
2. System uses PostGIS to detect which ward the location falls in
3. Auto-assigns complaint to a worker in that ward

---

### 4.4 Submit Complaint — Step 3: Photos

![Submit Step 3](images/user/submit-complain-s3.png)

**Shows:**
- Upload Photos area (optional, max 3, max 5MB each)
- Image preview with remove button
- Back and "Submit Complaint" buttons

**Workflow:**
1. Citizen uploads optional photos
2. Clicks "Submit Complaint"
3. System creates complaint, auto-detects ward, auto-assigns to available worker
4. AI classifies category, priority, department in background

---

### 4.5 My Complaints (Citizen)

![Citizen History](images/user/history.png)

**Shows:**
- Filter tabs: All, Pending, In Progress, Completed, Rejected
- Complaint cards with: Complaint No., Title, Description, Priority badge, Status badge, Date

**Workflow:** Citizen tracks all their complaints and their current status.

---

## 5. Worker Portal

The **worker** accepts, works on, and completes assigned complaints.

### 5.1 Worker Dashboard

![Worker Dashboard](images/worker/dashboard.png)

**Shows:**
- Worker name, rating (5.00/5), workload (1)
- Availability toggle: available, busy, off duty
- Stats: Total Assigned, Accepted, In Progress, Completed Today
- Recent complaints table

**Workflow:** Worker sees their assignment overview and can toggle availability.

---

### 5.2 My Complaints (Worker)

![Worker Complaints](images/worker/complaints.png)

**Shows:**
- Complaint list with No., Title, Priority, Status, Citizen, Assigned date
- "Accept" button for assigned complaints
- Filter by status

**Workflow:**
1. Worker sees complaints assigned to them
2. Clicks "Accept" to accept the complaint
3. Status changes from "assigned" to "accepted"

---

### 5.3 Complaint Detail — Upload Image

![Worker Complete Work](images/worker/complete-work.png)

**Shows:**
- Complaint detail with Leaflet map showing location
- Upload Image panel: Image Type (Progress/After), file selector
- Image preview
- "Upload Image" button
- Existing images section below

**Workflow:**
1. Worker views complaint location on map
2. Uploads progress/after images
3. After uploading at least one image, can mark as complete

---

### 5.4 Complaint Completed

![Worker Completed](images/worker/completed-work.png)

**Shows:**
- My Complaints list with status "completed" (green badge)
- "View" button

**Workflow:** After worker marks complete, complaint status changes to "completed". Area admin can then verify.

---

## 6. Full Complaint Lifecycle

```
Citizen submits complaint
        │
        ▼
   ┌─────────┐     PostGIS detects ward
   │ pending  │     AI classifies category + priority
   └────┬────┘
        │
   Auto-assigned to available worker (lowest workload)
        │
        ▼
   ┌──────────┐
   │ assigned  │ ◄── Worker sees "Accept" button
   └────┬─────┘
        │
   Worker clicks Accept
        │
        ▼
   ┌──────────┐
   │ accepted  │ ◄── Worker sees "Start Working" button
   └────┬─────┘
        │
   Worker clicks Start
        │
        ▼
   ┌──────────────┐
   │ in_progress   │ ◄── Upload card appears
   └────┬─────────┘
        │
   Upload image(s) + Click "Mark as Complete"
        │
        ▼
   ┌───────────┐
   │ completed  │ ◄── Requires at least 1 image
   └────┬──────┘
        │
   Area admin verifies
        │
        ▼
   ┌───────────┐
   │  verified  │
   └────┬──────┘
        │
   Auto-close or manual close
        │
        ▼
   ┌─────────┐
   │  closed  │
   └─────────┘
```

---

## 7. Key Features

| Feature | Description |
|---|---|
| **Auto-Assignment** | Complaints auto-assign to available worker with lowest workload |
| **AI Classification** | Groq API (LLaMA 3) classifies category, priority, department |
| **PostGIS Ward Detection** | GPS coordinates auto-detect which ward the complaint belongs to |
| **Image Requirement** | Worker must upload at least 1 image before completing |
| **Municipality Auto-Division** | New municipality auto-creates 2 zones + 4 wards |
| **Worker Auto-Add** | Area admin can add workers directly to their ward |
| **Dark/Light Theme** | Toggle between pure black dark theme and white light theme |
| **Responsive Design** | Hamburger menu, collapsing grids for mobile |

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js + Express 5 (ES Modules) |
| Database | PostgreSQL via Supabase (PostGIS) |
| Auth | JWT (access + refresh tokens) |
| AI | Groq API (llama-3.3-70b-versatile) |
| Images | Cloudinary |
| Email | Brevo (Sendinblue) |
| Fonts | DM Serif Display + DM Sans |
| Icons | Inline SVG |
| Maps | Leaflet + OpenStreetMap |

---

*Generated: 28 July 2026*


# Nagar AI — Municipal Workforce & Complaint Management System

## Tech Stack

- **Backend:** Node.js + Express.js (ES Modules, port 5000)
- **Database:** PostgreSQL via Supabase (connection pooler, port 6543)
- **Auth:** JWT (access + refresh tokens) + Brevo email (OTP + invites)
- **Storage:** Cloudinary (complaint images)
- **AI:** Groq API — llama-3.3-70b-versatile (auto-classification + priority)
- **Frontend:** HTML + CSS + Vanilla JS (served from Express at `/frontend`)
- **Geospatial:** PostGIS (ward detection from GPS coordinates)

## 5 Roles

| Role | Access |
|---|---|
| `super_admin` | Everything + municipalities + subscriptions |
| `admin` | Zones, departments, users in their municipality |
| `area_admin` | Complaints in their ward, assign/add workers |
| `worker` | Assigned complaints, accept/start/complete + image upload |
| `citizen` | Submit complaints (auto-assigned), track, feedback |

## Database (19 tables)

```
municipalities, profiles, zones, wards, departments, workers,
ward_admins, complaints, complaint_images, complaint_assignments,
complaint_timeline, ai_classifications, citizen_feedback,
refresh_tokens, auth_tokens, notifications, subscriptions,
assets, ai_verifications
```

## Backend API (55 endpoints)

### Auth `/api/auth`
```
POST   /register          Register citizen
POST   /verify-otp        Verify email OTP
POST   /login             Login
POST   /refresh           Refresh token
POST   /logout            Logout
GET    /me                Get profile
PUT    /me                Update profile
POST   /set-password      Set password via invite
POST   /google            Google OAuth
```

### Invites `/api/invites`
```
POST   /                  Send invite
GET    /                  List invites
```

### Admin `/api/admin`
```
GET    /dashboard              Dashboard stats
GET    /municipalities         List municipalities
POST   /municipalities         Create (+ auto 2 zones + 4 wards)
PUT    /municipalities/:id     Update
DELETE /municipalities/:id     Delete
GET    /zones                  List zones
POST   /zones                  Create zone
PUT    /zones/:id              Update
DELETE /zones/:id              Delete
GET    /wards                  List wards
POST   /wards                  Create ward
PUT    /wards/:id              Update
DELETE /wards/:id              Delete
GET    /departments            List departments
POST   /departments            Create
PUT    /departments/:id        Update
DELETE /departments/:id        Delete
GET    /users                  List users
GET    /users/:id              Get user
PATCH  /users/:id/activate     Activate
PATCH  /users/:id/deactivate   Deactivate
```

### Area Admin `/api/area-admin`
```
GET    /dashboard                   Ward stats
GET    /complaints                  Ward complaints
GET    /complaints/:id              Detail
PATCH  /complaints/:id/assign       Assign to worker
PATCH  /complaints/:id/status       Update status
GET    /workers                     List ward workers
POST   /workers                     Add worker to ward
```

### Worker `/api/worker`
```
GET    /dashboard                   Worker stats
GET    /complaints                  My assigned complaints
GET    /complaints/:id              Detail
PATCH  /complaints/:id/accept       Accept
PATCH  /complaints/:id/start        Start working
PATCH  /complaints/:id/complete     Complete (requires image)
POST   /complaints/:id/images       Upload image
PATCH  /availability                Set availability
```

### Citizen `/api/citizen`
```
POST   /complaints              Submit (auto-assigns to worker)
GET    /complaints              My complaints
GET    /complaints/:id          Detail
POST   /complaints/:id/images   Upload image
POST   /complaints/:id/feedback Submit feedback
```

### Notifications `/api/notifications`
```
GET    /                  My notifications
PATCH  /:id/read          Mark read
PATCH  /read-all          Mark all read
```

## Key Features

### Auto-Assignment
When a citizen submits a complaint:
1. PostGIS detects which ward the GPS coordinates fall in
2. System finds available worker in that ward (lowest workload)
3. Falls back to any available worker in the municipality
4. Complaint status set to `assigned` automatically

### AI Auto-Classification
- Groq API (llama-3.3-70b-versatile) analyzes title + description
- Returns: category, priority, department, confidence, summary
- Priority auto-updates on the complaint
- Runs non-blocking (fire-and-forget)

### Municipality Auto-Division
When super_admin creates a municipality:
- 2 zones auto-created (Zone A, Zone B)
- 4 wards auto-created (Ward 1-2 in A, Ward 3-4 in B)

### Worker Completion Requires Image
- Frontend disables "Mark as Complete" button if no image uploaded
- Backend validates at least one image in `complaint_images` table

## Frontend (23 pages, served from Express)

```
frontend/
├── auth/           login, register, verify-otp, set-password
├── admin/          dashboard, municipalities, zones, wards, departments, users, invite, complaints
├── area_admin/     dashboard, complaints, complaint-detail, workers
├── worker/         dashboard, complaints, complaint-detail
├── citizen/        dashboard, submit-complaint, complaints, complaint-detail
└── assets/
    ├── css/style.css       DM Sans + DM Serif, pure black dark theme
    └── js/
        ├── api.js          Central API layer
        ├── auth.js         Token management + route protection
        ├── utils.js        toast, emptyState, badges, helpers
        ├── icons.js        22 inline SVG icons
        ├── theme.js        Dark/light toggle
        └── sidebar-*.js    Role-specific sidebars with hamburger
```

## Design

- **Fonts:** DM Serif Display (headings) + DM Sans (body)
- **Dark theme:** Pure black `#000000`, surfaces `#0a0a0a`
- **Light theme:** White sidebar + topbar, `#f5f5f4` background
- **Icons:** All inline SVG (no emoji, no icon library)
- **Responsive:** Hamburger menu, collapsing grids, stacked forms

## Environment Variables

```env
PORT=5000
DATABASE_URL=          # Supabase pooler (port 6543)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=          # Groq console
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
FRONTEND_URL=http://localhost:5000/frontend
```

## Getting Started

```bash
# Install
cd backend && npm install

# Set up .env
cp .env.example .env   # Fill in real values

# Run
node server.js

# Access
open http://localhost:5000/frontend/auth/login.html
```
