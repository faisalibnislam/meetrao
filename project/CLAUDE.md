# Project instructions

## Change log is mandatory

Every turn that changes a design file in this project must also append an entry to
`design_handoff_meetrao/CHANGELOG.md` — newest entry at the top, under a dated heading.

Insert it **immediately after the intro's `---` separator**, never by anchoring a text replace on
the previous entry's heading. Anchored replaces silently no-op once the heading moves, and that
already lost ~15 entries. After writing, confirm the file grew and the new heading is first.

The log is read by a developer using Claude Code who did **not** see this conversation. So each
entry must state:

- **What changed** — the screen or component, named as it appears in the app.
- **From → to** — the old value and the new one, with exact numbers/hex/copy where relevant.
- **Why**, in one clause, when the reason is not obvious from the change.
- **Dev impact** — flag anything that needs backend work, a new API field, a data-model change,
  or a decision from the team. Write "None" when it is purely visual.

Do not log: screenshot re-captures, handoff-folder file copies, or my own verification passes.
Those are housekeeping, not design changes.

Keep `design_handoff_meetrao/README.md` in sync as the current-state spec — the CHANGELOG says
what moved, the README says what is true now. Update both.
