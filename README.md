# Student ID Management System

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

### City College of Tagaytay

A web-based intranet system for issuing and managing **temporary student IDs**. Admins manage students through a secure dashboard; students submit their photo, signature and guardian details via a unique personal link. The system then auto-generates a PDF temporary ID card and emails it directly to the student.

---

## Features

| Feature                  | Description                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin Dashboard**      | Manage students, review submissions, approve/reject uploads, configure global signatories                                                    |
| **Student Portal**       | Secure per-student upload form for a 2×2 photo, digital signature and guardian/contact details                                               |
| **PDF ID Generation**    | High-quality temporary ID cards generated via Puppeteer                                                                                      |
| **Email Automation**     | Sends approval notifications with the MIS banner and downloadable PDF ID attachment, with a live progress bar                                |
| **Bulk Student Import**  | Import student reference data from **CSV only**; duplicate student IDs are skipped safely                                                    |
| **Automatic ID Expiry**  | Every temporary ID is valid for **one year** from the date it is generated — no expiry column needed in the import                           |
| **Activity Logs**        | Records every system interaction (approvals, rejections, imports, document generation, email dispatch, renewals, settings changes, sign-ins) |
| **Auth & Rate Limiting** | JWT-based admin auth, bcrypt passwords, express-rate-limit                                                                                   |
| **QR Renewal**           | QR-code based renewal flow for student ID requests                                                                                           |
| **SQLite Storage**       | One lightweight SQLite database (`data/app.db`) stores students, admins, settings and activity logs                                          |

---

## Project Structure

```
student-id-management-system/
├── server.js                  # Entry point — Express app setup & routes
├── .env                       # Local secrets (not committed)
├── .env.example               # Template for required environment variables
│
├── scripts/
│   └── seed.js                # Creates the MIS Administrator account
│
├── src/
│   ├── config/                # Environment config loader
│   ├── controllers/           # Route handler logic
│   ├── middleware/            # Auth, intranet, rate limiting, upload handling
│   ├── routes/                # Express route definitions
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   └── renewalRoutes.js
│   ├── services/              # Business logic
│   │   ├── db.js              # SQLite connection + schema
│   │   ├── dbService.js       # Student & admin queries
│   │   ├── settingsService.js # Global settings
│   │   ├── logService.js      # Activity logging
│   │   ├── studentImportService.js
│   │   ├── documentService.js # PDF generation
│   │   ├── emailService.js    # SMTP / Brevo delivery
│   │   └── ...
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
│   ├── favicon.ico
│   └── images/                # Logos, background, email banner and the
│                              # ID card templates (id_template_front.jpeg,
│                              # id_template_back.jpeg) used by idCardTemplate.html
│
├── data/                      # SQLite database (not committed)
│   └── app.db
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

- [Node.js](https://nodejs.org/) **v22.12 or later** (the app uses the built-in `node:sqlite` module)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) enabled (for SMTP), or a Brevo account

### 1. Install dependencies

```bash
npm install
```

`npm audit` reports **0 vulnerabilities**. Three transitive packages (`body-parser`, `qs`, `ip-address`) are pinned through the `overrides` block in `package.json` so that patched versions are used even when a parent package has not released an update yet. Keep that block when upgrading dependencies.

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable               | Description                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PORT`                 | Port to run the server on (default: `3000`)                                                                |
| `DB_PATH`              | Optional SQLite database path (default: `./data/app.db`)                                                   |
| `PUBLIC_BASE_URL`      | Base URL used in student upload links (e.g. `http://localhost:3000`)                                       |
| `EMAIL_BANNER_URL`     | Optional public URL for `mis_email_banner.png` in email bodies; the banner is also attached to every email |
| `JWT_SECRET`           | Long random string for JWT signing                                                                         |
| `SMTP_HOST`            | SMTP server host (e.g. `smtp.gmail.com`)                                                                   |
| `SMTP_PORT`            | SMTP port (typically `587`)                                                                                |
| `SMTP_USER`            | Your sending email address                                                                                 |
| `SMTP_PASS`            | Gmail App Password (not your login password)                                                               |
| `EMAIL_PROVIDER`       | `smtp` for Gmail or `brevo` for the Brevo API                                                              |
| `BREVO_API_KEY`        | Brevo API key, required when using `brevo`                                                                 |
| `BREVO_API_URL`        | Brevo transactional endpoint (normally the default shown in `.env.example`)                                |
| `BREVO_SENDER_EMAIL`   | Verified Brevo sender address                                                                              |
| `BREVO_SENDER_NAME`    | Display name used by Brevo                                                                                 |
| `BREVO_REPLY_TO_EMAIL` | Optional reply-to address                                                                                  |
| `BREVO_SANDBOX`        | Set to `true` to test through Brevo without delivering the message                                         |

