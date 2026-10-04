import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { countElsewhere, describeElsewhere, nameWorkspaces, type Elsewhere } from "./elsewhere";

/* ─────────────────────────────────────────────────────────────────────────────
   "You have none here" against "you have none at all".

   Every company-scoped screen filters by the workspace in force, so a host
   whose meetings all belong to their company opens Personal and is told "No
   meetings yet" beside a Create button. That is a confident claim that they
   have nothing, and it is false in the most alarming way available: it looks
   exactly like the meetings have been deleted. It read that way to me on a
   live account before it read that way to anybody else.

   THE SWITCH IS THE PRIMARY ACTION, not creating another one. Somebody in
   this position does not want a second copy of what they already have, and
   offering Create first invites exactly that.
   ───────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const el = (name: string, count: number, id: string | null = name): Elsewhere => ({ id, name, count });

describe("saying where the rows actually are", () => {
  it("names the one workspace holding them", () => {
    expect(describeElsewhere([el("Northwind", 2)], "meeting")).toBe(
      "You have 2 in Northwind. Those meetings belong to another workspace, so it is not shown here.",
    );
  });

  /* One is one. "Those meetings belong" about a single meeting is the kind of
     wrongness that makes somebody trust the rest of the sentence less. */
  it("reads correctly for a single row", () => {
    expect(describeElsewhere([el("Acme", 1)], "contact")).toContain("That contact belongs");
  });

  it("joins several workspaces without a trailing comma", () => {
    const text = describeElsewhere([el("Northwind", 2), el("Acme", 1)], "meeting");
    expect(text).toContain("You have 2 in Northwind and 1 in Acme.");
    expect(text).not.toContain(", .");
  });

  it("uses commas then an and for three", () => {
    const text = describeElsewhere([el("A", 3), el("B", 2), el("C", 1)], "meeting");
    expect(text).toContain("You have 3 in A, 2 in B and 1 in C.");
  });

  /* The total decides the wording, not the number of workspaces: one each in
     two companies is still two meetings. */
  it("counts across workspaces for the singular", () => {
    expect(describeElsewhere([el("A", 1), el("B", 1)], "meeting")).toContain("Those meetings belong");
  });
});

describe("counting what is elsewhere", () => {
  const choices = [
    { id: null, name: "Personal" },
    { id: "c1", name: "Northwind" },
    { id: "c2", name: "Acme" },
  ];
  const row = (company_id: string | null) => ({ company_id });

  /* The whole point: standing in Personal with everything in a company. */
  it("finds the company holding them", () => {
    expect(countElsewhere([row("c1"), row("c1")], choices, null)).toEqual([
      { id: "c1", name: "Northwind", count: 2 },
    ]);
  });

  /* The mistake that makes this feature do nothing visible: counting the
     current workspace's own rows would tell somebody looking at a full screen
     that their work is somewhere else. */
  it("never counts the workspace you are standing in", () => {
    expect(countElsewhere([row(null), row(null)], choices, null)).toEqual([]);
    expect(countElsewhere([row("c1"), row("c1")], choices, "c1")).toEqual([]);
  });

  it("works from a company looking back at Personal", () => {
    expect(countElsewhere([row(null), row("c1")], choices, "c1")).toEqual([
      { id: null, name: "Personal", count: 1 },
    ]);
  });

  /* An absent company_id and an explicit null both mean Personal: every row
     written before companies existed has neither. */
  it("treats an absent company as Personal", () => {
    expect(countElsewhere([{}], choices, "c1")).toEqual([{ id: null, name: "Personal", count: 1 }]);
  });

  it("puts the busiest workspace first, which is the one offered", () => {
    const found = countElsewhere([row("c2"), row("c1"), row("c1")], choices, null);
    expect(found.map((f) => f.name)).toEqual(["Northwind", "Acme"]);
  });

  /* A row in a company somebody has since left must not invent a workspace
     that is not in their list. */
  it("ignores rows in a workspace that is not theirs", () => {
    expect(countElsewhere([row("gone")], choices, null)).toEqual([]);
  });

  it("says nothing when there are no rows at all", () => {
    expect(countElsewhere([], choices, null)).toEqual([]);
  });
});

