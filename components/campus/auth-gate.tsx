"use client"

import { Ban, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { useSession } from "./session-provider"
import { LoginScreen } from "./login-screen"
import { OnboardingModal } from "./onboarding-modal"
import { CampusApp } from "./campus-app"
import { PhoneShell } from "./phone-shell"

export function AuthGate() {
  const { loading, user, profile, reloadProfile } = useSession()

  if (loading) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      </PhoneShell>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  // Signed in but no profile row yet -> mandatory one-time onboarding.
  if (!profile) {
    return <OnboardingModal user={user} onDone={reloadProfile} />
  }

  if (profile.is_banned) {
    return <BannedScreen />
  }

  return <CampusApp />
}

function BannedScreen() {
  async function signOut() {
    await getSupabase().auth.signOut()
  }
  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Ban className="size-8" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Account suspended</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Your access to Campus Share Hub has been blocked by an administrator. If you believe this is a mistake, please
          contact your campus admin.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
        >
          Sign out
        </button>
      </div>
    </PhoneShell>
  )
}
