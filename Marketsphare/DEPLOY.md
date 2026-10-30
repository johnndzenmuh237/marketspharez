# Marketsphare — going live (Render web service + Postgres)

The Node server in `server/` holds all money logic and data. It also serves your website files, so ONE Render service runs everything.

## 1. Database (pick one)
- **Neon (neon.tech)** – free Postgres that does not expire. Recommended for testing long-term.
- **Render Postgres free** – per Render's docs it EXPIRES 30 days after creation (14-day grace, then deleted). Fine only if you export/upgrade.
Copy the connection string (starts with `postgres://`). Tables are created automatically on first start.

## 2. Put the project on GitHub
Repo root must contain: `index.html`, `assets/`, `dashboard/`, `admin/`, `auth/` (your existing folders), and `server/`.

## 3. Render → New → Web Service (connect the repo)
- Root Directory: (leave empty)
- Build Command: `cd server && npm install`
- Start Command: `node server/server.js`
- Environment variables:
  - `DATABASE_URL` = your Postgres connection string
  - `ADMIN_EMAILS` = your admin email(s), comma separated (must be verified Firebase accounts)
  - `FIREBASE_PROJECT_ID` = swiftchain-827f2 (optional, this is the default)

## 4. Firebase console
Authentication → Settings → Authorized domains → add your `xxxx.onrender.com` domain (and your custom domain if any).

## 5. Use it
- Users: sign up / log in at `/auth/login.html` as before.
- Admin: log in with an email listed in `ADMIN_EMAILS`, then open `/admin/dashboard.html`, `/admin/payments.html` (withdrawals) or `/admin/requests.html` (KYC + upgrades).
- Free Render web services sleep after ~15 min idle; the first request then takes a while to wake up.

## If the website is hosted somewhere else
Set `window.MS_API = "https://your-service.onrender.com"` in `assets/js/api-config.js`, and set env `CORS_ORIGIN` on Render to your site's address.

## Support contact
Edit `assets/js/support-config.js` (email + WhatsApp number for the AI chat's "talk to a person" buttons).

## Local test
`cd server && npm install && DATABASE_URL=postgres://... node server.js` then open http://localhost:3000
