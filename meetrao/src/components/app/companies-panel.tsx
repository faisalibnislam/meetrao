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

export type CompanyMemberView = {
  userId: string;
  name: string;
  email: string;
  handle: string;
  role: "owner" | "member";
};

export type CompanyView = {
  id: string;
  name: string;
  slug: string;
  handle: string;
  isOwner: boolean;
  domain: string | null;
  domainVerified: boolean;
  members: CompanyMemberView[];
  ownerPlan: Plan;
  memberLimit: number;
};

export function CompaniesPanel({
  companies,
  owned,
  companyLimit,
  canCreate,
  plan,
}: {
  companies: CompanyView[];
  owned: number;
  companyLimit: number;
  canCreate: boolean;
  /** The VIEWER's plan, which decides only whether they may create one. */
  plan: Plan;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<"new" | "invite" | "delete" | null>(null);
  const [active, setActive] = useState<string | null>(companies[0]?.id ?? null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");

  /* Falls back to the first company rather than trusting `active` alone.
     `active` is seeded from the list at FIRST render, and creating the first
     company re-renders with new props while the state stays null, so the card
     for the company somebody just made would not appear at all. Deriving it
     here means the selection is a preference, not the only way to have one. */
  const current = companies.find((c) => c.id === active) ?? companies[0] ?? null;

  /* ONE Business prompt per screen, and the card's wins.

     A Pro owner at the cap triggered both: "adding people" inside the card and
     "more than one company" under it, with the same pitch and the same button
     twice. The card's is the one beside what somebody just tried to do, so the
     panel-level one steps aside when it is showing. */
  const cardAsksForBusiness = Boolean(current?.isOwner && current.memberLimit <= 1);

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
        title="Companies"
        subtitle="A company owns a domain and a brand. The people in it get their own links on it."
      />

      {!isPaid(plan) ? (
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
          {companies.length > 1 ? (
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

          {current ? (
            <CompanyCard
              company={current}
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
              onRemoveMember={(userId) =>
                run(() => removeCompanyMember({ id: current.id, userId }), { title: "Removed" })
              }
            />
          ) : null}
        </div>
      )}

      {canCreate ? (
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
  busy,
  onInvite,
  onDelete,
  onRename,
  onHandle,
  onRemoveMember,
}: {
  company: CompanyView;
  busy: boolean;
  onInvite: () => void;
  onDelete: () => void;
  onRename: (name: string, slug: string) => void;
  onHandle: (userId: string, handle: string) => void;
  onRemoveMember: (userId: string) => void;
}) {
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftHandle, setDraftHandle] = useState("");

  const full = company.members.length >= company.memberLimit;
  /* The OWNER's cap. A member of a Business company must not be told their
     company holds one person because their own account is on Pro. */
  const canAddPeople = company.isOwner && company.memberLimit > 1;

  return (
    <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="text-[14px] font-semibold text-ink">{company.name}</span>
        <Badge tone={company.isOwner ? "ok" : "off"}>{company.isOwner ? "Owner" : "Member"}</Badge>
        {company.domain ? (
          <Badge tone={company.domainVerified ? "ok" : "warn"}>
            {company.domainVerified ? company.domain : `${company.domain} · pending`}
          </Badge>
        ) : null}
      </div>

      {company.isOwner ? (
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

      <div className="flex flex-col gap-[1px] overflow-hidden rounded-[7px] border border-line bg-line">
        {company.members.map((m) => (
          <div key={m.userId} className="flex flex-wrap items-center gap-[10px] bg-surface px-[12px] py-[10px]">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{m.name}</span>
              <span className="block text-[12px] text-ink-3">{m.email}</span>
            </span>

            {editing === m.userId ? (
              <>
                <Input
                  height={34}
                  value={draftHandle}
                  onChange={(e) => setDraftHandle(e.target.value)}
                  aria-label={`Handle for ${m.name}`}
                />
                <Button
                  variant="secondary"
                  size={30}
                  disabled={busy}
                  onClick={() => {
                    onHandle(m.userId, draftHandle);
                    setEditing(null);
                  }}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <span className="text-[12.5px] text-ink-2">/{m.handle}</span>
                {company.isOwner ? (
                  <Button
                    variant="ghost"
                    size={28}
                    disabled={busy}
                    onClick={() => {
                      setEditing(m.userId);
                      setDraftHandle(m.handle);
                    }}
                  >
                    Rename
                  </Button>
                ) : null}
              </>
            )}

            {company.isOwner && m.role !== "owner" ? (
              <Button
                variant="ghost"
                size={28}
                disabled={busy}
                aria-label={`Remove ${m.name} from ${company.name}`}
                onClick={() => onRemoveMember(m.userId)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {company.isOwner ? (
        <div className="flex flex-wrap items-center gap-[8px]">
          {canAddPeople ? (
            <Button variant="secondary" size={32} icon="plus" disabled={busy || full} onClick={onInvite}>
              Add somebody
            </Button>
          ) : null}
          <Button variant="ghost" size={32} disabled={busy} onClick={onDelete}>
            Delete company
          </Button>
          <span className="text-[12px] text-ink-3">
            {canAddPeople ? `${company.members.length} of ${company.memberLimit}.` : null}
          </span>
        </div>
      ) : null}

      {/* Beside the button that is not there, rather than at the top of the
          panel: this is the moment somebody wanted to add a colleague. */}
      {company.isOwner && !canAddPeople ? (
        <UpgradeCallout to="business" feature="Adding people to a company">
          {BUSINESS_PITCH}
        </UpgradeCallout>
      ) : null}
    </div>
  );
}
