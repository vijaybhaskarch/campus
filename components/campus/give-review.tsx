"use client"

import { useState } from "react"
import { X, MessageSquareHeart, CheckCircle2 } from "lucide-react"
import { submitReview } from "@/lib/api"

export function GiveReview({
  userId,
  username,
  onClose,
}: {
  userId: string
  username: string
  onClose: () => void
}) {
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (message.trim().length < 5) return
    setSubmitting(true)
    setError(null)
    try {
      await submitReview(userId, username, message)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your review. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-10 text-accent" />
          <h2 className="text-lg font-bold text-foreground">Thanks for your feedback</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Your report has been sent to the admin team. We appreciate you helping keep the hub safe.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquareHeart className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Give a review</h2>
              <p className="text-xs text-muted-foreground">Report an issue or share feedback with the admin.</p>
            </div>
          </div>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              if (error) setError(null)
            }}
            rows={5}
            autoFocus
            placeholder="Describe the issue or feedback…"
            className="input resize-none leading-relaxed"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={message.trim().length < 5 || submitting}
            className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Submit review"}
          </button>
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
