# Nagar AI — Test Documentation

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                       │
│         HTML5 • CSS3 • JavaScript (Vanilla) • Served by Express            │
│       Responsive UI • Role-based Dashboards • SVG Icons • DM Sans/DM Serif │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │  REST API (JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND                                          │
│          Node.js 18+ • Express 5 • ES Modules • JWT Auth                   │
│     Multer (uploads) • Brevo Email • OTP Service • Groq AI (LLaMA 3)       │
└───────┬──────────┬──────────┬──────────┬────────────┬──────────────────────┘
        │          │          │          │            │
        ▼          ▼          ▼          ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐
│ Supabase │ │Cloudinary│ │ Groq API │ │  Brevo   │ │   PostGIS            │
│PostgreSQL│ │  Images  │ │  (LLM)   │ │  Email   │ │  (Ward Detection)    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript | Client-side UI |
| Backend | Node.js 18+ | Runtime environment |
| Framework | Express 5 | HTTP routing & middleware |
| Database | Supabase PostgreSQL (hosted) | Persistent data storage |
| ORM/Driver | `pg` (node-postgres) | SQL query execution |
| Auth | JWT (access + refresh tokens) | Stateless authentication |
| File Storage | Cloudinary | Image upload & CDN |
| AI/LLM | Groq API (llama-3.3-70b-versatile) | Complaint classification & priority |
| Email | Brevo (Sendinblue) | Transactional emails (OTP + invites) |
| Uploads | Multer (memory storage) | Multipart form handling |
| Geospatial | PostGIS | Ward detection from GPS coordinates |
| Fonts | DM Serif Display + DM Sans | Typography |
| Icons | Inline SVG (icons.js) | All UI icons |

### Key Design Decisions

- Frontend served from Express at `/frontend` path
- Dark theme: pure black `#000000`, light theme: white sidebar + topbar
- All emojis replaced with inline SVG icons via `assets/js/icons.js`
- AI classification runs non-blocking (fire-and-forget) on complaint submission
- Auto-assignment: system picks available worker with lowest workload
- Municipality auto-creates 2 zones + 4 wards on creation

---

## 2. Database Schema (19 tables)

### 2.1 `profiles`

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'citizen'
        CHECK (role IN ('super_admin','admin','area_admin','worker','citizen')),
    municipality_id UUID REFERENCES municipalities(id),
    avatar_url TEXT,
    password_hash TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 `municipalities`

```sql
CREATE TABLE municipalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    logo_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 `zones`

```sql
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    zone_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 `wards`

```sql
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    ward_no INTEGER NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 `departments`

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 `workers`

```sql
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id),
    ward_id UUID REFERENCES wards(id),
    department_id UUID REFERENCES departments(id),
    availability VARCHAR(20) DEFAULT 'available'
        CHECK (availability IN ('available','busy','off_duty','on_leave')),
    current_workload INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 `ward_admins`

