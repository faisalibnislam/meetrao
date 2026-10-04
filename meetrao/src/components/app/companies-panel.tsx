"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Modal } from "@/components/ui/modal";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import {
  addCompanyMember,
  createCompany,
  deleteCompany,
  removeCompanyMember,
  renameCompany,
  setCompanyRole,
  setCompanyHandle,
} from "@/lib/actions/companies";
import { cx } from "@/lib/cx";
import { BUSINESS_PITCH, UpgradeCallout } from "./upgrade";
import { BUSINESS_LIMITS } from "@/lib/pricing";
import { isPaid, type Plan } from "@/convex/lib/plan";

/* ─────────────────────────────────────────────────────────────────────────────
   Companies: a domain, a brand, and the people whose links live on it.

   WHOSE PLAN IS SHOWN. Each card reports the OWNER's plan and the OWNER's
   member cap, not the viewer's. A free account added to somebody's Business
   company sees what that company can do; their own account is unchanged and
   the "new company" button stays closed to them. Showing the viewer's plan
   here would tell a member their company holds one person.

   NO DOMAIN OR BRANDING YET. Both arrive in the next step and belong to the
   company rather than the profile. This panel is deliberately only the shape:
   companies, people, handles.
   ───────────────────────────────────────────────────────────────────────────── */

export type CompanyRole = "owner" | "admin" | "member";

export type CompanyMeetingView = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  isActive: boolean;
};

export type CompanyMemberView = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Their meetrao.com name, which is what the link falls back to. */
  username: string;
  /** Their name on THIS company's domain. */
  handle: string;
  role: CompanyRole;
  joinedAt: number;
  /** Their meetings in this company. Personal ones are not on this domain. */
  meetings: CompanyMeetingView[];
};

export type CompanyView = {
  id: string;
  name: string;
  slug: string;
  handle: string;
  isOwner: boolean;
  /** The VIEWER's role here, which decides every control on the card. */
  myRole: CompanyRole;
  domain: string | null;
  domainVerified: boolean;
  members: CompanyMemberView[];
  ownerPlan: Plan;
  memberLimit: number;
};

const ROLE_LABEL: Record<CompanyRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/* What each role may do, written once. The panel asks these rather than
   re-deriving the rules, and convex/companies.ts enforces them; a control
   that is drawn when the mutation would refuse is a worse lie than a control
   that is missing. */
const canManage = (role: CompanyRole) => role === "owner" || role === "admin";

/**
 * Where a person's booking page actually answers.
 *
 * A verified company domain serves `/<handle>/<meeting>`; everything else
 * falls back to the person's own meetrao.com name, because an unverified
 * domain does not resolve yet and showing it would be showing an address
 * that 404s.
 */
function linkFor(company: CompanyView, member: CompanyMemberView, meetingSlug: string, siteHost: string): string {
  return company.domain && company.domainVerified
    ? `${company.domain}/${member.handle}/${meetingSlug}`
    : `${siteHost}/${member.username}/${meetingSlug}`;
}

