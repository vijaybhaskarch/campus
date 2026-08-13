"use client"

import { getSupabase } from "./supabase/client"
import type { Category, Item, Profile, Review } from "./campus-data"

/** Postgres unique-violation error code (duplicate username). */
const UNIQUE_VIOLATION = "23505"

/** Turn a raw Supabase error into a friendly, actionable message. */
function friendlyError(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (error?.code === UNIQUE_VIOLATION) {
    return new Error("That username is already taken. Please choose another.")
  }
  return new Error(error?.message?.trim() ? error.message : fallback)
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function createProfile(userId: string, email: string, username: string): Promise<Profile> {
  const supabase = getSupabase()
  const clean = username.trim()
  // upsert on the primary key (id) so a retry after a transient failure works,
  // while a duplicate username still surfaces a clear "taken" message.
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, username: clean }, { onConflict: "id" })
    .select("*")
    .single()
  if (error) throw friendlyError(error, "Could not save your username. Please try again.")
  return data as Profile
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const supabase = getSupabase()
  const clean = username.trim()

  // 1) Persist to the profiles table (the source of truth for display).
  const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", userId)
  if (error) throw friendlyError(error, "Could not update your username. Please try again.")

  // 2) Mirror it into the Supabase Auth user metadata so it stays consistent
  //    everywhere the session is read (e.g. right after OAuth).
  const { error: authError } = await supabase.auth.updateUser({ data: { username: clean } })
  if (authError) throw friendlyError(authError, "Saved your username, but could not sync your account. Try again.")

  // 3) Denormalised copy on the user's own listings so the feed shows the new
  //    name immediately without waiting for a re-fetch/join.
  await supabase.from("listings").update({ owner_username: clean }).eq("owner_id", userId)
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
export async function fetchListings(): Promise<Item[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Item[]
}

export async function createListing(input: {
  owner_id: string
  owner_username: string
  title: string
  category: Category
  price: number
  image: string
  owner: string
}): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").insert({ ...input, status: "available", requested_by: null })
  if (error) throw error
}

export async function requestListing(listing: Item, requesterId: string, requesterUsername: string): Promise<void> {
  const supabase = getSupabase()
  // Atomically claim the listing ONLY if it's still available. `.select()`
  // returns the rows that actually changed, so we can tell whether we won the
  // claim or someone beat us to it — instead of silently succeeding on 0 rows.
  const { data: claimed, error } = await supabase
    .from("listings")
    .update({ status: "pending", requested_by: requesterId })
    .eq("id", listing.id)
    .eq("status", "available") // guard: only claim if still available
    .select("id")
  if (error) throw new Error(error.message || "Could not send your request. Please try again.")
  if (!claimed || claimed.length === 0) {
    throw new Error("Sorry, this item was just requested by someone else.")
  }
  // Only record the request (which drives the owner's notification) once the
  // claim actually succeeded, so no phantom request rows are created.
  const { error: requestError } = await supabase.from("requests").insert({
    listing_id: listing.id,
    requester_id: requesterId,
    requester_username: requesterUsername,
  })
  if (requestError) throw new Error(requestError.message || "Could not notify the owner. Please try again.")
}

export async function markSold(listing: Item): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id)
  if (error) throw error
  // Increment the owner's sold counter atomically.
  const { error: rpcError } = await supabase.rpc("increment_sold", { p_user_id: listing.owner_id })
  if (rpcError) throw rpcError
}

export async function resetToAvailable(listing: Item): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("listings")
    .update({ status: "available", requested_by: null })
    .eq("id", listing.id)
  if (error) throw error
}

export async function deleteListing(listingId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").delete().eq("id", listingId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function submitReview(userId: string, username: string, message: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("reviews").insert({ user_id: userId, username, message: message.trim() })
  if (error) throw error
}

export async function fetchReviews(): Promise<Review[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Review[]
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function fetchAllProfiles(): Promise<Profile[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function setBanned(userId: string, banned: boolean): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", userId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Account deletion — permanently wipes ALL of the user's data (reviews,
// requests, listings, profile) and the underlying auth.users row via the
// `delete_own_account` security-definer function, then signs out locally.
// If that function isn't present yet (schema not applied), we fall back to
// wiping the data we can reach from the client so the account is still reset.
// ---------------------------------------------------------------------------
export async function deleteAccount(userId: string): Promise<void> {
  const supabase = getSupabase()

  const { error: rpcError } = await supabase.rpc("delete_own_account")

  if (rpcError) {
    // Fallback path when the RPC isn't available: remove everything the
    // client is allowed to delete directly.
    await supabase.from("reviews").delete().eq("user_id", userId)
    await supabase.from("requests").delete().eq("requester_id", userId)
    const { error: listingsError } = await supabase.from("listings").delete().eq("owner_id", userId)
    if (listingsError) throw listingsError
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
    if (profileError) throw profileError
  }

  // Always end the local session so the user is returned to sign-in.
  await supabase.auth.signOut()
}

// ---------------------------------------------------------------------------
// Live profile stats — real-time counts of the user's listings by status.
// ---------------------------------------------------------------------------
export interface ProfileStats {
  active: number
  pending: number
  sold: number
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("listings").select("status").eq("owner_id", userId)
  if (error) throw error
  const rows = (data ?? []) as { status: string }[]
  return {
    active: rows.filter((r) => r.status === "available").length,
    pending: rows.filter((r) => r.status === "pending").length,
    sold: rows.filter((r) => r.status === "sold").length,
  }
}
// ---------------------------------------------------------------------------
// Admin Announcements
// ---------------------------------------------------------------------------
export async function fetchAnnouncements() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("admin_announcements")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}
export async function createAnnouncement(announcement: { 
  title: string; 
  message: string; 
  image_url?: string | null;
  link_url?: string | null; 
  link_text?: string 
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("admin_announcements")
    .insert([announcement])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("admin_announcements")
    .delete()
    .eq("id", id)
  if (error) throw error
}
