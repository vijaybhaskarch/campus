"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import useSWR from "swr"
import { getSupabase } from "@/lib/supabase/client"
import { fetchListings, fetchProfile } from "@/lib/api"
import { ADMIN_EMAIL } from "@/lib/supabase/config"
import type { Item, Profile } from "@/lib/campus-data"

interface SessionContextValue {
  loading: boolean
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  listings: Item[]
  reloadProfile: () => void
  reloadListings: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const user = session?.user ?? null
  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const { data: profile, mutate: reloadProfile } = useSWR(
    user ? ["profile", user.id] : null,
    () => fetchProfile(user!.id),
    { revalidateOnFocus: true },
  )

  const { data: listings, mutate: reloadListings } = useSWR(
    user && profile ? ["listings", user.id] : null,
    () => fetchListings(),
    { revalidateOnFocus: true, refreshInterval: 15000 },
  )

  const value: SessionContextValue = {
    loading: !authReady,
    user,
    profile: profile ?? null,
    isAdmin,
    listings: listings ?? [],
    reloadProfile: () => {
      void reloadProfile()
    },
    reloadListings: () => {
      void reloadListings()
    },
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
