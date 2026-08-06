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
  const { error } = await supabase.from("profiles").update({ username: username.trim() }).eq("id", userId)
  if (error) throw friendlyError(error, "Could not update your username. Please try again.")
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
// Account deletion (client-side: wipes profile + listings, then signs out).
// Note: removing the underlying auth.users row requires the service-role key,
// which is intentionally never shipped to the browser. Wiping the profile and
// all listings effectively resets the account.
// ---------------------------------------------------------------------------
export async function deleteAccount(userId: string): Promise<void> {
  const supabase = getSupabase()
  const { error: listingsError } = await supabase.from("listings").delete().eq("owner_id", userId)
  if (listingsError) throw listingsError
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
  if (profileError) throw profileError
  await supabase.auth.signOut()
}
