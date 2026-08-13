"use client"

import { useState } from "react"
import { X, Pencil, Trash2, AlertTriangle, PhoneCall } from "lucide-react"
import { deleteAccount, updateUsername } from "@/lib/api"
import { getSupabase } from "@/lib/supabase/client"

type View = "menu" | "edit" | "edit-phone" | "delete"

export function AccountSettings({
  userId,
  currentUsername,
  onClose,
  onUsernameUpdated,
}: {
  userId: string
  currentUsername: string
  onClose: () => void
  onUsernameUpdated: () => void
}) {
  const [view, setView] = useState<View>("menu")
  const [username, setUsername] = useState(currentUsername)
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveUsername() {
    if (username.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      await updateUsername(userId, username)
      onUsernameUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update username.")
      setBusy(false)
    }
  }

  async function savePhone() {
    if (phone.trim().length < 10) {
      setError("Please enter a valid phone number.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ phone: phone.trim() })
        .eq("id", userId)

      if (updateErr) throw updateErr

      onUsernameUpdated() // Profile data refresh అవ్వడానికి
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update phone number.")
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.")
      setBusy(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      {view === "menu" && (
        <>
          <h2 className="mb-4 text-lg font-bold text-foreground">Account settings</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setView("edit")}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left"
            >
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">Edit Username</span>
            </button>
            <button
              type="button"
              onClick={() => setView("edit-phone")}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left"
            >
              <PhoneCall className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">Add / Update Phone Number</span>
            </button>
            <button
              type="button"
              onClick={() => setView("delete")}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
              <span className="flex-1 text-sm font-medium text-destructive">Delete Account</span>
            </button>
          </div>
        </>
      )}

      {view === "edit" && (
        <>
          <h2 className="mb-4 text-lg font-bold text-foreground">Edit Username</h2>
          <label htmlFor="new-username" className="text-sm font-semibold text-foreground">
            Username
          </label>
          <input
            id="new-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (error) setError(null)
            }}
            maxLength={24}
            autoFocus
            className="input mt-2"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={saveUsername}
              disabled={username.trim().length < 3 || busy}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {view === "edit-phone" && (
        <>
          <h2 className="mb-4 text-lg font-bold text-foreground">Update Phone Number</h2>
          <label htmlFor="new-phone" className="text-sm font-semibold text-foreground">
            Phone Number
          </label>
          <input
            id="new-phone"
            type="tel"
            placeholder="Enter 10-digit mobile number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (error) setError(null)
            }}
            maxLength={15}
            autoFocus
            className="input mt-2"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={savePhone}
              disabled={phone.trim().length < 10 || busy}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {view === "delete" && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <h2 className="text-lg font-bold text-foreground">Delete account?</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            This permanently wipes your profile, every listing you&apos;ve created, your requests and reviews, and your
            sign-in account from the database, then logs you out. This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="w-full rounded-xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete account permanently"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full rounded-xl border border-border py-3.5 text-sm font-semibold text-foreground"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-foreground/40 p-3" onClick={onClose}>
      <div
        className="relative w-full rounded-3xl bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  )
}
