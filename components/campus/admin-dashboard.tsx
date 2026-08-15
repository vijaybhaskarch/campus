"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { ChevronLeft, Users, MessageSquareWarning, PackageSearch, Ban, ShieldCheck, Trash2, Loader2, Megaphone, Send, Image as ImageIcon, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteListing, fetchAllProfiles, fetchReviews, deleteReview, setBanned, fetchAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/api"
import { formatPrice, type Item } from "@/lib/campus-data"
import { useSession } from "./session-provider"
import { getSupabase } from "@/lib/supabase/client"

type AdminTab = "users" | "listings" | "reviews" | "announcement"

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { user, profile, isAdmin, listings, reloadListings } = useSession()
  const [tab, setTab] = useState<AdminTab>("users")

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("View")
  const [submitting, setSubmitting] = useState(false)

  // లోకల్ గా డిలీట్ చేసిన (హైడ్ చేసిన) రివ్యూ ఐడీలను సేవ్ చేయడానికి
  const [hiddenReviewIds, setHiddenReviewIds] = useState<string[]>([])

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`hidden_reviews_${user.id}`)
      if (saved) {
        try {
          setHiddenReviewIds(JSON.parse(saved))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [user?.id])

  const { data: profiles, mutate: reloadProfiles, isLoading: profilesLoading } = useSWR("admin-profiles", fetchAllProfiles)
  const { data: reviews, isLoading: reviewsLoading } = useSWR("admin-reviews", fetchReviews)
  const { data: announcements, mutate: reloadAnnouncements, isLoading: announcementsLoading } = useSWR("admin-announcements", fetchAnnouncements)

  function checkIsSuperAdmin(pEmail?: string | null) {
    if (!pEmail) return false;
    return pEmail.toLowerCase().trim() === "vijaybhaskar.ch9045@gmail.com";
  }

  async function toggleBan(userId: string, banned: boolean) {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: banned })
        .eq("id", userId)

      if (error) {
        await setBanned(userId, banned)
      }
      void reloadProfiles()
    } catch (err) {
      console.error("Failed to ban/unban user:", err)
      alert("Failed to update user ban status.")
    }
  }

  async function toggleFaculty(userId: string, currentRole: string) {
    if (!isAdmin) {
      alert("You do not have permission to change user roles.")
      return
    }
    const newRole = currentRole === "faculty" ? "user" : "faculty"
    const supabase = getSupabase()
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
    if (error) {
      alert("Failed to update role.")
    } else {
      void reloadProfiles()
    }
  }

  async function removeListing(item: Item) {
    const ownerProfile = profiles?.find(p => p.username.toLowerCase() === item.owner_username?.toLowerCase());
    const isSuperAdminOwner = checkIsSuperAdmin(ownerProfile?.email);

    if (!isAdmin && isSuperAdminOwner) {
      alert("You cannot delete listings owned by the Super Admin.")
      return
    }

    if (!confirm(`Delete "${item.title}" permanently?`)) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("listings").delete().eq("id", item.id)
      
      if (error) {
        await deleteListing(item.id)
      }
      reloadListings()
    } catch (err) {
      console.error("Failed to delete listing:", err)
      alert("Failed to delete listing.")
    }
  }

  // ఇక్కడ మార్పు: కేవలం వారి అకౌంట్ (స్క్రీన్) నుండి మాత్రమే హైడ్ అవుతుంది
  async function removeReview(reviewId: string) {
    const isSuper = checkIsSuperAdmin(user?.email);

    // మీరు (Super Admin) అయితే పర్మనెంట్ డిలీట్ కావాలా లేదా అని అడగొచ్చు, లేదా అందరికీ లోకల్ గానే హైడ్ కావాలంటే సింపుల్ గా ఇలా చేయొచ్చు:
    if (isSuper && confirm("Super Admin: పర్మనెంట్ గా డేటాబేస్ నుండి డిలీట్ చేయాలా? (Cancel నొక్కితే మీ స్క్రీన్ నుండి మాత్రమే పోతుంది)")) {
      try {
        await deleteReview(reviewId)
        window.location.reload()
        return
      } catch (err) {
        console.error("Failed to delete permanently:", err)
      }
    }

    // ఫ్యాకల్టీ లేదా అడ్మిన్ ఎవరైనా సరే కేవలం వారి అకౌంట్ నుండి మాత్రమే పోవడానికి:
    const updated = [...hiddenReviewIds, reviewId]
    setHiddenReviewIds(updated)
    if (user?.id) {
      localStorage.setItem(`hidden_reviews_${user.id}`, JSON.stringify(updated))
    }
  }

  async function handleSendAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const supabase = getSupabase()
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `announcements/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("listings")
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from("listings")
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      await createAnnouncement({
        title: title.trim() || "Platform Announcement",
        message: message.trim(),
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        link_text: linkUrl.trim() ? (linkText.trim() || "View") : "View",
      })

      setTitle("")
      setMessage("")
      setImageFile(null)
      setLinkUrl("")
      setLinkText("View")
      void reloadAnnouncements()
      alert("Announcement sent successfully to all users!")
    } catch (err) {
      console.error(err)
      alert("Failed to send announcement.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAnnouncement(ann: any) {
    const creatorProfile = profiles?.find(p => p.id === ann.user_id || p.username.toLowerCase() === ann.username?.toLowerCase());
    const isAdminAnnouncement = checkIsSuperAdmin(creatorProfile?.email) || ann.is_admin || ann.username === "admin";

    if (!isAdmin && isAdminAnnouncement) {
      alert("You cannot delete announcements posted by the Super Admin.")
      return
    }

    if (!confirm("Delete this announcement?")) return
    try {
      await deleteAnnouncement(ann.id)
      void reloadAnnouncements()
    } catch (err) {
      console.error(err)
      alert("Failed to delete announcement.")
    }
  }

  // ఫ్యాకల్టీ అయితే కేవలం "Complaint to Faculty" మాత్రమే కనిపించాలి. అడ్మిన్ అయితే అన్నీ కనిపించాలి.
  const displayedReviews = (reviews ?? []).filter((r) => {
    // లోకల్ గా హైడ్ చేసినవి చూపించకూడదు
    if (hiddenReviewIds.includes(r.id)) return false;

    // ఒకవేళ యూజర్ అడ్మిన్ కాకపోతే (అంటే ఫ్యాకల్టీ అయితే) కేవలం కంప్లైంట్స్ మాత్రమే ఫిల్టర్ చేయాలి
    if (!isAdmin) {
      return r.category === "Complaint to Faculty";
    }

    return true; // అడ్మిన్ కి అన్నీ కనిపిస్తాయి
  });

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users & Faculty", icon: Users },
    { id: "listings", label: "Listings", icon: PackageSearch },
    { id: "reviews", label: "Reviews", icon: MessageSquareWarning },
    { id: "announcement", label: "Announcement", icon: Megaphone },
  ]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-4 pb-3 pt-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isAdmin ? "Admin Dashboard" : "Faculty Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Super-admin controls" : "Faculty management panel"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
                tab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2.5 px-4 pb-32 pt-2">
        {tab === "users" &&
          (profilesLoading ? (
            <Spinner />
          ) : (
            (profiles ?? []).map((p) => {
              const isMe = p.id === user?.id
              const isFaculty = p.role === "faculty"
              const isSuperAdminTarget = checkIsSuperAdmin(p.email)

              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold uppercase text-primary">
                    {p.username.slice(0, 2)}
                  </span>
                  
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                      @{p.username}
                      {isMe && <span className="text-[10px] font-medium text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sold_count} sold</p>
                    <div className="mt-0.5">
                      {isSuperAdminTarget ? (
                        <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                          Super Admin
                        </span>
                      ) : isFaculty ? (
                        <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                          Faculty
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          User
                        </span>
                      )}
                    </div>
                  </div>

                  {!isMe && (
                    <div className="flex items-center gap-1.5">
                      {isAdmin && !isSuperAdminTarget && (
                        <button
                          type="button"
                          onClick={() => toggleFaculty(p.id, p.role)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold border",
                            isFaculty ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          <GraduationCap className="h-4 w-4" />
                          {isFaculty ? "Revoke" : "Make Faculty"}
                        </button>
                      )}

                      {!isSuperAdminTarget && (
                        <button
                          type="button"
                          onClick={() => toggleBan(p.id, !p.is_banned)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold",
                            p.is_banned
                              ? "border border-border text-foreground"
                              : "bg-destructive text-destructive-foreground",
                          )}
                        >
                          {p.is_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          {p.is_banned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ))}

        {tab === "listings" &&
          (listings.length === 0 ? (
            <Empty label="No listings on the platform yet." />
          ) : (
            listings.map((item) => {
              const ownerProfile = profiles?.find(p => p.username.toLowerCase() === item.owner_username?.toLowerCase());
              const isSuperAdminOwner = checkIsSuperAdmin(ownerProfile?.email);
              const isFacultyOwner = ownerProfile?.role === "faculty";

              const ownerRole = isSuperAdminOwner ? "Super Admin" : (isFacultyOwner ? "Faculty" : "User");
              const hideDeleteButton = !isAdmin && isSuperAdminOwner;

              return (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="h-14 w-11 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-card-foreground">{item.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>@{item.owner_username}</span>
                      <span>·</span>
                      <span className={cn(
                        "rounded px-1.5 py-0.2 text-[10px] font-bold",
                        ownerRole === "Super Admin" ? "bg-amber-500/10 text-amber-500" :
                        ownerRole === "Faculty" ? "bg-blue-500/10 text-blue-500" : "bg-secondary text-muted-foreground"
                      )}>
                        {ownerRole}
                      </span>
                      <span>·</span>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                  </div>
                  
                  {!hideDeleteButton && (
                    <button
                      type="button"
                      onClick={() => removeListing(item)}
                      aria-label="Delete listing"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground hover:opacity-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })
          ))}

        {tab === "reviews" &&
          (reviewsLoading ? (
            <Spinner />
          ) : displayedReviews.length === 0 ? (
            <Empty label={isAdmin ? "No feedback submitted yet." : "No faculty complaints found."} />
          ) : (
            displayedReviews.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-card-foreground">@{r.username}</p>
                    {r.category && (
                      <span className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold",
                        r.category === "Complaint to Faculty" ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary"
                      )}>
                        {r.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.message}</p>
                  <span className="mt-2 block text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeReview(r.id)}
                  aria-label="Delete review"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ))}

        {tab === "announcement" && (
          <div className="flex flex-col gap-4">
            {isAdmin && (
              <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Broadcast to All Users
                </h2>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message for all users here..."
                    rows={3}
                    required
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" /> Attach Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Link URL (Optional)</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Button Text (Optional)</label>
                    <input
                      type="text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="View"
                      disabled={!linkUrl.trim()}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send to All Users
                </button>
              </form>
            )}

            <div className="mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Previous Broadcasts</h3>
              {announcementsLoading ? (
                <Spinner />
              ) : (announcements ?? []).length === 0 ? (
                <Empty label="No announcements sent yet." />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {(announcements ?? []).map((ann) => {
                    const creatorProfile = profiles?.find(p => p.id === ann.user_id || p.username.toLowerCase() === ann.username?.toLowerCase());
                    const isAdminAnnouncement = checkIsSuperAdmin(creatorProfile?.email) || ann.is_admin || ann.username === "admin";
                    const hideDeleteAnn = !isAdmin && isAdminAnnouncement;

                    return (
                      <div key={ann.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm relative group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground">{ann.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ann.message}</p>
                            
                            {ann.image_url && (
                              <img
                                src={ann.image_url}
                                alt="Announcement attachment"
                                className="mt-2.5 h-36 w-full rounded-xl object-cover"
                              />
                            )}

                            {ann.link_url && (
                              <p className="mt-2.5">
                                <a
                                  href={ann.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                                >
                                  {ann.link_text || "View"} →
                                </a>
                              </p>
                            )}
                          </div>

                          {!hideDeleteAnn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann)}
                              aria-label="Delete announcement"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <span className="mt-2 block text-[10px] text-muted-foreground">
                          {new Date(ann.created_at).toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="py-16 text-center text-sm text-muted-foreground">{label}</p>
}
