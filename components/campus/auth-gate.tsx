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

  // 1. సెషన్ లోడ్ అవుతున్నా, లేదా యూజర్ ఉండి ప్రొఫైల్ ఇంకా సర్వర్ నుంచి రాకపోయినా (undefined) 
  // కచ్చితంగా లోడింగ్ లోనే ఉంచుతాం. ఒక్క మిల్లీసెకండ్ కూడా వేరే స్క్రీన్ కనిపించదు.
  const isInitializing = loading || (user !== null && profile === undefined)

  if (isInitializing) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      </PhoneShell>
    )
  }

  // 2. యూజర్ లాగిన్ అవకపోతే లాగిన్ స్క్రీన్
  if (!user) {
    return <LoginScreen />
  }

  // 3. డేటా పూర్తిగా వచ్చాక, ప్రొఫైల్ నిజంగానే లేకపోతే (`null`) అప్పుడు మాత్రమే ఆన్-బోర్డింగ్
  if (profile === null) {
    return <OnboardingModal user={user} onDone={reloadProfile} />
  }

  // 4. యూజర్ బ్యాన్ అయి ఉంటే
  if (profile.is_banned) {
    return <BannedScreen />
  }

  // 5. అన్నీ పర్ఫెక్ట్ గా ఉంటే నేరుగా క్యాంపస్ యాప్ ఓపెన్ అవుతుంది
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
