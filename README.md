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
| **Email Automation** | Sends approval notifications with the MIS banner and downloadable PDF ID attachment |
| **Bulk Student Import** | Import CSV or JSON reference data; duplicate student IDs are skipped safely |
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
- [Node.js](https://nodejs.org/) v22.12 or later
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
| `EMAIL_BANNER_URL` | Optional public URL for `mis_email_banner.png` in email bodies; the banner is also attached to every email |
| `JWT_SECRET` | Long random string for JWT signing |
| `SEED_ADMIN_USERNAME` | Optional seed-admin username; set before the first seed run |
| `SEED_ADMIN_PASSWORD` | Optional seed-admin password; set before the first seed run |
| `SEED_DATA_DIR` | Optional alternate directory for seed JSON files, useful for isolated test data |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (typically `587`) |
| `SMTP_USER` | Your sending email address |
| `SMTP_PASS` | Gmail App Password (not your login password) |
| `EMAIL_PROVIDER` | `smtp` for Gmail or `brevo` for the Brevo API |
| `BREVO_API_KEY` | Brevo API key, required when using `brevo` |
| `BREVO_API_URL` | Brevo transactional endpoint (normally the default shown in `.env.example`) |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender address |
| `BREVO_SENDER_NAME` | Display name used by Brevo |
| `BREVO_REPLY_TO_EMAIL` | Optional reply-to address |
| `BREVO_SANDBOX` | Set to `true` to test through Brevo without delivering the message |

The `.env` file contains secrets and is intentionally ignored by Git. Use `.env.example` as the safe configuration template. Runtime databases, uploaded student assets, generated QR codes, generated PDFs, and the president's uploaded signature are also ignored because they may contain private or generated data. The source `public/images/mis_email_banner.png` is tracked because it is a reusable application asset.

### 3. Seed sample admin and student (optional)

The seed command adds one development admin and one development student to the JSON files. It does not delete or overwrite existing records, so it is safe to run repeatedly:

```bash
npm run seed
```

The seeded records are:

| Record | Value |
|---|---|
| Admin username | `sample_admin` |
| Admin password | `Admin123!` |
| Student ID | `2026019999` |
| Student upload token | `token-seed-2026019999` |

For a first-time seed, set a different admin username and password before running the command. PowerShell:

```powershell
$env:SEED_ADMIN_USERNAME = "mis_admin"
$env:SEED_ADMIN_PASSWORD = "use-a-long-development-password"
npm run seed
```

macOS/Linux:

```bash
SEED_ADMIN_USERNAME=mis_admin SEED_ADMIN_PASSWORD='use-a-long-development-password' npm run seed
```

The seed script only creates the admin if its seed `adminId` and username do not already exist; changing these variables after the record has been seeded does not change the existing password. Do not use the sample credentials in production. For multiple students, use the admin dashboard, the student API, or the bulk CSV/JSON import described below.

### 4. Start the server

**Production / normal start:**
```bash
npm start
```

**Development (auto-restarts on file changes):**
```bash
npm run dev
```

### 5. Access the system

| URL | Description |
|---|---|
| `http://localhost:3000/admin` | Admin dashboard (login required) |
| `http://localhost:3000/admin/login` | Admin login page |
| `http://localhost:3000/upload/:token` | Student upload portal (per-student link) |

With the sample data, open:

```text
http://localhost:3000/upload/token-seed-2026019999
```

### 6. Expose the student upload portal

Use a tunnel when students need to reach a server running on your computer. Start the application first, then run one of the following in a second terminal.

#### Option A: ngrok

Install ngrok and authenticate it once, then expose port `3000`:

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

Copy the HTTPS forwarding URL printed by ngrok, for example `https://example-name.ngrok-free.app`, and set it as `PUBLIC_BASE_URL` in `.env`:

```dotenv
PUBLIC_BASE_URL=https://example-name.ngrok-free.app
```

Restart the Node server after changing `.env`. The sample student portal will then be available at:

```text
https://example-name.ngrok-free.app/upload/token-seed-2026019999
```

The upload request itself uses:

```text
POST https://example-name.ngrok-free.app/api/student/upload/token-seed-2026019999
```

#### Option B: Cloudflare Quick Tunnel

Install `cloudflared`, then run:

```bash
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a temporary `https://...trycloudflare.com` URL. Put that URL in `.env` as `PUBLIC_BASE_URL`, restart the server, and use the same `/upload/token-seed-2026019999` path. Quick Tunnels are intended for testing and development; use a named Cloudflare Tunnel with a stable hostname for longer-running deployments.

#### Option C: Same local network

If the student is on the same trusted network, find the computer's LAN address and set, for example:

```dotenv
PUBLIC_BASE_URL=http://192.168.1.25:3000
```

Then share `http://192.168.1.25:3000/upload/token-seed-2026019999`. Allow port `3000` through the computer's firewall only for the trusted network. This option does not work for students outside that network.

Only the student portal and its upload API are public. The `/admin` routes remain protected by the intranet-only middleware and admin authentication.

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

### Bulk importing students

Administrators can import student reference data from the **Import students** button in the dashboard. Both CSV and JSON files are supported.

CSV headers are case-insensitive. The required columns are:

```text
studentId,fullName,email
```

Optional columns include `dob`, `course`, `programStartDate`, `temporaryExpiryDate`, `enrollmentStatus`, `guardianName`, `address`, and `phone`. JSON may be either an array of student objects or an object containing a `students` array.

Example CSV:

```csv
studentId,fullName,email,course,programStartDate,temporaryExpiryDate
2026011827,Juan dela Cruz,juan.delacruz@example.com,BSIT,2026-08-15,2027-03-01
```

Example JSON:

```json
[
  {
    "studentId": "2026011827",
    "fullName": "Juan dela Cruz",
    "email": "juan.delacruz@example.com",
    "course": "BSIT",
    "programStartDate": "2026-08-15",
    "temporaryExpiryDate": "2027-03-01"
  }
]
```

The API endpoint is `POST /admin/api/students/import` with the file sent in a multipart field named `file`. Existing student IDs and duplicate IDs within the same file are skipped; existing photos, signatures, QR codes, and PDFs are never overwritten. Imported records are reference-only (`PENDING_UPLOAD`) until the student submits both assets through `/upload/:token`. They will then appear as a pending temporary-ID request.

### Email delivery

Approved IDs are sent using the provider selected by `EMAIL_PROVIDER` in `.env`. Use `smtp` for Gmail or `brevo` for the Brevo transactional email API. The email template displays `mis_email_banner.png` in the email body when `EMAIL_BANNER_URL` is available, and sends the banner as an image attachment as well as the current generated PDF (`Temporary_ID_<studentId>.pdf`). A PDF must exist before an email can be sent.

For Brevo, create an API key and verify the sender address in Brevo, then set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, and `BREVO_SENDER_EMAIL`. Brevo’s transactional endpoint is `https://api.brevo.com/v3/smtp/email`; both the PDF and MIS banner are sent as attachments. Optionally set `EMAIL_BANNER_URL` to a public image URL to display the banner directly in the email body. Set `BREVO_SANDBOX=true` while testing if you want Brevo to accept the request without delivering the message.

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
- **ID card rendering**: HTML/CSS + Puppeteer
