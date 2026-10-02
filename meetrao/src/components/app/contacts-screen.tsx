"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckBox, Field, Input, SearchField, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { EmptyState, TableCard } from "@/components/ui/panels";
import { StackedCell, Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { deleteContact, importContacts, saveContact } from "@/lib/actions/contacts";
import type { ContactView } from "@/lib/data/contacts";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Contacts.

   Most rows here were never typed by anyone: the database mints a contact from
   every booking and every invitee, so the list fills itself in. The host adds,
   corrects and imports on top of that.

   The views are the four questions a host actually asks of this list — everyone,
   who did I meet through Meetrao, who did I add myself, and who has nothing in
   the diary. Filtering happens in the browser because the whole list is already
   here; a host with more contacts than fit in memory is a problem worth having
   first.
   ───────────────────────────────────────────────────────────────────────────── */

type View = "all" | "meetings" | "manual" | "unscheduled";

const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All contacts" },
  { id: "meetings", label: "From meetings" },
  { id: "manual", label: "Added by hand" },
  { id: "unscheduled", label: "Nothing scheduled" },
];

const PAGE_SIZES = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const BLANK = { name: "", email: "", phone: "", company: "", notes: "" };

export function ContactsScreen({ contacts }: { contacts: ContactView[] }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [perPage, setPerPage] = useState("25");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<(typeof BLANK & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactView | null>(null);
  const [busy, startBusy] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (view === "meetings" && c.source === "manual") return false;
      if (view === "manual" && c.source === "booking") return false;
      if (view === "unscheduled" && c.nextMeetingAt) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
      );
    });
  }, [contacts, query, view]);

  const size = Number(perPage);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * size, current * size + size);
  const allShownSelected = shown.length > 0 && shown.every((c) => selected.includes(c.id));

  function reset(next: () => void) {
    next();
    setPage(0);
    setSelected([]);
  }

  function save() {
    if (!editing) return;
    startBusy(async () => {
      const result = await saveContact(editing);
      if (result.error) return toast({ tone: "bad", title: "Could not save", text: result.error });
      toast({ tone: "ok", title: editing.id ? "Contact updated" : "Contact added" });
      setEditing(null);
      window.location.reload();
    });
  }

  function removeOne(contact: ContactView) {
    startBusy(async () => {
      const result = await deleteContact(contact.id);
      if (result.error) return toast({ tone: "bad", title: "Could not delete", text: result.error });
      toast({ tone: "ok", title: "Contact deleted" });
      setConfirmDelete(null);
      window.location.reload();
    });
  }

  function removeSelected() {
    startBusy(async () => {
      for (const id of selected) {
        const result = await deleteContact(id);
        if (result.error) return toast({ tone: "bad", title: "Could not delete", text: result.error });
      }
      toast({ tone: "ok", title: `${selected.length} contacts deleted` });
      window.location.reload();
    });
  }

  function onFile(file: File) {
    startBusy(async () => {
      const text = await file.text();
      const result = await importContacts(text);
      if (result.error) return toast({ tone: "bad", title: "Could not import", text: result.error });

      const parts = [
        result.added ? `${result.added} added` : "",
        result.updated ? `${result.updated} updated` : "",
        result.skipped ? `${result.skipped} skipped` : "",
      ].filter(Boolean);
      toast({ tone: "ok", title: "Import finished", text: parts.join(" · ") || "Nothing to do." });
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* ── toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-[10px]">
        <SearchField
          value={query}
          onValueChange={(v) => reset(() => setQuery(v))}
          placeholder="Search by name, email or company"
          width={280}
        />
        <div className="ml-auto flex flex-wrap items-center gap-[8px]">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so choosing the same file twice still fires a change.
              e.target.value = "";
              if (file) onFile(file);
            }}
          />
          <Button variant="secondary" size={32} icon="upload" busy={busy} onClick={() => fileRef.current?.click()}>
            Import CSV
          </Button>
          <a
            href="/api/contacts/export"
            className="unlink box-border inline-flex h-[32px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-line-strong bg-surface px-[12px] text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-fill"
          >
            <Icon name="download" size={12} />
            Export CSV
          </a>
          <Button variant="accent" size={32} icon="plus" onClick={() => setEditing({ ...BLANK })}>
            Add contact
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[8px]">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => reset(() => setView(v.id))}
            className={cx(
              "inline-flex h-[30px] cursor-pointer items-center gap-[7px] rounded-[6px] border px-[11px] text-[12.5px]",
              "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
              view === v.id
                ? "border-accent bg-accent font-semibold text-on-accent"
                : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
            )}
          >
            {view === v.id ? <Icon name="check" weight="solid" size={10} /> : null}
            {v.label}
          </button>
        ))}

        {selected.length ? (
          <Button
            variant="ghost"
            size={30}
            className="ml-auto text-red hover:text-red"
            busy={busy}
            onClick={removeSelected}
          >
            Delete {selected.length}
          </Button>
        ) : null}
      </div>

      {/* ── the list ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          title={contacts.length ? "Nothing matches" : "No contacts yet"}
          text={
            contacts.length
              ? "Try a different search, or switch back to All contacts."
              : "Anyone who books a meeting with you is added here automatically. You can also add someone yourself or import a CSV."
          }
          action={
            contacts.length ? undefined : (
              <Button variant="accent" size={30} icon="plus" onClick={() => setEditing({ ...BLANK })}>
                Add contact
              </Button>
            )
          }
        />
      ) : (
        <>
          <TableCard>
            <Table minWidth={860}>
              <thead>
                <tr>
                  <Th className="w-[42px]">
                    <label className="flex cursor-pointer items-center" aria-label="Select all on this page">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={allShownSelected}
                        onChange={(e) =>
                          setSelected(e.target.checked ? [...new Set([...selected, ...shown.map((c) => c.id)])] : [])
                        }
                      />
                      <CheckBox checked={allShownSelected} />
                    </label>
                  </Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone number</Th>
                  <Th>Last meeting</Th>
                  <Th>Next meeting</Th>
                  <Th>Company</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <label className="flex cursor-pointer items-center" aria-label={`Select ${c.name || c.email}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected.includes(c.id)}
                          onChange={(e) =>
                            setSelected((list) => (e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id)))
                          }
                        />
                        <CheckBox checked={selected.includes(c.id)} />
                      </label>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-[10px]">
                        <Avatar name={c.name || c.email} size={26} tone={c.source === "manual" ? "neutral" : "accent"} />
                        <StackedCell
                          primary={c.name || "–"}
                          secondary={c.meetings ? `${c.meetings} meeting${c.meetings === 1 ? "" : "s"}` : undefined}
                        />
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-ink-2">{c.email}</span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-ink-2">{c.phone || "–"}</span>
                    </Td>
                    <Td>
                      <span className="text-[13px] whitespace-nowrap text-ink-2">{c.lastMeeting ?? "–"}</span>
                    </Td>
                    <Td>
                      <span className={cx("text-[13px] whitespace-nowrap", c.nextMeeting ? "font-semibold text-ink" : "text-ink-2")}>
                        {c.nextMeeting ?? "–"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-ink-2">{c.company || "–"}</span>
                    </Td>
                    <Td className="text-right">
                      <span className="inline-flex gap-[4px]">
                        <Button
                          variant="ghost"
                          size={26}
                          onClick={() =>
                            setEditing({
                              id: c.id,
                              name: c.name,
                              email: c.email,
                              phone: c.phone,
                              company: c.company,
                              notes: c.notes,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size={26} className="text-red hover:text-red" onClick={() => setConfirmDelete(c)}>
                          Delete
                        </Button>
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableCard>

          <div className="flex flex-wrap items-center gap-[14px]">
            <span className="flex items-center gap-[9px] text-[12.5px] text-ink-3">
              Per page
              <span className="w-[86px]">
                <MenuSelect
                  size="sm"
                  aria-label="Contacts per page"
                  options={PAGE_SIZES}
                  value={perPage}
                  onChange={(v) => reset(() => setPerPage(v))}
                />
              </span>
            </span>
            <span className="text-[12.5px] text-ink-3">
              Showing {current * size + 1}–{current * size + shown.length} of {filtered.length}
            </span>
            {pages > 1 ? (
              <span className="ml-auto flex items-center gap-[6px]">
                <Button variant="secondary" size={28} disabled={current === 0} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size={28}
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </span>
            ) : null}
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit contact" : "Add contact"}
        subtitle={editing?.id ? undefined : "Email is how a contact is recognised, an address you already have updates that person."}
        primary={{ label: editing?.id ? "Save" : "Add contact", onClick: save, busy }}
        secondary={{ label: "Cancel", onClick: () => setEditing(null) }}
        wide
      >
        {editing ? (
          <div className="flex flex-col gap-[12px]">
            <Field label="Name" htmlFor="contact-name">
              <Input
                id="contact-name"
                height={36}
                value={editing.name}
                autoFocus
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email">
              <Input
                id="contact-email"
                type="email"
                height={36}
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-[12px]">
              <Field label="Phone" htmlFor="contact-phone" className="min-w-[150px] flex-1">
                <Input
                  id="contact-phone"
                  height={36}
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </Field>
              <Field label="Company" htmlFor="contact-company" className="min-w-[150px] flex-1">
                <Input
                  id="contact-company"
                  height={36}
                  value={editing.company}
                  onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes" htmlFor="contact-notes">
              <Textarea
                id="contact-notes"
                rows={3}
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this contact?"
        subtitle="Their meetings are not affected: only the contact record goes."
        primary={{
          label: "Delete contact",
          variant: "danger",
          busy,
          onClick: () => confirmDelete && removeOne(confirmDelete),
        }}
        secondary={{ label: "Keep it", onClick: () => setConfirmDelete(null) }}
      >
        <span className="text-[13px] text-ink-2">
          {confirmDelete?.name || confirmDelete?.email}
          {confirmDelete?.meetings
            ? ` has ${confirmDelete.meetings} meeting${confirmDelete.meetings === 1 ? "" : "s"} with you. Booking a meeting adds them back.`
            : ""}
        </span>
      </Modal>
    </div>
  );
}
