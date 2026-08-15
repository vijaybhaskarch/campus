"use client"

import { useState } from "react"
import useSWR from "swr"
import { Trash2, AlertTriangle, UserMinus, UserCheck, Megaphone } from "lucide-react"
import { fetchReviews, deleteReview, fetchAllProfiles, setBanned, fetchAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/api"

export default function AdminDashboard() {
  const [tab, setTab] = useState("reviews")
  const [announcementText, setAnnouncementText] = useState("")

  const { data: reviews, mutate: reloadReviews } = useSWR("admin-reviews", fetchReviews)
  const { data: profiles, mutate: reloadProfiles } = useSWR("admin-profiles", fetchAllProfiles)
  const { data: announcements, mutate: reloadAnnouncements } = useSWR("announcements", fetchAnnouncements)

  const handleDeleteReview = async (id: string) => {
    if (confirm("Delete this review?")) {
      await deleteReview(id)
      void reloadReviews()
    }
  }

  const handleBanToggle = async (userId: string, currentBannedStatus: boolean) => {
    await setBanned(userId, !currentBannedStatus)
    void reloadProfiles()
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementText.trim()) return
    await createAnnouncement(announcementText)
    setAnnouncementText("")
    void reloadAnnouncements()
  }

  const handleDeleteAnnouncement = async (id: string) => {
    await deleteAnnouncement(id)
    void reloadAnnouncements()
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab("reviews")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === "reviews" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"}`}>
          Reviews & Complaints
        </button>
        <button onClick={() => setTab("users")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === "users" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"}`}>
          Users
        </button>
        <button onClick={() => setTab("announcements")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === "announcements" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"}`}>
          Announcements
        </button>
      </div>

      {tab === "reviews" && (
        <div className="grid gap-3">
          {(!reviews || reviews.length === 0) ? (
            <p className="text-center text-sm text-muted-foreground py-8">No feedback submitted yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm relative">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">@{r.username}</p>
                    {r.category && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {r.category}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground pr-8">{r.message}</p>
                <button
                  type="button"
                  onClick={() => handleDeleteReview(r.id)}
                  aria-label="Delete message"
                  className="absolute bottom-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="grid gap-3">
          {(!profiles || profiles.length === 0) ? (
            <p className="text-center text-sm text-muted-foreground py-8">No users found.</p>
          ) : (
            profiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">@{p.username || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{p.email || p.phone || "No contact info"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBanToggle(p.id, p.is_banned)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    p.is_banned
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  {p.is_banned ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" /> Unban
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-3.5 w-3.5" /> Ban
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-4">
          <form onSubmit={handleCreateAnnouncement} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">Post New Announcement</h3>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Type your announcement here..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              required
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <Megaphone className="h-4 w-4" /> Broadcast Announcement
            </button>
          </form>

          <div className="grid gap-3">
            {(!announcements || announcements.length === 0) ? (
              <p className="text-center text-sm text-muted-foreground py-8">No announcements posted yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-card-foreground leading-relaxed">{a.message}</p>
                    <span className="text-[11px] text-muted-foreground mt-2 block">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
