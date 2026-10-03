# Plan: a third tier, companies that own a domain, and no index pages

Status: **agreed in outline, nothing built.** Written 2026-10-04, revised the
same day after two decisions that changed the shape: Pro moves onto the
companies model, and the all-meetings page goes away everywhere.

Two earlier shapes were considered and dropped: per-seat billing, and extending
the existing `teams` table.

The goal in one sentence: **a company owns a domain, its members each have
branded meeting links on it, and the plan decides how many companies and
members you get.**

## What is decided

| | Free | Pro | Business |
| --- | --- | --- | --- |
| Price | 0 | $3 / month, $30 / year | $9 / month, $99 / year |
| Companies | 0 | 1 | 10 |
| Members per company | n/a | 1, themselves | 100, marketed as unlimited |
| Custom domain | no | yes, on their company | yes, on each company |

Flat pricing is the decision that makes the rest tractable. Per-seat would have
meant quantity subscriptions in Polar, proration when somebody is added
mid-cycle, and seat reconciliation against membership. That was the largest risk
in the project and this removes it.

The caps are not there to sell upgrades. Every member on a company domain is a
published page: a Google freebusy call on each view, stored bookings, reminder
emails through Resend. Cost grows with members and companies while revenue stays
flat, so the caps bound what one account can do. No honest customer will see
either number. `teams` already bounds itself the same way at `MAX_MEMBERS = 25`.

**Pro having exactly one company is what makes this one system rather than
two.** There is no profile-owned domain path any more. The plan decides a count
and everything else is the same code.

## No index pages

The all-meetings page is removed. Every advertised link names a specific
meeting.

```
meetrao.com/sarah/intro        the link a person shares
meet.acme.com/sarah/intro      the same thing on a company domain
```

Everything above those 404s. `meetrao.com/sarah` 404s. `meet.acme.com/sarah`
404s. `meet.acme.com/` 404s, and there is no company directory listing members.

**Three consequences worth having written down.**

Existing links break. Every free and Pro account has `meetrao.com/<them>` in
email signatures, proposals and print. The app's own sidebar currently calls it
"Your booking page". Those stop working on the day this ships, and the people
holding them get a 404 with no way to recover the right link.

A company domain's root is dead. Somebody pays $99 a year, points
`meet.acme.com` at us, opens it, and gets a 404. That will generate support
mail. The cheap fix, if it is wanted later, is a per-company "root redirects to"
field pointing at the customer's own website. Not in scope here.

Two live pages become wrong. `/custom-domain` and `/help` both promise the bare
domain works, and `/custom-domain` shipped on 3 October with indexing requested.
Both need rewriting rather than editing, because the three-addresses section is
the centre of that page.

## Open decisions

**1. The plan is called "Business" throughout.** The product already has `teams`
meaning a round-robin rota, so calling the plan "Team" leaves three things called
team: the rota, the plan, and the workspace. Changing it later means Polar, the
pricing page, the comparison table and 666 price-consistency assertions. Settle
before step 1.

**2. What `/<username>` does when the person has exactly one meeting.**
Today `[username]/page.tsx:52` redirects to it, and that is genuinely useful. If
it stays, the rule becomes "your bare link works, unless you have two meetings,
in which case it 404s", which is worse than either consistent answer. The
recommendation is **always 404, remove the redirect too**, so there is one rule.

**3. Who chooses which meetings appear on a company domain.** The meeting belongs
to the member (`meeting_types.user_id`), so the recommendation is **the member
chooses**, per company, and the owner can see what is published but cannot
publish on someone's behalf. An agency owner will want to do it for them, and
letting them means one person can publish another person's personal meetings
onto a client's domain.

**4. What a newly added member publishes by default.** Recommendation:
**nothing**, with a prompt. Publishing everything is a better first run and risks
a personal meeting landing on a client's branded domain the moment somebody is
added.

## Data model

```
companies
  id, owner_id, name, slug, slug_lower
  custom_domain, custom_domain_verified_at
  brand_color, brand_background, logo_url, logo_storage_id
  created_at, updated_at
  by_uuid, by_owner, by_slug_lower, by_custom_domain

company_members
  id, company_id, user_id, role: "owner" | "member"
  handle, handle_lower
  created_at
  by_uuid, by_company, by_user, by_company_handle

company_meeting_types
  id, company_id, meeting_type_id, user_id
  created_at
  by_company, by_meeting_type, by_company_user
```

**Why `handle` rather than the global username.** Usernames are global and first
come first served, so a company cannot be promised `sarah`, and
`meet.acme.com/sarah-jones-1988/intro` is a worse link than the one the customer
is paying for. A per-company handle also covers the case the plan exists for:
the same person can be `sarah` at one company and `s.jones` at another. It
defaults to the username when a member is added.

**Why not extend `teams`.** A team is a rota that answers one link, a person can
be in several, and its meetings belong to its owner. A company is a brand, a
domain and a member list. Overloading one table makes "which team's brand shows
on this domain" a question with no good answer.

**What leaves `profiles`.** `custom_domain` and `custom_domain_verified_at`, plus
the branding fields, move to `companies`. They stay on `profiles` through the
migration and are dropped after, so a rollback does not lose a customer's logo.

## Entitlement

A member of a company is **not** on the Business plan. Their page is entitled by
the **company owner's** plan.

