# Campus Share Hub — Setup

This app runs entirely against **your own Supabase project**. Set the
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment
variables (in Netlify: Site configuration → Environment variables; locally: a
`.env.local` file, which is git-ignored) to your project's public URL and
publishable/anon key. Two things must be done once in your Supabase dashboard
before the app works end to end.

## 1. Create the database schema

Open your Supabase project → **SQL Editor** → paste the contents of
[`scripts/supabase-setup.sql`](scripts/supabase-setup.sql) and run it.

This creates the `profiles`, `listings`, and `reviews` tables, enables Row
Level Security, adds all policies, and installs the trigger that auto-creates a
profile row when a user signs up.

## 2. Enable Google sign-in

1. Supabase dashboard → **Authentication → Providers → Google** → enable it.
2. Create an OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type: *Web application*).
3. Add this **Authorized redirect URI** in Google (copy it from the Supabase
   Google provider screen — it looks like):

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

4. Paste the Google **Client ID** and **Client Secret** back into Supabase and
   save.
5. In Supabase → **Authentication → URL Configuration**, add your app's
   preview/production URL to the **Redirect URLs** allow-list.

## Admin account

The email in `config.ts` (`ADMIN_EMAIL`) is the super-admin. When that account
signs in, the profile menu gains an **Admin Dashboard** with the ability to ban
users and remove any listing. Change the constant to grant admin to a different
account.

## Access passcode

Every visit requires the passcode in `config.ts` (`ACCESS_PASSCODE`) before the
login screen is shown. It is intentionally **not** remembered between visits.
