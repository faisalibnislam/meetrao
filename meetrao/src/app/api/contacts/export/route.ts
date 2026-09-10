import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { listContacts } from "@/lib/data/contacts";
import { requireOnboardedSession } from "@/lib/data/session";

/**
 * The contact list as a CSV download.
 *
 * A route rather than a server action because the browser has to receive it as
 * a file, and the headers are what make that happen. The column names match
 * what the importer reads, so an export can be edited in a spreadsheet and
 * imported straight back.
 */
export async function GET() {
  const { userId, profile } = await requireOnboardedSession();
  const contacts = await listContacts(userId, profile.timezone);

  const csv = toCsv(
    ["name", "email", "phone", "company", "notes", "last meeting", "next meeting", "meetings", "source"],
    contacts.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.company,
      c.notes,
      c.lastMeeting ?? "",
      c.nextMeeting ?? "",
      String(c.meetings),
      c.source,
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meetrao-contacts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