export function CompaniesPanel({
  companies: all,
  owned,
  companyLimit,
  canCreate,
  plan,
  siteHost,
  only = null,
}: {
  companies: CompanyView[];
  owned: number;
  companyLimit: number;
  canCreate: boolean;
  /** Where a link answers when the company has no verified domain. */
  siteHost: string;
  /** The VIEWER's plan, which decides only whether they may create one. */
  plan: Plan;
  /**
   * One company, for the People tab inside a company's own settings.
   *
   * The same panel, because the card is the same thing in both places: who is
   * in this company and what they are called on its domain. The difference is
   * the question being asked, which is "which companies do I have" in
   * Personal and "who is in this one" inside a company, so the list of others
   * and the create button are both absent here.
   */
  only?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<"new" | "invite" | "delete" | null>(null);
  const [active, setActive] = useState<string | null>(all[0]?.id ?? null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");

  /* Falls back to the first company rather than trusting `active` alone.
     `active` is seeded from the list at FIRST render, and creating the first
     company re-renders with new props while the state stays null, so the card
     for the company somebody just made would not appear at all. Deriving it
     here means the selection is a preference, not the only way to have one. */
  const companies = only ? all.filter((c) => c.id === only) : all;
  const current = companies.find((c) => c.id === active) ?? companies[0] ?? null;

  /* ONE Business prompt per screen, and the card's wins.

     A Pro owner at the cap triggered both: "adding people" inside the card and
     "more than one company" under it, with the same pitch and the same button
     twice. The card's is the one beside what somebody just tried to do, so the
     panel-level one steps aside when it is showing. */
  const cardAsksForBusiness = Boolean(current?.isOwner && current.memberLimit <= 1);

  /* A Pro owner opening their company's own People tab has nothing to manage:
     the company can only ever hold them, so the list is a heading, a count of
     one, and themselves. What is useful here is the reason it is empty, so
     this screen becomes the pitch and nothing else.

     Everything the card carries stays reachable from Personal → Companies,
     which is the same card without this `only` filter. */
  const soloCompany = Boolean(only && current && current.memberLimit <= 1);

  function run(work: () => Promise<{ error?: string }>, ok: { title: string; text?: string }) {
    startBusy(async () => {
      const result = await work();
      if (result.error) {
        toast({ tone: "bad", title: "That did not work", text: result.error });
        return;
      }
      setDialog(null);
      setName("");
      setSlug("");
      setEmail("");
      setHandle("");
      toast({ tone: "ok", ...ok });
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-[11px]">
      <PanelHeading
        title={only ? "People" : "Companies"}
        subtitle={
          only
            ? "Everyone here gets their own link on this company's domain, under the handle you give them."
            : "A company owns a domain and a brand. The people in it get their own links on it."
        }
      />

      {!only && !isPaid(plan) ? (
        <UpgradeCallout to="pro" feature="A company of your own">
          Your booking links on your own domain, with your logo and colours. You can still be added to
          somebody else&rsquo;s company for nothing.
        </UpgradeCallout>
      ) : null}

      {companies.length === 0 ? (
        <Callout tone="info" title="No companies yet">
          {canCreate
            ? "Make one to put your booking links on your own domain."
            : "You are not in any company, and your plan does not cover owning one."}
        </Callout>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {!only && companies.length > 1 ? (
            <div className="flex flex-wrap gap-[7px]">
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={cx(
                    "cursor-pointer rounded-[7px] border px-[11px] py-[6px] text-[12.5px] font-semibold",
                    c.id === active
                      ? "border-accent-line bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink-2 hover:bg-fill",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          {current && soloCompany ? (
            <UpgradeCallout to="business" feature="Adding people to a company">
              {BUSINESS_PITCH}
            </UpgradeCallout>
          ) : current ? (
            <CompanyCard
              company={current}
              siteHost={siteHost}
              /* Deleting a company belongs to the owner's personal space,
                 beside the list of every company they have. Offering it from
                 inside the company is offering to delete the room you are
                 standing in. */
              canDelete={!only}
              busy={busy}
              onInvite={() => setDialog("invite")}
              onDelete={() => setDialog("delete")}
              onRename={(nextName, nextSlug) =>
                run(() => renameCompany({ id: current.id, name: nextName, slug: nextSlug }), {
                  title: "Renamed",
                })
              }
              onHandle={(userId, next) =>
                run(() => setCompanyHandle({ id: current.id, userId, handle: next }), { title: "Handle saved" })
              }
              onRole={(userId, role) =>
                run(() => setCompanyRole({ id: current.id, userId, role }), {
                  title: role === "admin" ? "Made an admin" : "Now a member",
                })
              }
              onRemoveMember={(userId) =>
                run(() => removeCompanyMember({ id: current.id, userId }), { title: "Removed" })
              }
            />
          ) : null}
        </div>
      )}

      {!only && canCreate ? (
        <div>
          <Button variant="secondary" size={34} icon="plus" disabled={busy} onClick={() => setDialog("new")}>
            New company
          </Button>
          <span className="mt-[7px] block text-[12px] text-ink-3">
            {owned} of {companyLimit} used.
          </span>
        </div>
      ) : owned > 0 ? (
        /* At the cap, which is the one moment a Pro customer has a reason to
           read about Business: they have just been told they cannot make
           another. One prompt, here, rather than a banner on the panel. */
        <div className="flex flex-col gap-[9px]">
          <span className="text-[12px] text-ink-3">
            {owned} of {companyLimit} used.
          </span>
          {companyLimit < BUSINESS_LIMITS.companies && !cardAsksForBusiness ? (
            <UpgradeCallout to="business" feature="More than one company">
              {BUSINESS_PITCH}
            </UpgradeCallout>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={dialog === "new"}
        onClose={() => setDialog(null)}
        title="New company"
        subtitle="You are its first member. A domain and branding come next."
        primary={{
          label: "Create",
          busy,
          onClick: () => run(() => createCompany({ name, slug: slug || name }), { title: "Company created" }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <div className="flex flex-col gap-[12px]">
          <Field label="Name" htmlFor="company-name">
            <Input
              id="company-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""));
              }}
              placeholder="Acme"
            />
          </Field>
          <Field label="Link name" htmlFor="company-slug" help="Shares a namespace with hosts and teams.">
            <Input id="company-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "invite"}
        onClose={() => setDialog(null)}
        title="Add somebody to this company"
        subtitle="They need a Meetrao account already. Their own account stays on whatever plan it is on; the page they get on this domain is covered by yours."
        primary={{
          label: "Add",
          busy,
          onClick: () =>
            current ? run(() => addCompanyMember({ id: current.id, email, handle }), { title: "Added" }) : undefined,
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <div className="flex flex-col gap-[12px]">
          <Field label="Email" htmlFor="company-email">
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@acme.com"
            />
          </Field>
          <Field
            label="Handle on this company"
            htmlFor="company-handle"
            help="Optional. Defaults to their username."
          >
            <Input
              id="company-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="sarah"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete this company?"
        subtitle="The people in it keep their accounts, their meetings and their own links. What goes is this company, its people list and anything on its domain."
        primary={{
          label: "Delete",
          variant: "danger",
          busy,
          onClick: () => (current ? run(() => deleteCompany({ id: current.id }), { title: "Deleted" }) : undefined),
        }}
        secondary={{ label: "Keep it", onClick: () => setDialog(null) }}
      />
    </section>
  );
}

function CompanyCard({
  company,
  siteHost,
  canDelete,
  busy,
  onInvite,
  onDelete,
  onRename,
  onHandle,
  onRole,
  onRemoveMember,
}: {
  company: CompanyView;
  siteHost: string;
  /** False inside a company's own settings: deleting lives in Personal. */
  canDelete: boolean;
  busy: boolean;
  onInvite: () => void;
  onDelete: () => void;
  onRename: (name: string, slug: string) => void;
  onHandle: (userId: string, handle: string) => void;
  onRole: (userId: string, role: "admin" | "member") => void;
  onRemoveMember: (userId: string) => void;
}) {
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftHandle, setDraftHandle] = useState("");

  const mine = company.myRole;
  const manage = canManage(mine);
  const full = company.members.length >= company.memberLimit;
  /* The OWNER's cap. A member of a Business company must not be told their
     company holds one person because their own account is on Pro. */
  const canAddPeople = manage && company.memberLimit > 1;

  return (
    <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="text-[14px] font-semibold text-ink">{company.name}</span>
        <Badge tone={mine === "member" ? "off" : "ok"}>{ROLE_LABEL[mine]}</Badge>
        {company.domain ? (
          <Badge tone={company.domainVerified ? "ok" : "warn"}>
            {company.domainVerified ? company.domain : `${company.domain} · pending`}
          </Badge>
        ) : null}
      </div>

      {manage ? (
        <div className="flex flex-wrap items-end gap-[9px]">
          <Field label="Name" htmlFor={`name-${company.id}`}>
            <Input id={`name-${company.id}`} height={34} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Link name" htmlFor={`slug-${company.id}`}>
            <Input id={`slug-${company.id}`} height={34} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
          <Button
            variant="secondary"
            size={34}
            disabled={busy || (name === company.name && slug === company.slug)}
            onClick={() => onRename(name, slug)}
          >
            Save
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-[9px] pt-[2px]">
        <span className="text-[13px] font-semibold text-ink">
          People
          <span className="ml-[7px] font-normal text-ink-3">
            {canAddPeople ? `${company.members.length} of ${company.memberLimit}` : company.members.length}
          </span>
        </span>
        {canAddPeople ? (
          <Button variant="secondary" size={30} icon="plus" disabled={busy || full} onClick={onInvite}>
            Add somebody
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-[1px] overflow-hidden rounded-[7px] border border-line bg-line">
        {company.members.map((m) => (
          <MemberRow
            key={m.userId}
            company={company}
            member={m}
            siteHost={siteHost}
            viewerRole={mine}
            busy={busy}
            editing={editing === m.userId}
            draftHandle={draftHandle}
            onDraftHandle={setDraftHandle}
            onStartEdit={() => {
              setEditing(m.userId);
              setDraftHandle(m.handle);
            }}
            onCancelEdit={() => setEditing(null)}
            onSaveHandle={() => {
              onHandle(m.userId, draftHandle);
              setEditing(null);
            }}
            onRole={(role) => onRole(m.userId, role)}
            onRemove={() => onRemoveMember(m.userId)}
          />
        ))}
      </div>

      {/* Deleting is the owner's alone. An admin looking after the company's
          face and its people must not be able to take the company away from
          the person who pays for it.

          And only from Personal, where it sits beside the list of every
          company they have. From inside the company it is an offer to delete
          the room you are standing in, with the workspace switcher left
          pointing at something that no longer exists. */}
      {mine === "owner" && canDelete ? (
        <div className="flex flex-wrap items-center gap-[8px]">
          <Button variant="ghost" size={32} disabled={busy} onClick={onDelete}>
            Delete company
          </Button>
        </div>
      ) : null}

      {/* Beside the button that is not there, rather than at the top of the
          panel: this is the moment somebody wanted to add a colleague. */}
      {manage && !canAddPeople ? (
        <UpgradeCallout to="business" feature="Adding people to a company">
          {BUSINESS_PITCH}
        </UpgradeCallout>
      ) : null}
    </div>
  );
}

/**
 * One person: who they are, what they may do, and what their links are.
 *
 * THE LINKS ARE THE POINT. A handle on its own says what the first segment of
 * a URL will be and nothing about whether anything answers at the end of it,
 * so a company could have a domain serving nothing but 404s with no sign of
 * it on this screen.
 */
function MemberRow({
  company,
  member,
  siteHost,
  viewerRole,
  busy,
  editing,
  draftHandle,
  onDraftHandle,
  onStartEdit,
  onCancelEdit,
  onSaveHandle,
  onRole,
  onRemove,
}: {
  company: CompanyView;
  member: CompanyMemberView;
  siteHost: string;
  viewerRole: CompanyRole;
  busy: boolean;
  editing: boolean;
  draftHandle: string;
  onDraftHandle: (next: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveHandle: () => void;
  onRole: (role: "admin" | "member") => void;
  onRemove: () => void;
}) {
  const isOwner = member.role === "owner";
  const manage = canManage(viewerRole);

  /* Promotion is a manager's to make; demotion and removing an admin are the
     owner's alone, because two admins who can each strip the other is a race
     whoever clicks first wins. The same rule is enforced in
     convex/companies.ts, which is the boundary; this only decides what to
     draw. */
  const mayChangeRole = !isOwner && (viewerRole === "owner" || (manage && member.role === "member"));
  const mayRemove = !isOwner && (viewerRole === "owner" || (manage && member.role === "member"));
  /* Anybody may fix their own link. Needing an admin for a typo in the one
     part of this that is nobody else's business was a rule with nothing
     behind it. */
  const mayRename = manage || member.role === viewerRole;

  const active = member.meetings.filter((t) => t.isActive);

  return (
    <div className="flex flex-col gap-[8px] bg-surface px-[12px] py-[10px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-[7px]">
            <span className="text-[13px] font-semibold text-ink">{member.name}</span>
            {/* Owner and admin share a tone: the word is the distinction,
                and amber on a colleague's name reads as a warning. */}
            <Badge tone={member.role === "member" ? "off" : "ok"} dot={false}>
              {ROLE_LABEL[member.role]}
            </Badge>
          </span>
          <span className="block text-[12px] text-ink-3">{member.email}</span>
        </span>

        {editing ? (
          <>
            <Input
              height={34}
              value={draftHandle}
              onChange={(e) => onDraftHandle(e.target.value)}
              aria-label={`Handle for ${member.name}`}
            />
            <Button variant="secondary" size={30} disabled={busy} onClick={onSaveHandle}>
              Save
            </Button>
            <Button variant="ghost" size={30} disabled={busy} onClick={onCancelEdit}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <span className="text-[12.5px] text-ink-2">/{member.handle}</span>
            {mayRename ? (
              <Button
                variant="ghost"
                size={28}
                disabled={busy}
                aria-label={`Rename ${member.name}'s link`}
                onClick={onStartEdit}
              >
                Rename
              </Button>
            ) : null}

            {/* A select rather than a "Make admin" button: the control says
                what they are now as well as what they could be, which a
                one-way button cannot. */}
            {mayChangeRole ? (
              <select
                value={member.role}
                disabled={busy}
                aria-label={`Role for ${member.name}`}
                onChange={(e) => onRole(e.target.value as "admin" | "member")}
                className="h-[30px] cursor-pointer rounded-[6px] border border-line-strong bg-surface px-[8px] font-sans text-[12.5px] text-ink disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            ) : null}

            {mayRemove ? (
              <Button
                variant="ghost"
                size={28}
                disabled={busy}
                aria-label={`Remove ${member.name} from ${company.name}`}
                onClick={onRemove}
              >
                Remove
              </Button>
            ) : null}
          </>
        )}
      </div>

      {active.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-[4px] p-0 pl-[1px]">
          {active.map((t) => {
            const link = linkFor(company, member, t.slug, siteHost);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-[8px] text-[12px]">
                <span className="text-ink-2">{t.name}</span>
                <span className="text-ink-3">{t.durationMinutes} min</span>
                <a
                  href={`https://${link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-accent-ink"
                >
                  {link}
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Said rather than left blank. A person on the domain with nothing
           behind their handle is the failure this list exists to show. */
        <span className="text-[12px] text-ink-3">
          {member.meetings.length > 0
            ? `${member.meetings.length} meeting${member.meetings.length === 1 ? "" : "s"} here, none switched on.`
            : "No meetings on this company yet."}
        </span>
      )}
    </div>
  );
}
