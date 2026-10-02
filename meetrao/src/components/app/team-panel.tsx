"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { CopyLinkChip } from "./copy-link";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  removeTeamMember,
  setMeetingTeam,
} from "@/lib/actions/teams";
import { cx } from "@/lib/cx";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   One link several people answer.

   A team is not an account type and has no seats to buy: a member is an
   ordinary host who agreed to appear in a rotation, and removing them takes
   nothing away from them. That is why this is a settings panel rather than a
   place of its own — it is a property of the host's account, like their hours.
   ───────────────────────────────────────────────────────────────────────────── */

export type TeamView = {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
  members: { userId: string; name: string; email: string; role: "owner" | "member"; timezone: string }[];
  meetings: { id: string; name: string; slug: string }[];
};

export type AssignableMeeting = { id: string; name: string; teamId: string | null };

export function TeamPanel({
  teams,
  meetings,
  siteUrl,
  pro,
}: {
  teams: TeamView[];
  /** The host's own meetings, any of which can be handed to a team. */
  meetings: AssignableMeeting[];
  siteUrl: string;
  pro: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<"new" | "invite" | "delete" | null>(null);
  const [active, setActive] = useState<string | null>(teams[0]?.id ?? null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");

  const team = teams.find((t) => t.id === active) ?? teams[0] ?? null;

  function run(work: () => Promise<{ error?: string }>, ok: { title: string; text: string }) {
    startBusy(async () => {
      const result = await work();
      if (result.error) {
        toast({ tone: "bad", title: "Could not save", text: result.error });
        return;
      }
      setDialog(null);
      setName("");
      setSlug("");
      setEmail("");
      toast({ tone: "ok", ...ok });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="Team"
        subtitle="One link, answered by whoever is free. Everyone keeps their own hours and calendar."
      />

      {teams.length === 0 ? (
        <>
          <div className="flex flex-col gap-[5px] rounded-[8px] border border-dashed border-line-strong px-[15px] py-[16px]">
            <span className="text-[13.5px] font-semibold text-ink">No team yet</span>
            <span className="text-[12.5px] leading-[1.5] text-ink-2">
              Make one when a meeting should go to whichever of you is free, rather than to you.
            </span>
          </div>
          {pro ? (
            <div>
              <Button variant="accent" size={34} icon="plus" onClick={() => setDialog("new")}>
                Create a team
              </Button>
            </div>
          ) : (
            /* Locked, and it says what it costs. A disabled button with no
               explanation is how a paywall reads as a bug. */
            <Callout tone="accent" title="Team links are part of Pro">
              One link the whole team answers, rotating to whoever is free.{" "}
              <Link href="/settings/billing" className="font-semibold">
                See Pro — $10 a year
              </Link>
              .
            </Callout>
          )}
        </>
      ) : null}

      {teams.length > 1 ? (
        <div className="flex flex-wrap gap-[8px]">
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === team?.id}
              onClick={() => setActive(t.id)}
              className={cx(
                "inline-flex h-[30px] cursor-pointer items-center rounded-[6px] border px-[11px] text-[12.5px]",
                t.id === team?.id
                  ? "border-accent bg-accent font-semibold text-on-accent"
                  : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}

      {team ? (
        <>
          <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
                  {team.name}
                  {team.isOwner ? <Badge tone="ok" dot={false}>Owner</Badge> : null}
                </span>
                <span className="text-[12px] text-ink-3">
                  {team.members.length} {team.members.length === 1 ? "person" : "people"} in the rotation
                </span>
              </div>
              {team.isOwner ? (
                <Button
                  variant="ghost"
                  size={28}
                  className="text-red hover:text-red"
                  onClick={() => setDialog("delete")}
                >
                  Delete team
                </Button>
              ) : null}
            </div>

            {team.meetings.length ? (
              <div className="flex flex-col gap-[8px]">
                {team.meetings.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-[10px]">
                    <span className="text-[13px] text-ink">{m.name}</span>
                    <CopyLinkChip link={`${siteUrl.replace(/^https?:\/\//, "")}/team/${team.slug}/${m.slug}`} />
                  </div>
                ))}
              </div>
            ) : (
              <Callout tone="amber" title="No meeting points here yet">
                Pick one below and its link becomes a team link — the same meeting, answered by whoever is
                free.
              </Callout>
            )}

            <div className="flex flex-col">
              {team.members.map((m, i) => (
                <div
                  key={m.userId}
                  className={cx("flex flex-wrap items-center gap-[12px] py-[9px]", i > 0 && "border-t border-line-soft")}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                    <span className="text-[13px] font-semibold text-ink">{m.name}</span>
                    <span className="text-[12px] text-ink-3">
                      {m.email} · {m.timezone}
                    </span>
                  </div>
                  {m.role === "owner" ? (
                    <Badge tone="off" dot={false}>Owner</Badge>
                  ) : team.isOwner ? (
                    <Button
                      variant="ghost"
                      size={26}
                      busy={busy}
                      className="text-red hover:text-red"
                      onClick={() =>
                        run(() => removeTeamMember({ id: team.id, userId: m.userId }), {
                          title: "Removed",
                          text: `${m.name} is no longer in the rotation.`,
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            {team.isOwner ? (
              <div className="flex flex-wrap gap-[8px]">
                <Button variant="secondary" size={30} icon="user-plus" onClick={() => setDialog("invite")}>
                  Add someone
                </Button>
              </div>
            ) : null}
          </div>

          {team.isOwner && meetings.length ? (
            <div className="flex flex-col gap-[8px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
              <span className="text-[13px] font-semibold text-ink">Meetings this team answers</span>
              <span className="text-[12px] leading-[1.5] text-ink-3">
                A team meeting is booked through the team link and assigned to whoever is free and least
                recently booked. Your own link keeps offering everything else.
              </span>
              {meetings.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-[10px] border-t border-line-soft pt-[9px]">
                  <span className="min-w-0 flex-1 text-[13px] text-ink">{m.name}</span>
                  <MenuSelect
                    size="sm"
                    aria-label={`Who answers ${m.name}`}
                    options={[
                      { value: "", label: "Just me" },
                      { value: team.id, label: team.name },
                    ]}
                    value={m.teamId ?? ""}
                    onChange={(v) =>
                      run(() => setMeetingTeam({ meetingId: m.id, teamId: v || null }), {
                        title: "Saved",
                        text: v ? `${m.name} goes to ${team.name}.` : `${m.name} is yours again.`,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <Modal
        open={dialog === "new"}
        onClose={() => setDialog(null)}
        title="Create a team"
        subtitle="You are its first member. Add the others once it exists."
        primary={{
          label: "Create",
          busy,
          onClick: () =>
            run(() => createTeam({ name, slug: slug || name }), {
              title: "Team created",
              text: "Add the people who should answer it.",
            }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <div className="flex flex-col gap-[12px]">
          <Field label="Name" htmlFor="team-name">
            <Input id="team-name" height={36} value={name} placeholder="Sales" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Link" htmlFor="team-slug" help={`${siteUrl.replace(/^https?:\/\//, "")}/team/${(slug || name || "sales").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`}>
            <Input id="team-slug" height={36} value={slug} placeholder="sales" onChange={(e) => setSlug(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "invite"}
        onClose={() => setDialog(null)}
        title="Add someone to the rotation"
        subtitle="They need a Meetrao account already — their own hours and calendar are what gets offered."
        primary={{
          label: "Add",
          busy,
          onClick: () =>
            team
              ? run(() => addTeamMember({ id: team.id, email }), {
                  title: "Added",
                  text: "They are in the rotation from now on.",
                })
              : undefined,
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <Field label="Their email" htmlFor="team-email">
          <Input
            id="team-email"
            type="email"
            height={36}
            value={email}
            placeholder="colleague@company.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete this team?"
        primary={{
          label: "Delete team",
          variant: "danger",
          busy,
          onClick: () =>
            team
              ? run(() => deleteTeam(team.id), {
                  title: "Team deleted",
                  text: "Its meetings are yours again.",
                })
              : undefined,
        }}
        secondary={{ label: "Keep it", onClick: () => setDialog(null) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          The team link stops working. Meetings it answered go back to you, and bookings already made are
          untouched — they belong to whoever took them.
        </span>
      </Modal>
    </div>
  );
}
