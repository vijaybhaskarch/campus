"use client"

import { useState } from "react"
import useSWR from "swr"
import { Trash2, AlertTriangle, UserMinus, UserCheck, Megaphone } from "lucide-react"
import { 
  fetchReviews, 
  fetchFacultyComplaints,
  deleteReview, 
  fetchAllProfiles, 
  setBanned, 
  fetchAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement 
} from "@/lib/api"

export function AdminDashboard({ isAdmin, facultyId }: { isAdmin: boolean, facultyId?: string }) {
  const [tab, setTab] = useState("reviews")
  const [announcementText, setAnnouncementText] = useState("")

  // 1. డేటా ఫెచింగ్ (అడ్మిన్ అయితే అన్ని రివ్యూలు, ఫ్యాకల్టీ అయితే కేవలం వారి కంప్లైంట్లు)
  const { data: reviews, isLoading: reviewsLoading, mutate: reloadReviews } = useSWR(
    isAdmin ? "admin-reviews" : `faculty-reviews-${facultyId}`,
    isAdmin ? fetchReviews : () => fetchFacultyComplaints(facultyId!)
  )

  const { data: profiles, mutate: reloadProfiles } = useSWR(isAdmin ? "admin-profiles" : null, fetchAllProfiles)
  const { data: announcements, mutate: reloadAnnouncements } = useSWR("announcements", fetchAnnouncements)

  // రివ్యూ డిలీట్ చేయడం
  const handleDeleteReview = async (id: string) => {
    if (confirm("ఈ మెసేజ్‌ని డిలీట్ చేయాలనుకుంటున్నారా?")) {
      try {
        await deleteReview(id)
        void reloadReviews()
      } catch (error) {
        console.error(error)
        alert("డిలీట్ చేయడం కుదరలేదు.")
      }
    }
  }

  // యూజర్ బ్యాన్/అన్‌బ్యాన్
  const handleBanToggle = async (userId: string, currentBannedStatus: boolean) => {
    try {
      await setBanned(userId, !currentBannedStatus)
      void reloadProfiles()
    } catch (error) {
      console.error(error)
      alert("మార్పు చేయడం కుదరలేదు.")
    }
  }

  // అనౌన్స్‌మెంట్ క్రియేట్ చేయడం
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementText.trim()) return
    try {
      await createAnnouncement(announcementText)
      setAnnouncementText("")
      void reloadAnnouncements()
    } catch (error) {
      console.error(error)
      alert("అనౌన్స్‌మెంట్ పంపడం కుదరలేదు.")
    }
  }

  // అనౌన్స్‌మెంట్ డిలీట్ చేయడం
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id)
      void reloadAnnouncements()
    } catch (error) {
      console.error(error)
      alert("డిలీట్ చేయడం కుదరలేదు.")
    }
  }

  return (
    <div className="space-y-6">
      {/* ట్యాబ్స్ నావిగేషన్ */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        <button 
          onClick={() => setTab("reviews")} 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "reviews" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          {isAdmin ? "రివ్యూలు / కంప్లైంట్లు" : "నా కంప్లైంట్లు"}
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => setTab("users")} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "users" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              యూజర్లు
            </button>
            <button 
              onClick={() => setTab("announcements")} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "announcements" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              అనౌన్స్‌మెంట్లు
            </button>
          </>
        )}
      </div>

      {/* 1. రివ్యూస్ ట్యాబ్ */}
      {tab === "reviews" && (
        <div className="grid gap-4">
          {reviewsLoading ? (
            <div className="flex justify-center p-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              {isAdmin ? "ఎటువంటి రివ్యూలు లేదా కంప్లైంట్లు లేవు." : "ఫ్యాకల్టీకి సంబంధించిన కంప్లైంట్లు ఏవీ లేవు."}
            </div>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm relative space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-card-foreground">@{r.username}</p>
                    {r.category && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {r.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                
                <p className="text-sm text-muted-foreground pr-8">{r.message}</p>
                
                {/* డిలీట్ బటన్ */}
                <button 
                  onClick={() => handleDeleteReview(r.id)}
                  className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  title="తొలగించు"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. యూజర్స్ ట్యాబ్ (అడ్మిన్‌కి మాత్రమే) */}
      {isAdmin && tab === "users" && (
        <div className="grid gap-3">
          {!profiles || profiles.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">యూజర్లు ఎవరూ లేరు</div>
          ) : (
            profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <p className="text-sm font-bold text-card-foreground">@{p.username || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{p.email || p.phone || "No contact"}</p>
                </div>
                <button
                  onClick={() => handleBanToggle(p.id, p.is_banned)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    p.is_banned 
                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" 
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  {p.is_banned ? <><UserCheck className="h-3.5 w-3.5" /> అన్‌బాన్</> : <><UserMinus className="h-3.5 w-3.5" /> బాన్</>}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. అనౌన్స్‌మెంట్స్ ట్యాబ్ (అడ్మిన్‌కి మాత్రమే) */}
      {isAdmin && tab === "announcements" && (
        <div className="space-y-4">
          <form onSubmit={handleCreateAnnouncement} className="space-y-3 bg-card border border-border p-4 rounded-2xl shadow-sm">
            <label className="text-sm font-semibold text-card-foreground">కొత్త అనౌన్స్‌మెంట్ పంపండి</label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="ఇక్కడ టైప్ చేయండి..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <button 
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Megaphone className="h-4 w-4" /> పంపు
            </button>
          </form>

          <div className="grid gap-3">
            {!announcements || announcements.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-sm">అనౌన్స్‌మెంట్లు ఏమీ లేవు</div>
            ) : (
              announcements.map((a: any) => (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm text-card-foreground">{a.message}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="text-destructive hover:opacity-80 p-1"
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
