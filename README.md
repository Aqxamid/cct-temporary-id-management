# Student ID Management System

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

### City College of Tagaytay

A web-based intranet system for issuing and managing **temporary student IDs**. Admins manage students through a secure dashboard; students submit their photos and signatures via a unique personal link sent to their institutional email. The system then auto-generates a PDF temporary ID card and emails it directly to the student.

---

## Features

| Feature | Description |
|---|---|
| **Admin Dashboard** | Manage students, review submissions, approve/reject uploads, configure global signatories |
| **Student Portal** | Secure per-student upload form for 2×2 photo and digital signature |
| **PDF ID Generation** | High-quality temporary ID cards generated via Puppeteer |
| **Email Automation** | Sends approval notifications and the PDF ID directly to the student's email |
| **Auth & Rate Limiting** | JWT-based admin auth, bcrypt passwords, express-rate-limit |
| **QR Renewal** | QR-code based renewal flow for student ID requests |

---

## Project Structure

```
student-id-management-system/
├── server.js                  # Entry point — Express app setup & routes
├── .env                       # Local secrets (not committed)
├── .env.example               # Template for required environment variables
│
├── src/
│   ├── config/                # Environment config loader
│   ├── controllers/           # Route handler logic
│   ├── middleware/            # Auth middleware (JWT)
│   ├── routes/                # Express route definitions
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   └── renewalRoutes.js
│   ├── services/              # Business logic (email, PDF gen, etc.)
│   └── views/                 # HTML pages served by Express
│       ├── adminDashboard.html
│       ├── adminLogin.html
│       ├── studentUpload.html
│       ├── studentLogin.html
│       └── idCardTemplate.html
│
├── public/                    # Static assets served at /public
│   ├── css/
│   ├── js/
│   ├── favicon.ico            # Favicon (City College of Tagaytay seal)
│   └── images/
│
├── data/                      # JSON flat-file database (not committed)
│   ├── students.json
│   ├── admins.json
│   └── settings.json
│
└── uploads/                   # User-uploaded files (not committed)
    ├── photos/
    ├── signatures/
    ├── qrcodes/
    └── documents/
```

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) enabled (for SMTP)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example file and fill in your values:
```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port to run the server on (default: `3000`) |
| `PUBLIC_BASE_URL` | Base URL used in student upload links (e.g. `http://localhost:3000`) |
| `SESSION_SECRET` | Long random string for JWT signing |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (typically `587`) |
| `SMTP_USER` | Your sending email address |
| `SMTP_PASS` | Gmail App Password (not your login password) |

### 3. Start the server

**Production / normal start:**
```bash
npm start
```

**Development (auto-restarts on file changes):**
```bash
npm run dev
```

### 4. Access the system

| URL | Description |
|---|---|
| `http://localhost:3000/admin` | Admin dashboard (login required) |
| `http://localhost:3000/admin/login` | Admin login page |
| `http://localhost:3000/upload/:token` | Student upload portal (per-student link) |

---

## Managing Students

### Adding a student (recommended — via API)

Use `curl`, Postman, or any HTTP client. The system auto-generates a secure `uploadToken` and sends an invitation email:

```bash
curl -X POST http://localhost:3000/admin/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "2026-CCT-1234",
    "fullName": "Jane Doe",
    "email": "jane.doe@citycollegeoftagaytay.edu.ph",
    "course": "BS Information Technology",
    "programStartDate": "2026"
  }'
```

### Manual entry (advanced)

You can edit `data/students.json` directly **while the server is stopped**, but you must provide the `uploadToken` manually and ensure valid JSON (no BOM, no trailing commas).

---

## Global Settings

The **Global Settings** tab in the Admin Dashboard lets you update:
- **MIS Signer** name and role
- **College President** signature and name
- Other ID card defaults

Changes apply to all newly generated IDs and persist across restarts via `data/settings.json` — no server restart needed.

---

## Maintenance & Cleanup

| Task | How |
|---|---|
| Clear students for a new semester | Overwrite `data/students.json` with `[]` |
| Clear uploads | Delete contents of `uploads/photos/`, `uploads/signatures/`, `uploads/documents/` |
| Clear generated IDs | Delete contents of `student_temporary_id_doc/` |
| Reset settings | Delete `data/settings.json` (defaults will be recreated) |

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer
- **Auth**: JWT + bcrypt
- **Storage**: JSON flat-file (no database required)
- **Templating**: docxtemplater + pizzip
