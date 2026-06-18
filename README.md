# Budget Pilot V2

![Budget Pilot Hero](Budget_pilot_thumbnail.png)

📲 Download Android App
Install Budget Pilot on your Android device

[![Download APK](https://img.shields.io/badge/Android-Download%20APK-success?style=for-the-badge&logo=android)](https://budgetpilotv2.netlify.app/BudgetPilot-v2.apk)

After downloading:

Open the APK file.
Allow installation from unknown sources if prompted.
Install Budget Pilot.
Launch and start tracking your expenses.

Note: Android may display a warning because the APK is not published through Google Play Store.

[![Live Demo](https://img.shields.io/badge/Netlify-Live%20Demo-brightgreen?style=flat&logo=netlify&logoColor=white)](https://budget-pilot-v2.netlify.app)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

## 🚀 What is Budget Pilot V2?

Budget Pilot V2 is a modern personal finance dashboard built as a full-stack web app with a polished mobile-first UI. It makes tracking expenses, managing budgets, and analyzing spending easy, fast, and visually delightful.

- Smart quick-add controls for common spending categories
- Budget progress tracking with dynamic progress bars
- Interactive analytics with charts and spending breakdowns
- Offline-capable PWA support + local storage powered by Dexie
- Server-ready architecture with Express, Drizzle ORM, Passport auth, and PostgreSQL-ready storage

> Live demo: [Click Here!](https://budgetpilotv2.netlify.app/)

---

## ✨ Highlights

- **Beautiful mobile-first UI** using Tailwind CSS, Radix UI, and Framer Motion
- **Quick expense entry** with category shortcuts and inline editing
- **Budget management** with monthly/weekly/yearly targets and progress indicators
- **Spending analytics** powered by Recharts for instant visual insight
- **Settings + personalization** for currency, theme, and data controls
- **PWA-ready** with manifest and service worker support

![Finance Dashboard](bp_2.png)

---

## 🧩 Key Features

- Dashboard overview with stats, budgets, and recent expenses
- Quick-add category chips for fast expense entry
- Expense list with edit and view-all navigation
- Detailed budget creation, category selection, and progress tracking
- Interactive charts page for spending analysis
- Settings page with theme and currency options
- Built-in form validation using React Hook Form + Zod

---

## 🛠️ Tech Stack

- Frontend: `React`, `Vite`, `TypeScript`, `Tailwind CSS`, `Radix UI`
- Data / state: `@tanstack/react-query`, `Dexie`, `Drizzle ORM`
- Backend: `Express`, `Passport`, `dotenv`
- Charts: `Recharts`
- PWA: `manifest.json`, `service worker`

---

## 📁 Repo Structure

- `client/` — React app source
- `client/src/components/` — UI components and pages
- `client/public/` — PWA manifest and static assets
- `server/` — Express server, authentication, and routes
- `shared/` — shared schema and types
- `drizzle.config.ts` — database config
- `netlify.toml` — Netlify deployment settings

---

## 🚧 Run locally

```bash
npm install
npm run dev
```

Then open the local development URL shown in your terminal.

### Build for production

```bash
npm run build
npm start
```

---

## 🌐 Netlify Deployment

This repo includes `netlify.toml` for automatic Netlify publish settings:

- build command: `vite build`
- publish directory: `dist`
- redirect all routes to `index.html`

> Live app: [Budget-Pilot](https://budgetpilotv2.netlify.app/)

---

## 💡 Want to improve it?

- Add Google OAuth login and user accounts
- Connect live Postgres or Neon database for shared budgets
- Add expense export/import (CSV / Excel)
- Add push notifications or reminders

---

## 📄 License

MIT License
