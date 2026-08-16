"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import type { Category, Item } from "@/lib/campus-data"
import {
  createListing,
  deleteListing,
  markSold,
  requestListing,
  resetToAvailable,
} from "@/lib/api"
import { fetchAnnouncements } from "@/lib/api" // <- ఇది యాడ్ చేయండి
import { useSession } from "./session-provider"
import { BottomNav, type Tab } from "./bottom-nav"
import { HomeScreen } from "./home-screen"
import { ProductDetail } from "./product-detail"
import { PostItem } from "./post-item"
import { MyListings } from "./my-listings"
import { NotificationsScreen } from "./notifications-screen"
import { ProfileScreen } from "./profile-screen"

export function CampusApp() {
  const { user, profile, isAdmin, listings, reloadListings, reloadProfile } = useSession()
  const [tab, setTab] = useState<Tab>("home")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // అడ్మిన్ అనౌన్స్‌మెంట్‌లను ఫెచ్ చేయడం కోసం
  const { data: announcements } = useSWR("admin-announcements", fetchAnnouncements)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const userId = user!.id
  const username = profile?.username ?? "student"

  // లోకల్ స్టోరేజ్ నుండి డిస్మిస్ చేసిన అనౌన్స్‌మెంట్‌ల ఐడీలను తెచ్చుకోవడం
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`hidden_announcements_${userId}`)
      if (stored) {
        setHiddenIds(JSON.parse(stored))
      }
    } catch (e) {
      console.error(e)
    }
  }, [userId])

  // Always derive the selected item from the live list so its status stays fresh.
  const selected = useMemo(
    () => (selectedId ? listings.find((i) => i.id === selectedId) ?? null : null),
    [selectedId, listings],
  )

  // విజిబుల్ అయిన (డిస్మిസ് కాని) అడ్మిన్ అనౌన్స్‌మెంట్‌ల కౌంట్
  const visibleAnnouncementsCount = (announcements ?? []).filter(
    (ann) => !hiddenIds.includes(ann.id)
  ).length

  // ఇన్‌కమింగ్ రిక్వెస్ట్స్ కౌంట్
  const incomingRequestsCount = listings.filter(
    (i) => i.owner_id === userId && i.status === "pending",
  ).length

  // రెండూ కలిపి టోటల్ నోటిఫికేషన్ కౌంట్
  const notificationCount = visibleAnnouncementsCount + incomingRequestsCount

  function openItem(item: Item) {
    setSelectedId(item.id)
  }

  async function handleRequest(item: Item) {
    await requestListing(item, userId, username)
    reloadListings()
  }

  async function handleMarkSold(item: Item) {
    await markSold(item)
    reloadListings()
    reloadProfile()
  }

  async function handleReset(item: Item) {
    await resetToAvailable(item)
    reloadListings()
  }

  async function handleDelete(item: Item) {
    await deleteListing(item.id)
    setSelectedId(null)
    reloadListings()
  }

  async function handleAdd(data: {
    title: string
    category: Category
    price: number
    image: string
    owner: string
  }) {
    await createListing({
      owner_id: userId,
      owner_username: username,
      ...data,
    })
    reloadListings()
    setTab("listings")
  }

  function changeTab(next: Tab) {
    setSelectedId(null)
    setTab(next)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-0 sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[900px] sm:max-h-[92vh] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90">
        <div className="scroll-area flex-1 overflow-y-auto overscroll-contain">
          {selected ? (
            <ProductDetail
              item={selected}
              currentUserId={userId}
              isAdmin={isAdmin}
              onBack={() => setSelectedId(null)}
              onRequest={handleRequest}
              onDelete={handleDelete}
            />
          ) : (
            <>
              {tab === "home" && (
                <HomeScreen items={listings} isAdmin={isAdmin} onOpen={openItem} onDelete={handleDelete} />
              )}
              {tab === "listings" && (
                <MyListings
                  items={listings}
                  currentUserId={userId}
                  onMarkSold={handleMarkSold}
                  onReset={handleReset}
                  onOpen={openItem}
                  onPost={() => changeTab("post")}
                />
              )}
              {tab === "post" && <PostItem onSubmit={handleAdd} />}
              {tab === "notifications" && <NotificationsScreen items={listings} currentUserId={userId} />}
              {tab === "profile" && <ProfileScreen />}
            </>
          )}
        </div>

        {!selected && <BottomNav active={tab} onChange={changeTab} notificationCount={notificationCount} />}
      </div>
    </div>
  )
}
