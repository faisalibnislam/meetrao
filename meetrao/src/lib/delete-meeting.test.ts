import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Deleting a meeting.

   The mutation has existed in convex/meetingTypes.ts since the Convex
   migration and nothing ever called it: there was no action wrapping it and
   no control anywhere in the app. A host could make a meeting and never be
   rid of it. That is the gap these cover, and the first test is the one that
   would have caught it.

   A BOOKING IS NOT PART OF THE MEETING. Deleting the link a booking came
   through does not unmake the fact that two people agreed on a time, so the
   bookings survive with their `meeting_type_id` nulled. Nobody is cancelled
   and no guest is told, which is exactly why the dialog has to say so: a host
   who thinks this cancels their week will find out when somebody turns up.

   THE DIALOG NAMES THE MEETING. "Delete this meeting?" is a dialog people
   confirm without reading. It also holds the row rather than a flag, so it
   cannot name one meeting and delete another.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const MUTATION = read("convex/meetingTypes.ts");
const ACTION = read("src/lib/actions/meetings.ts");
const FORM = read("src/components/app/meeting-form.tsx");
const TABLE = read("src/components/app/meetings-table.tsx");

describe("the mutation is reachable at all", () => {
  /* The test that was missing. `remove` sat in Convex with no caller, which
     no type check and no other test could notice. */
  it("has an action behind it", () => {
    expect(ACTION).toContain("api.meetingTypes.remove");
    expect(ACTION).toContain("export async function deleteMeeting");
  });

  it("has a control that calls the action", () => {
    expect(FORM).toContain("deleteMeeting");
    expect(FORM).toContain("await deleteMeeting(initial.id as string)");
  });

  /* On the edit screen, not the list. A fourth text button in the row pushed
     that column past the viewport at 1161px and put a horizontal scrollbar on
     the page, and the icon set has no trash glyph to shrink it to. */
  it("is not a fourth button in the list row", () => {
    expect(TABLE, "the row already carries Embed, Preview and Edit").not.toContain("deleteMeeting");
  });

  /* Only when there is something to delete. A new meeting has no id, and the
     button would call the mutation with undefined. */
  it("is absent while creating one", () => {
    expect(FORM).toContain("{editing ? (");
  });
});

describe("what deleting does not do", () => {
  /* Convex has no cascades. Without this the bookings keep pointing at a row
     that is gone. */
  it("keeps the bookings and nulls their link to it", () => {
    const at = MUTATION.indexOf("export const remove =");
    expect(at).toBeGreaterThan(-1);
    const body = MUTATION.slice(at);
    expect(body).toContain('by_meeting_type');
    expect(body).toContain("meeting_type_id: null");
    expect(body, "a booking must not be deleted with the meeting").not.toMatch(
      /ctx\.db\.delete\(b\._id\)/,
    );
  });

  /* The order matters: deleting the meeting first leaves nothing to find the
     affected bookings by. */
  it("re-points the bookings before it deletes the meeting", () => {
    const body = MUTATION.slice(MUTATION.indexOf("export const remove ="));
    const repoint = body.indexOf("meeting_type_id: null");
    const gone = body.indexOf("ctx.db.delete(m._id)");
    expect(repoint).toBeGreaterThan(-1);
    expect(gone).toBeGreaterThan(-1);
    expect(repoint).toBeLessThan(gone);
  });

  it("is only the host's to do", () => {
    const body = MUTATION.slice(MUTATION.indexOf("export const remove ="));
    expect(body).toContain("assertOwnerOrAdmin(me, m.user_id)");
  });
});

describe("the dialog", () => {
  /* "Delete this meeting?" gets confirmed without being read. */
  it("names the meeting it is about to delete", () => {
    expect(FORM).toContain("title={`Delete ${initial.name || \"this meeting\"}?`}");
  });

  /* The dialog and the mutation read the same `initial`, so there is no
     second variable that could drift from what the title says. */
  it("deletes the meeting it named", () => {
    expect(FORM).toContain("deleteMeeting(initial.id as string)");
  });

  /* A host who thinks this cancels their week finds out when somebody turns
     up. The subtitle is the only place that can say otherwise. */
  it("says the bookings survive and nobody is told", () => {
    expect(FORM).toContain("Bookings already made stay where they are");
    expect(FORM).toContain("nobody is cancelled and no guest is told");
  });

  it("is a confirm step rather than a one-click delete", () => {
    expect(FORM).toContain('label: "Delete",');
    expect(FORM).toContain('variant: "danger",');
    expect(FORM).toContain('secondary={{ label: "Keep it"');
  });
});
