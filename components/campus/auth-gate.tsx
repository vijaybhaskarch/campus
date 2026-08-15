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

  // సెషన్ లోడ్ అవుతున్నా లేదా ప్రొఫైల్ ఇంకా సర్వర్ నుండి రాకపోయినా (undefined) లోడింగ్ చూపిస్తుంది.
  if (loading || (user && profile === undefined)) {
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

  // ప్రొఫైల్ డేటా అస్సలు లేకపోతే మాత్రమే OnboardingModal కి వెళ్తుంది
  if (profile === null) {
    return <OnboardingModal user={user} onDone={reloadProfile} />
  }

  if (profile.is_banned) {
    return <BannedScreen />
  }

  return <CampusApp />
}

  // 4. ప్రొఫైల్ డేటా వచ్చాక, నిజంగానే ప్రొఫైల్ లేకపోతే (`null`) అప్పుడు మాత్రమే ఆన్-బోర్డింగ్ మోడల్ చూపించు
  if (profile === null) {
    return <OnboardingModal user={user} onDone={reloadProfile} />
  }

  // 5. యూజర్ బ్యాన్ అయి ఉంటే
  if (profile.is_banned) {
    return <BannedScreen />
  }

  // 6. అన్నీ పర్ఫెక్ట్ గా ఉంటే నేరుగా యాప్ ఓపెన్ అవుతుంది
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
          Your access to Student Material System has been blocked by an administrator. If you believe this is a mistake, please
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
