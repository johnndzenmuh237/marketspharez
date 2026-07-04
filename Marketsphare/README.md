# Marketsphare

**The AI-powered marketplace connecting digital marketing talent with employers worldwide.**

---

## 🗂 Project Structure

```
Marketsphare/
├── index.html              # Public homepage
├── about.html
├── services.html           # Service marketplace
├── jobs.html               # Job listings
├── pricing.html
├── contact.html
│
├── auth/
│   ├── login.html
│   ├── register.html
│   ├── forgot-password.html
│   └── verify-email.html
│
├── dashboard/              # Worker / Employer dashboard
│   ├── index.html          # Overview
│   ├── profile.html        # Profile & resume upload
│   ├── jobs.html           # Browse & saved jobs
│   ├── applications.html   # Track applications
│   ├── earnings.html       # Payments & withdrawals
│   ├── messages.html       # Chat system
│   └── settings.html       # Account settings
│
├── admin/                  # Admin panel
│   ├── dashboard.html      # Platform stats
│   ├── users.html
│   ├── jobs.html
│   ├── payments.html
│   ├── reports.html
│   ├── analytics.html
│   └── settings.html
│
├── assets/
│   ├── css/
│   │   ├── style.css       # Core design system + dark/light mode
│   │   ├── responsive.css  # Mobile / tablet / desktop breakpoints
│   │   ├── dashboard.css   # Dashboard layout & widgets
│   │   └── admin.css       # Admin-specific styles
│   ├── js/
│   │   ├── app.js          # Theme, scroll animations, shared utils
│   │   ├── auth.js         # Auth forms & API calls
│   │   ├── dashboard.js    # Dashboard interactivity
│   │   ├── admin.js        # Admin panel behaviour
│   │   └── mobile-nav.js   # Mobile drawer with nested dropdowns
│   └── icons/
│       └── favicon.svg
│
└── backend/                # Node.js / Express / MongoDB REST API
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── config/
    │   ├── db.js
    │   ├── mailer.js
    │   └── seed.js
    ├── models/
    │   ├── User.js
    │   ├── Job.js
    │   ├── Application.js
    │   ├── Message.js
    │   ├── Payment.js
    │   ├── Service.js
    │   ├── Notification.js
    │   └── Report.js
    ├── controllers/
    │   ├── authController.js
    │   ├── usersController.js
    │   ├── jobsController.js
    │   ├── applicationsController.js
    │   ├── messagesController.js
    │   ├── paymentsController.js
    │   ├── servicesController.js
    │   ├── notificationsController.js
    │   └── adminController.js
    ├── routes/
    │   ├── auth.js
    │   ├── users.js
    │   ├── jobs.js
    │   ├── applications.js
    │   ├── messages.js
    │   ├── payments.js
    │   ├── services.js
    │   ├── notifications.js
    │   └── admin.js
    └── middleware/
        ├── auth.js         # JWT protect, requireRole, optionalAuth
        ├── error.js        # Global error handler, asyncHandler, validate
        └── upload.js       # Multer file upload (avatar, resume, gallery)
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Professional multi-page marketing site | ✅ |
| AI-inspired hero & animations | ✅ |
| Remote job marketplace | ✅ |
| Digital marketing service marketplace | ✅ |
| Worker accounts | ✅ |
| Employer accounts | ✅ |
| Admin dashboard | ✅ |
| Secure JWT Authentication | ✅ |
| Email verification | ✅ |
| Password reset via email | ✅ |
| Job posting & management | ✅ |
| Job applications with status tracking | ✅ |
| Resume & file upload (Multer) | ✅ |
| Company profiles | ✅ |
| Chat / messaging system | ✅ |
| Notifications (in-app + email) | ✅ |
| Escrow payments | ✅ |
| Analytics (admin) | ✅ |
| Search & filters | ✅ |
| Dark / Light mode | ✅ |
| Fully responsive (mobile, tablet, desktop) | ✅ |
| Professional mobile drawer nav with nested dropdowns | ✅ |
| Smooth scroll animations | ✅ |
| SEO-friendly HTML structure | ✅ |
| Rate limiting & security headers (Helmet) | ✅ |

---

## 🚀 Quick Start

### 1. Frontend

Open `index.html` directly in a browser — or serve with any static server:

```bash
npx serve .
```

### 2. Backend

**Prerequisites:** Node.js 18+, MongoDB (local or Atlas)

```bash
cd backend
cp .env.example .env          # Fill in your values
npm install
npm run seed                  # Optional: seed demo data
npm run dev                   # Development (nodemon)
npm start                     # Production
```

**Demo accounts after seeding:**

| Role | Email | Password |
|---|---|---|
| Admin | admin@marketsphare.com | Admin@1234 |
| Worker | jamie@marketsphare.com | Worker@1234 |
| Employer | hr@brightwave.com | Employer@1234 |

---

## 🌐 API Reference

Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | 🔒 |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password` | Public |
| POST | `/auth/verify-email` | Public |
| PUT | `/auth/change-password` | 🔒 |

### Jobs
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/jobs` | Optional |
| GET | `/jobs/:id` | Optional |
| POST | `/jobs` | 🔒 Employer |
| PUT | `/jobs/:id` | 🔒 Employer |
| DELETE | `/jobs/:id` | 🔒 Employer |
| POST | `/jobs/:id/save` | 🔒 Worker |

### Applications
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/applications` | 🔒 Worker |
| GET | `/applications/me` | 🔒 Worker |
| GET | `/applications/employer` | 🔒 Employer |
| PUT | `/applications/:id/status` | 🔒 Employer |
| PUT | `/applications/:id/withdraw` | 🔒 Worker |

### Services · Messages · Payments · Admin
See full route files in `backend/routes/`.

---

## 🎨 Design System

CSS custom properties (variables) drive the entire design — swap the `:root` values to theme the whole platform.

**Key variables:**
```css
--color-primary      /* Indigo #4f46e5 */
--color-accent       /* Cyan   #06b6d4 */
--bg-body            /* Page background */
--bg-surface         /* Cards / panels  */
--text-primary       /* Main text       */
```

Dark mode toggles automatically via `data-theme="dark"` on `<html>` and `localStorage`.

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥ 1080px | Full desktop — 3/4 column grids, hero side-by-side |
| 900–1080px | Tablet — 2 column grids, mobile nav enabled |
| 720–900px | Small tablet / large phone — single column |
| < 720px | Mobile — compact single column, full-width buttons |

---

## 🔒 Security

- **Helmet** — secure HTTP headers
- **CORS** — origin whitelist via `FRONTEND_URL`
- **Rate limiting** — 100 req/15 min global; 20 req/15 min on `/api/auth/`
- **bcryptjs** — passwords hashed with 12 salt rounds
- **JWT** — stateless auth, 7-day expiry (configurable)
- **express-validator** — all inputs validated server-side
- **Multer** — file type & size restrictions on uploads

---

## 📦 Tech Stack

**Frontend:** HTML5, CSS3 (custom properties, grid, flexbox), Vanilla JS (ES2020)

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Multer, Nodemailer, Helmet, express-validator

---

*Built with ❤️ — Marketsphare © 2026*