```sql
CREATE TABLE ward_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    municipality_id UUID NOT NULL REFERENCES municipalities(id),
    zone_id UUID REFERENCES zones(id),
    ward_id UUID REFERENCES wards(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.8 `complaints`

```sql
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_no VARCHAR(30) UNIQUE NOT NULL,
    citizen_id UUID NOT NULL REFERENCES profiles(id),
    municipality_id UUID NOT NULL REFERENCES municipalities(id),
    ward_id UUID REFERENCES wards(id),
    department_id UUID REFERENCES departments(id),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location GEOMETRY(Point, 4326),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low','medium','high','critical')),
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending','assigned','in_progress','completed','verified','closed','rejected','duplicate')),
    ai_category VARCHAR(100),
    ai_priority VARCHAR(20),
    ai_department VARCHAR(100),
    duplicate_of UUID REFERENCES complaints(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.9 `complaint_images`

```sql
CREATE TABLE complaint_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50) DEFAULT 'complaint',
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.10 `complaint_assignments`

```sql
CREATE TABLE complaint_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    municipality_id UUID REFERENCES municipalities(id),
    worker_id UUID NOT NULL REFERENCES workers(id),
    assigned_by UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'assigned'
        CHECK (status IN ('assigned','accepted','in_progress','completed','reassigned','cancelled')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

### 2.11 `complaint_timeline`

```sql
CREATE TABLE complaint_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    remarks TEXT,
    changed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.12 `ai_classifications`

```sql
CREATE TABLE ai_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    model_version VARCHAR(100),
    detected_category VARCHAR(100),
    confidence DECIMAL(5,4),
    priority_suggestion TEXT,
    department TEXT,
    summary TEXT,
    raw_output JSONB,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.13 `citizen_feedback`

```sql
CREATE TABLE citizen_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.14 `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.15 `auth_tokens`

```sql
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token_type VARCHAR(30) NOT NULL
        CHECK (token_type IN ('otp','invite','set_password')),
    token_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.16 `notifications`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    related_complaint_id UUID REFERENCES complaints(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.17-2.19 `subscriptions`, `assets`, `ai_verifications`

Additional tables for subscription management, asset tracking, and AI verification logging.

---

## 3. API Routes

Base URL: `http://localhost:5000/api`

### Auth Module (9 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 1 | POST | `/auth/register` | No | — | Register new citizen |
| 2 | POST | `/auth/verify-otp` | No | — | Verify email OTP |
| 3 | POST | `/auth/login` | No | — | Login with email + password |
| 4 | POST | `/auth/refresh` | No | — | Refresh access token |
| 5 | POST | `/auth/logout` | Yes | * | Logout (revoke refresh) |
| 6 | GET | `/auth/me` | Yes | * | Get current user profile |
| 7 | PUT | `/auth/me` | Yes | * | Update profile |
| 8 | POST | `/auth/set-password` | No | — | Set password via invite token |
| 9 | POST | `/auth/google` | No | — | Google OAuth login |

### Invites Module (2 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 10 | POST | `/invites` | Yes | super_admin, admin | Send role invite |
| 11 | GET | `/invites` | Yes | super_admin, admin | List sent invites |

### Admin Module (18 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 12 | GET | `/admin/dashboard` | Yes | super_admin, admin | Dashboard stats |
| 13 | GET | `/admin/municipalities` | Yes | super_admin | List all municipalities |
| 14 | POST | `/admin/municipalities` | Yes | super_admin | Create municipality (+ 2 zones + 4 wards auto) |
| 15 | PUT | `/admin/municipalities/:id` | Yes | super_admin | Update municipality |
| 16 | DELETE | `/admin/municipalities/:id` | Yes | super_admin | Delete municipality |
| 17 | GET | `/admin/zones` | Yes | super_admin, admin | List zones |
| 18 | POST | `/admin/zones` | Yes | super_admin, admin | Create zone |
| 19 | PUT | `/admin/zones/:id` | Yes | super_admin, admin | Update zone |
| 20 | DELETE | `/admin/zones/:id` | Yes | super_admin, admin | Delete zone |
| 21 | GET | `/admin/wards` | Yes | super_admin, admin | List wards |
| 22 | POST | `/admin/wards` | Yes | super_admin, admin | Create ward |
| 23 | PUT | `/admin/wards/:id` | Yes | super_admin, admin | Update ward |
| 24 | DELETE | `/admin/wards/:id` | Yes | super_admin, admin | Delete ward |
| 25 | GET | `/admin/departments` | Yes | super_admin, admin | List departments |
| 26 | POST | `/admin/departments` | Yes | super_admin, admin | Create department |
| 27 | PUT | `/admin/departments/:id` | Yes | super_admin, admin | Update department |
| 28 | DELETE | `/admin/departments/:id` | Yes | super_admin, admin | Delete department |
| 29 | GET | `/admin/users` | Yes | super_admin, admin | List users (filter by role) |
| 30 | GET | `/admin/users/:id` | Yes | super_admin, admin | Get user detail |
| 31 | PATCH | `/admin/users/:id/activate` | Yes | super_admin, admin | Activate user |
| 32 | PATCH | `/admin/users/:id/deactivate` | Yes | super_admin, admin | Deactivate user |

### Area Admin Module (7 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 33 | GET | `/area-admin/dashboard` | Yes | area_admin | Ward dashboard stats |
| 34 | GET | `/area-admin/complaints` | Yes | area_admin | List ward complaints |
| 35 | GET | `/area-admin/complaints/:id` | Yes | area_admin | Complaint detail |
| 36 | PATCH | `/area-admin/complaints/:id/assign` | Yes | area_admin | Assign to worker |
| 37 | PATCH | `/area-admin/complaints/:id/status` | Yes | area_admin | Update status |
| 38 | GET | `/area-admin/workers` | Yes | area_admin | List ward workers |
| 39 | POST | `/area-admin/workers` | Yes | area_admin | Add worker to ward |

### Worker Module (7 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 40 | GET | `/worker/dashboard` | Yes | worker | Worker dashboard stats |
| 41 | GET | `/worker/complaints` | Yes | worker | List assigned complaints |
| 42 | GET | `/worker/complaints/:id` | Yes | worker | Complaint detail |
| 43 | PATCH | `/worker/complaints/:id/accept` | Yes | worker | Accept assignment |
| 44 | PATCH | `/worker/complaints/:id/start` | Yes | worker | Start working |
| 45 | PATCH | `/worker/complaints/:id/complete` | Yes | worker | Complete (requires image) |
| 46 | POST | `/worker/complaints/:id/images` | Yes | worker | Upload image |
| 47 | PATCH | `/worker/availability` | Yes | worker | Set availability status |

### Citizen Module (5 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 48 | POST | `/citizen/complaints` | Yes | citizen | Submit complaint (auto-assign) |
| 49 | GET | `/citizen/complaints` | Yes | citizen | List own complaints |
| 50 | GET | `/citizen/complaints/:id` | Yes | citizen | Complaint detail |
| 51 | POST | `/citizen/complaints/:id/images` | Yes | citizen | Upload image |
| 52 | POST | `/citizen/complaints/:id/feedback` | Yes | citizen | Submit feedback |

### Notification Module (3 endpoints)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 53 | GET | `/notifications` | Yes | * | List notifications |
| 54 | PATCH | `/notifications/:id/read` | Yes | * | Mark as read |
| 55 | PATCH | `/notifications/read-all` | Yes | * | Mark all as read |

---

## 4. Test Workflow

### Phase 1: Auth Setup

```bash
# Register citizen
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@test.com","password":"Test@1234","full_name":"Rajesh Kumar","phone":"9876543210"}'

# Verify OTP (check server logs)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@test.com","otp":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@test.com","password":"Test@1234"}'
# Save: access_token
```

### Phase 2: Super Admin Setup

```bash
# Create super_admin in DB directly:
# UPDATE profiles SET role = 'super_admin' WHERE email = 'your_email';

# Create municipality (auto-creates 2 zones + 4 wards)
curl -X POST http://localhost:5000/api/admin/municipalities \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nagar Municipal Corporation","city":"Nagar","state":"Maharashtra"}'

# Create department
curl -X POST http://localhost:5000/api/admin/departments \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Public Works Department","description":"Roads and infrastructure"}'
```

### Phase 3: Area Admin & Worker

```bash
# Invite area_admin
curl -X POST http://localhost:5000/api/invites \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"areaadmin@test.com","role":"area_admin","municipality_id":"<ID>"}'

# Area admin sets password via link in email
# Then login

# Area admin adds worker
curl -X POST http://localhost:5000/api/area-admin/workers \
  -H "Authorization: Bearer <AREA_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"worker@test.com","full_name":"Amit Singh","phone":"9876543211"}'
```

### Phase 4: Complaint Lifecycle (Auto-Assign)

```bash
# Citizen submits complaint → auto-assigns to available worker
curl -X POST http://localhost:5000/api/citizen/complaints \
  -H "Authorization: Bearer <CITIZEN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pothole on MG Road","description":"Large pothole causing traffic hazard near bus stop, multiple vehicles damaged","priority":"high"}'
# Response: _auto_assigned: true, status: "assigned"

# Worker accepts
curl -X PATCH http://localhost:5000/api/worker/complaints/<ID>/accept \
  -H "Authorization: Bearer <WORKER_TOKEN>"

# Worker starts
curl -X PATCH http://localhost:5000/api/worker/complaints/<ID>/start \
  -H "Authorization: Bearer <WORKER_TOKEN>"

# Worker uploads image
curl -X POST http://localhost:5000/api/worker/complaints/<ID>/images \
  -H "Authorization: Bearer <WORKER_TOKEN>" \
  -F "image=@./before.jpg" -F "image_type=progress"

# Worker completes (requires at least 1 image)
curl -X PATCH http://localhost:5000/api/worker/complaints/<ID>/complete \
  -H "Authorization: Bearer <WORKER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"remarks":"Pothole filled and road restored"}'

# Citizen gives feedback
curl -X POST http://localhost:5000/api/citizen/complaints/<ID>/feedback \
  -H "Authorization: Bearer <CITIZEN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"review":"Excellent work!"}'
```

---

## 5. Role Permissions Matrix

| Action | super_admin | admin | area_admin | worker | citizen |
|--------|:-----------:|:-----:|:----------:|:------:|:-------:|
| Create municipality | ✓ | ✗ | ✗ | ✗ | ✗ |
| Auto-create zones/wards | ✓ | ✗ | ✗ | ✗ | ✗ |
| CRUD zones/departments | ✓ | ✓ | ✗ | ✗ | ✗ |
| Invite users | ✓ | ✓ | ✓* | ✗ | ✗ |
| View all complaints | ✓ | ✓ | ✗ | ✗ | ✗ |
| View ward complaints | ✓ | ✓ | ✓ | ✗ | ✗ |
| Assign complaint | ✓ | ✓ | ✓ | ✗ | ✗ |
| Add workers to ward | ✗ | ✗ | ✓ | ✗ | ✗ |
| Accept/start task | ✗ | ✗ | ✗ | ✓ | ✗ |
| Complete task (with image) | ✗ | ✗ | ✗ | ✓ | ✗ |
| Submit complaint | ✗ | ✗ | ✗ | ✗ | ✓ |
| Auto-assign on submit | — | — | — | — | ✓ |
| AI auto-classify | — | — | — | — | ✓ |
| Submit feedback | ✗ | ✗ | ✗ | ✗ | ✓ |

> *area_admin can only invite workers to their own ward

---

## 6. Complaint Lifecycle Flow (Auto-Assign)

```
                    ┌──────────────┐
                    │    Citizen   │
                    │   Submits    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        PostGIS detect  Fallback    Insert as
        ward boundary   any ward    "pending"
              │            │            │
              └────────────┼────────────┘
                           │
                    Auto-find available worker
                    (ward → municipality fallback)
                    (lowest workload first)
                           │
                           ▼
                    ┌──────────────┐
                    │   assigned   │ ◄─── Auto-assigned to worker
                    └──────┬───────┘
                           │
                     Worker accepts
                           │
                           ▼
                    ┌──────────────┐
                    │   accepted   │ ◄─── Complaint stays "assigned"
                    └──────┬───────┘
                           │
                     Worker starts
                           │
                           ▼
                    ┌──────────────┐
                    │ in_progress  │ ◄─── Work begins
                    └──────┬───────┘
                           │
                     Upload image(s) ← REQUIRED
                     Worker completes
                           │
                           ▼
                    ┌──────────────┐
                    │  completed   │ ◄─── Work done
                    └──────┬───────┘
                           │
                   Area Admin verifies
                           │
                           ▼
                    ┌──────────────┐
                    │   verified   │ ◄─── Resolution confirmed
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    closed    │ ◄─── Final state
                    └──────────────┘
```

### State Transitions

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | pending→assigned | Auto-assigned on submit | System |
| assigned | accepted | Worker clicks Accept | Worker |
| accepted | in_progress | Worker clicks Start | Worker |
| in_progress | completed | Worker clicks Complete (with image) | Worker |
| completed | verified | Area Admin verifies | Area Admin |
| verified | closed | Auto-close or manual | System |
| any | rejected | Invalid complaint | Area Admin |

---

## 7. Frontend Pages Map

| # | Page | URL Path | Role Access |
|---|------|----------|-------------|
| 1 | Login | `/frontend/auth/login.html` | Public |
| 2 | Register | `/frontend/auth/register.html` | Public |
| 3 | Verify OTP | `/frontend/auth/verify-otp.html` | Public |
| 4 | Set Password | `/frontend/auth/set-password.html` | Public (token) |
| 5 | Admin Dashboard | `/frontend/admin/dashboard.html` | super_admin, admin |
| 6 | Municipalities | `/frontend/admin/municipalities.html` | super_admin |
| 7 | Zones | `/frontend/admin/zones.html` | super_admin, admin |
| 8 | Wards | `/frontend/admin/wards.html` | super_admin, admin |
| 9 | Departments | `/frontend/admin/departments.html` | super_admin, admin |
| 10 | Users | `/frontend/admin/users.html` | super_admin, admin |
| 11 | Invites | `/frontend/admin/invite.html` | super_admin, admin |
| 12 | Complaints (Admin) | `/frontend/admin/complaints.html` | super_admin, admin |
| 13 | Area Admin Dashboard | `/frontend/area_admin/dashboard.html` | area_admin |
| 14 | Ward Complaints | `/frontend/area_admin/complaints.html` | area_admin |
| 15 | Complaint Detail | `/frontend/area_admin/complaint-detail.html` | area_admin |
| 16 | Ward Workers | `/frontend/area_admin/workers.html` | area_admin |
| 17 | Worker Dashboard | `/frontend/worker/dashboard.html` | worker |
| 18 | My Complaints | `/frontend/worker/complaints.html` | worker |
| 19 | Complaint Detail | `/frontend/worker/complaint-detail.html` | worker |
| 20 | Citizen Dashboard | `/frontend/citizen/dashboard.html` | citizen |
| 21 | Submit Complaint | `/frontend/citizen/submit-complaint.html` | citizen |
| 22 | My Complaints | `/frontend/citizen/complaints.html` | citizen |
| 23 | Complaint Detail | `/frontend/citizen/complaint-detail.html` | citizen |

---

## 8. Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Supabase pooler)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# JWT
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary (images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Groq AI
GROQ_API_KEY=gsk_your_groq_api_key

# Brevo Email
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@nagar.ai
BREVO_SENDER_NAME=Nagar AI

# Frontend
FRONTEND_URL=http://localhost:5000/frontend
```

---

*Total Endpoints: 55 | Tables: 19 | Roles: 5 | Frontend Pages: 23*
