"use server";

import { revalidatePath } from "next/cache";
import { parseCsvRecords } from "@/lib/csv";
import { requireOnboardedSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { convexMessage } from "@/lib/convex/error";

/* Contacts a host maintains by hand, alongside the ones the database fills in
   from bookings. Email is the identity, so saving an address that already
   exists updates that contact rather than creating a second one — which is what
   a host means when they type it again. */

export type ContactResult = { error?: string; id?: string };
export type ImportResult = { error?: string; added?: number; updated?: number; skipped?: number };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_IMPORT = 2000;
/** One Convex mutation is one transaction; keep each one small. */
const IMPORT_CHUNK = 250;

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

  const row = {
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    company: input.company.trim(),
    notes: input.notes.trim(),
  };

  try {
    const convex = await convexServer();
    const id = await convex.mutation(api.contacts.save, { id: input.id, ...row });
    revalidatePath("/contacts");
    return { id };
  } catch (e) {
    return { error: convexMessage(e, "That contact could not be saved.") };
  }
}

export async function deleteContact(id: string): Promise<ContactResult> {
  const { userId } = await requireOnboardedSession();

  try {
    const convex = await convexServer();
    await convex.mutation(api.contacts.remove, { id });
    revalidatePath("/contacts");
    return {};
  } catch (e) {
    return { error: convexMessage(e, "That contact could not be removed.") };
  }
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

  /* Convex reports added/updated itself, because it is the side that knows
     which rows already existed at the moment each chunk ran. */
  try {
    const convex = await convexServer();
    let added = 0;
    let updated = 0;
    for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
      const chunk = rows.slice(i, i + IMPORT_CHUNK).map(({ name, email, phone, company, notes }) => ({
        name, email, phone, company, notes,
      }));
      const r = await convex.mutation(api.contacts.importChunk, { rows: chunk });
      added += r.added;
      updated += r.updated;
    }
    revalidatePath("/contacts");
    return { added, updated, skipped };
  } catch (e) {
    return { error: convexMessage(e, "That file could not be imported.") };
  }
}
