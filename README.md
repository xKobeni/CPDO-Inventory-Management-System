# CPDO Inventory Management System

A web-based Inventory Management System built for the Office of the City Planning and Development Coordinator (CPDO).

Built using the MERN Stack (MongoDB, Express, React, Node.js).

---

## 🚀 Features

- User authentication (Admin / Staff roles)
- Supplies inventory management
- Asset / property tracking
- Stock In & Issuance
- Asset assignment / transfer / return
- Dashboard analytics
- Excel & CSV import/export
- Automatic scheduled Excel backups

---

## 🏗 Tech Stack

**Frontend**
- React (Vite)
- Axios

**Backend**
- Node.js
- Express
- MongoDB (Mongoose)
- JWT Authentication
- ExcelJS / XLSX
- Node-cron

---

## ⚙️ Setup

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and optionally CLIENT_ORIGIN (required in production)
npm install
npm run dev
```

Optional: seed an admin user (set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` first):
```bash
npm run seed:admin
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env: set VITE_API_BASE_URL to your API base (e.g. http://localhost:5000/api for local)
npm install
npm run dev
```

### Backend runs at
`http://localhost:5000`

### Frontend runs at
`http://localhost:5173`

---

## 🔐 Environment variables

**Backend** (`backend/.env`) — see `backend/.env.example` for full list. Required:
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — secret for access tokens
- `JWT_REFRESH_SECRET` — secret for refresh tokens
- `CLIENT_ORIGIN` — frontend origin (required when `NODE_ENV=production`)
- `TURNSTILE_SECRET_KEY` — (optional) Cloudflare Turnstile secret key; when set, login requires a valid Turnstile token (use with `VITE_TURNSTILE_SITE_KEY` on the frontend).

**Frontend** (`frontend/.env`) — see `frontend/.env.example`:
- `VITE_API_BASE_URL` — API base URL including `/api` (e.g. `http://localhost:5000/api`). Set this for production builds to point to your deployed API.
- `VITE_TURNSTILE_SITE_KEY` — (optional) Cloudflare Turnstile site key for bot protection on login. If set, the backend must have `TURNSTILE_SECRET_KEY` set.
