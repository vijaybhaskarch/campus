"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { GraduationCap, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { ACCESS_PASSCODE } from "@/lib/supabase/config"

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Check if already unlocked in this browser session
    const isUnlocked = sessionStorage.getItem("campus_unlocked")
    if (isUnlocked === "true") {
      setUnlocked(true)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim() === ACCESS_PASSCODE) {
      setError(false)
      sessionStorage.setItem("campus_unlocked", "true")
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-0 sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[900px] sm:max-h-[92vh] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90">
        <div className="flex flex-1 flex-col justify-center px-7">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <GraduationCap className="size-8" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">Campus Share Hub</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              This hub is for verified students only. Enter your college passcode to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="passcode" className="text-sm font-semibold">
                College Passcode
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="passcode"
                  name="passcode"
                  type={show ? "text" : "password"}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value)
                    if (error) setError(false)
                  }}
                  placeholder="Enter passcode"
                  aria-invalid={error}
                  aria-describedby={error ? "passcode-error" : undefined}
                  className="input pl-9 pr-11 tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label={show ? "Hide passcode" : "Show passcode"}
                >
                  {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
              {error && (
                <p id="passcode-error" role="alert" className="text-sm font-medium text-destructive">
                  Incorrect passcode. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
            >
              Unlock Access
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground text-pretty">
            Don&apos;t have a passcode? Ask your department office or a fellow student to get access.
          </p>
        </div>
      </div>
    </div>
  )
}