Every read on a public company page resolves the owner's plan, never the
member's. This is the pattern `publicBrand()` already uses, and the reason it
uses it: branding rows survive a lapsed plan so returning costs nothing, which is
exactly why the gate has to be on the way out rather than only on the way in.

`Plan` becomes `"free" | "pro" | "business"`. The `plan` column is already
`v.optional(v.string())`, so **no schema migration for the plan itself**.
Business is a superset of Pro, so existing `requirePro` calls pass for a
Business account and nothing that gates on Pro today needs touching.

## Routing

Pro no longer has its own path, so this replaces rather than extends what is
there. `src/lib/custom-domain.ts` and its thirteen tests get rewritten.

`hostForDomain(domain)` resolves a company, checks the owner's plan and the
verification flag, and returns the company slug with its member handles.
`rewriteForDomain` then maps:

```
meet.acme.com/sarah/intro  ->  /c/<company-slug>/sarah/intro
meet.acme.com/sarah        ->  404
meet.acme.com/             ->  404
```

A new internal route rather than reusing `/[username]/[slug]`, because the page
has to know which company it is serving: that decides the branding and which of
the member's meetings are visible. `/[username]` has nowhere to carry it.

The no-enumeration property is preserved and is the reason the first segment
resolves against the company's own handles. A path that is not a handle of this
company 404s inside the company. It is never a door to another account, which is
what `meet.acme.com/<any-meetrao-username>` would otherwise become, serving a
stranger's page under the customer's logo.

The middleware caches hostname lookups for sixty seconds. A hundred short
handles is roughly two kilobytes, fine to carry, worth measuring rather than
assuming.

## Migration

This is the part that touches live customers, so it goes in its own step with
its own verification.

1. Create a company for every profile holding a `custom_domain`, owned by that
   profile, with one member (them), handle equal to their username, carrying
   their existing branding and domain and its verified timestamp.
2. Publish every active meeting of theirs into `company_meeting_types`, so
   nothing disappears from a domain that is already live.
3. Leave the `profiles` columns in place and reading from the company. Drop them
   in a later release once it has held.

Existing `meetrao.com/<username>` links break by design, per the decision above.
Worth deciding separately whether that is announced to existing users before it
ships, because it is the kind of change people find out about from a client.

## What a downgrade does

Nothing is deleted.

- `hostForDomain` returns null when the owner's plan no longer covers the
  company, so the hostname stops serving.
- Company pages 404. Branding, members, handles and meeting selections stay.
- A Business account dropping to Pro has ten companies and an entitlement for
  one. **Which one survives has to be a choice the customer makes**, not
  whichever sorts first. Until they choose, none of them resolve.
- Resubscribing restores everything with no work and no support ticket.

## Sequence

Riskiest first, each step verifiable on its own. This is the order the Pro work
went in and for the same reason: the billing chain was proved end to end before
anything was built on it.

**1. Plan and billing.** The `Plan` union, `planOf`, `isBusiness`, a third Polar
product, webhook mapping, admin console. No companies, no UI. Done when a real
card buys a Business subscription and the profile says so.

**2. Companies, in settings only.** Create, rename, delete. Members and handles.
Both caps, with tests. No domain, no branding, no public page.

**3. Branding and domain, per company.** `branding.ts` and `domains.ts` already
hold this for a profile and get scoped to a company. `src/lib/vercel-domains.ts`
is unchanged, it only ever took a hostname.

**4. Migration.** Existing Pro domains into companies, per the section above.
Verified against production data before the public pages change.

**5. The public pages, and the index removal.** `hostForDomain`,
`rewriteForDomain`, `/c/<slug>/<handle>/<meeting>`, and the 404s. This is the
step customers see and the one that breaks existing links, so it is the step to
be deliberate about announcing.

**6. Per-company meeting selection**, and the member's screen for it.

**7. Pricing and copy.** A third tier across `pricing.ts`, `plan-price.tsx`,
`pricing-band.tsx`, `plan-comparison.tsx`. Rewrite the address sections of
`/custom-domain` and `/help`. Remove "All meetings" from `copy-link.tsx` and
`app-shell.tsx`. `price-consistency.test.ts` will name every number missed.

**8. The company switcher** in the app chrome, and per-company settings.

Steps 1 and 2 are independently useful and ship behind nothing. Step 5 is the
first one a customer notices.

## Tests

- `custom-domain.test.ts` is **rewritten**. Its cases assert a Pro behaviour that
  no longer exists.
- New `companies-invariants.test.ts`: both caps, handle uniqueness within a
  company, and that every public read gates on the owner's plan rather than the
  member's. Mutation-check each by breaking the source deliberately.
- A test that a member's unselected meetings are absent from a company page.
  This is the one with a privacy consequence, so it earns an assertion rather
  than a manual check.
- A test that no index route exists, so the all-meetings page cannot come back
  by accident.
- `price-consistency.test.ts` gains the third tier.

## Known risks

1. **Meeting scoping is the largest piece of work here**, larger than the
   routing, and the one with a privacy failure mode. A member in two companies
   whose selections leak across puts a personal meeting on a client's branded
   page.
2. **The migration touches live paying customers.** A Pro account whose domain
   stops resolving for an hour is a booking page down for an hour.
3. Removing the index breaks links that are already in print, with no recovery
   path for the guest holding one.
4. A company domain whose root 404s will generate support mail.
5. The middleware payload at 100 members is believed fine and has not been
   measured.
6. A removed member's existing bookings survive and their page stops. Almost
   certainly right, not yet designed.
