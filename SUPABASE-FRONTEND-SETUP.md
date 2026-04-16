# MILAN MANDIR Supabase Frontend Setup

This folder now includes a separate Supabase-connected frontend path.

## Files

- [supabase-index.html](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-index.html)
- [supabase-app.js](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-app.js)
- [supabase-member-registration.html](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-member-registration.html)
- [supabase-member-registration.js](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-member-registration.js)
- [supabase-common.js](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-common.js)
- [supabase-config.example.js](C:/Users/dell/Downloads/milan-mandir-management-app/supabase-config.example.js)
- [start-supabase-app.ps1](C:/Users/dell/Downloads/milan-mandir-management-app/start-supabase-app.ps1)
- [create-member-login Edge Function](C:/Users/dell/Downloads/milan-mandir-management-app/supabase/functions/create-member-login/index.ts)

## One-time config

1. Open your Supabase project dashboard.
2. Go to `Project Settings -> API`.
3. Copy the `Project URL`.
4. Copy the `publishable key` (or anon key if your dashboard still labels it that way).
5. Create a new file named `supabase-config.js` in this folder.
6. Paste this and replace the key:

```js
window.SUPABASE_CONFIG = {
  url: "https://fmgmrkmzgcgzbteboffu.supabase.co",
  publishableKey: "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE",
  monthlyCollectionDefault: 200,
  storageBucket: "member-documents",
  mandirName: "MILAN MANDIR",
};
```

## Local start

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-supabase-app.ps1
```

Then open:

```text
http://localhost:8080/supabase-index.html
```

## Notes

- Admin and member login both use Supabase Auth email/password.
- Roles are loaded from `public.profiles`.
- Member linking is based on `public.members.auth_user_id`.
- If you want photo and Aadhaar uploads, create a bucket named `member-documents` and add storage policies.
- If you want member login creation to happen automatically during registration, deploy the Edge Function:

```bash
supabase functions deploy create-member-login
```

- The function uses the member's mobile number as the initial password.
