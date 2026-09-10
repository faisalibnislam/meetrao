"use server";

import { revalidatePath } from "next/cache";
import { parseCsvRecords } from "@/lib/csv";
import { requireOnboardedSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";

/* Contacts a host maintains by hand, alongside the ones the database fills in
   from bookings. Email is the identity, so saving an address that already
   exists updates that contact rather than creating a second one — which is what
   a host means when they type it again. */

export type ContactResult = { error?: string; id?: string };
export type ImportResult = { error?: string; added?: number; updated?: number; skipped?: number };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_IMPORT = 2000;

export type ContactInput = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
};

export async function saveContact(input: ContactInput): Promise<ContactResult> {
  const { userId } = await requireOnboardedSession();

  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "That is not an email address." };

  const supabase = await supabaseServer();
  const row = {
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    company: input.company.trim(),
    notes: input.notes.trim(),
  };

  if (input.id) {
    const { error } = await supabase.from("contacts").update(row).eq("id", input.id).eq("user_id", userId);
    if (error) {
      return { error: error.code === "23505" ? "You already have a contact with that email." : error.message };
    }
    revalidatePath("/contacts");
    return { id: input.id };
  }

  // Upsert on the identity rather than insert: typing an address that already
  // exists means "this person", not "a second row for this person".
  const { data, error } = await supabase
    .from("contacts")
    .upsert({ ...row, user_id: userId, source: "manual" }, { onConflict: "user_id,email" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  return { id: data.id };
}

export async function deleteContact(id: string): Promise<ContactResult> {
  const { userId } = await requireOnboardedSession();
  const supabase = await supabaseServer();

  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/contacts");
  return {};
}

/**
 * Import from CSV.
 *
 * Reports what happened to every row rather than claiming success: a file where
 * half the addresses are malformed should say so, not import silently and leave
 * the host to notice later. Rows with no usable email are skipped, not rejected
 * — one bad line should not throw away a thousand good ones.
 */
export async function importContacts(csv: string): Promise<ImportResult> {
  const { userId } = await requireOnboardedSession();

  let records: Record<string, string>[];
  try {
    records = parseCsvRecords(csv);
  } catch {
    return { error: "That file could not be read as CSV." };
  }

  if (!records.length) return { error: "That file has no rows." };
  if (records.length > MAX_IMPORT) return { error: `That is more than ${MAX_IMPORT} rows.` };

  const supabase = await supabaseServer();

  const { data: existingRows } = await supabase.from("contacts").select("email").eq("user_id", userId);
  const existing = new Set(((existingRows ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()));

  const seen = new Set<string>();
  const rows: { user_id: string; name: string; email: string; phone: string; company: string; notes: string; source: string }[] = [];
  let skipped = 0;

  for (const r of records) {
    const email = (r.email ?? r.emailaddress ?? r.mail ?? "").trim().toLowerCase();
    if (!EMAIL.test(email) || seen.has(email)) {
      skipped += 1;
      continue;
    }
    seen.add(email);

    const first = (r.firstname ?? "").trim();
    const last = (r.lastname ?? "").trim();
    rows.push({
      user_id: userId,
      // "name", or "full name", or first and last in separate columns — every
      // address book exports a different one of the three.
      name: (r.name ?? r.fullname ?? [first, last].filter(Boolean).join(" ")).trim(),
      email,
      phone: (r.phone ?? r.phonenumber ?? r.mobile ?? "").trim(),
      company: (r.company ?? r.organisation ?? r.organization ?? "").trim(),
      notes: (r.notes ?? r.note ?? "").trim(),
      source: "import",
    });
  }

  if (!rows.length) return { error: "No row in that file had a usable email address." };

  const { error } = await supabase.from("contacts").upsert(rows, { onConflict: "user_id,email" });
  if (error) return { error: error.message };

  const updated = rows.filter((r) => existing.has(r.email)).length;

  revalidatePath("/contacts");
  return { added: rows.length - updated, updated, skipped };
}
