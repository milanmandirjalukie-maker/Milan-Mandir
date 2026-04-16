# MILAN MANDIR Management App

This folder now contains:

- the original offline app
- the live Supabase app prepared for hosting

## Location

`C:\Users\dell\Downloads\milan-mandir-management-app`

## Node.js Hosting Ready

This folder is now prepared for GoDaddy Node.js Hosting:

- [package.json](C:/Users/dell/Downloads/milan-mandir-management-app/package.json)
- [server.js](C:/Users/dell/Downloads/milan-mandir-management-app/server.js)

The app now has:

- a root `package.json`
- a `start` script
- a Node entry point that serves the live Supabase app by default
- support for `process.env.PORT`

Hosted routes:

- `/` -> live Supabase app
- `/offline` -> original offline app

## Local Node Test

To test the Node-hosted version locally:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

Optional offline route:

```text
http://localhost:3000/offline
```

## Local Start

For the easiest local browser start, use:

- [start-local-app.ps1](C:/Users/dell/Downloads/milan-mandir-management-app/start-local-app.ps1)
- [serve-local.ps1](C:/Users/dell/Downloads/milan-mandir-management-app/serve-local.ps1)

## Supabase Frontend

This folder also now includes a separate live Supabase frontend:

- [supabase-index.html](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-index.html)
- [supabase-member-registration.html](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-member-registration.html)
- [SUPABASE-FRONTEND-SETUP.md](C:/Users/dell/Downloads/milan-mandir-management-app/SUPABASE-FRONTEND-SETUP.md)

Use:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-supabase-app.ps1
```

Then open:

```text
http://localhost:8080/supabase-index.html
```

## Deployment Prep

Use this checklist before launch:

- [DEPLOYMENT-CHECKLIST.md](C:/Users/dell/Downloads/milan-mandir-management-app/DEPLOYMENT-CHECKLIST.md)

## Vercel

This project now includes:

- [vercel.json](C:/Users/dell/Downloads/milan-mandir-management-app/vercel.json)

That makes Vercel serve:

- `/` -> live Supabase app
- `/offline` -> original offline app

## Offline App Note

The offline app still uses browser `localStorage` and remains available at:

- [offline-index.html](C:/Users/dell/Downloads/milan-mandir-management-app/offline-index.html)