The `.env` file contains secrets and is intentionally ignored by Git. The SQLite database, uploaded student assets, generated QR codes, generated PDFs and the president's uploaded signature are also ignored because they may contain private or generated data.

### 3. Seed the administrator account

```bash
npm run seed
```

This creates (or resets the password of) the single administrator account. No dummy students are created.

| Field    | Value               |
| -------- | ------------------- |
| Name     | `MIS Administrator` |
| Username | `admin`             |
| Password | `Password123!`      |

> Change this password before deploying to production.

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

| URL                                   | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `http://localhost:3000/admin`         | Admin dashboard (login required)           |
| `http://localhost:3000/admin/login`   | Admin login page                           |
| `http://localhost:3000/upload`        | Student entry page (look up by student ID) |
| `http://localhost:3000/upload/:token` | Student upload portal (per-student link)   |

The `Newest first` / `Oldest first` control applies to every student filter and to Activity logs.

### 6. Expose the student upload portal

Use a tunnel when students need to reach a server running on your computer. Start the application first, then run one of the following in a second terminal.

#### Option A: ngrok

```bash
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

Copy the HTTPS forwarding URL printed by ngrok and set it as `PUBLIC_BASE_URL` in `.env`:

```dotenv
PUBLIC_BASE_URL=https://example-name.ngrok-free.app
```

Restart the Node server after changing `.env`.

#### Option B: Cloudflare Quick Tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Put the printed `https://...trycloudflare.com` URL in `.env` as `PUBLIC_BASE_URL` and restart the server. Quick Tunnels are intended for testing; use a named Cloudflare Tunnel with a stable hostname for longer-running deployments.

#### Option C: Same local network

```dotenv
PUBLIC_BASE_URL=http://192.168.1.25:3000
```

Allow port `3000` through the computer's firewall only for the trusted network.

Only the student portal and its upload API are public. The `/admin` routes remain protected by the intranet-only middleware and admin authentication.

After a student submission is saved, the upload is locked server-side. Refreshing or resubmitting the old page cannot overwrite the photo, signature or guardian details. If an administrator rejects the submission, the student may use the same link to correct and resubmit it. Set `SUBMISSION_COMPLETE_REDIRECT_URL` in `.env` to change where students are sent after a successful submission; it defaults to `https://www.google.com/`.

---

## Managing Students

### Adding a student (via API)

```bash
curl -X POST http://localhost:3000/admin/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "2026-CCT-1234",
    "fullName": "Jane Doe",
    "email": "jane.doe@citycollegeoftagaytay.edu.ph",
    "course": "BS Information Technology",
    "programStartDate": "2026-08-15"
  }'
```

The temporary ID expiry is always computed by the system (one year from creation).

### Bulk importing students (CSV only)

Administrators can import student reference data from the **Import students** button in the dashboard. **CSV is the only supported format** — JSON files are rejected.

CSV headers are case-insensitive and spaces are ignored (`Student ID` = `studentId`). The required columns are:

```text
studentId,fullName,email
```

Optional columns: `dob`, `course`, `programStartDate`, `enrollmentStatus`, `guardianName`, `address`, `phone`.

> **ID expiry is not imported.** Every imported student automatically receives a temporary ID valid for **one year** from the import date. Do not add an expiry column.

Example CSV:

```csv
studentId,fullName,email,course,programStartDate,guardianName,address,phone
2026011827,Juan dela Cruz,juan.delacruz@example.com,BSIT,2026-08-15,Maria dela Cruz,"Tagaytay City, Cavite",09123456789
```

