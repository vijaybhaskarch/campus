"use client"

import { useState } from "react"
import useSWR from "swr"
import { Trash2, AlertTriangle, UserMinus, UserCheck, Megaphone, Trash } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"

export default function AdminDashboard({ isAdmin, facultyId }: { isAdmin: boolean, facultyId?: string }) {
  const [tab, setTab] = useState("reviews")

  // 1. రివ్యూస్/కంప్లైంట్స్ లాజిక్ (అడ్మిన్ అయితే అన్నీ, ఫ్యాకల్టీ అయితే ఓన్లీ వారివి)
  const { data: reviews, isLoading: reviewsLoading, mutate: reloadReviews } = useSWR(
    isAdmin ? "admin-reviews" : `faculty-reviews-${facultyId}`,
    isAdmin ? fetchReviews : () => fetchFacultyComplaints(facultyId!)
  )

  // 2. రివ్యూ డిలీట్ చేసే ఫంక్షన్
  const handleDeleteReview = async (id: string) => {
    if (confirm("ఈ రివ్యూని డిలీట్ చేయాలనుకుంటున్నారా?")) {
      try {
        await deleteReview(id)
        reloadReviews()
      } catch (error) {
        alert("డిలీట్ చేయడం కుదరలేదు.")
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ట్యాబ్స్ */}
      <div className="flex gap-2">
        <button onClick={() => setTab("reviews")} className={`px-4 py-2 rounded-lg ${tab === "reviews" ? "bg-primary text-white" : "bg-muted"}`}>
          రివ్యూలు / కంప్లైంట్స్
        </button>
      </div>

      {/* కంటెంట్ సెక్షన్ */}
      {tab === "reviews" && (
        <div className="grid gap-4">
          {reviewsLoading ? (
            <Spinner />
          ) : !reviews || reviews.length === 0 ? (
            <Empty label="ఏమీ లేవు" />
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm relative">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-card-foreground">@{r.username}</p>
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary">{r.category}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.message}</p>
                
                {/* డిలీట్ బటన్ */}
                <button 
                  onClick={() => handleDeleteReview(r.id)}
                  className="mt-3 flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> తొలగించు
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
