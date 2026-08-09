// Public Supabase project configuration.
// The URL and publishable (anon) key are safe to expose in client code — row
// level security in the database is what protects the data.
//
// Values are read from environment variables only. Define
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Netlify
// site's environment variables (Site configuration → Environment variables).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase environment variables are not set. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

// The one account that is granted Super-Admin authority across the app.
export const ADMIN_EMAIL = "vijaybhaskar.ch9045@gmail.com"

// Passcode required on every single visit before the app is shown.
export const ACCESS_PASSCODE = "ADARSHCAMPUSSHAREHUBVB"
