# Deployment Checklist

## Launch Target

This project is prepared to launch the live Supabase app by default:

- `https://your-domain/` -> `supabase-index.html`
- `https://your-domain/offline` -> `index.html`

## Vercel Ready

This folder also includes:

- `vercel.json`

So Vercel can serve:

- `/` -> `supabase-index.html`
- `/offline` -> `index.html`

## Before Upload

Confirm these files exist in the root folder:

- `package.json`
- `server.js`
- `supabase-index.html`
- `supabase-app.js`
- `supabase-member-registration.html`
- `supabase-member-registration.js`
- `supabase-common.js`
- `supabase-config.js`
- `styles.css`

## Supabase Checks

Confirm these are already working in your Supabase project:

- Auth users can log in
- `profiles`, `members`, `collections`, `donations`, `events`, `announcements`, `member_update_requests`, and `admin_audit_logs` exist
- `member-documents` bucket exists
- storage policies are applied
- `create-member-login` Edge Function is deployed

## Local Test

Run:

```powershell
npm install
npm start
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/offline`

## GoDaddy Node.js Hosting Upload

1. Upload the full folder
2. Let hosting run `npm install`
3. Let hosting run `npm start`
4. Open the preview URL
5. Test:
   - admin login
   - member login
   - member registration
   - photo/Aadhaar upload
   - update request flow
   - receipt download
   - backup and audit log

## Vercel Upload

Recommended path:

1. Push this folder to GitHub
2. Import the repository into Vercel
3. Keep the project root as this folder
4. Let Vercel deploy it as a static project
5. Test:
   - `/`
   - `/offline`
   - admin login
   - member login
   - storage upload
   - update request flow

## Launch Note

`supabase-config.js` contains the publishable key, which is safe for frontend use. Do not upload service-role secrets into this project folder.
