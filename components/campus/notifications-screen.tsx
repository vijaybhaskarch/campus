"use client"

import { Heart, CheckCircle2, Bell, Clock } from "lucide-react"
import { formatPrice, type Item } from "@/lib/campus-data"

export function NotificationsScreen({ items, currentUserId }: { items: Item[]; currentUserId: string }) {
  // Someone requested one of MY listings -> alert me.
  const incomingRequests = items.filter((i) => i.owner_id === currentUserId && i.status === "pending")
  // Listings I requested -> track their status.
  const myRequests = items.filter((i) => i.requested_by === currentUserId && i.status !== "available")

  const notifications: {
    id: string
    icon: typeof Bell
    tone: "primary" | "accent"
    title: string
    body: string
  }[] = [
    ...incomingRequests.map((i) => ({
      id: `incoming-${i.id}`,
      icon: Heart,
      tone: "primary" as const,
      title: "Someone needs your item",
      body: `A student tapped "I Need This" on "${i.title}" (${formatPrice(i.price)}). Head to My Listings to mark it sold or reset it.`,
    })),
    ...myRequests.map((i) => ({
      id: `mine-${i.id}`,
      icon: i.status === "sold" ? CheckCircle2 : Clock,
      tone: "accent" as const,
      title: i.status === "sold" ? "Item marked as sold" : "Request pending",
      body:
        i.status === "sold"
          ? `"${i.title}" was marked sold by @${i.owner_username}. Arrange the handover on campus.`
          : `You requested "${i.title}" from @${i.owner_username}. Waiting on the owner to confirm.`,
    })),
  ]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="text-xs text-muted-foreground">Requests on your items and updates on your requests.</p>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="max-w-[240px] text-xs text-muted-foreground">
            When someone requests your item or an owner responds to your request, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5 px-5 pb-32 pt-2">
          {notifications.map((n) => {
            const Icon = n.icon
            return (
              <li key={n.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <span
                  className={
                    n.tone === "primary"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
