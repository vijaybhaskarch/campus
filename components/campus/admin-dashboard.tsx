"use client"

import { useState } from "react"
import useSWR from "swr"
import { ChevronLeft, Users, MessageSquareWarning, PackageSearch, Ban, ShieldCheck, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteListing, fetchAllProfiles, fetchReviews, setBanned } from "@/lib/api"
import { formatPrice, type Item } from "@/lib/campus-data"
import { useSession } from "./session-provider"

type AdminTab = "users" | "listings" | "reviews"

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { user, listings, reloadListings } = useSession()
  const [tab, setTab] = useState<AdminTab>("users")

  const { data: profiles, mutate: reloadProfiles, isLoading: profilesLoading } = useSWR("admin-profiles", fetchAllProfiles)
  const { data: reviews, isLoading: reviewsLoading } = useSWR("admin-reviews", fetchReviews)

  async function toggleBan(userId: string, banned: boolean) {
    await setBanned(userId, banned)
    void reloadProfiles()
  }

  async function removeListing(item: Item) {
    if (!confirm(`Delete "${item.title}" permanently?`)) return
    await deleteListing(item.id)
    reloadListings()
  }

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "listings", label: "Listings", icon: PackageSearch },
    { id: "reviews", label: "Reviews", icon: MessageSquareWarning },
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

        <div className="mt-3 flex gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
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