describe("the screen", () => {
  const PAGE = read("src/app/(app)/meetings/page.tsx");
  const COMPONENT = read("src/components/app/elsewhere-empty.tsx");
  const SERVER = read("src/lib/data/elsewhere.ts");

  /* The extra query is only worth paying on the screen that would otherwise
     mislead, not on every load of one that has rows. */
  it("only asks when there is nothing to show", () => {
    expect(PAGE).toContain("meetings.length === 0 ? await heldElsewhere(all, context) : []");
  });

  /* Passing the FILTERED list would always come back empty, which would look
     like the feature works and do nothing at all. */
  it("is given the unfiltered list", () => {
    expect(PAGE).toContain("heldElsewhere(all, context)");
    expect(PAGE, "the filtered list would always be empty").not.toContain("heldElsewhere(meetings");
  });

  /* Three states, not two: rows, rows elsewhere, and genuinely none. Losing
     the third would tell a brand new account to switch somewhere. */
  it("keeps the real empty state for an account with nothing anywhere", () => {
    expect(PAGE).toContain("elsewhere.length ? (");
    expect(PAGE).toContain('title="No meetings yet"');
  });

  it("offers switching before creating", () => {
    const at = COMPONENT.indexOf("Switch to");
    const create = COMPONENT.indexOf("{action}");
    expect(at).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(-1);
    expect(at, "the switch is the primary action").toBeLessThan(create);
    expect(PAGE, "creating is demoted where the rows are elsewhere").toContain(
      '<ButtonLink variant="secondary" size={30} href="/meetings/new" icon="plus">',
    );
  });

  /* A client component that reaches the server-only module is a BUILD error,
     not a type error, so tsc stays quiet and the page 500s. It happened once
     here already. */
  it("keeps the client component off the server-only module", () => {
    expect(SERVER).toContain('import "server-only"');
    expect(COMPONENT).toContain('from "@/lib/elsewhere"');
    expect(COMPONENT, "this path is server-only").not.toContain('from "@/lib/data/elsewhere"');
  });
});

describe("naming counts somebody else did", () => {
  /* Bookings and contacts filter inside their Convex query and never hand the
     unfiltered rows out, so they count there and name here. One naming path
     for all three screens: three that disagreed about how to list two
     workspaces would be three bugs waiting. */
  const choices = [
    { id: null, name: "Personal" },
    { id: "c1", name: "Northwind" },
    { id: "c2", name: "Acme" },
  ];

  it("puts names on the counts, busiest first", () => {
    const found = nameWorkspaces(
      [
        { company_id: "c2", count: 1 },
        { company_id: "c1", count: 4 },
      ],
      choices,
      null,
    );
    expect(found).toEqual([
      { id: "c1", name: "Northwind", count: 4 },
      { id: "c2", name: "Acme", count: 1 },
    ]);
  });

  it("drops the workspace you are standing in", () => {
    expect(nameWorkspaces([{ company_id: "c1", count: 3 }], choices, "c1")).toEqual([]);
  });

  /* A workspace somebody has since left still holds their rows, and naming it
     would offer a switch that cannot happen. */
  it("drops a workspace that is no longer theirs", () => {
    expect(nameWorkspaces([{ company_id: "gone", count: 2 }], choices, null)).toEqual([]);
  });

  it("drops an empty count", () => {
    expect(nameWorkspaces([{ company_id: "c1", count: 0 }], choices, null)).toEqual([]);
  });

  it("agrees with counting from rows", () => {
    const rows = [{ company_id: "c1" }, { company_id: "c1" }, { company_id: "c2" }];
    expect(nameWorkspaces([{ company_id: "c1", count: 2 }, { company_id: "c2", count: 1 }], choices, null)).toEqual(
      countElsewhere(rows, choices, null),
    );
  });
});

describe("the other two screens", () => {
  const BOOKINGS = read("src/components/app/bookings-screen.tsx");
  const CONTACTS = read("src/components/app/contacts-screen.tsx");
  const CONVEX_BOOKINGS = read("convex/bookings.ts");
  const CONVEX_CONTACTS = read("convex/contacts.ts");

  /* A search that matches nothing is not a workspace problem, and an empty
     Past tab beside a full Upcoming one is not either. Saying so on a screen
     that is working would be noise. */
  it("bookings asks only when the workspace itself is empty", () => {
    expect(BOOKINGS).toContain("rows.length === 0 && bookings.length === 0 && !q && elsewhere.length");
  });

  it("contacts asks only when the workspace itself is empty", () => {
    expect(CONTACTS).toContain("filtered.length === 0 && contacts.length === 0 && elsewhere.length");
  });

  /* Both filter inside the query, so the count has to happen there too. */
  it("both queries count what they filtered out", () => {
    for (const source of [CONVEX_BOOKINGS, CONVEX_CONTACTS]) {
      expect(source).toContain("countOtherWorkspaces(");
      expect(source).toContain("elsewhere");
    }
  });

  /* Paid only on a screen that would otherwise mislead. Contacts reads by
     (user, company), so for it this is a second collect rather than free. */
  it("neither pays for the count on a screen that has rows", () => {
    expect(CONVEX_BOOKINGS).toContain("all.length === 0 ? countOtherWorkspaces(mine, companyId) : []");
    expect(CONVEX_CONTACTS).toContain("contacts.length === 0");
  });
});