The API endpoint is `POST /admin/api/students/import` with the file sent in a multipart field named `file`. There is no per-file student-record limit. Existing student IDs and duplicate IDs within the same file are skipped; existing photos, signatures, QR codes and PDFs are never overwritten. Imported records are reference-only (`PENDING_UPLOAD`) until the student submits their assets through `/upload/:token`.

### Student submission

Students open their personal link and provide:

1. A **2×2 photo** — JPG, PNG or WEBP, max **5 MB**, shortest side at least **300 px**, longest side at most **6000 px**. Clear error messages are shown when the file size or resolution limits are exceeded.
2. A **signature** — drawn on screen or uploaded as an image (white background is converted to transparent PNG).
3. **Guardian details** — guardian name, guardian contact number and home address. These are printed on the back of the ID and are required before submission.

### Email delivery

Approved IDs are sent using the provider selected by `EMAIL_PROVIDER` in `.env`. The dashboard shows a **live progress bar** while emails are dispatched, listing each student as sent or failed.

The email template displays `mis_email_banner.png` in the email body when `EMAIL_BANNER_URL` is available, and sends the banner as an image attachment as well as the current generated PDF (`Temporary_ID_<studentId>.pdf`). A PDF must exist before an email can be sent.

For Brevo, create an API key and verify the sender address in Brevo, then set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, and `BREVO_SENDER_EMAIL`. Set `BREVO_SANDBOX=true` while testing if you want Brevo to accept the request without delivering the message.

---

## Activity Logs

The **Activity logs** page records **system interactions only** — not raw HTTP requests. Each entry shows the time, action, description, student, admin and status.

Logged actions include:

| Category   | Actions                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| Auth       | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`                                |
| Approval   | `STUDENT_APPROVED`, `STUDENT_REJECTED`, `STUDENTS_BULK_APPROVED`         |
| Submission | `STUDENT_SUBMISSION_RECEIVED`                                            |
| Renewal    | `RENEWAL_REQUESTED`, `RENEWAL_APPROVED`                                  |
| Document   | `DOCUMENT_GENERATED`, `DOCUMENT_GENERATION_FAILED`                       |
| Email      | `EMAIL_SENT`, `EMAIL_FAILED`, `EMAILS_DISPATCHED`                        |
| Import     | `STUDENTS_IMPORTED`, `STUDENT_IMPORT_FAILED`                             |
| Student    | `STUDENT_CREATED`, `STUDENT_DELETED`, `RECIPIENT_EMAIL_UPDATED`          |
| Settings   | `SETTINGS_UPDATED`, `ID_TEMPLATE_UPDATED`, `PRESIDENT_SIGNATURE_UPDATED` |

Logs are stored in the `activity_logs` table and capped at the 5,000 most recent entries.

---

## Global Settings

The **Global Settings** tab in the Admin Dashboard lets you update:

- **MIS Signer** name, role and organization
- **College President** name, title and e-signature

Changes apply to all newly generated IDs and persist in the SQLite database — no server restart needed. The settings modal is scrollable and adapts to any desktop screen height.

---

## Database

All data lives in a single SQLite file at `data/app.db` (created automatically on first start):

| Table           | Contents                                        |
| --------------- | ----------------------------------------------- |
| `students`      | Student records, tokens, asset paths, statuses  |
| `admins`        | Administrator accounts (bcrypt password hashes) |
| `settings`      | Global signatory settings (key/value)           |
| `activity_logs` | System interaction history                      |

To back up, copy `data/app.db` while the server is stopped.

---

## Maintenance & Cleanup

| Task                              | How                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Clear students for a new semester | `DELETE FROM students;` in `data/app.db`                                                              |
| Clear activity logs               | `DELETE FROM activity_logs;` in `data/app.db`                                                         |
| Clear uploads                     | Delete contents of `uploads/photos/`, `uploads/signatures/`, `uploads/qrcodes/`, `uploads/documents/` |
| Reset settings                    | `DELETE FROM settings;` (defaults will be recreated)                                                  |
| Reset everything                  | Stop the server and delete `data/app.db`                                                              |

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js 5
- **Database**: SQLite via the built-in `node:sqlite` module (no external database required)
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer (SMTP) or Brevo API
- **Auth**: JWT + bcrypt
- **ID card rendering**: HTML/CSS + Puppeteer
