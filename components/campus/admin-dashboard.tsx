"use client"

import { useState } from "react"
import useSWR from "swr"
import { ChevronLeft, Users, MessageSquareWarning, PackageSearch, Ban, ShieldCheck, Trash2, Loader2, Megaphone, Send, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteListing, fetchAllProfiles, fetchReviews, setBanned, fetchAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/api"
import { formatPrice, type Item } from "@/lib/campus-data"
import { useSession } from "./session-provider"

type AdminTab = "users" | "listings" | "reviews" | "announcement"

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { user, listings, reloadListings } = useSession()
  const [tab, setTab] = useState<AdminTab>("users")

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("View Deal")
  const [submitting, setSubmitting] = useState(false)

  const { data: profiles, mutate: reloadProfiles, isLoading: profilesLoading } = useSWR("admin-profiles", fetchAllProfiles)
  const { data: reviews, isLoading: reviewsLoading } = useSWR("admin-reviews", fetchReviews)
  const { data: announcements, mutate: reloadAnnouncements, isLoading: announcementsLoading } = useSWR("admin-announcements", fetchAnnouncements)

  async function toggleBan(userId: string, banned: boolean) {
    await setBanned(userId, banned)
    void reloadProfiles()
  }

  async function removeListing(item: Item) {
    if (!confirm(`Delete "${item.title}" permanently?`)) return
    await deleteListing(item.id)
    reloadListings()
  }

  async function handleSendAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    try {
      await createAnnouncement({
        title: title.trim() || "Platform Announcement",
        message: message.trim(),
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        link_text: linkUrl.trim() ? (linkText.trim() || "View Deal") : "View Deal",
      })
      setTitle("")
      setMessage("")
      setImageUrl("")
      setLinkUrl("")
      setLinkText("View Deal")
      void reloadAnnouncements()
      alert("Announcement sent successfully to all users!")
    } catch (err) {
      console.error(err)
      alert("Failed to send announcement.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement for all users?")) return
    try {
      await deleteAnnouncement(id)
      void reloadAnnouncements()
    } catch (err) {
      console.error(err)
      alert("Failed to delete announcement.")
    }
  }

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Super-admin controls</p>
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
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold uppercase text-primary">
                    {p.username.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      @{p.username}
                      {isMe && <span className="ml-1 text-[10px] font-medium text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sold_count} sold</p>
                  </div>
                  {!isMe && (
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
              )
            })
          ))}

        {tab === "listings" &&
          (listings.length === 0 ? (
            <Empty label="No listings on the platform yet." />
          ) : (
            listings.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  className="h-14 w-11 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-card-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    @{item.owner_username} · {formatPrice(item.price)} · {item.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeListing(item)}
                  aria-label="Delete listing"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ))}

        {tab === "reviews" &&
          (reviewsLoading ? (
            <Spinner />
          ) : (reviews ?? []).length === 0 ? (
            <Empty label="No feedback submitted yet." />
          ) : (
            (reviews ?? []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-card-foreground">@{r.username}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.message}</p>
              </div>
            ))
          ))}

        {tab === "announcement" && (
          <div className="flex flex-col gap-4">
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
                  placeholder="e.g. 🔥 Special Flipkart Deal"
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
                  <ImageIcon className="h-3.5 w-3.5" /> Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Link URL (Optional)</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://fkrt.it/..."
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Button Text (Optional)</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Grab Now"
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

            <div className="mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Previous Broadcasts</h3>
              {announcementsLoading ? (
                <Spinner />
              ) : (announcements ?? []).length === 0 ? (
                <Empty label="No announcements sent yet." />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {(announcements ?? []).map((ann) => (
                    <div key={ann.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">{ann.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ann.message}</p>
                          
                          {/* Image rendering if available */}
                          {ann.image_url && (
                            <img
                              src={ann.image_url}
                              alt="Announcement attachment"
                              className="mt-2.5 h-36 w-full rounded-xl object-cover"
                            />
                          )}

                          {/* Link button rendering only if link_url exists */}
                          {ann.link_url && (
                            <a
                              href={ann.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2.5 inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              {ann.link_text || "View Link"} →
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          aria-label="Delete announcement"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="mt-2 block text-[10px] text-muted-foreground">
                        {new Date(ann.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
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
